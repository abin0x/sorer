import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { getStripeSecretKey } from '../../shared/clubCredentials.ts';
import { nextInstallmentDate } from '../../shared/installments.ts';

// Daily installment billing worker — invoked by the "Daily Installment Billing"
// scheduled workflow. Runs as the service role (no user auth).
//
// For every Registration and TryoutFinalRegistration with an active installment
// plan whose next_installment_date is today or earlier:
//   - Autopay ON + saved card → charge off-session via Stripe PaymentIntent.
//       succeeded → record Payment, advance schedule.
//       failed / requires_action → mark past_due, email a pay-now link.
//   - Autopay OFF → email a one-time Stripe Checkout link for the installment.
//
// Returns a summary so the workflow run log shows what happened.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole;
    const today = new Date().toISOString().split('T')[0];

    const summary = { charged: 0, failed: 0, links_sent: 0, skipped: 0 };

    // --- Registrations ---
    const regs = await svc.entities.Registration.list('-created_date', 500).catch(() => []);
    for (const reg of (regs || [])) {
      if (!reg.installment_count || reg.installment_count <= 0) continue;
      if ((reg.installments_paid || 0) >= reg.installment_count) continue;
      if (!reg.next_installment_date || reg.next_installment_date > today) continue;
      if (reg.status === 'cancelled' || reg.status === 'rejected') continue;
      try {
        await processInstallment(base44, svc, {
          sourceType: 'registration',
          source: reg,
          clubId: reg.club_id,
          description: `${reg.program_title || 'Registration'} — ${reg.player_name || ''}`.trim(),
          guardianEmail: await resolveRegGuardianEmail(svc, reg),
          successUrl: await appBase(req, `/FamilyAccount?paid=1`),
          cancelUrl: await appBase(req, `/FamilyAccount`),
        });
        summary.charged++;
      } catch (e) {
        console.error('charge-installments reg error', reg.id, e);
        summary.failed++;
      }
    }

    // --- Tryout final registrations ---
    const invites = await svc.entities.TryoutFinalRegistration.list('-created_date', 500).catch(() => []);
    for (const inv of (invites || [])) {
      if (!inv.installment_count || inv.installment_count <= 0) continue;
      if ((inv.installments_paid || 0) >= inv.installment_count) continue;
      if (!inv.next_installment_date || inv.next_installment_date > today) continue;
      if (inv.status === 'paid') continue;
      try {
        await processInstallment(base44, svc, {
          sourceType: 'tryout_event',
          source: inv,
          clubId: inv.club_id,
          description: `${inv.team_name || 'Team'} registration — ${inv.player_name || ''}`.trim(),
          guardianEmail: inv.guardian_email,
          successUrl: await appBase(req, `/FinalRegistration?invite=${inv.id}&paid=1`),
          cancelUrl: await appBase(req, `/FinalRegistration?invite=${inv.id}`),
        });
        summary.charged++;
      } catch (e) {
        console.error('charge-installments invite error', inv.id, e);
        summary.failed++;
      }
    }

    return Response.json(summary);
  } catch (error) {
    console.error('charge-installments error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

async function appBase(req, path) {
  const appUrl = req.headers.get('X-Base44-App-Url') || 'https://clubrudder.com';
  return `${appUrl.replace(/\/$/, '')}${path}`;
}

async function resolveRegGuardianEmail(svc, reg) {
  if (!reg.guardian_id) return null;
  const g = await svc.entities.Guardian.get(reg.guardian_id).catch(() => null);
  return g?.email || null;
}

async function processInstallment(base44, svc, ctx) {
  const { sourceType, source, clubId, description, guardianEmail, successUrl, cancelUrl } = ctx;
  const amount = Number(source.installment_amount || 0);
  if (amount < 0.5) return; // below Stripe minimum

  const secretKey = await getStripeSecretKey(base44, clubId);
  if (!secretKey) { console.error('charge-installments: no stripe key for club', clubId); return; }

  const updateSource = (patch) =>
    sourceType === 'registration'
      ? svc.entities.Registration.update(source.id, patch)
      : svc.entities.TryoutFinalRegistration.update(source.id, patch);

  // Autopay path: charge off-session with the saved payment method.
  if (source.autopay_enabled && source.stripe_customer_id && source.autopay_payment_method_id) {
    const piParams = new URLSearchParams();
    piParams.append('amount', String(Math.round(amount * 100)));
    piParams.append('currency', 'usd');
    piParams.append('customer', source.stripe_customer_id);
    piParams.append('payment_method', source.autopay_payment_method_id);
    piParams.append('off_session', 'true');
    piParams.append('confirm', 'true');
    piParams.append('description', `${description} — installment ${source.installments_paid + 1}/${source.installment_count}`);
    piParams.append('metadata[source_type]', sourceType);
    piParams.append('metadata[source_id]', source.id);
    piParams.append('metadata[club_id]', clubId);
    piParams.append('metadata[installment]', String((source.installments_paid || 0) + 1));

    const piRes = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: piParams.toString(),
    });
    const pi = await piRes.json().catch(() => ({}));
    if (piRes.ok && pi.status === 'succeeded') {
      await recordInstallmentPayment(svc, sourceType, source, amount, pi.id, clubId, description);
      await advanceSchedule(svc, sourceType, source, updateSource);
      return;
    }
    // Off-session charge needs customer action (SCA) or failed — fall back to a link email.
    console.warn('charge-installments: autopay charge not succeeded', pi.id, pi.status, pi.last_payment_error?.message);
    await markPastDue(svc, sourceType, source, updateSource);
    await sendInstallmentLinkEmail(base44, svc, sourceType, source, amount, description, guardianEmail, successUrl, cancelUrl, clubId, secretKey);
    return;
  }

  // No autopay — send a pay-now checkout link by email.
  await sendInstallmentLinkEmail(base44, svc, sourceType, source, amount, description, guardianEmail, successUrl, cancelUrl, clubId, secretKey);
}

