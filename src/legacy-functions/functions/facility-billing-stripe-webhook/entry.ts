// @ts-nocheck
// facility-billing-stripe-webhook — Stripe payments for facility invoices.
//
// Endpoint per club: /functions/facility-billing-stripe-webhook?club_id=<club id>,
// registered on the club's own Stripe account with that endpoint's signing secret
// (stored in ClubCredential.stripe_facility_webhook_secret — one secret per endpoint).
//
// Every request is signature-verified before anything is trusted, and each event id is
// recorded in WebhookLog exactly once so a Stripe retry can never pay an invoice twice.
// Handles checkout.session.completed and invoice.paid.

import { createClientFromRequest } from '@/legacy-functions/_sdk';
import { secrets } from '@/legacy-functions/_runtime';
import Stripe from 'stripe';
import { getClubCredentials } from '../../shared/clubCredentials.ts';
import { entityRows, recordFacilityPayment, round2 } from '../../shared/facilityBilling.ts';

/** Applies a settled Stripe payment to the matching facility invoice. */
async function applyPayment(svc, { invoiceId, clubId, amount, reference, eventId, sessionId, intentId }) {
  let invoice = null;
  if (invoiceId) {
    invoice = await svc.entities.Invoice.get(String(invoiceId)).catch(() => null);
  }
  if (!invoice && sessionId) {
    const rows = entityRows(
      await svc.entities.Invoice.filter({ stripe_session_id: sessionId }, { limit: 1 }).catch(() => [])
    );
    invoice = rows[0] || null;
  }

  if (!invoice) {
    console.warn('facility-billing-stripe-webhook: no facility invoice matched this event', { clubId, invoiceId, sessionId });
    return { note: 'no matching facility invoice' };
  }
  if (invoice.club_id !== clubId) {
    console.warn('facility-billing-stripe-webhook: invoice belongs to another club — ignoring', { clubId, invoiceId: invoice.id });
    return { note: 'club mismatch' };
  }
  if (invoice.status === 'paid') {
    console.log('facility-billing-stripe-webhook: invoice already paid', invoice.invoice_number);
    return { invoiceId: invoice.id, note: 'already paid' };
  }
  if (!(amount > 0)) {
    console.warn('facility-billing-stripe-webhook: zero-amount event ignored', invoice.invoice_number);
    return { invoiceId: invoice.id, note: 'zero amount' };
  }

  const balance = round2(invoice.balance ?? invoice.total);
  const applied = amount > balance ? balance : amount;

  await recordFacilityPayment(svc, {
    invoice,
    amount: applied,
    method: 'stripe',
    reference,
    recordedBy: 'stripe-webhook',
    stripeEventId: eventId,
    notes: `Stripe payment ${reference}`,
    currency: invoice.currency || 'USD',
  });

  await svc.entities.Invoice.update(invoice.id, {
    stripe_session_id: sessionId || invoice.stripe_session_id || '',
    ...(intentId ? { stripe_payment_intent_id: intentId } : {}),
  });

  console.log(`facility-billing-stripe-webhook: recorded ${applied} against ${invoice.invoice_number}`);
  return { invoiceId: invoice.id };
}

async function handleEvent(svc, { event, clubId }) {
  const object = event.data?.object || {};

  if (event.type === 'checkout.session.completed') {
    // Autopay setup and subscription checkouts are not invoice payments.
    if (object.mode && object.mode !== 'payment') return { note: `ignored mode ${object.mode}` };
    return await applyPayment(svc, {
      invoiceId: object.metadata?.invoice_id,
      clubId,
      amount: round2(Number(object.amount_total || 0) / 100),
      reference: object.payment_intent || object.id,
      eventId: event.id,
      sessionId: object.id,
      intentId: object.payment_intent || '',
    });
  }

  if (event.type === 'invoice.paid') {
    // Stripe's own invoice objects only touch facility billing when our metadata rides along.
    return await applyPayment(svc, {
      invoiceId: object.metadata?.invoice_id,
      clubId,
      amount: round2(Number(object.amount_paid || 0) / 100),
      reference: object.payment_intent || object.id,
      eventId: event.id,
      sessionId: object.metadata?.invoice_id ? object.id : '',
      intentId: object.payment_intent || '',
    });
  }

  return { note: `ignored ${event.type}` };
}

export default async function (req: Request): Promise<Response> {
  try {
    if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

    const clubId = new URL(req.url).searchParams.get('club_id');
    if (!clubId) return new Response('Missing club_id', { status: 400 });

    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole;

    // Read per request — the secrets are set from the billing page and may change.
    const cred = await getClubCredentials(base44, clubId);
    const stripeKey = cred?.stripe_secret_key || secrets.get('STRIPE_SECRET_KEY');
    // Stripe issues one signing secret per endpoint. The club's facility endpoint secret is
    // preferred; the app's registered Stripe webhook secret is also accepted so events
    // delivered through the app's existing Stripe setup verify here as well.
    const candidates = [cred?.stripe_facility_webhook_secret, secrets.get('MODULE_STRIPE_WEBHOOK_SECRET')].filter(Boolean);
    if (!candidates.length || !stripeKey) {
      console.error('facility-billing-stripe-webhook: no webhook secret or Stripe key configured for club', clubId);
      return new Response('Webhook not configured', { status: 500 });
    }

    const payload = await req.text();
    const signature = req.headers.get('stripe-signature') || '';

    let event = null;
    const stripe = new Stripe(stripeKey, { httpClient: Stripe.createFetchHttpClient() });
    for (const candidate of candidates) {
      try {
        event = await stripe.webhooks.constructEventAsync(
          payload,
          signature,
          candidate,
          undefined,
          Stripe.createSubtleCryptoProvider()
        );
        break;
      } catch (_) {
        // Wrong secret for this endpoint — try the next one.
      }
    }
    if (!event) {
      console.error('facility-billing-stripe-webhook: signature verification failed for club', clubId);
      return new Response('Invalid signature', { status: 401 });
    }

    // Idempotency: the same event id must only ever be applied once.
    const seen = entityRows(await svc.entities.WebhookLog.filter({ event_id: event.id }, { limit: 1 }));
    if (seen.length) {
      console.log('facility-billing-stripe-webhook: duplicate event ignored', event.id);
      return new Response('OK', { status: 200 });
    }

    const log = await svc.entities.WebhookLog.create({
      provider: 'stripe',
      event_id: event.id,
      event_type: event.type,
      club_id: clubId,
      received_at: new Date().toISOString(),
      payload_summary: {
        type: event.type,
        livemode: event.livemode === true,
        object_id: event.data?.object?.id || null,
      },
    });

    try {
      const result = await handleEvent(svc, { event, clubId });
      await svc.entities.WebhookLog.update(log.id, {
        processed: true,
        processed_at: new Date().toISOString(),
        invoice_id: result?.invoiceId || null,
      });
      return new Response('OK', { status: 200 });
    } catch (handlingError) {
      console.error('facility-billing-stripe-webhook: handling failed', handlingError);
      await svc.entities.WebhookLog
        .update(log.id, { error: String(handlingError?.message || handlingError) })
        .catch(() => {});
      // 500 asks Stripe to retry; the idempotency check above keeps that safe.
      return new Response('Processing failed', { status: 500 });
    }
  } catch (error) {
    console.error('facility-billing-stripe-webhook error:', error);
    return new Response('Internal error', { status: 500 });
  }
}