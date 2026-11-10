import { describe, expect, it } from 'bun:test';
import {
  createOAuthState, IntegrationAccessError, publicConnection,
  requireConnectionAdmin, requireTenantAdmin,
} from './integrationSecurity';

describe('Integration security boundary', () => {
  it('calls is_tenant_admin using the caller client before privileged access', async () => {
    const calls = [];
    await requireTenantAdmin({ rpc: async (name, args) => {
      calls.push([name, args]); return { data: true, error: null };
    } }, 'tenant-a');
    expect(calls).toEqual([['is_tenant_admin', { _tenant: 'tenant-a' }]]);
  });

  it('returns a 403 access error for a non-admin tenant caller', async () => {
    try {
      await requireTenantAdmin({ rpc: async () => ({ data: false, error: null }) }, 'tenant-b');
      throw new Error('Authorization incorrectly succeeded');
    } catch (error) {
      expect(error).toBeInstanceOf(IntegrationAccessError);
      expect(error.status).toBe(403);
    }
  });

  it('fails closed when the authorization RPC is missing or errors', async () => {
    await expect(requireTenantAdmin({ rpc: async () => ({ data: true, error: {} }) }, 'tenant-a'))
      .rejects.toBeInstanceOf(IntegrationAccessError);
  });

  it('uses only the stored connection club for disconnect authorization', async () => {
    let tenant;
    await requireConnectionAdmin({ rpc: async (_name, args) => {
      tenant = args['_tenant']; return { data: true, error: null };
    } }, { id: 'c1', club_id: 'stored-tenant', provider: 'resend', display_name: null, status: 'active' });
    expect(tenant).toBe('stored-tenant');
  });

  it('returns only id, provider, display_name and status', () => {
    const stored = { id: 'c1', club_id: 'tenant-a', provider: 'resend', display_name: 'Club',
      status: 'active', api_key: 'sentinel-not-a-real-key', vault_secret_id: 'private-reference' };
    expect(publicConnection(stored)).toEqual({ id: 'c1', provider: 'resend', display_name: 'Club', status: 'active' });
  });

  it('expires random OAuth states after exactly 10 minutes', () => {
    const now = Date.parse('2026-10-27T15:00:00Z');
    const a = createOAuthState(now), b = createOAuthState(now);
    expect(a.expires_at).toBe('2026-10-27T15:10:00.000Z');
    expect(a.state).toMatch(/^[0-9a-f]{64}$/);
    expect(a.state).not.toBe(b.state);
  });
});