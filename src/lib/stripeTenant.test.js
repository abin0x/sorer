import { describe, expect, it } from 'bun:test';
import { stripeEventAccount, stripeTenantClient, verifyStripeEvent } from './stripeTenant.server';

describe('Stripe tenant boundary', () => {
  it('resolves only the signed event.account, never tenant data in the body', () => {
    expect(stripeEventAccount({ account: 'acct_Owned', data: { object: { account: 'acct_Attacker', tenant_id: 'other' } } }))
      .toBe('acct_Owned');
    expect(stripeEventAccount({ data: { object: { account: 'acct_Attacker' } } })).toBeNull();
  });
  it('scopes platform API calls with stripeAccount', () => {
    const client = stripeTenantClient('non-secret-test-fixture', { id: 'c1', club_id: 'club1', external_account_id: 'acct_Owned' });
    expect(client.options).toEqual({ stripeAccount: 'acct_Owned' });
  });
  it('rejects forged webhook signatures', async () => {
    await expect(verifyStripeEvent('{}', 't=1,v1=invalid', 'non-secret-test-fixture')).rejects.toThrow();
  });
});