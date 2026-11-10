import { base44 } from "@/api/base44Client";
import { ROLES } from "@/lib/rbac";

export const CHANNEL_TYPES = {
  CLUB_ANNOUNCEMENTS: "club_announcements",
  SCHEDULING: "scheduling",
  TEAM_CHAT: "team_chat",
  PARENTS_CHAT: "parents_chat",
  SOCIAL_FEED: "social_feed",
};

export const CHANNEL_TYPE_LABELS = {
  [CHANNEL_TYPES.CLUB_ANNOUNCEMENTS]: "Announcements",
  [CHANNEL_TYPES.SCHEDULING]: "Scheduling",
  [CHANNEL_TYPES.TEAM_CHAT]: "Team Chat",
  [CHANNEL_TYPES.PARENTS_CHAT]: "Parents Chat",
  [CHANNEL_TYPES.SOCIAL_FEED]: "Social Feed",
};

const STAFF_ROLES = [
  ROLES.MASTER_ADMIN, ROLES.ADMIN, ROLES.CLUB_DIRECTOR, ROLES.CLUB_ADMIN,
  ROLES.BRANCH_DIRECTOR, ROLES.BRANCH_ADMIN,
];
const COACHING_ROLES = [...STAFF_ROLES, ROLES.COACH, ROLES.TEAM_MANAGER];

/** Roles allowed to post in a given channel type. */
export function canPostInChannel(user, channel) {
  const role = user?.custom_role || user?.role;
  if (STAFF_ROLES.includes(role)) return true;
  switch (channel?.type) {
    case CHANNEL_TYPES.CLUB_ANNOUNCEMENTS:
      // Club-wide announcements: staff only. Team-scoped announcements: that team's coaches/managers too.
      return channel?.scope === "team" && COACHING_ROLES.includes(role);
    case CHANNEL_TYPES.SCHEDULING:
      return COACHING_ROLES.includes(role);
    case CHANNEL_TYPES.TEAM_CHAT:
      return COACHING_ROLES.includes(role) || role === ROLES.PLAYER;
    case CHANNEL_TYPES.PARENTS_CHAT:
      return COACHING_ROLES.includes(role) || role === ROLES.PARENT_GUARDIAN;
    case CHANNEL_TYPES.SOCIAL_FEED:
      return true;
    default:
      return false;
  }
}

/** Only admin/coach/staff/team-manager roles may send a priority message. */
export function canSendPriority(user) {
  const role = user?.custom_role || user?.role;
  return COACHING_ROLES.includes(role);
}

/** Resolve the current user's team membership (coach, team manager, or guardian of a player). */
export function resolveMembership(user, { teams = [], coaches = [], guardians = [] } = {}) {
  const role = user?.custom_role || user?.role;
  if (STAFF_ROLES.includes(role)) {
    return { teamIds: teams.map((t) => t.id), allTeams: true };
  }
  if (role === ROLES.COACH) {
    const me = coaches.find((c) => c.email?.toLowerCase() === user.email?.toLowerCase());
    const myTeams = me ? teams.filter((t) => (t.coach_ids?.length ? t.coach_ids : [t.coach_id]).includes(me.id)) : [];
    return { teamIds: myTeams.map((t) => t.id), allTeams: false };
  }
  if (role === ROLES.TEAM_MANAGER) {
    const myTeams = teams.filter((t) => (t.team_manager_ids?.length ? t.team_manager_ids : [t.team_manager_id]).includes(user.id));
    return { teamIds: myTeams.map((t) => t.id), allTeams: false };
  }
  if (role === ROLES.PARENT_GUARDIAN) {
    const me = guardians.find((g) => g.email?.toLowerCase() === user.email?.toLowerCase());
    // Resolved further with players in callers that have that data; base case: no teams.
    return { teamIds: [], allTeams: false, guardianRecord: me };
  }
  return { teamIds: [], allTeams: false };
}

/** Which channels a user is allowed to read, given their resolved team membership. */
export function filterReadableChannels(user, channels, membership) {
  const role = user?.custom_role || user?.role;
  if (STAFF_ROLES.includes(role)) return channels;
  return channels.filter((ch) => {
    if (ch.scope === "club") {
      if (ch.type === CHANNEL_TYPES.PARENTS_CHAT) return role === ROLES.PARENT_GUARDIAN;
      return true;
    }
    if (!membership.teamIds.includes(ch.team_id)) return false;
    if (ch.type === CHANNEL_TYPES.PARENTS_CHAT) return role === ROLES.PARENT_GUARDIAN;
    if (ch.type === CHANNEL_TYPES.TEAM_CHAT) return role === ROLES.PLAYER || role === ROLES.PARENT_GUARDIAN;
    return true;
  });
}

