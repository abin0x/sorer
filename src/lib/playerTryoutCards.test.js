import { describe, it, expect } from 'bun:test';
import { playerTryoutCards, plansForTeamSeason, sameSeason } from './playerTryoutCards';
describe('player tryout access', () => {
  it('next-season edits cannot replace the current team season summary', () => {
    expect(sameSeason('2026-27', '2027-28')).toBe(false);
    expect(sameSeason('2026-27', '2026-2027')).toBe(true);
  });
  it('shows only the selected player and club registrations', () => {
    const rows = [{ id:'mine', player_id:'p1', club_id:'eclipse-select' }, { id:'other-player', player_id:'p2', club_id:'eclipse-select' }, { id:'other-club', player_id:'p1', club_id:'foreign' }];
    expect(playerTryoutCards(rows, [], [], 'p1', 'eclipse-select').map(r => r.id)).toEqual(['mine']);
  });
  it('never exposes staff placement advice or private notes on family cards', () => {
    const card = playerTryoutCards([{id:'r',player_id:'p1',club_id:'eclipse-select',notes:'move out',recommendation:'move_down'}],[],[],'p1','eclipse-select')[0];
    expect(card).not.toHaveProperty('notes');
    expect(card).not.toHaveProperty('recommendation');
  });
  it('ignores a foreign event even when its id matches', () => {
    const card = playerTryoutCards([{id:'r',player_id:'p1',club_id:'eclipse-select',tryout_event_id:'e'}],[{id:'e',club_id:'foreign',location:'Private location'}],[],'p1','eclipse-select')[0];
    expect(card.location).toBeUndefined();
  });
  it('keeps 2026–27 and 2027–28 team plans separate', () => {
    const plans = [{id:'current',club_id:'eclipse-select',team_id:'es-t1',season:'2026-27'},{id:'next',club_id:'eclipse-select',team_id:'es-t1',season:'2027-28'},{id:'foreign',club_id:'foreign',team_id:'es-t1',season:'2026-27'}];
    expect(plansForTeamSeason(plans,'eclipse-select','es-t1','2026-2027').map(p=>p.id)).toEqual(['current']);
    expect(plansForTeamSeason(plans,'eclipse-select','es-t1','2027-28').map(p=>p.id)).toEqual(['next']);
  });
});