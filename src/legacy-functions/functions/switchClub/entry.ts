// @ts-nocheck
import { createClientFromRequest } from '@/legacy-functions/_sdk';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const { club_id } = await req.json();
    if (!club_id) return Response.json({ error: 'Choose a club.' }, { status: 400 });
    const roles = await base44.asServiceRole.entities.UserRoles.filter({ user_id: user.id, club_id });
    const grants = roles.filter(r => ['active', 'pending'].includes(r.status));
    const grant = grants.find(r => r.role === user.custom_role && club_id === user.club_id) || grants.find(r => r.status === 'active') || grants[0];
    if (!grant && club_id !== user.club_id) return Response.json({ error: 'You do not belong to this club.' }, { status: 403 });
    const pendingOnboarding = grants.filter(r => r.status === 'pending').map(r => r.role);
    await base44.auth.updateMe({ club_id, custom_role: grant?.role || user.custom_role, onboarding_completed: true, role_onboarding_completed: !pendingOnboarding.length,
      ...(club_id !== user.club_id ? { branch_id: null, location_id: null, branch: null, title: null } : {}) });
    return Response.json({ success: true, pendingOnboarding });
  } catch (error) {
    console.error('switchClub:', error);
    return Response.json({ error: error.message || 'Unable to switch clubs.' }, { status: 500 });
  }
}