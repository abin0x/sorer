import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import {
  CreditCard, BookOpen, Facebook, Instagram, Linkedin, Mail, ArrowLeft, Loader2, CheckCircle2, AlertCircle,
  Link2, Unplug, Square, Wallet, Settings2, CalendarDays, MapPin, Twitter, Youtube, ShieldCheck, Clock, Landmark, Star,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Toaster } from '@/components/ui/sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { INTEGRATION_PROVIDERS, canManageIntegrations, safeOAuthRedirect, type ProviderDef, type ProviderKey } from '@/lib/integrationSettings';
import { connectionAvailability, startClubOAuth, saveManualConnection, disconnectClubConnection } from '@/lib/clubConnections.functions';
import { startStripeConnect, refreshStripeStatus } from '@/lib/integrations.functions';
import { getPaymentPreference, setClubPaymentPreference, setPlatformPaymentDefault } from '@/lib/paymentPreference.functions';

export const Route = createFileRoute('/settings/integrations')({
  ssr: false,
  head: () => ({ meta: [
    { title: 'Connections & integrations — ClubRudder' },
    { name: 'description', content: 'Connect your club’s payments, accounting, email, Google and social accounts.' },
    { property: 'og:title', content: 'Connections & integrations — ClubRudder' },
    { property: 'og:description', content: 'Secure club-specific payments, accounting, email, Google and social connections.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary' },
  ] }),
  component: IntegrationsPage,
});

type Membership = { club_id: string; role: string; clubs: { name: string } | null };
type Connection = { provider: string; display_name: string | null; status: string; last_error: string | null; connected_at: string | null };
const icons: Record<ProviderKey, typeof CreditCard> = {
  stripe: CreditCard, echelon: Landmark, square: Square, paypal: Wallet, custom_gateway: Settings2, quickbooks: BookOpen, resend: Mail,
  google_calendar: CalendarDays, google_maps: MapPin, facebook: Facebook, instagram: Instagram, x: Twitter, youtube: Youtube, linkedin: Linkedin,
};
const CATEGORIES: ProviderDef['category'][] = ['Payments', 'Accounting', 'Email', 'Google', 'Social'];

function IntegrationsPage() {
  const [userId, setUserId] = useState<string | null>();
  const [selectedClub, setSelectedClub] = useState('');
  useEffect(() => {
    let live = true;
    supabase.auth.getUser().then(({ data }) => { if (live) setUserId(data.user?.id ?? null); }).catch(() => live && setUserId(null));
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') setUserId(null);
      if (event === 'SIGNED_IN') setUserId(session?.user.id ?? null);
    });
    return () => { live = false; data.subscription.unsubscribe(); };
  }, []);
  const memberships = useQuery({
    queryKey: ['integration-admin-memberships', userId], enabled: !!userId, retry: 1,
    queryFn: async () => {
      // System owners (explicit system_owner_grants row, checked by the database) can switch to any club.
      const { data: owner } = await supabase.rpc('is_system_owner');
      if (owner === true) {
        const { data: clubs, error: clubsError } = await supabase.from('clubs').select('id,name').order('name');
        if (clubsError) throw new Error('Club access could not be verified.');
        return (clubs ?? []).map((c: any) => ({ club_id: c.id, role: 'system_owner', clubs: { name: c.name } })) as Membership[];
      }
      const { data, error } = await supabase.from('club_members')
        .select('club_id,role,clubs(name)').eq('user_id', userId ?? '').in('role', ['owner', 'admin']);
      if (error) throw new Error('Club access could not be verified.');
      return (data as unknown as Membership[]).filter((m) => canManageIntegrations(m.role));
    },
  });
  useEffect(() => {
    const rows = memberships.data;
    if (!rows?.length) return;
    const requested = new URLSearchParams(window.location.search).get('club');
    setSelectedClub((c) => rows.some((m) => m.club_id === c) ? c : rows.find((m) => m.club_id === requested)?.club_id ?? rows[0]!.club_id);
  }, [memberships.data]);
  if (userId === undefined || (userId && memberships.isPending)) return <AccessMessage loading />;
  if (!userId) return <AccessMessage text="Sign in to manage your club’s connections." signIn />;
  if (memberships.isError) return <AccessMessage text="Club access could not be verified." retry={() => void memberships.refetch()} />;
  if (!memberships.data?.length) return <AccessMessage text="Only club owners and admins can manage connections." />;
  if (!memberships.data.some((m) => m.club_id === selectedClub)) return <AccessMessage loading />;
  return <Portal key={selectedClub} clubId={selectedClub} memberships={memberships.data} selectClub={setSelectedClub} />;
}

