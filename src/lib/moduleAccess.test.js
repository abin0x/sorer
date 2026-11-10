import { describe, it, expect } from 'bun:test';
import { moduleHasAccess, tenantModuleHasAccess } from './moduleAccess.js';

describe('System Console module switches', () => {
  it('reads an enabled manual grant as accessible', () => {
    expect(moduleHasAccess({ status: 'complimentary', admin_enabled: true })).toBe(true);
  });
  it('keeps disabled access off even if billing reports active', () => {
    expect(moduleHasAccess({ status: 'active', admin_enabled: false })).toBe(false);
  });
  it('does not grant another module when core access is disabled', () => {
    expect(tenantModuleHasAccess({}, [
      { module_key: 'club_nexus', status: 'expired', admin_enabled: false },
      { module_key: 'payments', status: 'complimentary', admin_enabled: true },
    ], 'payments')).toBe(false);
  });
});