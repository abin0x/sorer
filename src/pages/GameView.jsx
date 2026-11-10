import React, { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams, Link } from "@/lib/router-compat";
import { format } from "date-fns";
import { CloudSun, Droplets, Wind, HandHeart, Plus, X, MapPin, Clock, Shirt, Play, Pause, RotateCcw, Flag, Send, Save, Radio, MessageSquare, Info, Trophy, Plane, Home } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { canSendPriority } from "@/lib/beaconChannels";
import {
  PERIODS, periodLabel, KITS, arrivalTime, clockSeconds, formatClock, clockStart, clockPause, clockReset,
  scoreChange, teamName, opponentName, recapText,
  defaultSlots, claimSlot, releaseSlot, volunteerReminder, zipFrom, weatherLabel, nearestHour,
} from "@/lib/gameDay";

const TABS = [
  { key: "details", label: "Details", icon: Info },
  { key: "chat", label: "Chat", icon: MessageSquare },
  { key: "score", label: "Scorekeeper", icon: Trophy },
];

export default function GameView() {
  const [params, setParams] = useSearchParams();
  const id = params.get("id");
  const tab = params.get("tab") || "details";
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: user } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me() });
  const { data: event, isLoading } = useQuery({
    queryKey: ["game", id], enabled: !!id,
    queryFn: async () => (await base44.entities.CalendarEvent.filter({ id }))[0] || null,
  });
  const teamId = event?.home_team_id || (Array.isArray(event?.team_ids) ? event.team_ids[0] : null);
  const { data: channel } = useQuery({
    queryKey: ["game-channel", event?.club_id, teamId], enabled: !!event?.club_id && !!teamId,
    queryFn: async () => {
      const list = await base44.entities.Channel.filter({ club_id: event.club_id, team_id: teamId });
      return list.find((c) => c.type === "team_chat") || list[0] || null;
    },
  });
  const isStaff = canSendPriority(user);

  // Live: score/clock/period changes from any device land instantly.
  useEffect(() => {
    if (!id) return;
    const ch = supabase
      .channel(`game-${id}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "calendar_events", filter: `id=eq.${id}` },
        (p) => qc.setQueryData(["game", id], (old) => ({ ...(old || {}), ...p.new })))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id, qc]);

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!event?.clock_started_at) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [event?.clock_started_at]);

  const save = async (patch) => {
    if (!patch) return;
    qc.setQueryData(["game", id], (old) => ({ ...old, ...patch }));
    try { await base44.entities.CalendarEvent.update(id, patch); }
    catch (e) { toast({ title: "Couldn't save", description: e?.message, variant: "destructive" }); qc.invalidateQueries({ queryKey: ["game", id] }); }
  };

  const postToChannel = async (content) => {
    if (!channel) { toast({ title: "No team channel", description: "Create the team's Beacon channel first.", variant: "destructive" }); return false; }
    const msg = await base44.entities.ChannelMessage.create({
      club_id: event.club_id, channel_id: channel.id, channel_type: channel.type, team_id: channel.team_id,
      author_email: user?.email, author_name: user?.full_name || user?.email, author_role: user?.custom_role || user?.role,
      moderation_status: "approved", content, urgency: "important",
    });
    base44.functions.invoke("beacon-deliver", { message_id: msg.id, mode: "send" }).catch(() => {});
    return true;
  };

  if (!id) return <Empty text="No game selected." />;
  if (isLoading) return <div className="flex h-[60vh] items-center justify-center"><div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary" /></div>;
  if (!event) return <Empty text="This game wasn't found or you don't have access." />;

  const secs = clockSeconds(event, now);
  const live = event.period && event.period !== "pregame" && event.period !== "final";

  return (
    <div className="min-h-screen bg-background pb-16">
      <div className="sticky top-0 z-20 border-b bg-primary text-primary-foreground shadow-md">
        <div className="mx-auto max-w-3xl px-4 pt-4 pb-2">
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider opacity-80">
            <span className="flex items-center gap-1">{event.is_away ? <Plane className="h-3 w-3" /> : <Home className="h-3 w-3" />}{event.is_away ? "Away" : "Home"}</span>
            <span className="flex items-center gap-1.5">
              {live && <span className="h-2 w-2 animate-pulse rounded-full bg-destructive" />}
              {periodLabel(event.period)}{live ? ` · ${formatClock(secs)}` : ""}
            </span>
          </div>
          <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <p className="truncate text-right text-sm font-bold sm:text-base">{teamName(event)}</p>
            <p className="font-mono text-3xl font-black tabular-nums sm:text-4xl">{event.team_score ?? 0}<span className="mx-2 opacity-50">–</span>{event.opponent_score ?? 0}</p>
            <p className="truncate text-sm font-bold sm:text-base">{opponentName(event)}</p>
          </div>
          <div className="mt-3 flex gap-1">
            {TABS.map((t) => (
              <button key={t.key} onClick={() => { const n = new URLSearchParams(params); n.set("tab", t.key); setParams(n, { replace: true }); }}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-t-lg py-2 text-sm font-semibold transition ${tab === t.key ? "bg-background text-foreground" : "opacity-80 hover:opacity-100"}`}>
                <t.icon className="h-4 w-4" />{t.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-3xl px-4 pt-5">
        {tab === "details" && <Details event={event} user={user} isStaff={isStaff} onSave={save} onNotify={postToChannel} toast={toast} />}
        {tab === "chat" && <Chat channel={channel} />}
        {tab === "score" && <Scorekeeper event={event} secs={secs} isStaff={!!user} onSave={save} onRecap={postToChannel} toast={toast} />}
      </div>
    </div>
  );
}

function Empty({ text }) {
  return <div className="flex h-[60vh] flex-col items-center justify-center gap-3 text-muted-foreground"><p>{text}</p><Link to="/teamcalendar" className="text-primary underline">Back to calendar</Link></div>;
}

function Details({ event, user, isStaff, onSave, onNotify, toast }) {
  const [form, setForm] = useState({
    opponent_name: event.opponent_name || event.away_team_name || "",
    is_away: !!event.is_away, kit: event.kit || "", arrive_minutes_before: event.arrive_minutes_before ?? 45,
    location_text: event.location_text || "",
  });
  const [busy, setBusy] = useState(false);
  const kickoff = event.start_datetime ? new Date(event.start_datetime) : null;
  const arrive = arrivalTime(event.start_datetime, form.arrive_minutes_before);
  const submit = async (notify) => {
    setBusy(true);
    const patch = { ...form, arrive_minutes_before: Number(form.arrive_minutes_before) || 0 };
    await onSave(patch);
    if (notify) {
      const merged = { ...event, ...patch };
      const when = kickoff ? format(kickoff, "EEE MMM d, h:mm a") : "TBD";
      const ok = await onNotify(`📣 Game updated: ${teamName(merged)} ${merged.is_away ? "@" : "vs"} ${opponentName(merged)} — ${when}${arrive ? ` · Arrive by ${format(arrive, "h:mm a")}` : ""}${merged.kit ? ` · Kit: ${merged.kit}` : ""}${merged.location_text ? ` · ${merged.location_text}` : ""}`);
      if (ok) await onSave({ notified: true, notified_at: new Date().toISOString() });
      toast({ title: ok ? "Saved and team notified" : "Saved (team not notified)" });
    } else toast({ title: "Saved quietly", description: "No one was notified." });
    setBusy(false);
  };
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-card p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Kickoff</p>
        <p className="mt-1 text-lg font-bold">{kickoff ? format(kickoff, "EEEE, MMM d · h:mm a") : "Time not set"}</p>
        {arrive && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-accent px-3 py-2 text-accent-foreground">
            <Clock className="h-4 w-4" />
            <span className="text-sm font-semibold">Kickoff {format(kickoff, "h:mm a")} • Arrive by {format(arrive, "h:mm a")} ({form.arrive_minutes_before} min prior)</span>
          </div>
        )}
        <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <Row icon={MapPin} label="Location" value={form.location_text || event.field_name || "TBD"} />
          <Row icon={Shirt} label="Kit" value={form.kit || "Not set"} />
        </div>
      </div>
      <Weather event={event} />
      <Volunteers event={event} user={user} isStaff={isStaff} onSave={onSave} onNotify={onNotify} toast={toast} />
      {isStaff && (
        <div className="space-y-4 rounded-2xl border bg-card p-5 shadow-sm">
          <h3 className="font-bold">Edit match details</h3>
          <label className="block text-sm font-medium">Opponent<Input className="mt-1" value={form.opponent_name} onChange={(e) => setForm({ ...form, opponent_name: e.target.value })} /></label>
          <label className="block text-sm font-medium">Location<Input className="mt-1" value={form.location_text} onChange={(e) => setForm({ ...form, location_text: e.target.value })} /></label>
          <div className="flex items-center justify-between rounded-xl border px-3 py-2.5">
            <span className="text-sm font-medium">Away game</span>
            <Switch checked={form.is_away} onCheckedChange={(v) => setForm({ ...form, is_away: v, kit: form.kit || (v ? KITS[1] : KITS[0]) })} />
          </div>
          <div>
            <p className="mb-1.5 text-sm font-medium">Uniform / kit</p>
            <div className="flex flex-wrap gap-2">
              {KITS.map((k) => (
                <button key={k} onClick={() => setForm({ ...form, kit: k })}
                  className={`rounded-full border px-3 py-1.5 text-sm transition ${form.kit === k ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}>{k}</button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-sm font-medium">Arrive before kickoff</p>
            <div className="flex flex-wrap gap-2">
              {[15, 30, 45, 60].map((m) => (
                <button key={m} onClick={() => setForm({ ...form, arrive_minutes_before: m })}
                  className={`rounded-full border px-3 py-1.5 text-sm transition ${Number(form.arrive_minutes_before) === m ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}>{m} min</button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" className="flex-1" disabled={busy} onClick={() => submit(false)}><Save className="mr-2 h-4 w-4" />Save</Button>
            <Button className="flex-1" disabled={busy} onClick={() => submit(true)}><Send className="mr-2 h-4 w-4" />Save & Notify</Button>
          </div>
          <p className="text-xs text-muted-foreground">Save updates quietly. Save & Notify also posts the change to the team's Beacon channel.</p>
        </div>
      )}
    </div>
  );
}

function Row({ icon: Icon, label, value }) {
  return <div className="flex items-center gap-2"><Icon className="h-4 w-4 text-muted-foreground" /><span className="text-muted-foreground">{label}:</span><span className="font-medium">{value}</span></div>;
}

function Chat({ channel }) {
  const { data: messages = [] } = useQuery({
    queryKey: ["beacon-messages", channel?.id], enabled: !!channel,
    queryFn: () => base44.entities.ChannelMessage.filter({ channel_id: channel.id }, "-created_date", 30),
    refetchInterval: 10000,
  });
  if (!channel) return <p className="py-10 text-center text-muted-foreground">This team doesn't have a Beacon channel yet.</p>;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-bold">#{channel.name}</h3>
        <Link to={`/communicationportal?channel=${channel.id}`} className="text-sm font-semibold text-primary">Open in Beacon →</Link>
      </div>
      {messages.filter((m) => !m.is_deleted && m.moderation_status !== "held").map((m) => (
        <div key={m.id} className="rounded-2xl border bg-card p-3 shadow-sm">
          <p className="text-xs text-muted-foreground"><span className="font-semibold text-foreground">{m.author_name}</span> · {m.created_date ? format(new Date(m.created_date), "MMM d, h:mm a") : ""}</p>
          <p className="mt-1 whitespace-pre-wrap text-sm">{m.content}</p>
        </div>
      ))}
      {messages.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No messages yet.</p>}
    </div>
  );
}

function Scorekeeper({ event, secs, isStaff, onSave, onRecap, toast }) {
  const [finalOpen, setFinalOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const running = !!event.clock_started_at;
  const isFinal = event.period === "final";
  const finish = async (post) => {
    setBusy(true);
    await onSave({ period: "final", ...clockPause(event) });
    if (post && !event.final_posted_at) {
      const ok = await onRecap(recapText(event));
      if (ok) { await onSave({ final_posted_at: new Date().toISOString() }); toast({ title: "Recap posted to the team channel" }); }
    }
    setBusy(false); setFinalOpen(false);
  };
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-card p-5 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Clock</p>
        <p className="mt-1 font-mono text-5xl font-black tabular-nums">{formatClock(secs)}</p>
        <p className="mt-1 text-xs text-muted-foreground">Clock is unofficial</p>
        {isStaff && !isFinal && (
          <div className="mt-4 flex justify-center gap-2">
            {running
              ? <Button variant="outline" onClick={() => onSave(clockPause(event))}><Pause className="mr-1.5 h-4 w-4" />Pause</Button>
              : <Button onClick={() => onSave({ ...clockStart(event), ...(event.period === "pregame" ? { period: "first_half" } : {}) })}><Play className="mr-1.5 h-4 w-4" />Start</Button>}
            <Button variant="ghost" onClick={() => onSave(clockReset())}><RotateCcw className="mr-1.5 h-4 w-4" />Reset</Button>
          </div>
        )}
      </div>
      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Period</p>
        <div className="grid grid-cols-5 gap-1.5">
          {PERIODS.map((p) => (
            <button key={p.key} disabled={!isStaff || isFinal}
              onClick={() => (p.key === "final" ? setFinalOpen(true) : onSave({ period: p.key, ...(p.key === "halftime" ? clockPause(event) : {}) }))}
              className={`rounded-lg px-1 py-2 text-xs font-semibold transition sm:text-sm ${event.period === p.key ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70"} disabled:cursor-default`}>{p.label}</button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[["team", teamName(event), event.team_score], ["opponent", opponentName(event), event.opponent_score]].map(([side, name, score]) => (
          <div key={side} className="rounded-2xl border bg-card p-4 text-center shadow-sm">
            <p className="truncate text-sm font-semibold">{name}</p>
            <p className="my-2 font-mono text-6xl font-black tabular-nums">{score ?? 0}</p>
            {isStaff && !isFinal && (
              <div className="space-y-2">
                <Button className="h-14 w-full text-lg font-bold" onClick={() => onSave(scoreChange(event, side, 1))}>+ GOAL</Button>
                <Button variant="outline" size="sm" className="w-full" onClick={() => onSave(scoreChange(event, side, -1))}>− 1</Button>
              </div>
            )}
          </div>
        ))}
      </div>
      {isStaff && !isFinal && (
        <Button variant="destructive" className="h-12 w-full" onClick={() => setFinalOpen(true)}><Flag className="mr-2 h-4 w-4" />Final whistle</Button>
      )}
      {isFinal && (
        <div className="rounded-2xl border border-primary/30 bg-accent p-4 text-center text-accent-foreground">
          <p className="font-bold">Final score</p>
          {event.final_posted_at ? <p className="text-sm">Recap posted to the team channel.</p>
            : isStaff && <Button size="sm" className="mt-2" disabled={busy} onClick={() => finish(true)}><Radio className="mr-1.5 h-4 w-4" />Post recap to Beacon</Button>}
        </div>
      )}
      <p className="text-center text-xs text-muted-foreground">Any parent or coach at the field can keep score. Everyone sees it update live.</p>
      <Dialog open={finalOpen} onOpenChange={setFinalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Final score: {event.team_score ?? 0} – {event.opponent_score ?? 0}?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This locks the score. Post a match recap to the team's Beacon channel?</p>
          <p className="rounded-lg bg-muted p-3 text-sm">{recapText(event)}</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" disabled={busy} onClick={() => finish(false)}>End without posting</Button>
            <Button disabled={busy} onClick={() => finish(true)}><Send className="mr-1.5 h-4 w-4" />End & post recap</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Weather({ event }) {
  const place = event.location_text || event.field_name || "";
  const { data, isLoading } = useQuery({
    queryKey: ["game-weather", place, event.start_datetime], enabled: !!place && !!event.start_datetime, staleTime: 30 * 60000,
    queryFn: async () => {
      const zip = zipFrom(place);
      let lat, lon;
      if (zip) {
        const r = await fetch(`https://api.zippopotam.us/us/${zip}`);
        if (r.ok) { const j = await r.json(); lat = j.places?.[0]?.latitude; lon = j.places?.[0]?.longitude; }
      }
      if (!lat) {
        const name = place.split(",").slice(-2, -1)[0]?.trim() || place;
        const g = await (await fetch(`https://geocoding-api.open-meteo.com/v1/search?count=1&name=${encodeURIComponent(name)}`)).json();
        lat = g.results?.[0]?.latitude; lon = g.results?.[0]?.longitude;
      }
      if (!lat) return { error: "location" };
      const w = await (await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,precipitation_probability,weather_code,wind_speed_10m&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto&forecast_days=16`)).json();
      const i = nearestHour(w.hourly?.time, event.start_datetime);
      if (i < 0) return { error: "range" };
      return { temp: Math.round(w.hourly.temperature_2m[i]), rain: w.hourly.precipitation_probability[i], wind: Math.round(w.hourly.wind_speed_10m[i]), label: weatherLabel(w.hourly.weather_code[i]) };
    },
  });
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Kickoff weather</p>
      {!place ? <p className="mt-1 text-sm text-muted-foreground">Add a field address with a zip code to see the forecast.</p>
        : isLoading ? <p className="mt-1 text-sm text-muted-foreground">Checking the forecast…</p>
        : !data || data.error ? <p className="mt-1 text-sm text-muted-foreground">{data?.error === "range" ? "Forecast shows up about two weeks before the game." : "Couldn't find this field's location — add a zip code."}</p>
        : (
          <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2">
            <span className="flex items-center gap-2 text-lg font-bold"><CloudSun className="h-6 w-6 text-primary" />{data.label}, {data.temp}°F</span>
            <span className="flex items-center gap-1 text-sm text-muted-foreground"><Droplets className="h-4 w-4" />{data.rain ?? 0}% rain</span>
            <span className="flex items-center gap-1 text-sm text-muted-foreground"><Wind className="h-4 w-4" />{data.wind} mph</span>
          </div>
        )}
    </div>
  );
}

function Volunteers({ event, user, isStaff, onSave, onNotify, toast }) {
  const slots = event.volunteer_slots?.length ? event.volunteer_slots : defaultSlots();
  const [newRole, setNewRole] = useState("");
  const me = { email: user?.email, name: user?.full_name || user?.email };
  const filled = slots.filter((s) => s.email).length;
  const remind = async () => {
    const text = volunteerReminder(event, slots);
    if (!text) return toast({ title: "All spots are filled" });
    if (await onNotify(text)) toast({ title: "Reminder posted to the team channel" });
  };
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 font-bold"><HandHeart className="h-5 w-5 text-primary" />Volunteers</p>
        <span className="text-sm text-muted-foreground">{filled}/{slots.length} filled</span>
      </div>
      <div className="mt-3 space-y-2">
        {slots.map((s) => (
          <div key={s.id} className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 ${s.email ? "bg-accent/50" : ""}`}>
            <div className="min-w-0">
              <p className="text-sm font-semibold">{s.role}</p>
              <p className="truncate text-xs text-muted-foreground">{s.name || "Open"}</p>
            </div>
            <div className="flex shrink-0 gap-1">
              {!s.email && user && <Button size="sm" onClick={() => onSave({ volunteer_slots: claimSlot(slots, s.id, me) })}>I'll do it</Button>}
              {s.email && s.email === user?.email && <Button size="sm" variant="outline" onClick={() => onSave({ volunteer_slots: releaseSlot(slots, s.id, user.email) })}>Can't anymore</Button>}
              {isStaff && <Button size="icon" variant="ghost" aria-label="Remove spot" onClick={() => onSave({ volunteer_slots: slots.filter((x) => x.id !== s.id) })}><X className="h-4 w-4" /></Button>}
            </div>
          </div>
        ))}
      </div>
      {isStaff && (
        <div className="mt-3 space-y-2">
          <div className="flex gap-2">
            <Input placeholder="Add a spot, e.g. Water cooler" value={newRole} onChange={(e) => setNewRole(e.target.value)} />
            <Button variant="outline" disabled={!newRole.trim()} onClick={() => { onSave({ volunteer_slots: [...slots, { id: `s${Date.now()}`, role: newRole.trim(), email: null, name: null }] }); setNewRole(""); }}><Plus className="h-4 w-4" /></Button>
          </div>
          <Button variant="secondary" className="w-full" onClick={remind}><Send className="mr-2 h-4 w-4" />Remind team about open spots</Button>
        </div>
      )}
    </div>
  );
}
