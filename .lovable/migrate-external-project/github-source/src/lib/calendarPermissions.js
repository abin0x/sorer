import { ROLES } from "@/lib/rbac";

// Roles that can manage calendar events for every team club-wide.
const CLUB_WIDE_ROLES = [ROLES.MASTER_ADMIN, ROLES.ADMIN, ROLES.CLUB_DIRECTOR, ROLES.CLUB_ADMIN];

// Roles scoped to a subset of teams (branch, platform, team, or family).
const SCOPED_STAFF_ROLES = [ROLES.BRANCH_DIRECTOR, ROLES.BRANCH_ADMIN, ROLES.PLATFORM_DIRECTOR, ROLES.COACH, ROLES.TEAM_MANAGER];

/**
 * Teams a given user is allowed to add/edit/delete calendar events for.
 */
export function getManageableTeams(user, teams = [], coaches = []) {
  if (!user) return [];
  const role = user.custom_role;

  if (CLUB_WIDE_ROLES.includes(role)) return teams;

  if (role === ROLES.BRANCH_DIRECTOR || role === ROLES.BRANCH_ADMIN) {
    const userBranch = user.location_id || user.branch_id;
    return userBranch ? teams.filter((t) => t.location_id === userBranch) : [];
  }

  if (role === ROLES.PLATFORM_DIRECTOR) {
    const userPlatform = user.platform_id;
    return userPlatform ? teams.filter((t) => t.platform_id === userPlatform) : [];
  }

  if (role === ROLES.TEAM_MANAGER) {
    return teams.filter((t) => (t.team_manager_ids?.length ? t.team_manager_ids : [t.team_manager_id]).includes(user.id));
  }

  if (role === ROLES.COACH) {
    return teams.filter((t) => {
      const ids = t.coach_ids?.length ? t.coach_ids : [t.coach_id];
      const coach = coaches.find((c) => ids.includes(c.id));
      return coach && coach.email === user.email;
    });
  }

  return [];
}

/**
 * Teams whose calendar events a user is allowed to SEE.
 * - Club-wide roles: every team
 * - Branch Director / Branch Admin: teams in their branch
 * - Platform Director: teams in their platform
 * - Coach: teams they coach
 * - Team Manager: teams they manage
 * - Parent: teams their children are assigned to
 * - Player: their own team
 */
export function getVisibleTeams(user, teams = [], coaches = [], guardians = [], players = []) {
  if (!user) return [];
  const role = user.custom_role;

  if (CLUB_WIDE_ROLES.includes(role)) return teams;

  if (role === ROLES.BRANCH_DIRECTOR || role === ROLES.BRANCH_ADMIN) {
    const userBranch = user.location_id || user.branch_id;
    return userBranch ? teams.filter((t) => t.location_id === userBranch) : [];
  }

  if (role === ROLES.PLATFORM_DIRECTOR) {
    const userPlatform = user.platform_id;
    return userPlatform ? teams.filter((t) => t.platform_id === userPlatform) : [];
  }

  if (role === ROLES.TEAM_MANAGER) {
    return teams.filter((t) => (t.team_manager_ids?.length ? t.team_manager_ids : [t.team_manager_id]).includes(user.id));
  }

  if (role === ROLES.COACH) {
    return teams.filter((t) => {
      const ids = t.coach_ids?.length ? t.coach_ids : [t.coach_id];
      const coach = coaches.find((c) => ids.includes(c.id));
      return coach && coach.email === user.email;
    });
  }

  if (role === ROLES.PARENT_GUARDIAN) {
    const me = guardians.find((g) => g.email?.toLowerCase() === user.email?.toLowerCase());
    if (!me) return [];
    const myChildren = players.filter((p) => (p.guardian_ids?.length ? p.guardian_ids : [p.guardian_id]).includes(me.id));
    const teamIds = [...new Set(myChildren.map((c) => c.team_id).filter(Boolean))];
    return teams.filter((t) => teamIds.includes(t.id));
  }

  if (role === ROLES.PLAYER) {
    return teams.filter((t) => t.id === user.team_id);
  }

  return [];
}

export function canCreateEvents(user, teams = [], coaches = []) {
  if (!user) return false;
  if (CLUB_WIDE_ROLES.includes(user.custom_role)) return true;
  if (SCOPED_STAFF_ROLES.includes(user.custom_role)) {
    return getManageableTeams(user, teams, coaches).length > 0;
  }
  return false;
}

export function canManageEvent(user, event, teams = [], coaches = []) {
  if (!user || !event) return false;
  if (CLUB_WIDE_ROLES.includes(user.custom_role)) return true;
  const manageableIds = new Set(getManageableTeams(user, teams, coaches).map((t) => t.id));
  return (event.team_ids || []).some((id) => manageableIds.has(id));
}

export function isClubWideCalendarRole(user) {
  return user && CLUB_WIDE_ROLES.includes(user.custom_role);
}