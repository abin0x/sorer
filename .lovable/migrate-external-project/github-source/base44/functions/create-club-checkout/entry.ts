import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { getStripeSecretKey } from '../../shared/clubCredentials.ts';
import { validatePromoCode, incrementPromoUsage } from '../../shared/promoCodes.ts';

// Creates a Stripe Checkout Session on the CLUB'S OWN Stripe account (secret
// key stored in ClubCredential) for a Registration (season dues),
// TryoutFinalRegistration (event signup), or EventRegistration (camp/class).
// Public endpoint — guardians are often anonymous on the signup portals, so
// this must not require login. The amount is always resolved SERVER-SIDE from
// the record, never trusted from the client. An optional promo_code is
// validated and the discount applied to the line-item total.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole;

    const body = await req.json().catch(() => ({}));
    const { source_type, source_id, promo_code } = body;
    if (!source_id || !['registration', 'tryout_final_registration', 'club_event'].includes(source_type)) {
      return Response.json({ error: 'source_type (registration|tryout_final_registration|club_event) and source_id are required' }, { status: 400 });
    }

    const appUrl = req.headers.get('X-Base44-App-Url') || process.env.WIX_CHECKOUT_APP_URL || '';
    if (!appUrl) return Response.json({ error: 'App URL not configured.' }, { status: 500 });
    const base = appUrl.replace(/\/$/, '');

    let clubId, amount, description, successUrl, cancelUrl, guardianEmail;

    if (source_type === 'registration') {
      const reg = await svc.entities.Registration.get(source_id).catch(() => null);
      if (!reg) return Response.json({ error: 'Registration not found' }, { status: 404 });
      clubId = reg.club_id;
      amount = Number(reg.amount_due || 0) - Number(reg.amount_paid || 0);
      description = `${reg.program_title || 'Registration'} — ${reg.player_name || ''}`.trim();
      successUrl = `${base}/FamilyAccount?paid=1`;
      cancelUrl = `${base}/FamilyAccount`;
      if (reg.guardian_id) {
        const guardian = await svc.entities.Guardian.get(reg.guardian_id).catch(() => null);
        guardianEmail = guardian?.email;
      }
    } else if (source_type === 'tryout_final_registration') {
      const invite = await svc.entities.TryoutFinalRegistration.get(source_id).catch(() => null);
      if (!invite) return Response.json({ error: 'Registration invite not found' }, { status: 404 });
      clubId = invite.club_id;
      amount = Number(invite.amount_due || 0) - Number(invite.amount_paid || 0);
      description = `${invite.team_name || 'Team'} registration — ${invite.player_name || ''}`.trim();
      successUrl = `${base}/FinalRegistration?invite=${source_id}&paid=1`;
      cancelUrl = `${base}/FinalRegistration?invite=${source_id}`;
      guardianEmail = invite.guardian_email;
    } else {
      const evReg = await svc.entities.EventRegistration.get(source_id).catch(() => null);
      if (!evReg) return Response.json({ error: 'Event registration not found' }, { status: 404 });
      clubId = evReg.club_id;
      amount = Number(evReg.amount_due || 0) - Number(evReg.amount_paid || 0);
      description = evReg.event_name || 'Event Registration';
      successUrl = `${base}/EventSignup?event=${evReg.event_id}&paid=1`;
      cancelUrl = `${base}/EventSignup?event=${evReg.event_id}`;
      guardianEmail = evReg.guardian_email;
    }

    if (!clubId) return Response.json({ error: 'Club could not be resolved for this record.' }, { status: 400 });
    if (!(amount >= 0.5)) return Response.json({ error: 'Nothing due, or the amount is below the $0.50 minimum.' }, { status: 400 });

    const secretKey = await getStripeSecretKey(base44, clubId);
    if (!secretKey) return Response.json({ error: 'This club has not connected Stripe yet.' }, { status: 400 });

    // Apply promo code if provided.
    let discountAmount = 0;
    let promoId = null;
    let promoCodeValue = null;
    if (promo_code) {
      const promo = await validatePromoCode(base44, clubId, promo_code, source_type === 'tryout_final_registration' ? 'tryout_event' : source_type, amount);
      if (!promo.valid) return Response.json({ error: promo.error || 'Invalid promo code' }, { status: 400 });
      discountAmount = promo.discount_amount;
      promoId = promo.promo_id;
      promoCodeValue = promo.code;
    }
    const chargeAmount = Math.max(0, amount - discountAmount);
    if (chargeAmount < 0.5 && discountAmount > 0) {
      // Fully discounted — nothing to charge, but we still record a $0 "paid" so the buyer isn't stuck.
      await markSourcePaid(svc, source_type, source_id);
      return Response.json({ url: successUrl, fully_discounted: true });
    }

    const params = new URLSearchParams();
    params.append('mode', 'payment');
    params.append('success_url', successUrl);
    params.append('cancel_url', cancelUrl);
    params.append('line_items[0][price_data][currency]', 'usd');
    params.append('line_items[0][price_data][product_data][name]', description || 'Club Payment');
    params.append('line_items[0][price_data][unit_amount]', String(Math.round(chargeAmount * 100)));
    params.append('line_items[0][quantity]', '1');
    params.append('metadata[source_type]', source_type);
    params.append('metadata[source_id]', source_id);
    params.append('metadata[club_id]', clubId);
    if (promoId) {
      params.append('metadata[promo_id]', promoId);
      params.append('metadata[promo_code]', promoCodeValue);
      params.append('metadata[discount_amount]', String(discountAmount));
    }
    if (guardianEmail) params.append('customer_email', guardianEmail);

    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });
    const session = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error('create-club-checkout: stripe error', session);
      return Response.json({ error: session?.error?.message || 'Could not start checkout' }, { status: 502 });
    }

    // Increment promo usage now that a checkout session was created.
    if (promoId) await incrementPromoUsage(base44, promoId);

    return Response.json({ url: session.url });
  } catch (error) {
    console.error('create-club-checkout error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

async function markSourcePaid(svc, sourceType, sourceId) {
  if (sourceType === 'registration') {
    const reg = await svc.entities.Registration.get(sourceId).catch(() => null);
    if (reg) await svc.entities.Registration.update(sourceId, { amount_paid: reg.amount_due, payment_status: 'paid' });
  } else if (sourceType === 'tryout_final_registration') {
    const inv = await svc.entities.TryoutFinalRegistration.get(sourceId).catch(() => null);
    if (inv) await svc.entities.TryoutFinalRegistration.update(sourceId, { amount_paid: inv.amount_due, payment_status: 'paid', status: 'paid' });
  } else {
    const ev = await svc.entities.EventRegistration.get(sourceId).catch(() => null);
    if (ev) await svc.entities.EventRegistration.update(sourceId, { amount_paid: ev.amount_due, payment_status: 'paid' });
  }
}