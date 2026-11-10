import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

/**
 * Returns every club the current user has an active role in, plus the
 * role they hold in each. Uses asServiceRole so UserRoles records in
 * other clubs (outside the user's current club_id RLS scope) are visible.
 *
 * Response: { clubs: [{ club_id, club_name, slug, primary_color, logo_url, role, role_label }] }
 */
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    // Fetch all UserRoles for this user (service role bypasses club-scoped RLS)
    const roles = await base44.asServiceRole.entities.UserRoles.filter({ user_id: user.id });

    // Group by club_id, pick the first active role per club
    const byClub = new Map();
    for (const r of roles) {
      if (!r.club_id || !['active', 'pending'].includes(r.status)) continue;
      const existing = byClub.get(r.club_id);
      if (!existing || (existing.status !== 'active' && r.status === 'active')) {
        byClub.set(r.club_id, { role: r.role, role_label: r.role_label, status: r.status });
      }
    }

    // Always include the user's current club_id even if no UserRoles record exists
    if (user.club_id && !byClub.has(user.club_id)) {
      byClub.set(user.club_id, { role: user.custom_role || 'user', role_label: null, status: 'active' });
    }

    // Resolve club identity through verified membership, not a potentially stale
    // user-scoped Club lookup immediately after invitation acceptance.
    if (body.club_id || body.slug) {
      const systemUser = !!(user.role === 'admin' || user.system_role || user.is_super_admin);
      const query = body.club_id ? { id: String(body.club_id) } : { slug: String(body.slug) };
      if (!systemUser) query.id = { $in: [...byClub.keys()] };
      const rows = await base44.asServiceRole.entities.Club.filter(query);
      const selected = rows.find(c => !body.club_id || c.id === String(body.club_id));
      if (!selected) {
        // System users can access the platform even if their personal club_id
        // is stale (e.g. their club was deleted). Return a null club so the
        // TenantContext doesn't block them — they can still use the system
        // console and select a tenant to view.
        if (systemUser) return Response.json({ club: null });
        return Response.json({ error: 'Your club could not be found or you no longer have access. Ask your club administrator to check your invitation.' }, { status: 404 });
      }
      const { id, name, app_name, slug, logo_url, primary_color, secondary_color, enabled_modules, is_demo, is_active, club_type } = selected;
      return Response.json({ club: { id, name, app_name, slug, logo_url, primary_color, secondary_color, enabled_modules, is_demo, is_active, club_type } });
    }
    const clubIds = [...byClub.keys()];
    if (clubIds.length === 0) return Response.json({ clubs: [] });

    // Batch-fetch all club records
    const clubs = await base44.asServiceRole.entities.Club.filter({ id: { $in: clubIds } });
    const clubMap = new Map(clubs.map((c) => [c.id, c]));

    const result = clubIds.map((cid) => {
      const club = clubMap.get(cid);
      const roleInfo = byClub.get(cid);
      return {
        club_id: cid,
        club_name: club?.name || club?.app_name || 'Unknown Club',
        slug: club?.slug || '',
        primary_color: club?.primary_color || '#4f47e6',
        logo_url: club?.logo_url || '',
        role: roleInfo.role,
        role_label: roleInfo.role_label,
        is_current: cid === user.club_id,
        pendingOnboarding: roles.filter(r => r.club_id === cid && r.status === 'pending').map(r => r.role),
      };
    });

    // Current club first, then alphabetical
    result.sort((a, b) => (a.is_current ? -1 : b.is_current ? 1 : a.club_name.localeCompare(b.club_name)));

    return Response.json({ clubs: result });
  } catch (error) {
    console.error('get-user-clubs error:', error);
    return Response.json({ error: error.message || 'Failed to fetch user clubs' }, { status: 500 });
  }
}