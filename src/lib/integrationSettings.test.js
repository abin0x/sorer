import { describe, expect, it } from 'bun:test';
import { canManageIntegrations, safeOAuthRedirect, INTEGRATION_PROVIDERS, validateManualFields } from './integrationSettings';

describe('Integration settings access', () => {
  it('allows tenant owners and admins only', () => {
    expect(canManageIntegrations('owner')).toBe(true);
    expect(canManageIntegrations('admin')).toBe(true);
    for (const role of ['member', 'coach', 'parent', 'system_owner', 'master_admin']) {
      expect(canManageIntegrations(role)).toBe(false);
    }
  });
  it('accepts the Stripe Connect HTTPS destination', () => {
    expect(safeOAuthRedirect('stripe', 'https://connect.stripe.com/oauth/authorize?state=test'))
      .toBe('https://connect.stripe.com/oauth/authorize?state=test');
  });
  it('rejects insecure and unrelated OAuth destinations', () => {
    expect(() => safeOAuthRedirect('stripe', 'https://evil.example')).toThrow();
    expect(() => safeOAuthRedirect('stripe', 'http://connect.stripe.com')).toThrow();
    expect(() => safeOAuthRedirect('stripe', 'https://connect.stripe.com.evil.example')).toThrow();
  });
  it('lists every required club connection', () => {
    const keys = INTEGRATION_PROVIDERS.map((p) => p.key);
    for (const k of ['stripe', 'square', 'paypal', 'custom_gateway', 'quickbooks', 'resend', 'google_calendar', 'google_maps', 'facebook', 'instagram', 'x', 'youtube', 'linkedin']) expect(keys).toContain(k);
  });
  it('uses native OAuth for social and YouTube (no Ayrshare)', () => {
    for (const k of ['facebook', 'instagram', 'x', 'youtube', 'linkedin']) expect(INTEGRATION_PROVIDERS.find((p) => p.key === k).mode).toBe('oauth');
  });
  it('requires https for custom gateways and needed fields', () => {
    expect(validateManualFields('custom_gateway', { gateway_name: 'G', api_base_url: 'http://x.com', api_key: 'k' }).ok).toBe(false);
    expect(validateManualFields('custom_gateway', { gateway_name: 'G', api_base_url: 'https://x.com', api_key: 'k' }).ok).toBe(true);
    expect(validateManualFields('paypal', { client_id: 'A', environment: 'sandbox' }).ok).toBe(false);
    expect(validateManualFields('square', { access_token: 'EAAA1', environment: 'live' }).ok).toBe(false);
  });
});