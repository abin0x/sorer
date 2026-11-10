import { describe, it, expect, vi, beforeEach } from 'vitest';
const fixture = vi.hoisted(() => ({ club: { id: 'club-a' }, offer: null, orders: [] }));
vi.mock('@/legacy-functions/_sdk', () => ({ createClientFromRequest: () => ({ asServiceRole: { entities: {
  Club: { get: async () => fixture.club }, Offer: { get: async () => fixture.offer },
  MarketplaceOrder: { create: async row => { fixture.orders.push(row); return { id: 'pending-order' }; }, update: async () => ({}) },
} } }) }));
vi.mock('@/lib/integrations.server', () => ({ requireEnv: () => 'unused-test-key', admin: async () => ({ from: () => {
  const chain = { select: () => chain, eq: () => chain, in: async () => ({ data: [] }), maybeSingle: async () => ({ data: null }) };
  return chain;
} }) }));
import checkout from './entry';
const request = selected => new Request('https://clubrudder.com/test', { method: 'POST', body: JSON.stringify({ club_id: 'club-a', items: [{ offer_id: 'offer-a', type: 'dues', payment_plan: 'full', player: { name: 'Test Player' }, selected_fee_ids: selected }], customer: { name: 'Test Parent', email: 'parent@example.test' } }) });
beforeEach(() => { fixture.orders = []; fixture.offer = { id: 'offer-a', club_id: 'club-a', status: 'active', type: 'dues', config: { amount: 1, payment_plans: ['full'], dues: { base_dues: 1600, team_fees: [{ id: 'league', name: 'League', amount: 200, required: true }, { id: 'camp', name: 'Camp', amount: 125.25, required: false }] } } }; });
describe('dues checkout tenant boundary', () => {
  it('refuses offers from another club before creating an order', async () => {
    fixture.offer.club_id = 'club-b';
    expect((await checkout(request([]))).status).toBe(400);
    expect(fixture.orders).toHaveLength(0);
  });
  it('refuses foreign optional fees before creating an order', async () => {
    expect((await checkout(request(['foreign-fee']))).status).toBe(400);
    expect(fixture.orders).toHaveLength(0);
  });
  it('prices from the saved fee structure and stores selections on the owning club', async () => {
    await checkout(request(['camp']));
    expect(fixture.orders[0].club_id).toBe('club-a');
    expect(fixture.orders[0].total).toBe(1925.25);
    expect(fixture.orders[0].items[0].selected_fee_ids).toEqual(['camp']);
  });
});