// Pure rules for who may add, edit or remove Beacon channels. Shared by the
// browser (to show the controls) and the server action (to enforce them).
export const CHANNEL_ADMIN_ROLES = ["master_admin", "admin", "club_director", "club_admin", "branch_director", "branch_admin"];

/** Kinds a person can pick for a new channel, mapped to existing channel types. */
export const CHANNEL_KINDS = [
  { type: "team_chat", label: "Group chat", hint: "Players, families and coaches can talk", allow_replies: true },
  { type: "parents_chat", label: "Parents only", hint: "Families and coaches", allow_replies: true },
  { type: "club_announcements", label: "Announcements", hint: "Only staff can post", allow_replies: false },
  { type: "scheduling", label: "Scheduling", hint: "Coaches post times, families reply", allow_replies: true },
];

export function managedTeamIds(user, teams = []) {
  const role = user?.custom_role || user?.role;
  if (role !== "team_manager") return [];
  return teams
    .filter((t) => (t.team_manager_ids?.length ? t.team_manager_ids : [t.team_manager_id].filter(Boolean)).includes(user.id))
    .map((t) => t.id);
}

/** Can this person manage channels for the given scope (teamId null = club-wide)? */
export function canManageChannels(user, teamId, teams = []) {
  const role = user?.custom_role || user?.role;
  if (CHANNEL_ADMIN_ROLES.includes(role)) return true;
  if (!teamId) return false;
  return managedTeamIds(user, teams).includes(teamId);
}

/** Built-in channels are recreated automatically, so only custom ones can be removed. */
export function isCustomChannel(channel) {
  return !!channel?.created_by;
}
