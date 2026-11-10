import { tenantModuleHasAccess } from './moduleAccess';
import { MODULE_KEYS, normalizeModuleKey } from './moduleRegistry';

export async function requireTenantModule(client: any, userId: string, tenantId: string | undefined, requestedKey: string) {
  const key = normalizeModuleKey(requestedKey);
  if (!MODULE_KEYS.includes(key) || !tenantId) throw new Error('Module access denied: select a tenant.');
  const { data: membership, error: membershipError } = await client.from('club_members').select('club_id').eq('user_id', userId).eq('club_id', tenantId).maybeSingle();
  if (membershipError || !membership) throw new Error('Module access denied: tenant membership required.');
  const { data: modules, error } = await client.from('tenant_modules').select('*').eq('club_id', tenantId).order('created_date', { ascending: false });
  if (error || !Array.isArray(modules) || !tenantModuleHasAccess(null, modules, key)) throw new Error('Module access denied: ask the system owner to enable this module.');
}
