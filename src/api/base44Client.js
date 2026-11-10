// Compatibility layer: keeps the original `base44.*` API used across the app,
// but reads/writes the ClubRudder Supabase database and uses Supabase auth.
import { supabase } from "@/integrations/supabase/client";
import { getDevMock, MOCK_CLUBS } from "@/lib/devMock";
import { aggregateRows } from "@/lib/aggregateRows";
import { transcribeCoachAudio } from "@/lib/core.functions";

const GLOBAL_ENTITIES = new Set([
  "Club", "Plugin", "AppConfig", "RBACConfig", "League", "Platform",
  "AgeGroup", "NotificationMatrix", "SubscriptionPlan", "User", "PricingConfig",
]);

export function tableFor(name) {
  const s = name.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
  if (/[^aeiou]y$/.test(s)) return s.slice(0, -1) + "ies";
  if (/(s|x|ch|sh)$/.test(s)) return s + "es";
  return s + "s";
}

let _me; // cached current user (undefined = not loaded)
let _effectiveClubId = null;
let _strictClubScope = false;
/** strict=true (system owner acting as a club) forces every scoped query onto that club, even if a page passes its own club_id. */
export function setEffectiveClubId(id, strict = false) { _effectiveClubId = id || null; _strictClubScope = !!(strict && id); }
export function _resetCachedClubId() { _me = undefined; }

function newId() {
  const b = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}

