import { createClientFromRequest } from 'npm:@base44/sdk@0.8.48';
import { getStripeSecretKey } from '../../shared/clubCredentials.ts';

// Returns the current club's Stripe account status (email, charges_enabled, etc.)
// for display on the Connections page. Returns { connected: false } if no key is stored.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || !user.club_id) {
      return Response.json({ connected: false });
    }

    const secretKey = await getStripeSecretKey(base44, user.club_id);
    if (!secretKey) {
      return Response.json({ connected: false });
    }

    const acctRes = await fetch('https://api.stripe.com/v1/account', {
      headers: { Authorization: `Bearer ${secretKey}` },
    });
    const acct = await acctRes.json().catch(() => ({}));
    if (!acctRes.ok) {
      console.error('stripe account fetch failed:', acct?.error?.message);
      return Response.json({ connected: true, account_id: acct?.id || null, error: acct?.error?.message });
    }

    return Response.json({
      connected: true,
      account_id: acct.id,
      email: acct.email || null,
      business_name: acct.business_profile?.name || null,
      charges_enabled: !!acct.charges_enabled,
      details_submitted: !!acct.details_submitted,
      payouts_enabled: !!acct.payouts_enabled,
    });
  } catch (error) {
    console.error('stripe-account-status error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}