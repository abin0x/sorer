import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, serverUrl, token, functionsVersion } = appParams;

//Create a client with authentication required
export const base44 = createClient({
  appId,
  serverUrl,
  token,
  functionsVersion,
  requiresAuth: false
});

// ===== Multi-tenant auto-stamping =====
// Every club-scoped record carries a `club_id` matching the creating user's club_id;
// RLS enforces isolation server-side. To avoid forcing every call site to pass club_id
// manually, we wrap each entity's create/bulkCreate so the current user's club_id is
// injected automatically before the request leaves the browser.
//
// Platform-wide (non-tenant) entities are excluded so they never receive a club_id.
const GLOBAL_ENTITIES = new Set([
  'Club', 'Plugin', 'AppConfig', 'RBACConfig', 'League', 'Platform',
  'AgeGroup', 'SubscriptionPlan', 'User',
  'PricingConfig', 'PricingQuote'
]);

let _cachedClubId = undefined; // undefined = not yet fetched, null = no club (super admin / anon)

async function getCurrentClubId() {
  if (_cachedClubId !== undefined) return _cachedClubId;
  try {
    const me = await base44.auth.me();
    _cachedClubId = me?.club_id || null;
  } catch {
    _cachedClubId = null;
  }
  return _cachedClubId;
}

// Allow auth state changes (login/logout) to re-resolve the club_id.
export function _resetCachedClubId() {
  _cachedClubId = undefined;
}

// Effective club scope — set by TenantContext when a system user views a specific
// tenant. When set, list/filter calls on tenant entities are scoped server-side to
// that club, so a system_owner viewing a tenant only sees that tenant's data
// (RLS is bypassed for admins, so this client-side scoping is what enforces isolation).
let _effectiveClubId = null;
export function setEffectiveClubId(id) { _effectiveClubId = id || null; }

// ===== Entity scoping Proxy =====
// base44.entities is a Proxy that returns a FRESH entity object on every access,
// so mutating entity methods (e.list = ...) does NOT persist. Instead we replace
// base44.entities with our own Proxy that returns STABLE wrapper objects. Each
// wrapper delegates to a captured original entity reference, scopes list/filter
// to the effective club, and auto-stamps club_id on create/bulkCreate.
const _realEntities = base44.entities;
const _entityCache = {};

function makeScopedEntity(name) {
  const orig = _realEntities[name];
  if (!orig) return undefined;
  const isGlobal = GLOBAL_ENTITIES.has(name);
  // Copy every method from the original entity, bound to the captured reference.
  const scoped = {};
  for (const key of Object.keys(orig)) {
    if (typeof orig[key] === 'function') scoped[key] = orig[key].bind(orig);
  }
  if (isGlobal) return scoped;
  // Scope reads to the effective club. When the effective club has not been
  // resolved yet (null), return empty results instead of issuing an unscoped
  // query — this prevents a system user from briefly seeing ALL tenants' data
  // before TenantContext finishes resolving the current tenant.
  scoped.list = (sort, limit) => {
    if (!_effectiveClubId) return Promise.resolve([]);
    return orig.filter({ club_id: _effectiveClubId }, sort, limit);
  };
  scoped.filter = (query, sort, limit) => {
    // If the caller explicitly passes club_id, the query is already scoped —
    // allow it through even before the tenant resolves.
    if (query && typeof query === 'object' && query.club_id != null) {
      return orig.filter(query, sort, limit);
    }
    if (!_effectiveClubId) return Promise.resolve([]);
    return orig.filter({ ...query, club_id: _effectiveClubId }, sort, limit);
  };
  // Auto-stamp club_id on writes. When a system user is viewing a tenant,
  // stamp the effective (tenant) club_id so the record belongs to that tenant;
  // otherwise fall back to the user's own club_id.
  scoped.create = async (record = {}) => {
    if (record && typeof record === 'object' && record.club_id == null) {
      const clubId = _effectiveClubId || await getCurrentClubId();
      if (clubId) record.club_id = clubId;
    }
    return orig.create(record);
  };
  scoped.bulkCreate = async (records) => {
    if (Array.isArray(records)) {
      const clubId = _effectiveClubId || await getCurrentClubId();
      if (clubId) {
        records = records.map((r) =>
          r && typeof r === 'object' && r.club_id == null ? { ...r, club_id: clubId } : r
        );
      }
    }
    return orig.bulkCreate(records);
  };
  return scoped;
}

base44.entities = new Proxy(_realEntities, {
  get(_target, prop) {
    if (typeof prop !== 'string') return undefined;
    if (prop in _entityCache) return _entityCache[prop];
    const wrapped = makeScopedEntity(prop);
    _entityCache[prop] = wrapped;
    return wrapped;
  },
});