function applyFilter(q, query) {
  for (const [k, v] of Object.entries(query || {})) {
    if (v === undefined) continue;
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
  // Newer pages pass an options object: { sort, limit, skip }.
  if (sort && typeof sort === "object") {
    ({ limit = limit, skip = skip } = sort);
    sort = sort.sort;
  }
  if (typeof sort === "string" && sort) {
    const desc = sort.startsWith("-");
    q = q.order(desc ? sort.slice(1) : sort, { ascending: !desc, nullsFirst: false });
  }
  const lim = Number(limit) || 1000;
  const off = Number(skip) || 0;
  return q.range(off, off + lim - 1);
}

async function run(p) {
  const { data, error } = await p;
  if (error) { const e = new Error(error.message); e.status = 400; e.data = error; throw e; }
  // Newer pages read `page.items`; keep the array but expose it there too.
  if (Array.isArray(data) && !("items" in data)) Object.defineProperty(data, "items", { value: data, enumerable: false });
  return data;
}

async function currentUser() {
  const mock = getDevMock();
  if (mock) return mock;
  if (_me !== undefined) return _me;
  const { data: s } = await supabase.auth.getSession();
  if (!s.session) { _me = null; return null; }
  await supabase.rpc("accept_my_invitations").then(() => {}, () => {});
  const { data } = await supabase.rpc("get_me");
  _me = data ? { ...data, email: data.email || s.session.user.email } : { id: s.session.user.id, email: s.session.user.email };
  return _me;
}

function rawEntity(name) {
  const table = tableFor(name);
  const t = () => supabase.from(table);
  return {
    list: (sort, limit, skip) => run(applySort(t().select("*"), sort, limit, skip)),
    filter: (query, sort, limit, skip) => run(applySort(applyFilter(t().select("*"), query), sort, limit, skip)),
    get: (id) => run(t().select("*").eq("id", id).maybeSingle()),
    count: async (query) => {
      const { count, error } = await applyFilter(t().select("id", { count: "exact", head: true }), query);
      if (error) { const e = new Error(error.message); e.status = 400; e.data = error; throw e; }
      return count || 0;
    },
    aggregate: async ({ query, ...opts } = {}) => {
      const all = [];
      for (let off = 0; off < 20000; off += 1000) {
        const page = await run(applyFilter(t().select("*"), query).range(off, off + 999));
        all.push(...page);
        if (page.length < 1000) break;
      }
      return aggregateRows(all, opts);
    },
    create: async (rec = {}) => {
      const me = await currentUser();
      const row = { id: newId(), created_by: me?.email, created_by_id: me?.id, ...rec };
      return run(t().insert(row).select().single());
    },
    bulkCreate: async (recs = []) => {
      const me = await currentUser();
      const rows = recs.map((r) => ({ id: newId(), created_by: me?.email, created_by_id: me?.id, ...r }));
      return run(t().insert(rows).select());
    },
    update: (id, patch) => run(t().update({ ...patch, updated_date: new Date().toISOString() }).eq("id", id).select().maybeSingle()),
    bulkUpdate: (items = []) => Promise.all(items.map(({ id, ...p }) => run(t().update(p).eq("id", id)))),
    updateMany: (query, patch) => run(applyFilter(t().update(patch), query)),
    delete: (id) => run(t().delete().eq("id", id)),
    deleteMany: (query) => run(applyFilter(t().delete(), query)),
    subscribe: (cb) => {
      const ch = supabase.channel(`${table}-${newId()}`)
        .on("postgres_changes", { event: "*", schema: "public", table }, (p) =>
          cb({ type: p.eventType === "INSERT" ? "create" : p.eventType === "UPDATE" ? "update" : "delete", id: p.new?.id || p.old?.id, data: p.new }))
        .subscribe();
      return () => supabase.removeChannel(ch);
    },
    schema: async () => ({}),
  };
}

function scopedEntity(name) {
  const orig = rawEntity(name);
  if (GLOBAL_ENTITIES.has(name)) return orig;
  const scopeQuery = (query) => {
    if (_strictClubScope) return { ...(query || {}), club_id: _effectiveClubId };
    if (query && query.club_id != null) return query;
    if (!_effectiveClubId) return null;
    return { ...(query || {}), club_id: _effectiveClubId };
  };
  const clubFor = async () => _effectiveClubId || (await currentUser())?.club_id || null;
  return {
    ...orig,
    list: async (sort, limit, skip) => {
      if (!_effectiveClubId) return [];
      return orig.filter({ club_id: _effectiveClubId }, sort, limit, skip);
    },
    filter: async (query, sort, limit, skip) => {
      if (_strictClubScope) return orig.filter({ ...(query || {}), club_id: _effectiveClubId }, sort, limit, skip);
      if (query && query.club_id != null) return orig.filter(query, sort, limit, skip);
      if (!_effectiveClubId) return [];
      return orig.filter({ ...query, club_id: _effectiveClubId }, sort, limit, skip);
    },
    count: async (query) => {
      const q = scopeQuery(query);
      return q ? orig.count(q) : 0;
    },
    aggregate: async (opts = {}) => {
      const q = scopeQuery(opts.query);
      return q ? orig.aggregate({ ...opts, query: q }) : aggregateRows([], opts);
    },
    create: async (rec = {}) => {
      if (_strictClubScope) rec = { ...rec, club_id: _effectiveClubId };
      else if (rec.club_id == null) { const c = await clubFor(); if (c) rec = { ...rec, club_id: c }; }
      return orig.create(rec);
    },
    bulkCreate: async (recs = []) => {
      const c = await clubFor();
      return orig.bulkCreate(recs.map((r) => (_strictClubScope ? { ...r, club_id: c } : r.club_id == null && c ? { ...r, club_id: c } : r)));
    },
    get: async (id) => {
      const rec = await orig.get(id);
      if (_strictClubScope && rec && rec.club_id != null && rec.club_id !== _effectiveClubId) return null;
      return rec;
    },
  };
}

// The User entity lives in a private table and is reached through safe database functions.
const UserEntity = {
  list: async () => (await run(supabase.rpc("list_users"))) || [],
  filter: async (query) => {
    const all = (await run(supabase.rpc("list_users"))) || [];
    return all.filter((u) => Object.entries(query || {}).every(([k, v]) => u[k] === v));
  },
  get: async (id) => ((await run(supabase.rpc("list_users"))) || []).find((u) => u.id === id) || null,
  me: () => auth.me(),
  update: async (id, patch) => {
    const me = await currentUser();
    if (me?.id === id) return auth.updateMe(patch);
    throw new Error("Editing other users is not available yet.");
  },
  create: async () => { throw new Error("Use invitations to add users."); },
  delete: async () => { throw new Error("Deleting users is not available yet."); },
};

const cache = {};
const entities = new Proxy({}, {
  get(_t, prop) {
    if (typeof prop !== "string") return undefined;
    if (prop === "User") return UserEntity;
    if (prop === "Club" && getDevMock()) {
      const real = (cache.Club ||= scopedEntity("Club"));
      return { ...real,
        get: async (id) => MOCK_CLUBS[id] || real.get(id),
        list: async () => Object.values(MOCK_CLUBS),
        filter: async (q) => Object.values(MOCK_CLUBS).filter((c) => Object.entries(q || {}).every(([k, v]) => c[k] === v)) };
    }
    return (cache[prop] ||= scopedEntity(prop));
  },
});

const origin = () => (typeof window !== "undefined" ? window.location.origin : "");

const auth = {
  me: async () => {
    const u = await currentUser();
    if (!u) { const e = new Error("Not authenticated"); e.status = 401; throw e; }
    // System owner acting as a club: pages that read user.club_id see the selected club.
    if (_strictClubScope && _effectiveClubId) return { ...u, club_id: _effectiveClubId, home_club_id: u.club_id };
    return u;
  },
  isAuthenticated: async () => !!getDevMock() || !!(await supabase.auth.getSession()).data.session,
  updateMe: async (patch) => { const d = await run(supabase.rpc("update_me", { p: patch })); _me = undefined; return d; },
  loginViaEmailPassword: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    _me = undefined;
  },
  register: async ({ email, password }) => {
    const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${origin()}/home` } });
    if (error) throw error;
  },
  verifyOtp: async ({ email, otpCode }) => {
    const { data, error } = await supabase.auth.verifyOtp({ email, token: otpCode, type: "signup" });
    if (error) throw error;
    _me = undefined;
    return { access_token: data.session?.access_token };
  },
  resendOtp: async (email) => { const { error } = await supabase.auth.resend({ type: "signup", email }); if (error) throw error; },
  setToken: () => {},
  resetPasswordRequest: async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${origin()}/reset-password` });
    if (error) throw error;
  },
  resetPassword: async ({ newPassword }) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  },
  loginWithProvider: async (provider, returnTo) => {
    const p = provider === "microsoft" ? "azure" : provider;
    const inIframe = typeof window !== "undefined" && window.self !== window.top;
    let back = "/home";
    try { if (returnTo) { const u = new URL(returnTo, origin()); if (u.origin === origin()) back = u.pathname + u.search; } } catch {}
    const redirectTo = `${origin()}/auth/callback?returnTo=${encodeURIComponent(back)}`;
    // Open the popup synchronously so browsers don't block it.
    const popup = inIframe ? window.open("", "cr-oauth", "width=520,height=680") : null;
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: p,
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error) { popup?.close(); throw error; }
    if (!data?.url) { popup?.close(); return; }
    if (!inIframe) { window.location.assign(data.url); return; }
    // In the editor preview Google can't load in the frame: sign in via a popup,
    // then receive the session back here so this window becomes signed in.
    if (popup) popup.location.href = data.url; else window.open(data.url, "cr-oauth");
    await new Promise((resolve, reject) => {
      const onMsg = async (e) => {
        if (e.origin !== origin() || e.data?.type !== "cr-oauth") return;
        window.removeEventListener("message", onMsg);
        try {
          if (e.data.access_token && e.data.refresh_token) {
            const { error: se } = await supabase.auth.setSession({ access_token: e.data.access_token, refresh_token: e.data.refresh_token });
            if (se) throw se;
          } else if (e.data.code) {
            const { error: ce } = await supabase.auth.exchangeCodeForSession(e.data.code);
            if (ce) throw ce;
          } else throw new Error(e.data.error || "Sign-in was cancelled.");
          _me = undefined;
          window.location.assign(back);
          resolve();
        } catch (err) { reject(err); }
      };
      window.addEventListener("message", onMsg);
    });
  },
  logout: async (redirectUrl) => {
    await supabase.auth.signOut();
    _me = undefined;
    if (typeof window !== "undefined") window.location.href = "/login";
  },
  redirectToLogin: (returnTo) => {
    if (typeof window !== "undefined") window.location.href = `/login${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`;
  },
};

