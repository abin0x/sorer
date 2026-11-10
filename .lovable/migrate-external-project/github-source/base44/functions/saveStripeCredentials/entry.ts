import { createClientFromRequest } from 'npm:@base44/sdk@0.8.48';
import { logAudit } from '../../shared/auditLog.ts';

const ADMIN_ROLES = ['master_admin', 'admin', 'club_director', 'club_admin'];

// Saves the club's own Stripe Secret Key, validates it by fetching the account,
// and stores it in ClubCredential (admin-only). Also stamps stripe_account_id
// and quickbooks_connected-style flags on the Club for display.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!user.club_id) return Response.json({ error: 'Your user is not associated with a club.' }, { status: 400 });
    if (user.role !== 'admin' && !ADMIN_ROLES.includes(user.custom_role)) {
      return Response.json({ error: 'Forbidden — admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { secretKey, publishableKey, webhookSecret } = body;
    if (!secretKey || !secretKey.startsWith('sk_')) {
      return Response.json({ error: 'A valid Stripe Secret Key (starting with sk_) is required.' }, { status: 400 });
    }

    // Validate the key by fetching the account
    const acctRes = await fetch('https://api.stripe.com/v1/account', {
      headers: { Authorization: `Bearer ${secretKey}` },
    });
    const acct = await acctRes.json().catch(() => ({}));
    if (!acctRes.ok) {
      const msg = acct?.error?.message || `Stripe rejected this key (${acctRes.status}).`;
      return Response.json({ error: msg }, { status: 400 });
    }

    // Upsert ClubCredential
    const existing = await base44.asServiceRole.entities.ClubCredential.filter({ club_id: user.club_id });
    const cred = existing?.[0];
    const credData = {
      club_id: user.club_id,
      stripe_secret_key: secretKey,
      stripe_publishable_key: publishableKey || cred?.stripe_publishable_key || null,
      stripe_webhook_secret: webhookSecret || cred?.stripe_webhook_secret || null,
    };
    if (cred) {
      await base44.asServiceRole.entities.ClubCredential.update(cred.id, credData);
    } else {
      await base44.asServiceRole.entities.ClubCredential.create(credData);
    }

    // Stamp account info on Club for display
    await base44.asServiceRole.entities.Club.update(user.club_id, {
      stripe_account_id: acct.id,
    });

    await logAudit(base44, {
      club_id: user.club_id,
      user,
      action: 'stripe_connected',
      entity_type: 'Club',
      entity_id: user.club_id,
      metadata: { account_id: acct.id, email: acct.email || '' },
    });

    return Response.json({
      success: true,
      account_id: acct.id,
      email: acct.email || null,
      business_name: acct.business_profile?.name || null,
      charges_enabled: !!acct.charges_enabled,
      details_submitted: !!acct.details_submitted,
      payouts_enabled: !!acct.payouts_enabled,
    });
  } catch (error) {
    console.error('saveStripeCredentials error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}