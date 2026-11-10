import ThemeToggle from "@/components/theme/ThemeToggle";
import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import useUnreadCounts from "@/components/beacon/useUnreadCounts";
import { haptic } from "@/lib/haptics";
import { initNativeShell } from "@/lib/nativeShell";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useTenant } from "@/lib/TenantContext";
import ChannelsView from "@/components/beacon/ChannelsView";
import TeamScopePicker from "@/components/beacon/TeamScopePicker";
import BeaconTryouts from "@/components/beacon/BeaconTryouts";
import BeaconDevelop from "@/components/beacon/BeaconDevelop";
import NativeSheet from "@/components/beacon/NativeSheet";
import NotificationsSheet from "@/components/beacon/NotificationsSheet";
import { markChannelsRead } from "@/components/beacon/useUnreadCounts";
import useBeaconData from "@/components/beacon/useBeaconData";
import { accessibleTeams, cleanScope, inScope, scopeStorageKey } from "@/lib/beaconTeamScope";
import {
  Home, MessageCircle, CalendarDays, CreditCard, User, Bell, MapPin, Clock,
  ChevronRight, LogOut, LayoutDashboard, Settings, RefreshCw, Trophy, ClipboardCheck, ShoppingBag, Ticket, Trash2, AlertTriangle, Loader2,
} from "lucide-react";

const fmtDay = (d) => new Date(d).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
const fmtTime = (d) => new Date(d).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
const isGame = (e) => ["game", "match"].includes(String(e?.event_type || "").toLowerCase());
const money = (n) => `$${Number(n || 0).toFixed(2)}`;

function useTab() {
  const read = () => new URLSearchParams(window.location.search).get("tab") || "home";
  const [tab, set] = useState(read);
  const setTab = (t) => {
    const u = new URL(window.location.href);
    u.searchParams.set("tab", t);
    window.history.replaceState(null, "", u);
    set(t);
    window.scrollTo(0, 0);
  };
  return [tab, setTab];
}

function Card({ children, className = "", onClick }) {
  const C = onClick ? "button" : "div";
  return <C onClick={onClick} className={`w-full text-left rounded-2xl border border-border bg-card p-4 shadow-sm ${onClick ? "active:scale-[0.97] active:shadow-none transition-all duration-150 ease-out" : ""} ${className}`}>{children}</C>;
}
const H = ({ children, action }) => (
  <div className="flex items-center justify-between mt-6 mb-2 px-1">
    <h2 className="text-[11px] font-black uppercase tracking-[0.14em] text-muted-foreground">{children}</h2>{action}
  </div>
);
const Empty = ({ icon: I, text }) => (
  <Card className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground"><I className="w-7 h-7" /><p className="text-sm">{text}</p></Card>
);

