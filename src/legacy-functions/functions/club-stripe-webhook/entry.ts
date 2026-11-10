// @ts-nocheck
import { createClientFromRequest } from '@/legacy-functions/_sdk';
import { getStripeSecretKey } from '../../shared/clubCredentials.ts';
import { postPaymentToQbo, postRefundToQbo, postPayoutDepositToQbo } from '../../shared/qboStripeSync.ts';
import { sendTryoutConfirmation } from '../../shared/tryoutEmails.ts';

// Each club configures this URL (with ?club_id=<their club id>) as a webhook
// endpoint on their OWN Stripe account, using their OWN webhook signing secret
// (stored in ClubCredential). Handles:
//   1. checkout.session.completed (mode=payment)      → confirm a registration/event/dues payment.
//   2. checkout.session.completed (mode=setup)         → save the card for autopay.
//   3. checkout.session.completed (mode=subscription)  → confirm a recurring marketplace order.
//   4. payment_intent.succeeded (off-session)           → recorded by charge-installments, no-op here.
//   5. charge.refunded                                  → mirror as a Refund Receipt in QuickBooks.
//   6. payout.paid                                       → create the QuickBooks Deposit for the payout.
async function verifyStripeSignature(payload: string, sigHeader: string, secret: string): Promise<boolean> {
  if (!sigHeader || !secret) return false;
  const parts: Record<string, string> = {};
  for (const kv of sigHeader.split(',')) {
    const idx = kv.indexOf('=');
    if (idx === -1) continue;
    parts[kv.slice(0, idx)] = kv.slice(idx + 1);
  }
  const t = parts['t'];
  const v1 = parts['v1'];
  if (!t || !v1) return false;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${t}.${payload}`));
  const expectedHex = Array.from(new Uint8Array(sigBuf)).map((b) => b.toString(16).padStart(2, '0')).join('');
  return expectedHex === v1;
}

export default async function (req: Request): Promise<Response> {
  try {
    if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

    const url = new URL(req.url);
    const clubId = url.searchParams.get('club_id');
    if (!clubId) return new Response('Missing club_id', { status: 400 });

    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole;

    const creds = await svc.entities.ClubCredential.filter({ club_id: clubId });
    const cred = creds?.[0];
    if (!cred?.stripe_webhook_secret) {
      console.error('club-stripe-webhook: no webhook secret configured for club', clubId);
      return new Response('Webhook not configured', { status: 500 });
    }

    const payload = await req.text();
    const sigHeader = req.headers.get('stripe-signature') || '';
    const valid = await verifyStripeSignature(payload, sigHeader, cred.stripe_webhook_secret);
    if (!valid) {
      console.error('club-stripe-webhook: invalid signature for club', clubId);
      return new Response('Invalid signature', { status: 401 });
    }

    const event = JSON.parse(payload);

    // --- Autopay setup: a setup-mode checkout completed → save the card. ---
    if (event.type === 'checkout.session.completed') {
      const session = event.data?.object;
      if (session?.mode === 'setup') {
        await handleSetupComplete(svc, session, clubId);
        return new Response('OK', { status: 200 });
      }
      if (session?.mode === 'subscription') {
        await handleSubscriptionComplete(svc, session, clubId);
        return new Response('OK', { status: 200 });
      }
      // mode === 'payment'
      await handlePaymentComplete(base44, session, clubId);
      return new Response('OK', { status: 200 });
    }

    // Off-session installment charges are recorded by charge-installments directly.
    if (event.type === 'payment_intent.succeeded') {
      return new Response('OK', { status: 200 });
    }

    // --- Refund: mirror as a negative Payment ledger entry + QBO Refund Receipt. ---
    if (event.type === 'charge.refunded') {
      await handleChargeRefunded(base44, event.data?.object, clubId);
      return new Response('OK', { status: 200 });
    }

    // --- Payout landed: create the QuickBooks Deposit covering this payout's receipts/fees. ---
    if (event.type === 'payout.paid') {
      await handlePayoutPaid(base44, event.data?.object, clubId);
      return new Response('OK', { status: 200 });
    }

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('club-stripe-webhook error:', error);
    return new Response('Internal error', { status: 500 });
  }
}

async function handleSetupComplete(svc, session, clubId) {
  const metadata = session.metadata || {};
  const { source_type, source_id } = metadata;
  if (!source_type || !source_id) return;

  const setupIntentId = session.setup_intent;
  let paymentMethodId = null;
  if (setupIntentId) {
    paymentMethodId = session.setup_intent_payment_method || null;
  }
  const customerId = session.customer || null;

  const patch = {
    autopay_enabled: true,
    stripe_customer_id: customerId,
    autopay_payment_method_id: paymentMethodId || null,
  };
  if (source_type === 'registration') {
    await svc.entities.Registration.update(source_id, patch).catch((e) => console.error('setup update reg', e));
  } else if (source_type === 'tryout_final_registration') {
    await svc.entities.TryoutFinalRegistration.update(source_id, patch).catch((e) => console.error('setup update invite', e));
  }
}

async function handlePaymentComplete(base44, session, clubId) {
  const svc = base44.asServiceRole;
  const metadata = session.metadata || {};
  const { source_type, source_id } = metadata;
  if (!source_type || !source_id) {
    console.error('club-stripe-webhook: session missing metadata', session?.id);
    return;
  }

  const amountTotal = (session.amount_total || 0) / 100;
  const sessionId = session.id;
  const currency = (session.currency || 'usd').toUpperCase();
  const today = new Date().toISOString().split('T')[0];

  // Idempotency: Stripe may redeliver.
  const already = await svc.entities.Payment.filter({ source_type: mapSourceType(source_type), source_id, transaction_reference: sessionId });
  if (already?.length) return;

  if (source_type === 'registration') {
    const reg = await svc.entities.Registration.get(source_id).catch(() => null);
    if (!reg) return;
    const newAmountPaid = Number(reg.amount_paid || 0) + amountTotal;
    await svc.entities.Registration.update(source_id, {
      amount_paid: newAmountPaid,
      payment_status: newAmountPaid >= Number(reg.amount_due || 0) ? 'paid' : 'partial',
    });
    await svc.entities.Payment.create({
      club_id: reg.club_id,
      source_type: 'registration',
      source_id,
      source_label: reg.program_title || 'Registration',
      player_id: reg.player_id,
      player_name: reg.player_name,
      guardian_name: reg.guardian_name,
      amount: amountTotal,
      currency,
      processor_name: 'Stripe',
      payment_method: 'card',
      status: 'paid_in_full',
      transaction_reference: sessionId,
      payment_date: today,
      recorded_by: 'stripe_webhook',
      promo_code: metadata.promo_code || null,
      discount_amount: Number(metadata.discount_amount) || 0,
    });
  } else if (source_type === 'tryout_final_registration') {
    const invite = await svc.entities.TryoutFinalRegistration.get(source_id).catch(() => null);
    if (!invite) return;
    const newAmountPaid = Number(invite.amount_paid || 0) + amountTotal;
    const fullyPaid = newAmountPaid >= Number(invite.amount_due || 0);
    await svc.entities.TryoutFinalRegistration.update(source_id, {
      amount_paid: newAmountPaid,
      payment_status: fullyPaid ? 'paid' : 'partial',
      status: fullyPaid ? 'paid' : invite.status,
    });
    await svc.entities.Payment.create({
      club_id: invite.club_id,
      source_type: 'tryout_event',
      source_id,
      source_label: `${invite.team_name || ''} Final Registration`.trim(),
      player_id: invite.player_id,
      player_name: invite.player_name,
      guardian_name: invite.guardian_email,
      amount: amountTotal,
      currency,
      processor_name: 'Stripe',
      payment_method: 'card',
      status: 'paid_in_full',
      transaction_reference: sessionId,
      payment_date: today,
      recorded_by: 'stripe_webhook',
      promo_code: metadata.promo_code || null,
      discount_amount: Number(metadata.discount_amount) || 0,
    });
  } else if (source_type === 'club_event') {
    const evReg = await svc.entities.EventRegistration.get(source_id).catch(() => null);
    if (!evReg) return;
    const newAmountPaid = Number(evReg.amount_paid || 0) + amountTotal;
    const fullyPaid = newAmountPaid >= Number(evReg.amount_due || 0);
    await svc.entities.EventRegistration.update(source_id, {
      amount_paid: newAmountPaid,
      payment_status: fullyPaid ? 'paid' : 'partial',
      status: 'registered',
      stripe_checkout_session_id: sessionId,
    });
    await svc.entities.Payment.create({
      club_id: evReg.club_id,
      source_type: 'club_event',
      source_id,
      source_label: evReg.event_name || 'Event',
      player_name: evReg.player_name,
      guardian_name: evReg.guardian_name,
      amount: amountTotal,
      currency,
      processor_name: 'Stripe',
      payment_method: 'card',
      status: 'paid_in_full',
      transaction_reference: sessionId,
      payment_date: today,
      recorded_by: 'stripe_webhook',
      promo_code: metadata.promo_code || null,
      discount_amount: Number(metadata.discount_amount) || 0,
    });
  } else if (source_type === 'marketplace_order') {
    await fulfillMarketplaceOrder(base44, source_id, sessionId, amountTotal, currency, today, metadata, clubId);
  } else if (source_type === 'tryout_registration') {
    await fulfillTryoutRegistrations(base44, metadata, session, today);
  }
}

// --- Tryout registration fulfillment (mode=payment) ---
// One Checkout Session can cover several siblings, so the registration ids and
// their individual amounts travel in the session metadata. Each registration
// gets its own ledger entry (so a refund can target it) and the family gets one
// confirmation email covering every player in the checkout.
async function fulfillTryoutRegistrations(base44, metadata, session, today) {
  const svc = base44.asServiceRole;
  const ids = String(metadata.registration_ids || '').split(',').filter(Boolean);
  const amounts = String(metadata.amounts || '').split(',');
  if (!ids.length) {
    console.error('club-stripe-webhook: tryout session missing registration ids', session?.id);
    return;
  }

  const reference = session.payment_intent || session.id;
  const currency = (session.currency || 'usd').toUpperCase();
  const charged = [];

  for (let i = 0; i < ids.length; i += 1) {
    const amount = Number(amounts[i] || 0);
    if (!(amount > 0)) continue; // waitlist / waived / aid rows are handled at signup
    const reg = await svc.entities.TryoutRegistration.get(ids[i]).catch(() => null);
    if (!reg) continue;
    if (['paid', 'refunded'].includes(reg.payment_status)) continue; // idempotency

    const payment = await svc.entities.Payment.create({
      club_id: reg.club_id,
      source_type: 'tryout_registration',
      source_id: reg.id,
      source_label: `Tryout fee — ${reg.player_name}`,
      player_id: reg.player_id,
      player_name: reg.player_name,
      guardian_name: reg.guardian_name,
      family_email: reg.guardian_email,
      amount,
      currency,
      processor_name: 'Stripe',
      payment_method: 'card',
      status: 'paid_in_full',
      transaction_reference: reference,
      payment_date: today,
      recorded_by: 'stripe_webhook',
      promo_code: metadata.promo_code || null,
      discount_amount: Number(reg.discount_amount || 0),
      charge_type: 'other',
    }).catch((e) => { console.error('tryout: ledger entry failed', e); return null; });

    const updated = await svc.entities.TryoutRegistration.update(reg.id, {
      payment_status: 'paid',
      amount_paid: Math.round((Number(reg.amount_paid || 0) + amount) * 100) / 100,
      payment_id: payment?.id || '',
      stripe_checkout_session_id: session.id,
      status: ['pending_payment', 'pooled'].includes(reg.status) ? 'registered' : reg.status,
    }).catch((e) => { console.error('tryout: registration update failed', e); return null; });
    if (updated) charged.push(updated);
  }

  if (!charged.length) return;

  // Keep each session's registered count in step with the real registrations.
  for (const eventId of [...new Set(charged.map((r) => r.tryout_event_id).filter(Boolean))]) {
    const all = await svc.entities.TryoutRegistration.filter({ tryout_event_id: eventId }, null, 1000).catch(() => []);
    const registered = all.filter((r) =>
      ['registered', 'pending_payment', 'checked_in', 'no_show'].includes(r.status)).length;
    await svc.entities.TryoutEvent.update(eventId, { registration_count: registered }).catch(() => {});
  }

  if (metadata.promo_code && metadata.club_id) {
    const promos = await svc.entities.PromoCode.filter({ club_id: metadata.club_id, code: metadata.promo_code }, null, 1).catch(() => []);
    if (promos?.[0]) {
      await svc.entities.PromoCode.update(promos[0].id, { used_count: Number(promos[0].used_count || 0) + 1 }).catch(() => {});
    }
  }

  // The whole family, including any sibling whose fee was already covered.
  const group = metadata.group_id
    ? await svc.entities.TryoutRegistration.filter({ checkout_group_id: metadata.group_id }, 'created_date', 100).catch(() => [])
    : charged;
  const family = group.length ? group : charged;

  const sessions: Record<string, any> = {};
  await Promise.all([...new Set(family.map((r) => r.tryout_event_id).filter(Boolean))].map(async (id) => {
    sessions[id] = await svc.entities.TryoutEvent.get(id).catch(() => ({}));
  }));
  const plan = family[0]?.tryout_plan_id
    ? await svc.entities.TryoutPlan.get(family[0].tryout_plan_id).catch(() => null)
    : null;

  await sendTryoutConfirmation(base44, {
    email: family[0].guardian_email,
    registrations: family,
    sessions,
    plan,
    totals: {
      total: Math.round(family.reduce((s, r) => s + Number(r.amount_paid || 0), 0) * 100) / 100,
      discount: Math.round(family.reduce((s, r) => s + Number(r.discount_amount || 0), 0) * 100) / 100,
    },
    appUrl: (process.env.WIX_CHECKOUT_APP_URL || 'https://clubrudder.com').replace(/\/$/, ''),
  }).catch((e) => console.error('tryout confirmation email failed:', e?.message || e));
}

// Retrieves the Stripe fee and payout id for a Checkout Session's payment
// intent, via the club's own Stripe account. Returns { fee, payoutId } in
// dollars, or nulls if it couldn't be resolved (never blocks the Payment
// ledger entry — fee/payout fields just stay empty until the next sync).
async function fetchFeeAndPayout(base44, clubId, paymentIntentId) {
  try {
    const secretKey = await getStripeSecretKey(base44, clubId);
    if (!secretKey || !paymentIntentId) return { fee: null, payoutId: null };
    const authHeader = { Authorization: `Bearer ${secretKey}` };

    const piRes = await fetch(`https://api.stripe.com/v1/payment_intents/${paymentIntentId}?expand[]=latest_charge`, { headers: authHeader });
    const pi = await piRes.json().catch(() => ({}));
    const charge = pi?.latest_charge;
    const chargeId = typeof charge === 'string' ? charge : charge?.id;
    const balanceTxnId = typeof charge === 'object' ? charge?.balance_transaction : null;
    if (!chargeId) return { fee: null, payoutId: null };

    let btId = balanceTxnId;
    let payoutId = null;
    if (!btId) {
      const chRes = await fetch(`https://api.stripe.com/v1/charges/${chargeId}`, { headers: authHeader });
      const ch = await chRes.json().catch(() => ({}));
      btId = ch?.balance_transaction;
    }
    if (!btId) return { fee: null, payoutId: null };

    const btRes = await fetch(`https://api.stripe.com/v1/balance_transactions/${btId}`, { headers: authHeader });
    const bt = await btRes.json().catch(() => ({}));
    const fee = typeof bt?.fee === 'number' ? bt.fee / 100 : null;
    payoutId = typeof bt?.source === 'string' && bt?.source?.startsWith('po_') ? bt.source : (bt?.payout || null);
    return { fee, payoutId };
  } catch (err) {
    console.error('fetchFeeAndPayout error:', err);
    return { fee: null, payoutId: null };
  }
}

