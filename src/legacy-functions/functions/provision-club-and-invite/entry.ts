// @ts-nocheck
import { createClientFromRequest } from '@/legacy-functions/_sdk';
import { createClubInvite } from '../../shared/clubInvite.ts';

// System-owner-only: "Invite club". Creates the tenant in Invited status and
// emails the club admin a magic link into their Setup Journey.

function isSystemOwner(user: any): boolean {
  return !!(user && (user.system_role === 'system_owner' || user.is_super_admin === true || user.role === 'admin'));
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || !isSystemOwner(user)) {
      return Response.json({ error: 'Only the system owner can invite clubs' }, { status: 403 });
    }

    const b = (await req.json()) || {};
    const result = await createClubInvite(base44, {
      origin: 'system_owner',
      inviter: user,
      club_name: b.club_name,
      slug: b.slug,
      admin_name: b.admin_name || b.director_name,
      admin_email: b.admin_email || b.director_email,
      plan_tier: b.plan_tier,
      max_branches: b.max_branches,
      enabled_modules: b.enabled_modules,
      specialist_name: b.specialist_name,
      source_system: b.source_system,
    });

    if (b.signupRequestId) {
      try {
        await base44.asServiceRole.entities.ClubSignupRequest.update(b.signupRequestId, {
          status: 'provisioned', provisioned_club_id: result.club.id, provisioned_date: new Date().toISOString(),
        });
      } catch (e) { console.error('Failed to mark signup request provisioned', e); }
    }

    return Response.json({ ok: true, club: result.club, invitationId: result.invitationId, emailSent: result.emailSent });
  } catch (error) {
    console.error('provision-club-and-invite error:', error);
    return Response.json({ error: error.message || 'Invite failed' }, { status: 500 });
  }
}