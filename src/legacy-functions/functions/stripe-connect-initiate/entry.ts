// @ts-nocheck
import { createClientFromRequest } from '@/legacy-functions/_sdk';

// Creates (or reuses) a Stripe Express Connect account for the current user's club
// and returns an onboarding account-link URL. The account_id is saved to the Club
// immediately so we can track incomplete onboarding and create refresh links later.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!user.club_id) {
      return Response.json({ error: 'Your user is not associated with a club.' }, { status: 400 });
    }

    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      return Response.json({ error: 'Stripe not configured (STRIPE_SECRET_KEY).' }, { status: 500 });
    }

    const appUrl =
      req.headers.get('X-Base44-App-Url') ||
      process.env.WIX_CHECKOUT_APP_URL ||
      '';
    if (!appUrl) {
      return Response.json({ error: 'App URL not configured.' }, { status: 500 });
    }

    const club = await base44.asServiceRole.entities.Club.get(user.club_id);
    if (!club) return Response.json({ error: 'Club not found.' }, { status: 404 });

    let accountId = club.stripe_account_id;

    // Create a new Express account if the club doesn't have one yet
    if (!accountId) {
      const createRes = await fetch('https://api.stripe.com/v1/accounts', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${secretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          'type': 'express',
          'metadata[club_id]': user.club_id,
          'metadata[club_name]': club.name || '',
        }),
      });
      const account = await createRes.json().catch(() => ({}));
      if (!createRes.ok) {
        const msg = account?.error?.message || `Failed to create Stripe account (${createRes.status})`;
        console.error('stripe account create failed:', msg);
        return Response.json({ error: msg }, { status: 500 });
      }
      accountId = account.id;

      // Save the account_id to the club immediately
      await base44.asServiceRole.entities.Club.update(user.club_id, {
        stripe_account_id: accountId,
      });
    }

    // Create an onboarding account link
    const returnUrl = `${appUrl.replace(/\/$/, '')}/functions/stripe-connect-callback?account_id=${encodeURIComponent(accountId)}`;
    const linkRes = await fetch('https://api.stripe.com/v1/account_links', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        account: accountId,
        type: 'account_onboarding',
        return_url: returnUrl,
        refresh_url: returnUrl,
      }),
    });
    const link = await linkRes.json().catch(() => ({}));
    if (!linkRes.ok) {
      const msg = link?.error?.message || `Failed to create onboarding link (${linkRes.status})`;
      console.error('stripe account_links failed:', msg);
      return Response.json({ error: msg }, { status: 500 });
    }

    return Response.json({ url: link.url, accountId });
  } catch (error) {
    console.error('stripe-connect-initiate error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}