// --- Marketplace order fulfillment (mode=payment) ---
async function fulfillMarketplaceOrder(base44, orderId, sessionId, amountTotal, currency, today, metadata, clubId) {
  const svc = base44.asServiceRole;
  const order = await svc.entities.MarketplaceOrder.get(orderId).catch(() => null);
  if (!order) { console.error('marketplace_order: order not found', orderId); return; }
  if (order.status === 'paid') return; // idempotency

  await svc.entities.MarketplaceOrder.update(orderId, {
    status: 'paid',
    stripe_payment_intent_id: metadata.payment_intent || null,
    paid_date: new Date().toISOString(),
  });

  const club = await svc.entities.Club.get(order.club_id || clubId).catch(() => null);
  const { fee: totalFee, payoutId } = await fetchFeeAndPayout(base44, order.club_id || clubId, metadata.payment_intent);

  const duesItems = (order.items || []).filter((i) => i.type === 'dues');
  const duesSubtotal = duesItems.reduce((s, i) => s + (i.line_total || 0), 0);
  const duesPayments = [];

  // Fulfill each line item
  for (const item of order.items || []) {
    if (item.type === 'event' || item.type === 'event_series' || item.type === 'event_bulk') {
      const ev = await svc.entities.ClubEvent.get(item.reference_id).catch(() => null);
      if (!ev) continue;
      const datesLabel = (item.dates || []).join(', ') || 'All dates';
      const reg = await svc.entities.EventRegistration.create({
        club_id: ev.club_id,
        event_id: ev.id,
        event_name: ev.name,
        player_name: order.customer_name,
        guardian_name: order.customer_name,
        guardian_email: order.customer_email,
        phone: order.customer_phone || '',
        status: 'registered',
        amount_due: item.line_total,
        amount_paid: item.line_total,
        payment_status: 'paid',
        registered_date: today,
        notes: `Marketplace order ${order.order_number} — ${item.type === 'event_series' ? 'Series Pass' : item.type === 'event_bulk' ? 'All-Days Pass' : datesLabel}`,
      }).catch((e) => console.error('marketplace: create reg error', e));
      if (reg) {
        const newCount = (ev.registered_count || 0) + (item.quantity || 1);
        const newStatus = ev.capacity > 0 && newCount >= ev.capacity ? 'full' : 'open';
        await svc.entities.ClubEvent.update(ev.id, { registered_count: newCount, status: newStatus }).catch(() => {});
      }
    }

    else if (item.type === 'spiritwear') {
      const product = await svc.entities.SpiritwearProduct.get(item.reference_id).catch(() => null);
      if (!product) continue;
      const variants = (product.variants || []).map((v) => {
        if (v.size === item.variant?.size && v.color === item.variant?.color && v.sku === item.variant?.sku) {
          return { ...v, stock: Math.max(0, (v.stock || 0) - (item.quantity || 1)) };
        }
        return v;
      });
      await svc.entities.SpiritwearProduct.update(product.id, { variants }).catch((e) => console.error('marketplace: stock update error', e));
    }

    // Dues: tagged at checkout with team_id/branch_id/charge_type — create its
    // own Payment ledger entry (so it carries its own Class/Location) and sync
    // it to QuickBooks as a Sales Receipt.
    else if (item.type === 'dues') {
      const itemFee = totalFee && duesSubtotal > 0 ? Math.round((totalFee * (item.line_total / duesSubtotal)) * 100) / 100 : null;
      const payment = await svc.entities.Payment.create({
        club_id: order.club_id,
        source_type: 'offer',
        source_id: item.reference_id,
        source_label: item.name || 'Dues',
        guardian_name: order.customer_name,
        family_email: order.customer_email,
        amount: item.line_total,
        currency,
        processor_name: 'Stripe',
        payment_method: 'card',
        status: 'paid_in_full',
        transaction_reference: sessionId,
        payment_date: today,
        recorded_by: 'stripe_webhook',
        team_id: item.team_id || '',
        team_name: item.team_name || '',
        branch_id: item.branch_id || '',
        branch_name: item.branch_name || '',
        charge_type: 'dues',
        stripe_fee: itemFee,
        net_amount: itemFee != null ? Math.round((item.line_total - itemFee) * 100) / 100 : null,
        stripe_payout_id: payoutId || '',
      }).catch((e) => { console.error('marketplace: dues payment ledger error', e); return null; });
      if (payment) duesPayments.push(payment);
    }

    // Subscriptions in payment mode (one_time) — no additional record needed beyond the order
  }

  // Sync each dues payment to QuickBooks (Sales Receipt + fee Expense), or
  // mark it blocked and alert the bookkeeper if the team/branch isn't mapped.
  if (club && duesPayments.length > 0) {
    for (const payment of duesPayments) {
      await postPaymentToQbo(base44, club, payment);
    }
  }

  // Non-dues portion of the order gets one generic ledger entry, as before.
  const nonDuesTotal = amountTotal - duesPayments.reduce((s, p) => s + (p.amount || 0), 0);
  if (nonDuesTotal > 0.004) {
    await svc.entities.Payment.create({
      club_id: order.club_id,
      source_type: 'other',
      source_id: orderId,
      source_label: `Marketplace Order ${order.order_number}`,
      guardian_name: order.customer_name,
      family_email: order.customer_email,
      amount: Math.round(nonDuesTotal * 100) / 100,
      currency,
      processor_name: 'Stripe',
      payment_method: 'card',
      status: 'paid_in_full',
      transaction_reference: sessionId,
      payment_date: today,
      recorded_by: 'stripe_webhook',
    }).catch((e) => console.error('marketplace: payment ledger error', e));
  }
}

