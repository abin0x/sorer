export function isMigrationReviewer(user) {
  return user?.role === 'admin' || user?.is_super_admin === true ||
    ['system_owner', 'system_admin', 'system_support'].includes(user?.system_role);
}

/**
 * Returns true if the club has at least one Season record — meaning they've
 * started managing their club and migration requires manual system-owner approval.
 * Clubs without a season can migrate freely (auto-approved).
 */
export async function hasActiveSeason(svc, clubId: string): Promise<boolean> {
  if (!clubId) return false;
  try {
    const seasons = await svc.entities.Season.filter({ club_id: clubId }, '-created_date', 1);
    return (Array.isArray(seasons) ? seasons : seasons.items || []).length > 0;
  } catch {
    return false;
  }
}

export async function canManageMigrationClub(svc, user, clubId) {
  const roles = ['club_admin', 'club_director'];
  // A platform administrator acting in their club-admin role must still supply
  // the originating club explicitly. Never infer it from their home club.
  if (roles.includes(user.custom_role) && (user.club_id === clubId || isMigrationReviewer(user))) return true;
  const grants = await svc.entities.UserRoles.filter({ user_id: user.id, club_id: clubId, status: 'active' });
  return grants.some(grant => roles.includes(grant.role));
}