function AccessMessage({ text, signIn, loading, retry }: { text?: string; signIn?: boolean; loading?: boolean; retry?: () => void }) {
  return <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
    {loading ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-label="Loading" /> : <p className="text-muted-foreground">{text}</p>}
    {retry && <Button onClick={retry} variant="outline">Try again</Button>}
    {!loading && <Button asChild variant="outline"><a href={signIn ? '/login?returnTo=/settings/integrations' : '/home'}>{signIn ? 'Sign in' : 'Back to ClubRudder'}</a></Button>}
  </div>;
}

function Portal({ clubId, memberships, selectClub }: { clubId: string; memberships: Membership[]; selectClub: (id: string) => void }) {
  const qc = useQueryClient();
  const queryKey = ['club-connections', clubId];
  const connections = useQuery({ queryKey, queryFn: async () => {
    const { data, error } = await supabase.from('club_integrations')
      .select('provider,display_name,status,last_error,connected_at').eq('club_id', clubId);
    if (error) throw new Error('Connections are unavailable.');
    return data as Connection[];
  } });
  const availabilityFn = useServerFn(connectionAvailability);
  const availability = useQuery({ queryKey: ['connection-availability'], queryFn: () => availabilityFn(), staleTime: 300_000 });
  const oauth = useServerFn(startClubOAuth);
  const stripeStart = useServerFn(startStripeConnect);
  const stripeRefresh = useServerFn(refreshStripeStatus);
  const disconnect = useServerFn(disconnectClubConnection);
  const saveManual = useServerFn(saveManualConnection);
  const [busy, setBusy] = useState<string | null>(null);
  const [manual, setManual] = useState<ProviderDef | null>(null);
  const [toDisconnect, setToDisconnect] = useState<ProviderDef | null>(null);
  const reload = () => qc.invalidateQueries({ queryKey });

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const name = INTEGRATION_PROVIDERS.find((d) => d.key === p.get('provider'))?.name;
    if (p.get('connected')) toast.success(`${name ?? 'Account'} connected`);
    else if (p.get('error')) toast.error(`${name ?? 'The account'} wasn’t connected. Please try again.`);
    if (p.get('provider') === 'stripe') void stripeRefresh({ data: { clubId } }).then(reload).catch(() => {});
    if (p.get('provider')) window.history.replaceState(null, '', `/settings/integrations?club=${encodeURIComponent(clubId)}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const run = async (id: string, fn: () => Promise<void>) => {
    setBusy(id);
    try { await fn(); } catch (e: any) { toast.error(e?.message && e.message.length < 160 ? e.message : 'That didn’t work. Please try again.'); }
    finally { setBusy(null); }
  };
  const connect = (p: ProviderDef) => {
    if (p.mode === 'manual') { setManual(p); return; }
    void run(p.key, async () => {
      const origin = window.location.origin;
      if (p.mode === 'stripe') {
        const r = await stripeStart({ data: { clubId, origin } });
        if (r.error || !r.url) throw new Error(r.error ?? 'Stripe could not be started.');
        window.location.assign(safeOAuthRedirect('stripe', r.url));
        return;
      }
      const r = await oauth({ data: { clubId, provider: p.key as any, origin } });
      window.location.assign(safeOAuthRedirect(p.key, r.url));
    });
  };
  const byKey = useMemo(() => new Map((connections.data ?? []).map((c) => [c.provider, c])), [connections.data]);
  const connectedCount = (connections.data ?? []).filter((c) => c.status === 'connected').length;
  const clubName = memberships.find((m) => m.club_id === clubId)?.clubs?.name ?? 'Your club';

  return <main className="min-h-screen bg-background text-foreground">
    <Toaster />
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Button asChild variant="ghost" size="sm" className="mb-6"><a href="/home"><ArrowLeft className="h-4 w-4" />Back to ClubRudder</a></Button>
      <header className="flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div>
          <p className="mb-1 text-sm text-muted-foreground">{clubName}</p>
          <h1 className="text-3xl font-semibold tracking-tight">Connections & integrations</h1>
          <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground"><ShieldCheck className="h-4 w-4 text-primary" />Each club connects its own accounts. Keys are encrypted and never shown again.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="secondary" className="text-sm">{connectedCount} of {INTEGRATION_PROVIDERS.length} connected</Badge>
          {memberships.length > 1 && <Select value={clubId} onValueChange={selectClub}><SelectTrigger className="w-64" aria-label="Club"><SelectValue /></SelectTrigger><SelectContent>{memberships.map((m) => <SelectItem key={m.club_id} value={m.club_id}>{m.clubs?.name ?? 'Club'}</SelectItem>)}</SelectContent></Select>}
        </div>
      </header>
      {connections.isError && <div role="alert" className="mt-6 flex items-center justify-between gap-3 rounded-lg border border-destructive p-4 text-sm"><span>Connections couldn’t be loaded.</span><Button variant="outline" size="sm" onClick={() => void connections.refetch()}>Try again</Button></div>}
      {CATEGORIES.map((cat) => <section key={cat} className="mt-10">
        <h2 className="mb-4 text-lg font-semibold">{cat}</h2>
        {cat === 'Payments' && <PreferredPayment clubId={clubId} version={connectedCount} />}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {INTEGRATION_PROVIDERS.filter((p) => p.category === cat).map((p) => {
            const Icon = icons[p.key];
            const row = byKey.get(p.key);
            const status = row?.status === 'connected' ? 'connected' : row?.status === 'pending' ? 'pending' : row?.status === 'error' ? 'error' : 'none';
            const appMissing = p.mode !== 'manual' && availability.data && availability.data[p.key] === false;
            return <article key={p.key} className="flex flex-col rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10"><Icon className="h-5 w-5 text-primary" /></div>
                {status === 'connected' ? <Badge className="gap-1"><CheckCircle2 className="h-3 w-3" />Connected</Badge>
                  : status === 'pending' ? <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" />Finish setup</Badge>
                  : status === 'error' ? <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" />Needs attention</Badge>
                  : <Badge variant="outline">Not connected</Badge>}
              </div>
              <h3 className="mt-4 font-semibold">{p.name}</h3>
              <p className="mt-1 flex-1 text-sm text-muted-foreground">{p.blurb}</p>
              {row?.display_name && status !== 'none' && <p className="mt-3 truncate text-sm font-medium">{row.display_name}</p>}
              {appMissing && <p className="mt-3 text-xs text-muted-foreground">Coming soon — ClubRudder is finishing setup with {p.name}.</p>}
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" disabled={!!busy || !connections.isSuccess || !!appMissing} onClick={() => connect(p)}>
                  {busy === p.key ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                  {status === 'none' ? 'Connect' : status === 'pending' ? 'Continue setup' : p.mode === 'manual' ? 'Update details' : 'Reconnect'}
                </Button>
                {status !== 'none' && <Button size="sm" variant="ghost" disabled={!!busy} onClick={() => setToDisconnect(p)}><Unplug className="h-4 w-4" />Disconnect</Button>}
              </div>
            </article>;
          })}
        </div>
      </section>)}
    </div>
    <ManualDialog provider={manual} onClose={() => setManual(null)} busy={busy} onSubmit={(fields) => run(manual!.key, async () => {
      await saveManual({ data: { clubId, provider: manual!.key, fields } });
      setManual(null); toast.success(`${manual!.name} connected`); await reload();
    })} />
    <Dialog open={!!toDisconnect} onOpenChange={(o) => { if (!o) setToDisconnect(null); }}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Disconnect {toDisconnect?.name}?</DialogTitle><DialogDescription>Saved keys for this account will be deleted. You can connect again any time.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setToDisconnect(null)}>Cancel</Button><Button variant="destructive" disabled={!!busy} onClick={() => {
      const p = toDisconnect!;
      void run(p.key, async () => { await disconnect({ data: { clubId, provider: p.key } }); setToDisconnect(null); toast.success('Disconnected'); await reload(); });
    }}>Disconnect</Button></DialogFooter></DialogContent></Dialog>
  </main>;

}

const PAY_NAMES = { stripe: 'Stripe', echelon: 'Echelon' } as const;

function PreferredPayment({ clubId, version }: { clubId: string; version: number }) {
  const getFn = useServerFn(getPaymentPreference);
  const setClub = useServerFn(setClubPaymentPreference);
  const setPlatform = useServerFn(setPlatformPaymentDefault);
  const pref = useQuery({ queryKey: ['payment-pref', clubId, version], queryFn: () => getFn({ data: { clubId } }) });
  const [saving, setSaving] = useState(false);
  if (!pref.data) return null;
  const d = pref.data;
  const save = async (fn: () => Promise<unknown>, msg: string) => {
    setSaving(true);
    try { await fn(); toast.success(msg); await pref.refetch(); }
    catch (e: any) { toast.error(e?.message ?? 'Couldn’t save.'); } finally { setSaving(false); }
  };
  return <div className="mb-4 rounded-xl border border-primary/30 bg-primary/5 p-5">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h3 className="flex items-center gap-2 font-semibold"><Star className="h-4 w-4 text-primary" />Preferred payment solution</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {d.active ? <>Families currently pay through <strong className="text-foreground">{PAY_NAMES[d.active]}</strong>.</> : 'Connect Stripe or Echelon below to start taking payments.'}
        </p>
      </div>
      <div className="flex gap-2" role="radiogroup" aria-label="Preferred payment solution">
        {(['stripe', 'echelon'] as const).map((p) => {
          const isOn = (d.clubPreferred ?? d.platformDefault) === p;
          const ready = d.connected.includes(p);
          return <Button key={p} size="sm" role="radio" aria-checked={isOn} variant={isOn ? 'default' : 'outline'} disabled={saving}
            onClick={() => save(() => setClub({ data: { clubId, provider: p } }), `${PAY_NAMES[p]} is now preferred`)}>
            {PAY_NAMES[p]}{!ready && <span className="ml-1 text-xs opacity-70">(not connected)</span>}
          </Button>;
        })}
      </div>
    </div>
    {d.isSystemOwner && <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-4 text-sm">
      <span className="text-muted-foreground">App-wide default for clubs that haven’t chosen:</span>
      <Select value={d.platformDefault} onValueChange={(v) => save(() => setPlatform({ data: { provider: v as 'stripe' | 'echelon' } }), 'App-wide default saved')}>
        <SelectTrigger className="w-40" aria-label="App-wide default"><SelectValue /></SelectTrigger>
        <SelectContent><SelectItem value="stripe">Stripe</SelectItem><SelectItem value="echelon">Echelon</SelectItem></SelectContent>
      </Select>
    </div>}
  </div>;
}

function ManualDialog({ provider, onClose, onSubmit, busy }: { provider: ProviderDef | null; onClose: () => void; onSubmit: (f: Record<string, string>) => void; busy: string | null }) {
  const form = useRef<HTMLFormElement>(null);
  const close = () => { form.current?.reset(); onClose(); };
  return <Dialog open={!!provider} onOpenChange={(o) => { if (!o) close(); }}>
    <DialogContent className="sm:max-w-md">
      <DialogHeader><DialogTitle>Connect {provider?.name}</DialogTitle><DialogDescription>Paste the details from your {provider?.name} account. Secret values are encrypted and can’t be viewed later.</DialogDescription></DialogHeader>
      {provider?.key === 'echelon' && <p className="rounded-md bg-muted p-3 text-sm">Find it in your Echelon gateway: <strong>Settings → Security Keys → Add a new private key</strong> (check “API”). Copy the key and paste it here — that’s it.</p>}
      <form ref={form} className="space-y-4" autoComplete="off" onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const fields: Record<string, string> = {};
        fd.forEach((v, k) => { fields[k] = String(v); });
        e.currentTarget.reset();
        onSubmit(fields);
      }}>
        {provider?.fields?.map((f) => <div key={f.name} className="space-y-1.5">
          <Label htmlFor={`f-${f.name}`}>{f.label}{f.optional && <span className="text-muted-foreground"> (optional)</span>}</Label>
          {f.options ? <select id={`f-${f.name}`} name={f.name} defaultValue={f.options[0]} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">{f.options.map((o) => <option key={o} value={o}>{o === 'production' ? 'Live' : 'Test (sandbox)'}</option>)}</select>
            : <Input id={`f-${f.name}`} name={f.name} type={f.secret ? 'password' : 'text'} placeholder={f.placeholder} required={!f.optional} maxLength={500} />}
        </div>)}
        <DialogFooter><Button type="button" variant="outline" onClick={close}>Cancel</Button><Button type="submit" disabled={!!busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Save & verify</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}