// --- Marketplace subscription fulfillment (mode=subscription) ---
async function handleSubscriptionComplete(svc, session, clubId) {
  const metadata = session.metadata || {};
  const { source_type, order_id } = metadata;
  if (source_type !== 'marketplace_order' || !order_id) {
    console.error('club-stripe-webhook: subscription session missing marketplace metadata', session?.id);
    return;
  }
  const order = await svc.entities.MarketplaceOrder.get(order_id).catch(() => null);
  if (!order) return;
  if (order.status === 'paid') return; // idempotency

  await svc.entities.MarketplaceOrder.update(order_id, {
    status: 'paid',
    stripe_subscription_id: session.subscription || null,
    paid_date: new Date().toISOString(),
  });

  // Create a Payment ledger entry for the first subscription charge
  const amountTotal = (session.amount_total || 0) / 100;
  const currency = (session.currency || 'usd').toUpperCase();
  const today = new Date().toISOString().split('T')[0];
  await svc.entities.Payment.create({
    club_id: order.club_id,
    source_type: 'other',
    source_id: order_id,
    source_label: `Marketplace Subscription ${order.order_number}`,
    guardian_name: order.customer_name,
    family_email: order.customer_email,
    amount: amountTotal,
    currency,
    processor_name: 'Stripe',
    payment_method: 'card',
    status: 'paid_in_full',
    transaction_reference: session.subscription || session.id,
    payment_date: today,
    recorded_by: 'stripe_webhook',
  }).catch((e) => console.error('marketplace: subscription ledger error', e));
}

