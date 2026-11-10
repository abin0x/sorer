// @ts-nocheck
// Server-side stand-in for the old Base44 SDK. Old actions keep calling
// base44.entities.X / base44.asServiceRole.entities.X / base44.auth.me(), but
// everything runs against the ClubRudder Supabase database:
//  - base44.entities.*            -> signed-in user's access rules (RLS)
//  - base44.asServiceRole.*       -> privileged server access (the action checks permissions itself)
import "./_runtime";
import { createClient } from "@supabase/supabase-js";
import { tableFor } from "@/api/base44Client.js";
import { aggregateRows } from "@/lib/aggregateRows";
import { moduleForEntity } from '@/lib/moduleRegistry';
import { requireTenantModule } from '@/lib/tenantModuleGuard.server';

const URL_ = () => process.env.SUPABASE_URL!;

export function legacyCallerClient(token?: string) {
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!key) throw new Error('Supabase configuration missing.');
  return createClient(URL_(), key, {
    global: {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith('sb_') && headers.get('Authorization') === `Bearer ${key}`) headers.delete('Authorization');
        headers.set('apikey', key);
        return fetch(input, { ...init, headers });
      },
    },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
let _admin;
async function adminClient() {
  if (!_admin) _admin = (await import("@/integrations/supabase/client.server")).supabaseAdmin;
  return _admin;
}

const newId = () => Array.from(crypto.getRandomValues(new Uint8Array(12)), (x) => x.toString(16).padStart(2, "0")).join("");

function applyFilter(q, query) {
  for (const [k, v] of Object.entries(query || {})) {
    if (v === undefined) continue;
    if (k === "$or" && Array.isArray(v)) continue;
    if (v === null) q = q.is(k, null);
    else if (v && typeof v === "object" && !Array.isArray(v)) {
      if ("$in" in v) q = q.in(k, v.$in);
      if ("$nin" in v) q = q.not(k, "in", `(${v.$nin.map((x) => JSON.stringify(x)).join(",")})`);
      if ("$ne" in v) q = v.$ne === null ? q.not(k, "is", null) : q.neq(k, v.$ne);
      if ("$gt" in v) q = q.gt(k, v.$gt);
      if ("$gte" in v) q = q.gte(k, v.$gte);
      if ("$lt" in v) q = q.lt(k, v.$lt);
      if ("$lte" in v) q = q.lte(k, v.$lte);
      if ("$regex" in v) q = q.ilike(k, `%${v.$regex}%`);
      if ("$exists" in v) q = v.$exists ? q.not(k, "is", null) : q.is(k, null);
    } else if (Array.isArray(v)) q = q.contains(k, v);
    else q = q.eq(k, v);
  }
  return q;
}
function applySort(q, sort, limit, skip) {
  if (typeof sort === "string" && sort) {
    const desc = sort.startsWith("-");
    q = q.order(desc ? sort.slice(1) : sort, { ascending: !desc, nullsFirst: false });
  }
  const lim = Number(limit) || 1000, off = Number(skip) || 0;
  return q.range(off, off + lim - 1);
}
async function run(p) {
  const { data, error, count } = await p;
  if (error) { const e = new Error(error.message); e.status = 400; throw e; }
  return count ?? data;
}

