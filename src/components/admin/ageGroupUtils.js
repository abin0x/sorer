// Helper: determine a player's age group from their DOB using AgeGroup config
export function getPlayerAgeGroupFromDOB(dob, ageGroups, season) {
  if (!dob || !ageGroups?.length) return null;
  const date = new Date(dob);
  if (isNaN(date.getTime())) return null;
  const seasonGroups = ageGroups.filter((a) => a.season === season);
  const groups = seasonGroups.length > 0 ? seasonGroups : ageGroups;
  for (const ag of groups) {
    const startMonth = (ag.cutoff_month || 1) - 1;
    const startDay = ag.cutoff_day || 1;
    const rangeStart = new Date(ag.birth_year_start, startMonth, startDay);
    const rangeEnd = new Date(ag.birth_year_end, startMonth, startDay);
    rangeEnd.setDate(rangeEnd.getDate() - 1);
    rangeEnd.setHours(23, 59, 59, 999);
    if (date >= rangeStart && date <= rangeEnd) {
      return ag.age_group;
    }
  }
  return null;
}

// Helper: check if a player is "playing up" (on an older team than their age group)
export function isPlayingUp(player, team, ageGroups, season) {
  if (!player?.date_of_birth || !team?.age_group) return false;
  const playerAG = getPlayerAgeGroupFromDOB(player.date_of_birth, ageGroups, season);
  if (!playerAG) return false;
  const playerNum = parseInt(playerAG.replace(/[Uu]/, ""));
  const teamNum = parseInt(team.age_group.replace(/[Uu]/, ""));
  if (isNaN(playerNum) || isNaN(teamNum)) return false;
  return teamNum > playerNum;
}

// Helper: get age group number from label
export function getAgeGroupNumber(label) {
  if (!label) return null;
  const num = parseInt(label.replace(/[Uu]/, ""));
  return isNaN(num) ? null : num;
}