// --- Refund: find the original Payment by its Stripe charge/session reference,
// write a negative ledger entry, and mirror it to QuickBooks as a Refund Receipt. ---
async function handleChargeRefunded(base44, charge, clubId) {
  const svc = base44.asServiceRole;
  if (!charge) return;
  const chargeId = charge.id;
  const refundAmount = (charge.amount_refunded || 0) / 100;
  if (!chargeId || refundAmount <= 0) return;

  // The Payment ledger stores the Checkout Session id, not the charge id directly —
  // match on payment_intent since that's consistent across both.
  const paymentIntentId = charge.payment_intent;
  const existing = await svc.entities.Payment.filter({ club_id: clubId }, '-created_date', 200).catch(() => []);
  const original = (existing || []).find((p) => p.transaction_reference && (p.transaction_reference === chargeId || p.transaction_reference === paymentIntentId));
  if (!original) {
    console.error('club-stripe-webhook: refund received for unknown charge', chargeId);
    return;
  }

  const already = await svc.entities.Payment.filter({ original_payment_id: original.id, is_refund: true }).catch(() => []);
  if (already?.length) return; // idempotency

  const club = await svc.entities.Club.get(clubId).catch(() => null);
  const refundPayment = await svc.entities.Payment.create({
    club_id: clubId,
    source_type: original.source_type,
    source_id: original.source_id,
    source_label: original.source_label,
    guardian_name: original.guardian_name,
    family_email: original.family_email,
    amount: -refundAmount,
    currency: original.currency,
    processor_name: 'Stripe',
    payment_method: original.payment_method,
    status: 'refunded',
    transaction_reference: chargeId,
    payment_date: new Date().toISOString().split('T')[0],
    recorded_by: 'stripe_webhook',
    is_refund: true,
    original_payment_id: original.id,
    team_id: original.team_id,
    team_name: original.team_name,
    branch_id: original.branch_id,
    branch_name: original.branch_name,
    charge_type: original.charge_type,
  }).catch((e) => { console.error('refund ledger error', e); return null; });

  await svc.entities.Payment.update(original.id, { status: 'refunded' }).catch(() => {});

  if (club && refundPayment) {
    await postRefundToQbo(base44, club, original, refundPayment);
  }
}

