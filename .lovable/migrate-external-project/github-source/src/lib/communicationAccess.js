import { ROLES } from "@/lib/rbac";

const CLUB_WIDE = [ROLES.MASTER_ADMIN, ROLES.ADMIN, ROLES.CLUB_DIRECTOR, ROLES.CLUB_ADMIN];

/**
 * Returns the communication scope for a user — what they can compose and to whom.
 * @param {Object} user - current user
 * @param {Object} data - { teams, coaches, guardians, players, locations, platforms }
 */
export function getCommunicationScope(user, data = {}) {
  const {
    teams = [],
    coaches = [],
    guardians = [],
    players = [],
    locations = [],
    platforms = [],
  } = data;

  if (!user) return { canCompose: false, mode: "none" };
  const role = user.custom_role || user.role;

  // Player: receive-only (limited send rights can be granted later)
  if (role === ROLES.PLAYER) {
    return { canCompose: false, mode: "receive_only", scopeLabel: "Receive-only" };
  }

  // Club-wide: full access to every branch, team, and role
  if (CLUB_WIDE.includes(role)) {
    return {
      canCompose: true,
      mode: "full",
      branchFilter: { locked: false, options: locations.map((l) => ({ value: l.name, label: l.name })) },
      teamFilter: { locked: false, options: teams.map((t) => ({ value: t.id, label: t.name })) },
      roleOptions: [
        { value: "coach", label: "Coaches" },
        { value: "parent", label: "Parents/Guardians" },
      ],
      scopeLabel: "All branches (club-wide)",
    };
  }

  // Branch Director / Branch Admin: their branch only
  if (role === ROLES.BRANCH_DIRECTOR || role === ROLES.BRANCH_ADMIN) {
    const userBranchId = user.location_id || user.branch_id;
    const branch = locations.find((l) => l.id === userBranchId);
    const branchName = branch?.name;
    const branchTeams = branchName
      ? teams.filter((t) => t.location_name === branchName || t.location_id === userBranchId)
      : [];
    return {
      canCompose: true,
      mode: "branch",
      branchFilter: { locked: true, options: branch ? [{ value: branch.name, label: branch.name }] : [], value: branchName },
      teamFilter: { locked: false, options: branchTeams.map((t) => ({ value: t.id, label: t.name })) },
      roleOptions: [
        { value: "coach", label: "Coaches" },
        { value: "parent", label: "Parents/Guardians" },
      ],
      scopeLabel: `Branch: ${branchName || "—"}`,
      canRemoveDirectors: role === ROLES.BRANCH_DIRECTOR,
    };
  }

  // Platform Director: their platform only
  if (role === ROLES.PLATFORM_DIRECTOR) {
    const userPlatformId = user.platform_id;
    const platform = platforms.find((p) => p.id === userPlatformId);
    const platformTeams = userPlatformId ? teams.filter((t) => t.platform_id === userPlatformId) : [];
    return {
      canCompose: true,
      mode: "platform",
      platformFilter: { locked: true, value: platform?.name },
      teamFilter: { locked: false, options: platformTeams.map((t) => ({ value: t.id, label: t.name })) },
      roleOptions: [
        { value: "coach", label: "Coaches" },
        { value: "parent", label: "Parents/Guardians" },
      ],
      scopeLabel: `Platform: ${platform?.name || "—"}`,
    };
  }

  // Coach / Team Manager: their teams only — parents/players of those teams
  if (role === ROLES.COACH || role === ROLES.TEAM_MANAGER) {
    let myTeams = [];
    if (role === ROLES.COACH) {
      const myCoach = coaches.find((c) => c.email?.toLowerCase() === user.email?.toLowerCase());
      myTeams = myCoach
        ? teams.filter((t) => (t.coach_ids?.length ? t.coach_ids : [t.coach_id]).includes(myCoach.id))
        : [];
    } else {
      myTeams = teams.filter((t) =>
        (t.team_manager_ids?.length ? t.team_manager_ids : [t.team_manager_id]).includes(user.id)
      );
    }
    return {
      canCompose: true,
      mode: "team",
      teamFilter: {
        locked: true,
        options: myTeams.map((t) => ({ value: t.id, label: t.name })),
        value: myTeams.map((t) => t.id),
      },
      roleOptions: [{ value: "parent", label: "Parents/Guardians" }],
      scopeLabel: `${myTeams.length} team${myTeams.length !== 1 ? "s" : ""} (parents & players)`,
    };
  }

  // Parent: message their children's coaches or branch admins only
  if (role === ROLES.PARENT_GUARDIAN) {
    const me = guardians.find((g) => g.email?.toLowerCase() === user.email?.toLowerCase());
    const myChildren = me
      ? players.filter((p) => (p.guardian_ids?.length ? p.guardian_ids : [p.guardian_id]).includes(me.id))
      : [];
    const childTeamIds = [...new Set(myChildren.map((c) => c.team_id).filter(Boolean))];
    const childTeams = teams.filter((t) => childTeamIds.includes(t.id));
    const childCoachIds = [
      ...new Set(childTeams.flatMap((t) => (t.coach_ids?.length ? t.coach_ids : [t.coach_id]).filter(Boolean))),
    ];
    const childCoaches = coaches.filter((c) => childCoachIds.includes(c.id));
    return {
      canCompose: true,
      mode: "parent_direct",
      recipientPool: childCoaches.map((c) => ({
        key: `coach_${c.id}`,
        type: "coach",
        name: `${c.first_name} ${c.last_name}`,
        email: c.email,
        phone: c.phone,
        teams: childTeams
          .filter((t) => (t.coach_ids?.length ? t.coach_ids : [t.coach_id]).includes(c.id))
          .map((t) => t.name),
      })),
      scopeLabel: "Your children's coaches",
    };
  }

  return { canCompose: false, mode: "none" };
}