function entity(getDb, name, me) {
  const table = tableFor(name);
  const t = async () => (await getDb()).from(table);
  const stamp = async (r) => { const u = await me(); return { id: newId(), created_by: u?.email, created_by_id: u?.id, ...r }; };
  return {
    list: async (s, l, k) => run(applySort((await t()).select("*"), s, l, k)),
    filter: async (q, s, l, k) => run(applySort(applyFilter((await t()).select("*"), q), s, l, k)),
    get: async (id) => run((await t()).select("*").eq("id", id).maybeSingle()),
    count: async (q) => run(applyFilter((await t()).select("id", { count: "exact", head: true }), q)),
    create: async (r = {}) => run((await t()).insert(await stamp(r)).select().single()),
    bulkCreate: async (rs = []) => run((await t()).insert(await Promise.all(rs.map(stamp))).select()),
    update: async (id, p) => run((await t()).update({ ...p, updated_date: new Date().toISOString() }).eq("id", id).select().maybeSingle()),
    bulkUpdate: async (items = []) => Promise.all(items.map(async ({ id, ...p }) => run((await t()).update(p).eq("id", id)))),
    updateMany: async (q, p) => run(applyFilter((await t()).update(p), q)),
    delete: async (id) => run((await t()).delete().eq("id", id)),
    deleteMany: async (q) => run(applyFilter((await t()).delete(), q)),
    aggregate: async ({ query, ...opts } = {}) => {
      const all = [];
      for (let off = 0; off < 20000; off += 1000) {
        const page = await run(applyFilter((await t()).select("*"), query).range(off, off + 999));
        all.push(...page);
        if (page.length < 1000) break;
      }
      return aggregateRows(all, opts);
    },
    schema: async () => ({}),
  };
}

export type LegacyCtx = { token?: string; invoke: (name: string, payload: unknown, token?: string) => Promise<any> };

