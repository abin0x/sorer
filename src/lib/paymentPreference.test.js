import { describe, it, expect } from 'vitest';
import { resolvePaymentProvider, isEchelonKey } from './paymentPreference';

describe('resolvePaymentProvider', () => {
  it('uses the club choice when connected', () => expect(resolvePaymentProvider('echelon', 'stripe', ['stripe', 'echelon'])).toBe('echelon'));
  it('falls back to app default when club choice not connected', () => expect(resolvePaymentProvider('echelon', 'stripe', ['stripe'])).toBe('stripe'));
  it('uses app default when club has no choice', () => expect(resolvePaymentProvider(null, 'echelon', ['stripe', 'echelon'])).toBe('echelon'));
  it('uses whatever is connected', () => expect(resolvePaymentProvider(null, 'stripe', ['echelon'])).toBe('echelon'));
  it('returns null when none connected', () => expect(resolvePaymentProvider('stripe', 'stripe', ['square'])).toBeNull());
});

describe('isEchelonKey', () => {
  it('accepts 32 chars', () => expect(isEchelonKey('a'.repeat(32))).toBe(true));
  it('rejects short', () => expect(isEchelonKey('abc')).toBe(false));
});
