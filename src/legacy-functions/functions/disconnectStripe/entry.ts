// @ts-nocheck
import { createClientFromRequest } from '@/legacy-functions/_sdk';
import { logAudit } from '../../shared/auditLog.ts';

const ADMIN_ROLES = ['master_admin', 'admin', 'club_director', 'club_admin'];

// Clears the club's stored Stripe credentials from ClubCredential and removes
// the stripe_account_id reference from the Club entity.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!user.club_id) return Response.json({ error: 'Your user is not associated with a club.' }, { status: 400 });
    if (user.role !== 'admin' && !ADMIN_ROLES.includes(user.custom_role)) {
      return Response.json({ error: 'Forbidden — admin access required' }, { status: 403 });
    }

    // Clear stripe fields from ClubCredential
    const existing = await base44.asServiceRole.entities.ClubCredential.filter({ club_id: user.club_id });
    if (existing?.[0]) {
      await base44.asServiceRole.entities.ClubCredential.update(existing[0].id, {
        stripe_secret_key: null,
        stripe_publishable_key: null,
      });
    }

    await base44.asServiceRole.entities.Club.update(user.club_id, {
      stripe_account_id: null,
    });

    await logAudit(base44, {
      club_id: user.club_id,
      user,
      action: 'stripe_disconnected',
      entity_type: 'Club',
      entity_id: user.club_id,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('disconnectStripe error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}