async function sendInstallmentLinkEmail(base44, svc, sourceType, source, amount, description, guardianEmail, successUrl, cancelUrl, clubId, secretKey) {
  if (!guardianEmail) return;
  // Create a checkout session for the installment.
  const params = new URLSearchParams();
  params.append('mode', 'payment');
  params.append('success_url', successUrl);
  params.append('cancel_url', cancelUrl);
  params.append('line_items[0][price_data][currency]', 'usd');
  params.append('line_items[0][price_data][product_data][name]', `${description} — installment`);
  params.append('line_items[0][price_data][unit_amount]', String(Math.round(amount * 100)));
  params.append('line_items[0][quantity]', '1');
  params.append('metadata[source_type]', sourceType);
  params.append('metadata[source_id]', source.id);
  params.append('metadata[club_id]', clubId);
  params.append('metadata[installment]', String((source.installments_paid || 0) + 1));
  if (source.stripe_customer_id) params.append('customer', source.stripe_customer_id);
  else if (guardianEmail) params.append('customer_email', guardianEmail);

  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  const session = await res.json().catch(() => ({}));
  if (!res.ok || !session.url) { console.error('charge-installments: checkout link failed', session?.error?.message); return; }

  // Send the link by email through the platform's SendEmail integration.
  try {
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: guardianEmail,
      subject: `Installment due: $${amount.toFixed(2)} for ${description}`,
      body: `Your next installment of $${amount.toFixed(2)} for ${description} is now due. Complete your payment here: ${session.url}`,
    });
  } catch (e) {
    console.error('charge-installments: email send failed', e);
  }
}

async function recordInstallmentPayment(svc, sourceType, source, amount, chargeId, clubId, description) {
  const today = new Date().toISOString().split('T')[0];
  await svc.entities.Payment.create({
    club_id: clubId,
    source_type: sourceType,
    source_id: source.id,
    source_label: `${description} — installment`,
    player_id: source.player_id,
    player_name: source.player_name,
    guardian_name: source.guardian_name || source.guardian_email,
    amount,
    currency: 'USD',
    processor_name: 'Stripe',
    payment_method: 'card',
    status: 'paid_in_full',
    transaction_reference: chargeId,
    payment_date: today,
    recorded_by: 'autopay_workflow',
  });
  // Update the source's running balance.
  const newPaid = Number(source.amount_paid || 0) + amount;
  const balancePatch = {
    amount_paid: newPaid,
    payment_status: newPaid >= Number(source.amount_due || 0) ? 'paid' : 'partial',
  };
  if (sourceType === 'registration') {
    await svc.entities.Registration.update(source.id, balancePatch);
  } else {
    const paid = (source.installments_paid || 0) + 1 >= source.installment_count;
    await svc.entities.TryoutFinalRegistration.update(source.id, { ...balancePatch, status: paid ? 'paid' : source.status });
  }
}

async function advanceSchedule(svc, sourceType, source, updateSource) {
  const next = nextInstallmentDate(source.next_installment_date, 'monthly');
  await updateSource({
    installments_paid: (source.installments_paid || 0) + 1,
    next_installment_date: next,
  });
}

async function markPastDue(svc, sourceType, source, updateSource) {
  if (sourceType === 'registration') {
    await updateSource({ payment_status: 'past_due' });
  }
}