/**
 * Idempotently create the five default channels for every team + the two
 * club-wide channels (Announcements, Social Feed). Safe to call repeatedly —
 * only creates what's missing.
 */
export async function ensureDefaultChannels(clubId, teams = []) {
  if (!clubId) return;
  const existing = await base44.entities.Channel.filter({ club_id: clubId });
  const existingKeys = new Set(existing.map((c) => `${c.type}_${c.team_id || "club"}`));
  const toCreate = [];

  if (!existingKeys.has(`${CHANNEL_TYPES.CLUB_ANNOUNCEMENTS}_club`)) {
    toCreate.push({ club_id: clubId, name: "Club Announcements", type: CHANNEL_TYPES.CLUB_ANNOUNCEMENTS, scope: "club", allow_replies: false });
  }
  if (!existingKeys.has(`${CHANNEL_TYPES.SOCIAL_FEED}_club`)) {
    toCreate.push({ club_id: clubId, name: "Club Social Feed", type: CHANNEL_TYPES.SOCIAL_FEED, scope: "club", allow_replies: true, moderation_mode: "post_review" });
  }

  teams.forEach((team) => {
    if (!existingKeys.has(`${CHANNEL_TYPES.SCHEDULING}_${team.id}`)) {
      toCreate.push({ club_id: clubId, team_id: team.id, team_name: team.name, name: `${team.name} — Scheduling`, type: CHANNEL_TYPES.SCHEDULING, scope: "team", allow_replies: true });
    }
    if (!existingKeys.has(`${CHANNEL_TYPES.TEAM_CHAT}_${team.id}`)) {
      toCreate.push({ club_id: clubId, team_id: team.id, team_name: team.name, name: `${team.name} — Team Chat`, type: CHANNEL_TYPES.TEAM_CHAT, scope: "team", allow_replies: true });
    }
    if (!existingKeys.has(`${CHANNEL_TYPES.PARENTS_CHAT}_${team.id}`)) {
      toCreate.push({ club_id: clubId, team_id: team.id, team_name: team.name, name: `${team.name} — Parents Chat`, type: CHANNEL_TYPES.PARENTS_CHAT, scope: "team", allow_replies: true });
    }
    if (!existingKeys.has(`${CHANNEL_TYPES.CLUB_ANNOUNCEMENTS}_${team.id}`)) {
      toCreate.push({ club_id: clubId, team_id: team.id, team_name: team.name, name: `${team.name} — Announcements`, type: CHANNEL_TYPES.CLUB_ANNOUNCEMENTS, scope: "team", allow_replies: false });
    }
    if (!existingKeys.has(`${CHANNEL_TYPES.SOCIAL_FEED}_${team.id}`)) {
      toCreate.push({ club_id: clubId, team_id: team.id, team_name: team.name, name: `${team.name} — Social Feed`, type: CHANNEL_TYPES.SOCIAL_FEED, scope: "team", allow_replies: true, moderation_mode: "post_review" });
    }
  });

  if (toCreate.length > 0) {
    await base44.entities.Channel.bulkCreate(toCreate);
  }
}

/** Resolve the audience emails for a channel (used for priority confirmation + notification fan-out). */
export function resolveChannelAudienceEmails(channel, { coaches = [], guardians = [], players = [] } = {}) {
  if (channel.scope === "club") {
    const allGuardianEmails = guardians.map((g) => g.email).filter(Boolean);
    const allCoachEmails = coaches.map((c) => c.email).filter(Boolean);
    if (channel.type === CHANNEL_TYPES.PARENTS_CHAT) return [...new Set(allGuardianEmails)];
    return [...new Set([...allGuardianEmails, ...allCoachEmails])];
  }
  const teamPlayers = players.filter((p) => p.team_id === channel.team_id);
  const guardianIds = new Set(teamPlayers.flatMap((p) => (p.guardian_ids?.length ? p.guardian_ids : [p.guardian_id]).filter(Boolean)));
  const guardianEmails = guardians.filter((g) => guardianIds.has(g.id)).map((g) => g.email).filter(Boolean);
  const coachEmails = coaches.filter((c) => c.team_id === channel.team_id || c.team_name === channel.team_name).map((c) => c.email).filter(Boolean);
  if (channel.type === CHANNEL_TYPES.PARENTS_CHAT) return [...new Set(guardianEmails)];
  return [...new Set([...guardianEmails, ...coachEmails])];
}