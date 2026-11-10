import { describe, it, expect } from 'bun:test';
import { requireTenantModule } from './tenantModuleGuard.server';
import { ADDON_MODULES, MODULE_KEYS, normalizeModuleKey, moduleForAction, moduleForEntity } from './moduleRegistry';
import { moduleForRoute } from './moduleRoutes';
import { tenantModuleHasAccess, moduleHasAccess } from './moduleAccess';
const grant = (key, enabled = true) => ({ club_id: 'tenant-a', module_key: key, status: 'active', admin_enabled: enabled });
const client = (member, modules, readError = false) => ({
  from(table) {
    const q = { select: () => q, eq: () => q, maybeSingle: async () => ({ data: member ? { club_id: 'tenant-a' } : null, error: null }), order: async () => ({ data: modules, error: readError ? { message: 'unavailable' } : null }) };
    if (table !== 'club_members' && table !== 'tenant_modules') throw new Error('Unexpected privileged read');
    return q;
  },
});

describe('Core plus six console-controlled add-ons', () => {
  it('defines exactly six add-ons and one core', () => {
    expect(ADDON_MODULES).toEqual(['payments', 'kanban', 'development', 'facilities', 'tournaments', 'branding']);
    expect(MODULE_KEYS.length).toBe(7);
  });
  for (const key of ADDON_MODULES) {
    it(`${key} requires its own explicit grant and an enabled core`, () => {
      expect(tenantModuleHasAccess(null, [grant('club_nexus')], key)).toBe(false);
      expect(tenantModuleHasAccess(null, [grant('club_nexus'), grant(key)], key)).toBe(true);
      expect(tenantModuleHasAccess(null, [grant('club_nexus'), grant(key, false)], key)).toBe(false);
      expect(tenantModuleHasAccess(null, [grant('club_nexus', false), grant(key)], key)).toBe(false);
    });
  }
  it('does not substitute a paid subscription for console core approval', () => {
    expect(tenantModuleHasAccess({ status: 'active', subscription_status: 'active' }, [grant('payments')], 'payments')).toBe(false);
  });
  it('does not accept missing approval or unknown module keys', () => {
    expect(moduleHasAccess({ status: 'active' })).toBe(false);
    expect(tenantModuleHasAccess(null, [grant('club_nexus'), grant('unknown')], 'unknown')).toBe(false);
  });
  it('core includes messaging, calendar, recruitment and email templates', () => {
    for (const page of ['CommunicationPortal', 'TeamCalendar', 'TryoutPlanner', 'EmailTemplates', 'EmailLogs']) expect(moduleForRoute('/' + page)).toBe('club_nexus');
  });
  it('protects direct and dashed add-on URLs without hiding management', () => {
    for (const [path, key] of Object.entries({ '/marketplace-manager': 'payments', '/KanbanStaff': 'kanban', '/test-settings': 'development', '/field-board': 'facilities', '/TournamentManager': 'tournaments', '/Marketing': 'branding' })) expect(moduleForRoute(path + '?tab=one')).toBe(key);
    expect(moduleForRoute('/SaaSAdmin?tab=modules')).toBe(null);
  });
  it('normalizes pricing and legacy aliases to the same entitlement', () => {
    expect(normalizeModuleKey('player_dev')).toBe('development');
    expect(normalizeModuleKey('website')).toBe('branding');
    expect(normalizeModuleKey('marketplace')).toBe('payments');
  });
  it('maps data and actions to add-on guards', () => {
    expect(moduleForEntity('Facility')).toBe('facilities');
    expect(moduleForEntity('SkillTestScore')).toBe('development');
    expect(moduleForAction('create-marketplace-checkout')).toBe('payments');
    expect(moduleForAction('generate-tournament-schedule')).toBe('tournaments');
  });
  it('denies cross-tenant requests even with enabled records', async () => {
    await expect(requireTenantModule(client(false, [grant('club_nexus'), grant('payments')]), 'admin-b', 'tenant-a', 'payments')).rejects.toThrow('membership required');
  });
  it('denies entitlement lookup failures', async () => {
    await expect(requireTenantModule(client(true, [grant('club_nexus'), grant('payments')], true), 'admin-a', 'tenant-a', 'payments')).rejects.toThrow('enable this module');
  });
  it('allows members only when the selected tenant has core and add-on approval', async () => {
    await expect(requireTenantModule(client(true, [grant('club_nexus'), grant('payments')]), 'member-a', 'tenant-a', 'payments')).resolves.toBeUndefined();
    await expect(requireTenantModule(client(true, [grant('club_nexus'), grant('payments', false)]), 'member-a', 'tenant-a', 'payments')).rejects.toThrow('enable this module');
  });
});
