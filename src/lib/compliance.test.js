import { describe, it, expect } from 'bun:test';
import { coachStatus } from './compliance';

const email = 'coach@example.com';
const records = (background, safesport) => ({
  [email]: {
    background_check: { status: background },
    safesport_certification: { status: safesport },
  },
});

describe('coach compliance status', () => {
  it('handles loading, failed or absent compliance data without crashing', () => {
    for (const lookup of [undefined, null, {}]) {
      expect(coachStatus([email], lookup)).toBe('incomplete');
    }
  });
  it('returns unassigned when there are no coaches', () => {
    expect(coachStatus([], undefined)).toBe('unassigned');
    expect(coachStatus(undefined, undefined)).toBe('unassigned');
  });
  it('reads actual requirement keys and normalizes email case', () => {
    expect(coachStatus(['COACH@EXAMPLE.COM'], records('approved', 'approved'))).toBe('compliant');
    expect(coachStatus([email], records('approved', 'expiring_soon'))).toBe('compliant');
  });
  it('keeps pending records pending', () => {
    expect(coachStatus([email], records('approved', 'pending'))).toBe('pending');
  });
  it('flags action-required records even when another coach has no records', () => {
    expect(coachStatus(['missing@example.com', email], records('flagged', 'approved'))).toBe('flagged');
  });
  it('requires both requirements and rejects expired or unknown status', () => {
    expect(coachStatus([email], { [email]: { background_check: { status: 'approved' } } })).toBe('incomplete');
    expect(coachStatus([email], records('expired', 'pending'))).toBe('incomplete');
    expect(coachStatus([email], records('unknown', 'approved'))).toBe('incomplete');
  });
});