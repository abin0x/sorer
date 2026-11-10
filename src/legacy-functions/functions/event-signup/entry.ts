// @ts-nocheck
import { createClientFromRequest } from '@/legacy-functions/_sdk';
import { getStripeSecretKey } from '../../shared/clubCredentials.ts';
import { validatePromoCode, incrementPromoUsage } from '../../shared/promoCodes.ts';

// Public: registers a participant for a ClubEvent. Enforces capacity (sends
// overflow to the waitlist when allow_waitlist is on), applies a promo code,
// and — for paid events — creates a Stripe Checkout Session on the club's own
// Stripe account. Returns { status, registration_id, checkout_url? }.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole;

    const body = await req.json().catch(() => ({}));
    const { event_id, player_name, guardian_name, guardian_email, phone, promo_code } = body;
    if (!event_id || !player_name || !guardian_email) {
      return Response.json({ error: 'event_id, player_name, and guardian_email are required' }, { status: 400 });
    }

    const event = await svc.entities.ClubEvent.get(event_id).catch(() => null);
    if (!event) return Response.json({ error: 'Event not found' }, { status: 404 });
    if (event.status !== 'open' && event.status !== 'full') {
      return Response.json({ error: 'This event is not open for registration.' }, { status: 400 });
    }

    const today = new Date().toISOString().split('T')[0];
    if (event.registration_closes && today > event.registration_closes) {
      return Response.json({ error: 'Registration for this event has closed.' }, { status: 400 });
    }

    // Capacity check.
    const isFull = event.capacity > 0 && (event.registered_count || 0) >= event.capacity;
    let status = 'registered';
    if (isFull) {
      if (!event.allow_waitlist) return Response.json({ error: 'This event is full and not accepting a waitlist.' }, { status: 400 });
      status = 'waitlist';
    }

    // Promo code validation.
    let discountAmount = 0;
    let promoId = null;
    let promoCodeValue = null;
    if (promo_code) {
      const promo = await validatePromoCode(base44, event.club_id, promo_code, 'club_event', Number(event.price || 0));
      if (!promo.valid) return Response.json({ error: promo.error || 'Invalid promo code' }, { status: 400 });
      discountAmount = promo.discount_amount;
      promoId = promo.promo_id;
      promoCodeValue = promo.code;
    }
    const amountDue = Math.max(0, Number(event.price || 0) - discountAmount);

    // Create the registration record.
    const reg = await svc.entities.EventRegistration.create({
      club_id: event.club_id,
      event_id: event.id,
      event_name: event.name,
      player_name,
      guardian_name: guardian_name || '',
      guardian_email,
      phone: phone || '',
      status,
      amount_due: amountDue,
      amount_paid: 0,
      payment_status: amountDue <= 0 ? 'free' : 'unpaid',
      promo_code: promoCodeValue,
      discount_amount: discountAmount,
      registered_date: today,
    });

    // Update event counts.
    if (status === 'registered') {
      const newCount = (event.registered_count || 0) + 1;
      const newStatus = event.capacity > 0 && newCount >= event.capacity ? 'full' : 'open';
      await svc.entities.ClubEvent.update(event.id, { registered_count: newCount, status: newStatus });
    } else {
      await svc.entities.ClubEvent.update(event.id, { waitlist_count: (event.waitlist_count || 0) + 1 });
    }

    // Free or fully-discounted event — no checkout needed.
    if (amountDue < 0.5) {
      await svc.entities.EventRegistration.update(reg.id, { amount_paid: amountDue, payment_status: 'paid' });
      if (promoId) await incrementPromoUsage(base44, promoId);
      return Response.json({ status: 'registered', registration_id: reg.id, checkout_url: null });
    }

    // Paid event — create a Stripe Checkout Session.
    const secretKey = await getStripeSecretKey(base44, event.club_id);
    if (!secretKey) {
      // No Stripe connected — keep the registration but tell the caller payment is pending.
      return Response.json({ status, registration_id: reg.id, checkout_url: null, error: 'Online payment not available — the club will follow up.' });
    }

    const appUrl = req.headers.get('X-Base44-App-Url') || 'https://clubrudder.com';
    const base = appUrl.replace(/\/$/, '');
    const params = new URLSearchParams();
    params.append('mode', 'payment');
    params.append('success_url', `${base}/EventSignup?event=${event.id}&paid=1`);
    params.append('cancel_url', `${base}/EventSignup?event=${event.id}`);
    params.append('line_items[0][price_data][currency]', 'usd');
    params.append('line_items[0][price_data][product_data][name]', event.name);
    params.append('line_items[0][price_data][unit_amount]', String(Math.round(amountDue * 100)));
    params.append('line_items[0][quantity]', '1');
    params.append('metadata[source_type]', 'club_event');
    params.append('metadata[source_id]', reg.id);
    params.append('metadata[club_id]', event.club_id);
    if (promoId) {
      params.append('metadata[promo_id]', promoId);
      params.append('metadata[promo_code]', promoCodeValue);
      params.append('metadata[discount_amount]', String(discountAmount));
    }
    if (guardian_email) params.append('customer_email', guardian_email);

    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    const session = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error('event-signup: stripe error', session);
      return Response.json({ status, registration_id: reg.id, checkout_url: null, error: session?.error?.message || 'Could not start checkout' });
    }
    await svc.entities.EventRegistration.update(reg.id, { stripe_checkout_session_id: session.id });
    if (promoId) await incrementPromoUsage(base44, promoId);

    return Response.json({ status: 'registered', registration_id: reg.id, checkout_url: session.url });
  } catch (error) {
    console.error('event-signup error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}