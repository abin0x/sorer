// Deno contract suite only; no Edge handlers or replacement application logic.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.101.0';
import postgres from 'npm:postgres@3.4.7';
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';

const sentinel = 'SENTINEL_SECRET_123';
const fakeKey = `re_fake_${sentinel}`;
function required(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`BLOCKED: missing ${name}`);
  return value;
}
function local(raw: string) {
  const url = new URL(raw);
  assert(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname), 'BLOCKED: disposable localhost stack required');
  return url;
}
function checked(result: { error: unknown }, label: string) {
  assert(!result.error, label); // Never log SDK/DB errors or submitted credentials.
}

Deno.test('Real-JWT integration security contract', async (t) => {
  const clubs: string[] = [], users: string[] = [], ids: string[] = [], vault: string[] = [];
  const actors: Record<string, { client: SupabaseClient; jwt: string }> = {};
  const bodies: string[] = [], statuses: number[] = [];
  let admin: SupabaseClient | undefined, anon: SupabaseClient | undefined;
  let sql: ReturnType<typeof postgres> | undefined;
  let base = '', blocked: string | undefined;
  const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
  async function call(name: string, jwt?: string, data?: unknown, query?: URLSearchParams) {
    const headers: Record<string, string> = { apikey: required('SUPABASE_ANON_KEY') };
    if (jwt) headers.Authorization = `Bearer ${jwt}`;
    if (data) headers['Content-Type'] = 'application/json';
    const r = await fetch(`${base}/${name}${query ? `?${query}` : ''}`, {
      method: query ? 'GET' : 'POST', headers, body: data ? JSON.stringify(data) : undefined,
      redirect: 'manual', signal: AbortSignal.timeout(15000),
    });
    const body = await r.text(); bodies.push(body); statuses.push(r.status);
    assert(!body.includes(sentinel) && !body.includes(fakeKey), `${name}: secret leaked`);
    return r;
  }
  async function rows(club: string) {
    assert(admin, 'setup missing');
    const r = await admin.from('integration_connections').select('id,club_id').eq('club_id', club).order('id');
    checked(r, 'verification read failed'); return r.data ?? [];
  }
  async function state(expired = false) {
    assert(admin, 'setup missing');
    const value = crypto.randomUUID();
    checked(await admin.from('oauth_states').insert({ state: value, club_id: clubs[0], user_id: users[0],
      provider: 'quickbooks', expires_at: new Date(Date.now() + (expired ? -60000 : 600000)).toISOString() }), 'state setup failed');
    return value;
  }
  try {
    try {
      // Never create test users/fixtures in the connected production database.
      const url = local(required('SUPABASE_URL')).origin;
      base = local(required('INTEGRATION_TEST_FUNCTIONS_URL')).href.replace(/\/$/, '');
      local(required('INTEGRATION_TEST_DATABASE_URL'));
      assertEquals(required('INTEGRATION_TEST_PROVIDER_ISOLATION'), 'network-denied',
        'BLOCKED: worker egress denial and fake provider adapters required');
      admin = createClient(url, required('SUPABASE_SERVICE_ROLE_KEY'), options);
      anon = createClient(url, required('SUPABASE_ANON_KEY'), options);
      for (const table of ['clubs', 'club_members', 'integration_connections', 'integration_secrets', 'oauth_states'])
        checked(await admin.from(table).select('*', { head: true }).limit(0), `BLOCKED: ${table} unavailable`);
      for (const name of ['connect-resend', 'disconnect-integration', 'oauth-start', 'oauth-callback']) {
        const r = await fetch(`${base}/${name}`, { method: 'OPTIONS',
          headers: { apikey: required('SUPABASE_ANON_KEY') }, signal: AbortSignal.timeout(15000) });
        await r.arrayBuffer(); assert(r.ok, `BLOCKED: ${name} not deployed with OPTIONS support`);
      }
      sql = postgres(required('INTEGRATION_TEST_DATABASE_URL'), { max: 1 });
      const run = crypto.randomUUID();
      for (const label of ['A', 'B']) {
        const id = crypto.randomUUID(); clubs.push(id);
        checked(await admin.from('clubs').insert({ id, name: `Security test ${run} ${label}` }), 'club setup failed');
      }
      for (const [i, name] of ['adminA', 'memberA', 'adminB', 'memberB'].entries()) {
        const email = `${name.toLowerCase()}-${run}@example.invalid`, password = `Test-${crypto.randomUUID()}!`;
        const r = await admin.auth.admin.createUser({ email, password, email_confirm: true });
        checked(r, 'user setup failed'); assert(r.data.user, 'user missing'); users.push(r.data.user.id);
        checked(await admin.from('club_members').insert({ club_id: clubs[i < 2 ? 0 : 1], user_id: r.data.user.id,
          role: name.startsWith('admin') ? 'admin' : 'member' }), 'membership setup failed');
        const client = createClient(url, required('SUPABASE_ANON_KEY'), options);
        const login = await client.auth.signInWithPassword({ email, password });
        checked(login, 'real password sign-in failed'); assert(login.data.session, 'JWT missing');
        actors[name] = { client, jwt: login.data.session.access_token };
      }
      for (const club of clubs) {
        const id = crypto.randomUUID(); ids.push(id);
        checked(await admin.from('integration_connections').insert({ id, club_id: club, provider: 'resend',
          external_account_id: `fake-${id}`, display_name: 'Fake Resend', status: 'active' }), 'connection setup failed');
        checked(await admin.rpc('store_connection_secret', { _conn: id, _secret: sentinel }), 'Vault setup failed');
        const ref = await admin.from('integration_secrets').select('vault_secret_id').eq('connection_id', id).single();
        checked(ref, 'Vault ref missing'); assert(ref.data?.vault_secret_id, 'Vault ref missing'); vault.push(ref.data.vault_secret_id);
      }
      await state();
    } catch (error) {
      blocked = error instanceof Error && error.message.startsWith('BLOCKED:') ? error.message
        : 'BLOCKED: fixture setup failed (raw errors withheld to protect credentials)';
    }
    const cases: Array<[string, () => Promise<void>]> = [
      ['1 adminA reads A, zero B', async () => {
        const a = await actors.adminA.client.from('integration_connections').select('id').eq('club_id', clubs[0]);
        const b = await actors.adminA.client.from('integration_connections').select('id').eq('club_id', clubs[1]);
        checked(a, 'A read failed'); checked(b, 'B read failed'); assertEquals(a.data, [{ id: ids[0] }]); assertEquals(b.data, []);
      }],
      ['2 memberA reads A; Resend/disconnect forbidden', async () => {
        const r = await actors.memberA.client.from('integration_connections').select('id').eq('club_id', clubs[0]);
        checked(r, 'member read failed'); assertEquals(r.data, [{ id: ids[0] }]);
        assertEquals((await call('connect-resend', actors.memberA.jwt, { tenant_id: clubs[0], api_key: fakeKey })).status, 403);
        assertEquals((await call('disconnect-integration', actors.memberA.jwt, { connection_id: ids[0] })).status, 403);
      }],
      ['3 cross-tenant disconnect denied; B persists', async () => {
        assert([403, 404].includes((await call('disconnect-integration', actors.adminA.jwt, { connection_id: ids[1] })).status));
        assertEquals((await rows(clubs[1])).map((r) => r.id), [ids[1]]);
      }],
      ['4 cross-tenant Resend denied', async () => {
        assertEquals((await call('connect-resend', actors.adminA.jwt, { tenant_id: clubs[1], api_key: fakeKey })).status, 403);
      }],
      ['5 cross-tenant OAuth denied', async () => {
        assertEquals((await call('oauth-start', actors.adminA.jwt, { tenant_id: clubs[1], provider: 'quickbooks' })).status, 403);
      }],
      ['6 invalid/reused states denied; query tenant ignored', async () => {
        for (const value of [crypto.randomUUID(), await state(true)]) {
          const r = await call('oauth-callback', undefined, undefined,
            new URLSearchParams({ state: value, code: 'fake-code', tenant_id: clubs[1] }));
          assert([400, 401, 403, 410].includes(r.status), 'invalid state accepted');
        }
        const value = await state(), beforeA = await rows(clubs[0]), beforeB = await rows(clubs[1]);
        const query = new URLSearchParams({ state: value, code: 'fake-success-code', tenant_id: clubs[1] });
        const first = await call('oauth-callback', undefined, undefined, query);
        assert([302, 303].includes(first.status), 'fake provider exchange must succeed');
        assertEquals((await rows(clubs[0])).length, beforeA.length + 1); assertEquals(await rows(clubs[1]), beforeB);
        assert(admin, 'setup missing');
        const consumed = await admin.from('oauth_states').select('state').eq('state', value);
        checked(consumed, 'state verification failed'); assertEquals(consumed.data, []);
        assert([400, 401, 403, 410].includes((await call('oauth-callback', undefined, undefined, query)).status), 'reused state accepted');
      }],
      ['7 all clients denied private tables and secret RPCs', async () => {
        assert(anon, 'setup missing');
        for (const client of [anon, ...Object.values(actors).map((a) => a.client)]) {
          for (const table of ['integration_secrets', 'oauth_states']) {
            const r = await client.from(table).select('*');
            assert(r.error?.code === '42501' || (!r.error && r.data?.length === 0), `${table}: private rows exposed or unexpected failure`);
          }
          for (const [name, args] of [['get_connection_secret', { _conn: ids[0] }],
            ['store_connection_secret', { _conn: ids[0], _secret: fakeKey }]] as const) {
            const r = await client.rpc(name, args);
            assert(r.error && ['42501', 'PGRST202'].includes(r.error.code), `${name}: execute not denied`);
          }
        }
      }],
      ['8 no sentinel in tested Edge response bodies', async () => {
        assertEquals((await call('connect-resend', actors.adminA.jwt, { tenant_id: clubs[0], api_key: fakeKey })).status, 200);
        assertEquals((await call('oauth-start', actors.adminA.jwt, { tenant_id: clubs[0], provider: 'quickbooks' })).status, 200);
        assertEquals((await call('disconnect-integration', actors.adminA.jwt, { connection_id: ids[0] })).status, 200);
        assert(bodies.length >= 10 && statuses.some((s) => s >= 200 && s < 300), 'successful responses not covered');
        for (const body of bodies) assert(!body.includes(sentinel) && !body.includes(fakeKey), 'secret leaked');
      }],
    ];
    for (const [name, test] of cases) await t.step(name, async () => {
      if (blocked) throw new Error(blocked);
      await test();
    });
  } finally {
    let failed = false;
    if (admin && clubs.length) {
      try {
        const connections = await admin.from('integration_connections').select('id').in('club_id', clubs);
        checked(connections, 'cleanup lookup failed');
        const all = (connections.data ?? []).map((r) => r.id);
        if (all.length) {
          const refs = await admin.from('integration_secrets').select('vault_secret_id').in('connection_id', all);
          checked(refs, 'cleanup refs failed'); vault.push(...(refs.data ?? []).map((r) => r.vault_secret_id));
        }
        checked(await admin.from('oauth_states').delete().in('club_id', clubs), 'state cleanup failed');
        checked(await admin.from('integration_connections').delete().in('club_id', clubs), 'connection cleanup failed');
      } catch { failed = true; }
      if (sql) try { for (const id of new Set(vault)) await sql`delete from vault.secrets where id = ${id}::uuid`; }
      catch { failed = true; }
      // Continue teardown even if a previous stage failed.
      for (const id of clubs) {
        for (const table of ['club_members', 'clubs']) {
          const r = await admin.from(table).delete().eq(table === 'clubs' ? 'id' : 'club_id', id);
          if (r.error) failed = true;
        }
      }
      for (const id of users) { const r = await admin.auth.admin.deleteUser(id); if (r.error) failed = true; }
    }
    for (const a of Object.values(actors)) await a.client.auth.signOut();
    if (sql) await sql.end();
    assert(!failed, 'Teardown failed: inspect disposable stack (credentials withheld)');
  }
});