function EventRow({ e }) {
  return (
    <Card onClick={isGame(e) ? () => window.location.assign(`/gameview?id=${e.id}`) : undefined} className="flex gap-3 items-center">
      <div className={`w-12 shrink-0 rounded-xl py-1.5 text-center ${isGame(e) ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
        <div className="text-[10px] font-semibold uppercase">{new Date(e.start_datetime).toLocaleDateString(undefined, { month: "short" })}</div>
        <div className="text-lg font-bold leading-none">{new Date(e.start_datetime).getDate()}</div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase text-primary">{isGame(e) ? <Trophy className="w-3 h-3" /> : <Clock className="w-3 h-3" />}{e.event_type || "Event"}</div>
        <div className="font-semibold truncate">{e.title || e.name || "Team event"}</div>
        <div className="text-xs text-muted-foreground flex items-center gap-2 truncate">
          <span>{fmtTime(e.start_datetime)}</span>{e.location && <span className="flex items-center gap-0.5 truncate"><MapPin className="w-3 h-3" />{e.location}</span>}
        </div>
      </div>
      {isGame(e) && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
    </Card>
  );
}

// Events can list several teams; club-wide events (no team) always show.
function eventInScope(e, scope) {
  const ids = Array.isArray(e.team_ids) && e.team_ids.length ? e.team_ids : [e.team_id].filter(Boolean);
  return !scope.length || !ids.length || ids.some((id) => inScope(id, scope));
}

function useEvents(scope = []) {
  const { data = [], isLoading } = useQuery({
    queryKey: ["beacon-app-events"],
    queryFn: () => base44.entities.CalendarEvent.list("start_datetime", 300).catch(() => []),
  });
  const upcoming = useMemo(() => {
    const now = Date.now() - 3 * 3600e3;
    return (Array.isArray(data) ? data : []).filter((e) => e.start_datetime && new Date(e.start_datetime).getTime() >= now && eventInScope(e, scope));
  }, [data, scope]);
  return { upcoming, isLoading };
}

function useBalance(user) {
  const { data = [] } = useQuery({
    queryKey: ["beacon-app-regs"],
    queryFn: () => base44.entities.Registration.list("-created_date", 200).catch(() => []),
  });
  const mine = (Array.isArray(data) ? data : []).filter((r) => !user?.email || [r.parent_email, r.guardian_email, r.email, r.created_by].includes(user.email));
  const owed = mine.reduce((s, r) => s + Math.max(0, (r.amount_due || 0) - (r.amount_paid || 0)), 0);
  return { mine, owed };
}

function HomeTab({ user, go, scope, logout }) {
  const [acct, setAcct] = useState(false);
  const { upcoming } = useEvents(scope);
  const { owed } = useBalance(user);
  const next = upcoming[0];
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  return (
    <>
      <h1 className="text-3xl font-black tracking-tight mt-2">{greet}, {(user?.full_name || "there").split(" ")[0]}</h1>
      <p className="text-sm text-muted-foreground">{upcoming.length ? `${upcoming.length} upcoming events` : "Nothing on the schedule yet"}</p>
      <Card onClick={() => setAcct(true)} className="mt-4 flex items-center gap-3 py-3">
        <div className="w-11 h-11 rounded-full bg-primary text-primary-foreground grid place-items-center font-bold">{(user?.full_name || user?.email || "?")[0].toUpperCase()}</div>
        <div className="min-w-0 flex-1"><div className="font-semibold truncate">{user?.full_name || "Your profile"}</div><div className="text-xs text-muted-foreground truncate">Profile & account settings</div></div>
        <Settings className="w-5 h-5 text-muted-foreground" />
      </Card>
      <NativeSheet open={acct} onClose={() => setAcct(false)} title="Profile & account"><MeTab user={user} logout={logout} /></NativeSheet>

      <H>Up next</H>
      {next ? (
        <Card onClick={isGame(next) ? () => window.location.assign(`/gameview?id=${next.id}`) : () => go("schedule")} className="bg-primary text-primary-foreground border-primary">
          <div className="text-xs font-semibold uppercase">{fmtDay(next.start_datetime)} · {next.event_type || "Event"}</div>
          <div className="text-lg font-bold mt-1">{next.title || "Team event"}</div>
          <div className="text-sm mt-1 flex items-center gap-3"><span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{fmtTime(next.start_datetime)}</span>{next.location && <span className="flex items-center gap-1 truncate"><MapPin className="w-3.5 h-3.5" />{next.location}</span>}</div>
          {isGame(next) && <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-background/20 px-3 py-1 text-xs font-semibold">Open game · live score <ChevronRight className="w-3 h-3" /></div>}
        </Card>
      ) : <Empty icon={CalendarDays} text="No upcoming events." />}

      <H>Quick actions</H>
      <div className="grid grid-cols-2 gap-3">
        <Card onClick={() => go("messages")}><MessageCircle className="w-6 h-6 text-primary" /><div className="mt-2 font-semibold">Messages</div><div className="text-xs text-muted-foreground">Team channels</div></Card>
        <Card onClick={() => go("schedule")}><CalendarDays className="w-6 h-6 text-primary" /><div className="mt-2 font-semibold">Schedule</div><div className="text-xs text-muted-foreground">Games & practices</div></Card>
        <Card onClick={() => go("pay")}><CreditCard className="w-6 h-6 text-primary" /><div className="mt-2 font-semibold">Payments</div><div className={`text-xs ${owed > 0 ? "text-destructive font-semibold" : "text-muted-foreground"}`}>{owed > 0 ? `${money(owed)} due` : "All paid up"}</div></Card>
        <Card onClick={() => go("tryouts")}><ClipboardCheck className="w-6 h-6 text-primary" /><div className="mt-2 font-semibold">Tryouts</div><div className="text-xs text-muted-foreground">Check-in, offers</div></Card>
      </div>
    </>
  );
}

function ScheduleTab({ scope }) {
  const { upcoming, isLoading } = useEvents(scope);
  const [filter, setFilter] = useState("all");
  const list = upcoming.filter((e) => filter === "all" || (filter === "games" ? isGame(e) : !isGame(e)));
  const byDay = list.reduce((m, e) => { const k = fmtDay(e.start_datetime); (m[k] ||= []).push(e); return m; }, {});
  return (
    <>
      <div className="flex items-center justify-between mt-2"><h1 className="text-2xl font-bold">Schedule</h1>
        <button onClick={() => window.location.assign("/eventsignup")} className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-3 py-2 text-sm font-semibold min-h-[40px]"><Ticket className="w-4 h-4" />Event sign-up</button></div>
      <div className="flex gap-2 mt-3">
        {[["all", "All"], ["games", "Games"], ["other", "Practices & more"]].map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)} className={`rounded-full px-4 py-1.5 text-sm font-medium ${filter === k ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>{l}</button>
        ))}
      </div>
      {isLoading ? <p className="mt-6 text-sm text-muted-foreground">Loading…</p> :
        !list.length ? <div className="mt-4"><Empty icon={CalendarDays} text="No upcoming events." /></div> :
        Object.entries(byDay).map(([day, evs]) => (
          <div key={day}><H>{day}</H><div className="space-y-2">{evs.map((e) => <EventRow key={e.id} e={e} />)}</div></div>
        ))}
    </>
  );
}

