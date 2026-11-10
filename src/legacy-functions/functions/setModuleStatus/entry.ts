// @ts-nocheck
import { createClientFromRequest } from '@/legacy-functions/_sdk';
import { MODULE_KEYS, normalizeModuleKey } from '@/lib/moduleRegistry';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({error:'Sign in required'}, {status:401});
    if (!(await base44.auth.isSystemOwner())) return Response.json({error:'System owner access required'}, {status:403});
    const body = await req.json();
    const svc = base44.asServiceRole;
    if (body.action === 'list') {
      if (!Array.isArray(body.club_ids) || body.club_ids.some(id => typeof id !== 'string')) return Response.json({ error: 'Tenant IDs required' }, { status: 400 });
      const records = body.club_ids.length ? await svc.entities.TenantModule.filter({ club_id: { $in: body.club_ids } }, '-created_date', 5000) : [];
      return Response.json({ records });
    }
    const {club_id, enabled} = body;
    const module_key = normalizeModuleKey(body.module_key);
    const status = typeof enabled === 'boolean' ? (enabled ? 'active' : 'off') : body.status;
    if (!club_id || !module_key || !['off','active','complimentary','trialing','past_due','suspended','expired'].includes(status)) return Response.json({error:'Invalid module change'}, {status:400});
    const [clubs, catalog, rows] = await Promise.all([svc.entities.Club.filter({id:club_id}), svc.entities.ModuleCatalog.filter({key:module_key}), svc.entities.TenantModule.filter({club_id,module_key},'-created_date',100)]);
    if (!clubs.length || !MODULE_KEYS.includes(module_key)) return Response.json({error:'Tenant or module not found'}, {status:404});
    const target = status === 'off' ? 'expired' : typeof enabled === 'boolean' && enabled && !rows[0]?.stripe_subscription_id ? 'complimentary' : status;
    const data = {club_id,module_key,status:target,admin_enabled:status !== 'off' && !['expired','suspended'].includes(status)};
    if (target === 'complimentary') Object.assign(data,{complimentary_reason:'Manual system console grant',complimentary_granted_by:user.email,complimentary_expires_at:null});
    if (target === 'past_due') Object.assign(data,{grace_ends_at:new Date(Date.now()+7*86400000).toISOString()});
    const record = rows.length ? await svc.entities.TenantModule.update(rows[0].id,data) : await svc.entities.TenantModule.create(data);
    if (rows.length > 1) await svc.entities.TenantModule.bulkUpdate(rows.slice(1).map(r=>({id:r.id,...data})));
    await svc.entities.EntitlementEvent.create({club_id,module_key,action:status==='off'?'revoked':'status_changed',from_status:rows[0]?.status || 'off',to_status:target,actor:user.email,reason:'Manual system console change'});
    return Response.json({record});
  } catch(error) {
    console.error('Module status change failed',error.message);
    return Response.json({error:error.message},{status:500});
  }
}