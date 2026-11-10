import { describe, it, expect } from 'vitest';
import { duesSchema, priceDues, requireSameClub } from './teamDues';

const config = { dues: { base_dues: 1600, included_services: ['Coaching', 'Field rental'], team_fees: [
  { id: 'league', name: 'League fees', amount: 200, required: true },
  { id: 'camp', name: 'Optional camp', amount: 125.25, required: false },
] } };
describe('club-specific itemized dues', () => {
  it('always includes base club dues and required team fees', () => expect(priceDues(config).total).toBe(1800));
  it('only charges optional team fees the family selects', () => expect(priceDues(config, ['camp']).total).toBe(1925.25));
  it('rejects fee IDs from another plan', () => expect(() => priceDues(config, ['another-club-fee'])).toThrow());
  it('rejects duplicate fee choices', () => expect(() => priceDues(config, ['camp', 'camp'])).toThrow());
  it('preserves the description of included services', () => expect(priceDues(config).included_services).toEqual(['Coaching', 'Field rental']));
  it('does not accept negative dues', () => expect(duesSchema.safeParse({ base_dues: -1 }).success).toBe(false));
  it('does not accept fractional cents', () => expect(duesSchema.safeParse({ base_dues: 0.001 }).success).toBe(false));
  it('rejects cross-club plan edits and linked records', () => expect(() => requireSameClub({ club_id: 'club-b' }, 'club-a', 'Team')).toThrow());
  it('supports existing flat dues plans', () => expect(priceDues({ amount: 1850 }).total).toBe(1850));
});