function PayTab({ user }) {
  const { mine, owed } = useBalance(user);
  return (
    <>
      <h1 className="text-2xl font-bold mt-2">Payments</h1>
      <Card className={`mt-3 ${owed > 0 ? "border-destructive/40" : ""}`}>
        <div className="text-xs font-semibold uppercase text-muted-foreground">Balance due</div>
        <div className={`text-3xl font-bold mt-1 ${owed > 0 ? "text-destructive" : ""}`}>{money(owed)}</div>
        <button onClick={() => window.location.assign("/familyaccount")} className="mt-3 w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground">{owed > 0 ? "Pay now" : "View billing"}</button>
      </Card>
      <Card onClick={() => window.location.assign("/marketplace")} className="mt-3 flex items-center gap-3"><ShoppingBag className="w-6 h-6 text-primary" /><div className="flex-1"><div className="font-semibold">Club store</div><div className="text-xs text-muted-foreground">Programs, camps, gear</div></div><ChevronRight className="w-4 h-4 text-muted-foreground" /></Card>
      <H>Registrations</H>
      {!mine.length ? <Empty icon={CreditCard} text="No registrations yet." /> : (
        <div className="space-y-2">{mine.map((r) => {
          const left = Math.max(0, (r.amount_due || 0) - (r.amount_paid || 0));
          const pct = r.amount_due ? Math.min(100, Math.round(((r.amount_paid || 0) / r.amount_due) * 100)) : 100;
          return (
            <Card key={r.id}>
              <div className="flex justify-between gap-2"><div className="font-semibold truncate">{r.player_name || r.program_name || "Registration"}</div><div className={`text-sm font-semibold ${left ? "text-destructive" : "text-primary"}`}>{left ? `${money(left)} left` : "Paid"}</div></div>
              <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden"><div className="h-full bg-primary" style={{ width: `${pct}%` }} /></div>
            </Card>
          );
        })}</div>
      )}
    </>
  );
}

function MeTab({ user, logout }) {
  return (
    <>
      <div className="flex items-center gap-3 mt-1">
        <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground grid place-items-center text-xl font-bold">{(user?.full_name || user?.email || "?")[0].toUpperCase()}</div>
        <div className="min-w-0"><div className="text-lg font-bold truncate">{user?.full_name || "Your profile"}</div><div className="text-sm text-muted-foreground truncate">{user?.email}</div></div>
      </div>
      <div className="space-y-2 mt-6">
        <Card onClick={() => window.location.assign("/communicationportal?tab=settings")} className="flex items-center gap-3"><Bell className="w-5 h-5 text-primary" /><span className="flex-1 font-medium">Notification settings</span><ChevronRight className="w-4 h-4 text-muted-foreground" /></Card>
        <Card onClick={() => window.location.assign("/familyaccount")} className="flex items-center gap-3"><User className="w-5 h-5 text-primary" /><span className="flex-1 font-medium">Family & players</span><ChevronRight className="w-4 h-4 text-muted-foreground" /></Card>
        <Card onClick={logout} className="flex items-center gap-3"><LogOut className="w-5 h-5 text-primary" /><span className="flex-1 font-medium">Sign out</span></Card>
      </div>
      <DeleteAccountRow user={user} />
    </>
  );
}