export function makeClient(ctx: LegacyCtx) {
  const user = legacyCallerClient(ctx.token);
  let cachedMe;
  const me = async () => {
    if (cachedMe !== undefined) return cachedMe;
    if (!ctx.token) return (cachedMe = null);
    const { data: u } = await user.auth.getUser(ctx.token);
    if (!u?.user) return (cachedMe = null);
    const { data } = await user.rpc("get_me");
    return (cachedMe = { ...(data || {}), id: data?.id || u.user.id, email: data?.email || u.user.email });
  };
  const usersVia = async () => ((await user.rpc("list_users")).data || []);
  const userEntity = {
    list: usersVia,
    filter: async (q) => (await usersVia()).filter((u) => Object.entries(q || {}).every(([k, v]) => u[k] === v)),
    get: async (id) => (await usersVia()).find((u) => u.id === id) || null,
    update: async (id, patch) => {
      const m = await me();
      if (m?.id === id) return run(user.rpc("update_me", { p: patch }));
      throw new Error("Editing other users is not available yet.");
    },
  };
  // Add-on service-role CRUD must pass the caller's membership and entitlement
  // checks first. IDs are resolved with the caller's RLS client, not admin reads.
  const guardedEntity = (getDb, name) => {
    const original = entity(getDb, name, me);
    const key = moduleForEntity(name);
    if (!key) return original;
    const authorize = async (query = {}, id) => {
      const caller = await me();
      if (!caller) throw new Error('Not authenticated');
      let clubIds;
      if (id) {
        const { data: row, error } = await user.from(tableFor(name)).select('club_id').eq('id', id).maybeSingle();
        if (error || !row) throw new Error('Module record access denied.');
        clubIds = [row.club_id];
        if (query.club_id != null && query.club_id !== row.club_id) throw new Error('Moving module records between tenants is forbidden.');
      } else if (typeof query.club_id === 'string') clubIds = [query.club_id];
      else {
        const { data: rows, error } = await user.from('club_members').select('club_id').eq('user_id', caller.id);
        if (error || !rows?.length) throw new Error('Tenant membership required.');
        clubIds = rows.map(row => row.club_id);
      }
      for (const clubId of clubIds) await requireTenantModule(user, caller.id, clubId, key);
      return { ...query, club_id: clubIds.length === 1 ? clubIds[0] : { $in: clubIds } };
    };
    return {
      ...original,
      list: async (s, l, k) => original.filter(await authorize(), s, l, k),
      filter: async (q, s, l, k) => original.filter(await authorize(q), s, l, k),
      count: async q => original.count(await authorize(q)),
      aggregate: async (opts = {}) => original.aggregate({ ...opts, query: await authorize(opts.query) }),
      get: async id => { await authorize({}, id); return original.get(id); },
      create: async (row = {}) => {
        const scoped = await authorize(row);
        if (typeof scoped.club_id !== 'string') throw new Error('Select a tenant to create this record.');
        return original.create(scoped);
      },
      bulkCreate: async (rows = []) => {
        const scoped = [];
        for (const row of rows) {
          const value = await authorize(row);
          if (typeof value.club_id !== 'string') throw new Error('Select a tenant to create this record.');
          scoped.push(value);
        }
        return original.bulkCreate(scoped);
      },
      update: async (id, patch) => { await authorize(patch, id); return original.update(id, patch); },
      bulkUpdate: async (rows = []) => {
        for (const { id, ...patch } of rows) await authorize(patch, id);
        return original.bulkUpdate(rows);
      },
      updateMany: async (q, patch) => {
        const scoped = await authorize(q);
        if ('club_id' in patch) throw new Error('Moving module records between tenants is forbidden.');
        return original.updateMany(scoped, patch);
      },
      delete: async id => { await authorize({}, id); return original.delete(id); },
      deleteMany: async q => original.deleteMany(await authorize(q)),
    };
  };
  const entities = (getDb) => new Proxy({}, { get: (_t, p) => typeof p !== "string" ? undefined : p === "User" ? userEntity : guardedEntity(getDb, p) });

  const core = {
    SendEmail: async ({ to, subject, body, from_name, club_id }) => {
      const s = await import("@/lib/integrations.server");
      const u = await me();
      const clubId = club_id || u?.club_id;
      if (!clubId) throw new Error("No club selected for this email.");
      const secret = await s.getSecret(clubId, "resend");
      const db = await s.admin();
      const { data: row } = await db.from("club_integrations").select("external_account_id").eq("club_id", clubId).eq("provider", "resend").maybeSingle();
      if (!secret?.api_key || !row?.external_account_id) throw new Error("Your club's Resend email isn't connected.");
      const from = from_name ? `${String(from_name).replace(/[<>"]/g, "")} <${row.external_account_id}>` : row.external_account_id;
      await s.resend(secret.api_key, "/emails", "POST", { from, to: Array.isArray(to) ? to : [to], subject, html: body });
      return { success: true };
    },
    InvokeLLM: async ({ prompt, response_json_schema }) => {
      const { runAI } = await import("@/lib/core.functions");
      return (await runAI(prompt, response_json_schema)).result;
    },
    UploadFile: async () => { throw new Error("File upload from server actions is not available yet."); },
    GenerateImage: async () => { throw new Error("Image generation is not available yet."); },
  };

  const base = {
    entities: entities(async () => user),
    auth: {
      me: async () => { const u = await me(); if (!u) { const e = new Error("Not authenticated"); e.status = 401; throw e; } return u; },
      isAuthenticated: async () => !!(await me()),
      isSystemOwner: async () => { const { data, error } = await user.rpc('is_system_owner'); return !error && data === true; },
      /** Club owner/admin membership or the service-managed System Owner grant, checked on the caller's own JWT. */
      isClubManager: async (clubId) => { if (!clubId) return false; const { data, error } = await user.rpc('is_club_manager', { _club_id: clubId }); return !error && data === true; },
      updateMe: async (p) => run(user.rpc("update_me", { p })),
    },
    integrations: { Core: core },
    functions: { invoke: async (name, payload) => ({ data: await ctx.invoke(name, payload, ctx.token) }) },
  };
  return {
    ...base,
    asServiceRole: {
      ...base,
      entities: entities(adminClient),
      auth: {
        ...base.auth,
        inviteUser: async (email) => { const a = await adminClient(); const { error } = await a.auth.admin.inviteUserByEmail(email); if (error) throw error; },
      },
    },
  };
}

// Old actions call createClientFromRequest(req); the request carries the legacy context.
export function createClientFromRequest(req) {
  const ctx = req.__legacyCtx;
  if (!ctx) throw new Error("Legacy context missing");
  return makeClient(ctx);
}
