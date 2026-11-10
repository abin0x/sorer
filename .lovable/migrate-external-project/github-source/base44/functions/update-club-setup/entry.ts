import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Club Setup Wizard steps 1 & 3 write to the Club record itself (branding,
// module flags), which normal club users cannot update directly under RLS.
// This function lets the club's own director/admin (or a system user) apply
// those changes, scoped strictly to their own club.

function canManage(user: any, clubId: string): boolean {
  if (!user) return false;
  if (user.system_role || user.is_super_admin === true || user.role === 'admin') return true;
  return user.club_id === clubId && ['club_director', 'club_admin'].includes(user.custom_role);
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { clubId, step, data } = body || {};
    if (!clubId || !canManage(user, clubId)) {
      return Response.json({ error: 'You do not have access to set up this club' }, { status: 403 });
    }

    const svc = base44.asServiceRole;
    const patch: Record<string, any> = {};

    if (step === 'identity') {
      const { name, app_name, logo_url, primary_color, secondary_color } = data || {};
      if (name !== undefined) patch.name = name;
      if (app_name !== undefined) patch.app_name = app_name;
      if (logo_url !== undefined) patch.logo_url = logo_url;
      if (primary_color !== undefined) patch.primary_color = primary_color;
      if (secondary_color !== undefined) patch.secondary_color = secondary_color;
    } else if (step === 'modules') {
      if (data?.enabled_modules) patch.enabled_modules = data.enabled_modules;
    } else {
      return Response.json({ error: 'Unknown step' }, { status: 400 });
    }

    const updated = await svc.entities.Club.update(clubId, patch);
    return Response.json({ ok: true, club: updated });
  } catch (error) {
    console.error('update-club-setup error:', error);
    return Response.json({ error: error.message || 'Update failed' }, { status: 500 });
  }
}