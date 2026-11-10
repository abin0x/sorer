export function playerTryoutCards(registrations, events, plans, playerId, clubId) {
  if (!clubId || !playerId) return [];
  return registrations.filter(r => r.club_id === clubId && r.player_id === playerId).map(r => {
    const event = events.find(e => e.id === r.tryout_event_id && e.club_id === clubId);
    const plan = plans.find(p => p.id === (event?.tryout_plan_id || r.tryout_plan_id) && p.club_id === clubId);
    // Only family-facing logistics are projected; staff advice/notes never leave this boundary.
    return { id: r.id, name: r.player_name, bib: r.bib_number, checkedIn: r.checked_in,
      title: plan?.title || 'Tryout registration', season: plan?.season || r.season_name,
      date: event?.date, start: event?.start_time, end: event?.end_time, location: event?.location };
  });
}

export function plansForTeamSeason(plans, clubId, teamId, season) {
  return plans.filter(p => p.club_id === clubId && p.team_id === teamId && !p.is_template && sameSeason(p.season, season));
}
export function sameSeason(a, b) {
  const normalize = value => String(value || '').replace(/(\d{4})[-/](?:20)?(\d{2})$/, '$1-$2');
  return !!a && !!b && normalize(a) === normalize(b);
}