function DeleteAccountRow({ user }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const blocked = user?.is_super_admin === true || String(user?.system_role || "").startsWith("system_");
  const run = async () => {
    setBusy(true); setErr("");
    try { await base44.functions.invoke("delete-account", {}); base44.auth.logout("/"); }
    catch (e) { setBusy(false); setErr(e?.response?.data?.error || e?.message || "Could not delete your account. Please try again."); }
  };
  return (
    <>
      <H>Account</H>
      <Card onClick={() => setOpen(true)} className="flex items-center gap-3 text-destructive"><Trash2 className="w-5 h-5" /><span className="flex-1 font-medium">Delete account</span><ChevronRight className="w-4 h-4" /></Card>
      <NativeSheet open={open} onClose={() => { if (!busy) { setOpen(false); setText(""); setErr(""); } }} title="Delete your account?">
        <div className="flex gap-2 rounded-xl bg-destructive/10 p-3 text-sm text-destructive mt-1"><AlertTriangle className="w-5 h-5 shrink-0" /><span>This permanently removes your login, notification settings and pending invitations. It cannot be undone.</span></div>
        <p className="text-sm text-muted-foreground mt-3">Your club keeps its roster, registration and payment records, no longer linked to a login.</p>
        {blocked ? <p className="mt-3 text-sm font-medium">Platform owner accounts can't be deleted from the app.</p> : (
          <>
            <label className="block text-sm font-medium mt-4" htmlFor="beacon-del">Type DELETE to confirm</label>
            <input id="beacon-del" value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" autoCapitalize="characters" className="mt-1.5 w-full rounded-xl border border-border bg-card px-3 py-3 text-base outline-none focus:ring-2 focus:ring-ring" />
            {err && <p className="mt-2 text-sm text-destructive">{err}</p>}
            <button disabled={text !== "DELETE" || busy} onClick={run} className="mt-4 w-full rounded-xl bg-destructive py-3.5 font-semibold text-destructive-foreground disabled:opacity-40 flex items-center justify-center gap-2">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}Permanently delete</button>
          </>
        )}
      </NativeSheet>
    </>
  );
}

