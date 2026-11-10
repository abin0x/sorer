import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { getStripeSecretKey } from '../../shared/clubCredentials.ts';

// Creates a Stripe Checkout Session in SETUP mode so a guardian can save a
// card for autopay. The saved payment method is attached to a Stripe Customer
// (created here if the registration doesn't already have one) and the webhook
// finalizes autopay on the source record when setup_intent.succeeded fires.
//
// Public endpoint — guardians on the final-registration portal may not be
// logged in, so this must not require auth.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole;

    const body = await req.json().catch(() => ({}));
    const { source_type, source_id } = body;
    if (!source_id || !['registration', 'tryout_final_registration'].includes(source_type)) {
      return Response.json({ error: 'source_type (registration|tryout_final_registration) and source_id are required' }, { status: 400 });
    }

    const appUrl = req.headers.get('X-Base44-App-Url') || 'https://clubrudder.com';
    if (!appUrl) return Response.json({ error: 'App URL not configured.' }, { status: 500 });
    const base = appUrl.replace(/\/$/, '');

    let clubId, guardianEmail, existingCustomerId, successUrl, cancelUrl;
    if (source_type === 'registration') {
      const reg = await svc.entities.Registration.get(source_id).catch(() => null);
      if (!reg) return Response.json({ error: 'Registration not found' }, { status: 404 });
      clubId = reg.club_id;
      existingCustomerId = reg.stripe_customer_id;
      successUrl = `${base}/FamilyAccount?autopay=1`;
      cancelUrl = `${base}/FamilyAccount`;
      if (reg.guardian_id) {
        const g = await svc.entities.Guardian.get(reg.guardian_id).catch(() => null);
        guardianEmail = g?.email;
      }
    } else {
      const invite = await svc.entities.TryoutFinalRegistration.get(source_id).catch(() => null);
      if (!invite) return Response.json({ error: 'Registration invite not found' }, { status: 404 });
      clubId = invite.club_id;
      guardianEmail = invite.guardian_email;
      existingCustomerId = invite.stripe_customer_id;
      successUrl = `${base}/FinalRegistration?invite=${source_id}&autopay=1`;
      cancelUrl = `${base}/FinalRegistration?invite=${source_id}`;
    }

    if (!clubId) return Response.json({ error: 'Club could not be resolved.' }, { status: 400 });
    const secretKey = await getStripeSecretKey(base44, clubId);
    if (!secretKey) return Response.json({ error: 'This club has not connected Stripe yet.' }, { status: 400 });

    // Reuse or create a Stripe Customer for this family.
    let customerId = existingCustomerId;
    if (!customerId) {
      const custParams = new URLSearchParams();
      if (guardianEmail) custParams.append('email', guardianEmail);
      const custRes = await fetch('https://api.stripe.com/v1/customers', {
        method: 'POST',
        headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: custParams.toString(),
      });
      const cust = await custRes.json().catch(() => ({}));
      if (!custRes.ok) return Response.json({ error: cust?.error?.message || 'Could not create customer' }, { status: 502 });
      customerId = cust.id;
      // Persist the customer id on the source so we reuse it next time.
      if (source_type === 'registration') {
        await svc.entities.Registration.update(source_id, { stripe_customer_id: customerId });
      } else {
        await svc.entities.TryoutFinalRegistration.update(source_id, { stripe_customer_id: customerId });
      }
    }

    const params = new URLSearchParams();
    params.append('mode', 'setup');
    params.append('customer', customerId);
    params.append('success_url', successUrl);
    params.append('cancel_url', cancelUrl);
    params.append('metadata[source_type]', source_type);
    params.append('metadata[source_id]', source_id);
    params.append('metadata[club_id]', clubId);

    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    const session = await res.json().catch(() => ({}));
    if (!res.ok) return Response.json({ error: session?.error?.message || 'Could not start setup' }, { status: 502 });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error('create-setup-intent error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}