supabase.auth.onAuthStateChange((event) => {
  if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") _me = undefined;
});

const functions = {
  invoke: async (name, payload = {}) => {
    if (name === "checkResendConnection" || name === "inviteClubMember") {
      const fns = await import("@/lib/integrations.functions");
      const me = await currentUser();
      const clubId = payload.club_id || me?.club_id || undefined;
      try {
        if (name === "checkResendConnection") return { data: await fns.checkClubResend({ data: { clubId } }) };
        // Accept both the bulk shape ({ invitees: [...] }) and single-person calls ({ email, role, full_name }).
        const invitees = Array.isArray(payload.invitees) && payload.invitees.length
          ? payload.invitees
          : [{ email: payload.email, role: payload.role || payload.custom_role, full_name: payload.full_name || "" }];
        const cleaned = invitees.map((i) => ({ email: String(i?.email || "").trim(), role: String(i?.role || "").trim(), full_name: String(i?.full_name || "").trim() }));
        const bad = cleaned.find((i) => !i.email || !i.role);
        if (bad) throw new Error(!bad.email ? "Enter an email address." : "Pick a role for this person.");
        return { data: await fns.inviteClubMembers({ data: { clubId, origin: window.location.origin, invitees: cleaned } }) };
      } catch (err) {
        const msg = err?.message || "Request failed";
        err.response = { data: { error: msg, preflight_failed: /isn't connected/.test(msg) } };
        throw err;
      }
    }
    if (name === "sendEmail") {
      return { data: await integrations.Core.SendEmail(payload) };
    }
    const { invokeLegacyAction } = await import("@/lib/legacyActions.functions");
    const res = await invokeLegacyAction({ data: { name, payload: _effectiveClubId && payload.club_id == null && payload.tenant_id == null ? { ...payload, club_id: _effectiveClubId } : payload } });
    if (res && typeof res === "object" && "__error" in res) {
      const e = new Error(res.__error);
      e.status = res.status;
      e.response = { status: res.status, data: res.data };
      throw e;
    }
    return { data: res };
  },
};

async function uploadFile({ file }, isPublic = true) {
  const path = `uploads/${newId()}-${(file.name || "file").replace(/[^\w.-]/g, "_")}`;
  const { error } = await supabase.storage.from("public_base44_assets").upload(path, file);
  if (error) throw error;
  const { data } = supabase.storage.from("public_base44_assets").getPublicUrl(path);
  return { file_url: data.publicUrl };
}

// Private files (Beacon photos, voice notes, documents) live in the club's own
// folder of the private bucket; storage rules only let that club's members read them.
async function uploadPrivateFile({ file, club_id }) {
  const clubId = club_id || _effectiveClubId || (await currentUser())?.club_id;
  if (!clubId) throw new Error("Pick a club before attaching files.");
  const path = `${clubId}/${newId()}-${(file.name || "file").replace(/[^\w.-]/g, "_")}`;
  const { error } = await supabase.storage.from("beacon_files").upload(path, file, { contentType: file.type || undefined });
  if (error) throw new Error(error.message || "Upload failed");
  return { file_uri: `beacon_files/${path}` };
}

async function createFileSignedUrl({ file_uri, expires_in = 3600 }) {
  const uri = String(file_uri || "");
  if (/^https?:\/\//.test(uri)) return { signed_url: uri };
  const [bucket, ...rest] = uri.split("/");
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(rest.join("/"), expires_in);
  if (error) throw new Error(error.message || "File unavailable");
  return { signed_url: data.signedUrl };
}

const notYet = (n) => async () => { throw new Error(`${n} is not available yet.`); };

const integrations = {
  Core: {
    UploadFile: (a) => uploadFile(a),
    UploadPublicFile: (a) => uploadFile(a),
    UploadPrivateFile: (a) => uploadPrivateFile(a),
    CreateFileSignedUrl: (a) => createFileSignedUrl(a),
    SendEmail: async ({ to, subject, body, from_name, club_id }) => {
      const { sendClubEmail } = await import("@/lib/core.functions");
      return sendClubEmail({ data: { to, subject, body, from_name, clubId: club_id || _effectiveClubId || undefined } });
    },
    SendSMS: notYet("Sending SMS"),
    InvokeLLM: async ({ prompt, response_json_schema }) => {
      const { invokeAI } = await import("@/lib/core.functions");
      const { result } = await invokeAI({ data: { prompt, response_json_schema } });
      return result;
    },
    GenerateImage: notYet("Image generation"),
    ExtractDataFromUploadedFile: notYet("File data extraction"),
    TranscribeAudio: async ({ file }) => {
      if (!(file instanceof Blob)) throw new Error("Choose an audio recording first.");
      const data = new FormData();
      data.append("file", file, file.name || "dictation.webm");
      const { text } = await transcribeCoachAudio({ data });
      return text;
    },
  },
};

export const base44 = { entities, auth, functions, integrations, appLogs: { logUserInApp: async () => {} } };
export default base44;