// --- Payout landed: gather this payout's synced Sales Receipts/Expenses and
// create the QuickBooks Deposit moving net funds from Stripe Clearing to the bank. ---
async function handlePayoutPaid(base44, payout, clubId) {
  const svc = base44.asServiceRole;
  if (!payout?.id) return;

  const existing = await svc.entities.StripePayout.filter({ club_id: clubId, stripe_payout_id: payout.id }).catch(() => []);
  if (existing?.length && existing[0].qbo_deposit_id) return; // idempotency

  const payments = await svc.entities.Payment.filter({ club_id: clubId, stripe_payout_id: payout.id, qbo_entry_type: 'sales_receipt' }, '-created_date', 500).catch(() => []);

  const club = await svc.entities.Club.get(clubId).catch(() => null);
  const grossTotal = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const feeTotal = payments.reduce((s, p) => s + (p.stripe_fee || 0), 0);

  const payoutRecord = {
    club_id: clubId,
    stripe_payout_id: payout.id,
    amount: (payout.amount || 0) / 100,
    currency: (payout.currency || 'usd').toUpperCase(),
    arrival_date: payout.arrival_date ? new Date(payout.arrival_date * 1000).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    status: 'paid',
    payment_ids: payments.map((p) => p.id),
    payment_count: payments.length,
    gross_total: Math.round(grossTotal * 100) / 100,
    fee_total: Math.round(feeTotal * 100) / 100,
  };

  let deposit = existing?.[0];
  if (deposit) {
    await svc.entities.StripePayout.update(deposit.id, payoutRecord);
  } else {
    deposit = await svc.entities.StripePayout.create(payoutRecord);
  }

  if (club) {
    const qboDepositId = await postPayoutDepositToQbo(base44, club, payoutRecord, payments);
    if (qboDepositId) {
      await svc.entities.StripePayout.update(deposit.id, { qbo_deposit_id: qboDepositId });
    }
  }
}

function mapSourceType(s) {
  if (s === 'tryout_final_registration') return 'tryout_event';
  return s;
}