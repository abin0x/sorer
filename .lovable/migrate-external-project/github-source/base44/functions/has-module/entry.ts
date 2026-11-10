// has-module — authoritative server-side module access check.
//
// Takes module_key from the client payload. Derives tenant_id from the
// authenticated user's club_id — NEVER from the client. System owners/admins
// may pass an explicit tenant_id to check any tenant.
//
// Returns { has_access, status, module } based on the TenantModule record
// and the access rules in moduleAccess.moduleHasAccess.

import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";
import { tenantModuleHasAccess } from "../../shared/moduleAccess.ts";

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const moduleKey = String(body.module_key ?? "");
    if (!moduleKey) return Response.json({ error: "module_key is required" }, { status: 400 });

    // Derive tenant_id from the authenticated user — never from the client.
    // System owners/admins may override to check any tenant.
    const isSystemElevated =
      user.system_role === "system_owner" ||
      user.system_role === "system_admin" ||
      user.system_role === "system_billing" ||
      user.system_role === "system_support" ||
      user.role === "admin";

    const tenantId = isSystemElevated && body.tenant_id
      ? String(body.tenant_id)
      : user.club_id;

    if (!tenantId) return Response.json({ error: "No tenant context" }, { status: 400 });

    const svc = base44.asServiceRole;
    const [clubs, modules] = await Promise.all([
      svc.entities.Club.filter({ id: tenantId }),
      svc.entities.TenantModule.filter({ club_id: tenantId }, '-created_date', 200),
    ]);
    const mod = modules.find(m => m.module_key === moduleKey) || null;
    const hasAccess = tenantModuleHasAccess(clubs[0], modules, moduleKey);

    return Response.json({
      has_access: hasAccess,
      status: mod?.status || null,
      module: mod ? {
        status: mod.status,
        current_period_end: mod.current_period_end,
        grace_ends_at: mod.grace_ends_at,
        access_ends_at: mod.access_ends_at,
        complimentary_expires_at: mod.complimentary_expires_at,
      } : null,
    });
  } catch (error) {
    console.error("has-module error:", error);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}