export default function BeaconApp() {
  useEffect(() => { let stop = () => {}; initNativeShell().then((f) => { stop = f; }); return () => stop(); }, []);
  const { user, logout } = useAuth();
  const tenant = useTenant();
  const [tab, setTab] = useTab();
  const beacon = useBeaconData(user);
  const myTeams = useMemo(() => accessibleTeams(beacon.teams, beacon.membership), [beacon.teams, beacon.membership]);
  const storeKey = scopeStorageKey(user?.club_id, user?.id);
  const [scopeRaw, setScopeRaw] = useState([]);
  useEffect(() => { try { setScopeRaw(JSON.parse(localStorage.getItem(storeKey) || "[]")); } catch { setScopeRaw([]); } }, [storeKey]);
  const scope = useMemo(() => cleanScope(scopeRaw, myTeams), [scopeRaw, myTeams]);
  // With nothing picked, coaches and families see only their own teams' events.
  const eventScope = useMemo(() => scope.length || beacon.membership?.allTeams ? scope : myTeams.map((t) => t.id).concat(myTeams.length ? [] : ["__none__"]), [scope, myTeams, beacon.membership]);
  const setScope = (next) => { setScopeRaw(next); try { localStorage.setItem(storeKey, JSON.stringify(next)); } catch {} };
  const showPicker = ["home", "messages", "schedule"].includes(tab) && myTeams.length > 1;
  const tabs = [
    ["home", "Home", Home], ["messages", "Messages", MessageCircle], ["schedule", "Schedule", CalendarDays],
    ["tryouts", "Tryouts", ClipboardCheck],
    ["pay", "Pay", CreditCard], ["dashboard", "Dashboard", LayoutDashboard],
  ];
  const active = tab === "me" ? "dashboard" : tabs.some(([k]) => k === tab) ? tab : "home";
  const qc = useQueryClient();
  const channelIds = useMemo(() => [...(beacon.clubChannels || []), ...(beacon.teamGroups || []).flatMap((g) => g.channels || [])].map((c) => c.id), [beacon.clubChannels, beacon.teamGroups]);
  const unread = useUnreadCounts(user, channelIds);
  const brandColor = tenant.brand?.primary_color;

  // Pull-to-refresh: drag down from the top of the page to reload everything.
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  useEffect(() => {
    let startY = null;
    const onStart = (e) => { startY = window.scrollY <= 0 && !document.querySelector('[role="dialog"]') ? e.touches[0].clientY : null; };
    const onMove = (e) => { if (startY == null) return; const d = e.touches[0].clientY - startY; setPull(d > 0 ? Math.min(110, d * 0.5) : 0); };
    const onEnd = async () => {
      if (startY == null) return;
      startY = null;
      setPull((p) => {
        if (p >= 70) {
          haptic("success");
          setRefreshing(true);
          qc.invalidateQueries().finally(() => setTimeout(() => setRefreshing(false), 400));
        }
        return 0;
      });
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd);
    return () => { window.removeEventListener("touchstart", onStart); window.removeEventListener("touchmove", onMove); window.removeEventListener("touchend", onEnd); };
  }, [qc]);
  const [notifOpen, setNotifOpen] = useState(false);
  const { data: alertCount = 0 } = useQuery({ queryKey: ["beacon-notifications", user?.email], enabled: !!user?.email, queryFn: () => base44.entities.Notification.filter({ user_email: user.email }, "-created_date", 50).catch(() => []), select: (rows) => rows.filter((n) => !n.read).length, refetchInterval: 60000 });
  const bellCount = unread.total + alertCount;
  const goTab = (k) => { if (k !== active) haptic(); setTab(k); };

  return (
    <div className="min-h-[100dvh] bg-background overscroll-none select-none [-webkit-tap-highlight-color:transparent] text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur pt-[env(safe-area-inset-top)]">
        <div className="h-1 w-full bg-primary" style={brandColor ? { background: brandColor } : undefined} />
        <div className="mx-auto max-w-md flex items-center gap-2 h-14 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]">
          {tenant.brand?.logo_url ? <img src={tenant.brand.logo_url} alt="" onError={(e) => { e.currentTarget.style.visibility = "hidden"; }} className="w-9 h-9 rounded-xl object-contain bg-card border border-border p-0.5" /> : <div className="w-9 h-9 rounded-xl bg-primary" />}
          <div className="min-w-0 flex-1 leading-tight"><div className="font-black tracking-tight">Beacon</div><div className="text-[11px] text-muted-foreground truncate">{tenant.brand?.club_name || "Your club"}</div></div>
          <ThemeToggle />
          <button onClick={() => { haptic(); setNotifOpen(true); }} aria-label={bellCount ? `Notifications, ${bellCount} new` : "Notifications"} className="relative w-11 h-11 grid place-items-center rounded-full hover:bg-muted active:scale-90 transition"><Bell className="w-5 h-5" />{bellCount > 0 && <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-black grid place-items-center">{bellCount > 99 ? "99+" : bellCount}</span>}</button>
        </div>
      </header>

      <main className={`mx-auto max-w-md px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] select-text ${active === "messages" ? "pt-2" : "pt-3"}`}>
        {(pull > 0 || refreshing) && (
          <div className="flex justify-center overflow-hidden transition-[height] duration-150" style={{ height: refreshing ? 44 : pull * 0.5 }}>
            <RefreshCw className={`w-5 h-5 mt-2 text-primary ${refreshing ? "animate-spin" : ""}`} style={refreshing ? undefined : { transform: `rotate(${pull * 3}deg)`, opacity: Math.min(1, pull / 70) }} />
          </div>
        )}
        <div key={active} className="animate-in fade-in slide-in-from-bottom-2 duration-200 ease-out">
        {showPicker && <div className="mb-1"><TeamScopePicker teams={myTeams} selected={scope} onChange={setScope} /></div>}
        {active === "home" && <HomeTab user={user} go={goTab} scope={eventScope} logout={logout} />}
        {active === "messages" && <ChannelsView user={user} teamScope={scope} />}
        {active === "schedule" && <ScheduleTab scope={eventScope} />}
        {active === "tryouts" && <BeaconTryouts user={user} clubId={tenant.effectiveClubId || user?.club_id} />}
        {active === "pay" && <PayTab user={user} />}
        {active === "dashboard" && <BeaconDevelop user={user} beacon={beacon} clubId={tenant.effectiveClubId || user?.club_id} />}
        </div>
      </main>

      <NotificationsSheet open={notifOpen} onClose={() => setNotifOpen(false)} user={user} unreadMessages={unread.total} onOpenMessages={() => setTab("messages")} onMarkMessagesRead={() => markChannelsRead(unread.messages, user?.email)} />

      <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto max-w-md flex">
          {tabs.map(([k, l, I]) => (
            <button key={k} onClick={() => goTab(k)} aria-label={k === "messages" && unread.total ? `${l}, ${unread.total} unread` : l} className={`flex-1 min-w-0 min-h-[56px] flex flex-col items-center justify-center gap-0.5 py-1.5 text-[10px] transition-colors ${active === k ? "text-primary font-black" : "text-muted-foreground font-semibold"}`}>
              <span className={`relative grid place-items-center w-12 h-8 rounded-full transition-all duration-200 ${active === k ? "bg-primary/15 scale-105" : "scale-100"}`}><I className="w-5 h-5" />{k === "messages" && unread.total > 0 && <span className="absolute -top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-black grid place-items-center">{unread.total > 99 ? "99+" : unread.total}</span>}</span>{l}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
