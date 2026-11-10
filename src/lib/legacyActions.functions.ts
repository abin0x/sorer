import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { moduleForAction } from './moduleRegistry';

import { isPublicLegacyAction } from "./legacyPublicActions";
import { trustedOrigin } from "./trustedOrigin";

// Scheduled/internal jobs: never callable directly from a browser except by the
// service-managed system owner (they charge cards or email many people).
const OWNER_ONLY_ACTIONS = new Set(["charge-installments", "extend-occurrences", "tryoutReminders", "expense-weekly-digest", "module-reconcile", "outreach-engine", "expense-reminders", "expense-digest-flush", "run-report-schedules", "setModuleStatus"]);

async function runLegacy(name: string, payload: unknown, token?: string, depth = 0, appUrl = ''): Promise<any> {
  if (depth > 3) throw new Error("Too many nested actions.");
  if (!isPublicLegacyAction(name, payload)) {
    const { legacyCallerClient } = await import('@/legacy-functions/_sdk');
    const client = legacyCallerClient(token);
    const { data: identity, error } = await client.auth.getUser(token);
    if (error || !identity.user) throw new Error('Please sign in to do this.');
    if (OWNER_ONLY_ACTIONS.has(name) && depth === 0) {
      const { data: owner, error: ownerError } = await client.rpc('is_system_owner');
      if (ownerError || owner !== true) throw new Error('Only the system owner can run this.');
    }
    const moduleKey = moduleForAction(name);
    if (moduleKey) {
      const body = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {};
      let clubId = typeof body['club_id'] === 'string' ? body['club_id'] : typeof body['tenant_id'] === 'string' ? body['tenant_id'] : undefined;
      if (!clubId) {
        const { data: memberships, error: membershipError } = await client.from('club_members').select('club_id').eq('user_id', identity.user.id);
        if (!membershipError && memberships?.length === 1) clubId = memberships[0]?.club_id;
      }
      const { requireTenantModule } = await import('./tenantModuleGuard.server');
      await requireTenantModule(client, identity.user.id, clubId, moduleKey);
    }
  }
  const { legacyFunctions } = await import("@/legacy-functions/registry");
  const load = legacyFunctions[name];
  if (!load) {
    const e: any = new Error(`"${name}" is still being moved over from the old app and isn't available yet.`);
    e.status = 501;
    throw e;
  }
  await import("@/legacy-functions/_runtime");
  const mod = await load();
  const handler = mod.default;
  const req: any = new Request(`https://legacy.local/functions/${name}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(appUrl ? { "X-Base44-App-Url": appUrl } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(payload ?? {}),
  });
  req.__legacyCtx = { token, invoke: (n: string, p: unknown, t?: string) => runLegacy(n, p, t, depth + 1, appUrl) };
  const res: Response = await handler(req);
  const text = await res.text();
  let data: any = text;
  try { data = JSON.parse(text); } catch {}
  if (!res.ok) {
    const msg = (data && (data.error || data.message)) || `Action failed (${res.status})`;
    return { __error: typeof msg === "string" ? msg : JSON.stringify(msg), status: res.status, data };
  }
  return data;
}

export const invokeLegacyAction = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ name: z.string().min(1).max(100).regex(/^[\w-]+$/), payload: z.any().optional() }).parse(d))
  .handler(async ({ data }) => {
    const auth = getRequest()?.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : undefined;
    const signedIn = !!token && token.split(".").length === 3;
    if (!signedIn && !isPublicLegacyAction(data.name, data.payload)) throw new Error("Please sign in to do this.");
    const req = getRequest();
    const origin = req?.headers.get("origin") || (req ? new URL(req.url).origin : "");
    return runLegacy(data.name, data.payload, signedIn ? token : undefined, 0, trustedOrigin(origin));
  });
