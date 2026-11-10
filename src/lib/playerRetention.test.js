import { describe, it, expect } from 'vitest';
import { RETENTION_STATUSES, PLACEMENT_RECOMMENDATIONS, TEAM_ROLES, mergeReviewOptions, requiresDirectorFollowUp, directorQueue, scopedPlayerReview } from './playerRetention.js';
describe('returning-player review rules', () => {
  it('always flags at-risk players', () => expect(requiresDirectorFollowUp('at_risk')).toBe(true));
  it('always flags leaving players', () => expect(requiresDirectorFollowUp('leaving')).toBe(true));
  it('does not flag returning players by default', () => expect(requiresDirectorFollowUp('returning')).toBe(false));
  it('preserves all four independent coach recommendations', () => expect(PLACEMENT_RECOMMENDATIONS.map((v) => v.key)).toEqual(['move_up','keep','move_down','move_out']));
  it('contains indispensable and the first three starter/squad tiers', () => expect(TEAM_ROLES.map((v) => v.key)).toEqual(['indispensable','first_team_starter','first_team_squad','second_team_starter','second_team_squad','third_team_starter','third_team_squad']));
  it('supports further admin-defined tiers', () => expect(mergeReviewOptions(TEAM_ROLES, [{ key:'fourth_team_starter', label:'Fourth team starter' }]).at(-1).key).toBe('fourth_team_starter'));
  it('cannot disable mandatory risk flags by renaming', () => expect(mergeReviewOptions(RETENTION_STATUSES,[{ key:'at_risk', label:'Uncertain', requires_follow_up:false }]).find((v) => v.key==='at_risk').requires_follow_up).toBe(true));
  it('supports additional flagged statuses', () => expect(requiresDirectorFollowUp('undecided', [{ key:'undecided', requires_follow_up:true }])).toBe(true));
  it('keeps director queue within the selected club and season', () => {
    const base={needs_follow_up:true,follow_up_status:'open',intent:'at_risk'};
    expect(directorQueue([{...base,club_id:'a',season:'2027',player_id:'one'},{...base,club_id:'b',season:'2027',player_id:'two'},{...base,club_id:'a',season:'2026',player_id:'three'}],'a','2027').map((r)=>r.player_id)).toEqual(['one']);
  });
  it('excludes resolved cases without removing their risk record', () => expect(directorQueue([{club_id:'a',season:'2027',needs_follow_up:true,follow_up_status:'resolved'}],'a','2027')).toEqual([]));
  it('does not resolve a same-player review from another club', () => expect(scopedPlayerReview([{club_id:'b',season:'2027',player_id:'p'}],'a','2027','p')).toBeUndefined());
});
import { latestRetentionByPlayer } from './playerRetention';
describe('latestRetentionByPlayer', () => {
  it('keeps the newest season per player and drops other clubs', () => {
    const map = latestRetentionByPlayer(
      [{ club_id: 'a', player_id: 'p', season: '2025-26', intent: 'returning' }, { club_id: 'a', player_id: 'p', season: '2026-27', intent: 'at_risk' }, { club_id: 'b', player_id: 'q', season: '2026-27' }],
      [{ club_id: 'a', player_id: 'p', season: '2026-27', recommendation: 'keep' }, { club_id: 'a', player_id: 'p', season: '2025-26', recommendation: 'move_up' }],
      'a');
    expect(map.p.review.intent).toBe('at_risk');
    expect(map.p.coaches.map((c) => c.recommendation)).toEqual(['keep']);
    expect(map.q).toBeUndefined();
  });
});
