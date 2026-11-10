import React, { useMemo, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Printer, Undo2, Check, X, FileWarning, CreditCard, Hourglass } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { playerAge, printCheckInSheet, sessionOptionLabel } from "@/lib/tryoutDashboard";

const FILTERS = [
  { key: "waiting", label: "Waiting" },
  { key: "in", label: "Checked in" },
  { key: "flags", label: "Needs attention" },
  { key: "all", label: "Everyone" },
];

const needsPayment = (r) => r.payment_status && !["paid", "waived", "refunded", "free", "not_required"].includes(r.payment_status);
const needsWaiver = (r) => r.waiver_status && r.waiver_status !== "signed";

function Initials({ name, done }) {
  const text = (name || "?").split(" ").map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
  return (
    <div className={cn(
      "w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-colors",
      done ? "bg-status-success text-primary-foreground" : "bg-primary/10 text-primary",
    )}>
      {done ? <Check className="w-6 h-6" /> : text}
    </div>
  );
}

/** Check-in desk: built for a phone at the field. Type a bib or name and press
 *  Enter, or tap a big player row; every player shows what they still owe. */
export default function TryoutCheckInTab({ plans, events, registrations, onChanged }) {
  const today = new Date().toISOString().slice(0, 10);
  const ordered = useMemo(() => [...events].sort((a, b) => String(a.date).localeCompare(String(b.date))), [events]);
  const [sessionId, setSessionId] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("waiting");
  const [busyId, setBusyId] = useState("");
  const [lastIn, setLastIn] = useState(null);
  const searchRef = useRef(null);

  const activeSession = ordered.find((e) => e.id === sessionId)
    || ordered.find((e) => e.date >= today)
    || ordered[ordered.length - 1]
    || null;

  const list = useMemo(
    () => registrations
      .filter((r) => r.tryout_event_id === activeSession?.id && r.status !== "cancelled" && r.status !== "pooled")
      .sort((a, b) => (Number(a.bib_number) || 9999) - (Number(b.bib_number) || 9999)),
    [registrations, activeSession],
  );

  const q = query.trim().toLowerCase();
  const checkedIn = list.filter((r) => r.checked_in);
  const flagged = list.filter((r) => needsPayment(r) || needsWaiver(r));
  const pct = list.length ? Math.round((checkedIn.length / list.length) * 100) : 0;
  const plan = plans.find((p) => p.id === activeSession?.tryout_plan_id);

  const shown = list.filter((r) => {
    if (q) {
      return [r.player_name, r.bib_number ? String(r.bib_number) : "", r.check_in_code, r.guardian_name]
        .filter(Boolean).join(" ").toLowerCase().includes(q);
    }
    if (filter === "waiting") return !r.checked_in;
    if (filter === "in") return r.checked_in;
    if (filter === "flags") return needsPayment(r) || needsWaiver(r);
    return true;
  });

  const setChecked = async (reg, checked) => {
    setBusyId(reg.id);
    try {
      await base44.entities.TryoutRegistration.update(reg.id, checked
        ? { checked_in: true, checked_in_at: new Date().toISOString(), attended: true, status: "checked_in" }
        : { checked_in: false, checked_in_at: "", attended: false, status: "registered" });
      if (checked) setLastIn(reg);
      toast.success(`${reg.player_name} ${checked ? "checked in" : "check-in undone"}`);
      onChanged();
    } catch (e) {
      toast.error(e.message || "Couldn't save the check-in. Try again.");
    } finally {
      setBusyId("");
    }
  };

  const checkInFromSearch = async () => {
    if (!q) return;
    const exact = list.find((r) => String(r.bib_number) === q)
      || list.find((r) => (r.check_in_code || "").toLowerCase() === q)
      || list.find((r) => (r.player_name || "").trim().toLowerCase() === q);
    const match = exact || (shown.length === 1 ? shown[0] : null);
    if (!match) { toast.error(shown.length ? "More than one player matches — tap the right one." : "No player with that name or bib in this session."); return; }
    if (match.checked_in) { toast.info(`${match.player_name} is already checked in.`); setQuery(""); return; }
    await setChecked(match, true);
    setQuery("");
    searchRef.current?.focus();
  };

  if (!ordered.length) {
    return <p className="text-sm text-muted-foreground text-center py-16 border border-dashed border-border rounded-2xl">No tryout sessions have been scheduled yet.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <Select value={activeSession?.id || ""} onValueChange={setSessionId}>
          <SelectTrigger className="sm:w-96 h-11"><SelectValue placeholder="Pick a session" /></SelectTrigger>
          <SelectContent>
            {ordered.map((e) => <SelectItem key={e.id} value={e.id}>{sessionOptionLabel(e)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          className="h-11 gap-1.5 sm:ml-auto"
          onClick={() => printCheckInSheet({
            title: `${sessionOptionLabel(activeSession)} — check-in sheet`,
            subtitle: `${plan?.title || "Tryout"} · ${list.length} registered`,
            rows: list,
          })}
        >
          <Printer className="w-4 h-4" /> Print sheet
        </Button>
      </div>

      {/* Progress */}
      <div className="rounded-2xl bg-primary text-primary-foreground p-5 shadow-md">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm opacity-80">{plan?.title || "Tryout"} · check-in</p>
            <p className="text-4xl font-bold tracking-tight">
              {checkedIn.length}<span className="text-xl opacity-70"> / {list.length}</span>
            </p>
          </div>
          <div className="flex gap-5 text-sm">
            <div><p className="text-2xl font-bold">{list.length - checkedIn.length}</p><p className="opacity-80">Waiting</p></div>
            <div><p className="text-2xl font-bold">{flagged.length}</p><p className="opacity-80">Need attention</p></div>
          </div>
        </div>
        <div className="mt-4 h-2.5 rounded-full bg-primary-foreground/20 overflow-hidden" aria-label={`${pct}% checked in`}>
          <div className="h-full rounded-full bg-primary-foreground transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Search: sticky so the desk can keep typing bib numbers */}
      <div className="sticky top-0 z-20 -mx-1 px-1 py-2 bg-background/95 backdrop-blur">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              ref={searchRef}
              className="pl-12 pr-10 h-14 text-lg rounded-2xl shadow-sm"
              placeholder="Bib number or name, then Enter"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && checkInFromSearch()}
              inputMode="search"
              aria-label="Find a player to check in"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-muted-foreground hover:bg-muted">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <Button className="h-14 px-6 rounded-2xl text-base" disabled={!q || !!busyId} onClick={checkInFromSearch}>
            Check in
          </Button>
        </div>
        {!q && (
          <div className="flex gap-2 pt-3 overflow-x-auto" role="tablist">
            {FILTERS.map((f) => {
              const count = f.key === "waiting" ? list.length - checkedIn.length : f.key === "in" ? checkedIn.length : f.key === "flags" ? flagged.length : list.length;
              return (
                <button key={f.key} type="button" role="tab" aria-selected={filter === f.key} onClick={() => setFilter(f.key)}
                  className={cn("shrink-0 h-9 px-4 rounded-full text-sm font-medium border transition-colors",
                    filter === f.key ? "bg-foreground text-background border-foreground" : "bg-card text-muted-foreground border-border hover:border-primary/40")}>
                  {f.label} <span className="opacity-70">{count}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {lastIn && !q && (
        <div className="flex items-center gap-3 rounded-xl border border-status-success/40 bg-status-success-50 p-3 text-sm">
          <Check className="w-4 h-4 text-status-success-700 shrink-0" />
          <span className="flex-1 min-w-0 truncate"><strong>{lastIn.player_name}</strong> just checked in{lastIn.bib_number ? ` · bib #${lastIn.bib_number}` : ""}</span>
          <Button size="sm" variant="ghost" onClick={() => { setChecked(lastIn, false); setLastIn(null); }}>
            <Undo2 className="w-4 h-4 mr-1" /> Undo
          </Button>
        </div>
      )}

      <div className="grid gap-2 md:grid-cols-2">
        {shown.map((r) => {
          const age = playerAge(r);
          return (
            <div key={r.id} className={cn(
              "flex items-center gap-3 rounded-2xl border p-3 bg-card transition-all",
              r.checked_in ? "border-status-success/40" : "border-border hover:border-primary/40 hover:shadow-sm",
            )}>
              <Initials name={r.player_name} done={r.checked_in} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold truncate">
                  {Number(r.bib_number) >= 1 && <span className="font-mono text-primary mr-2">#{r.bib_number}</span>}
                  {r.player_name}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {age !== null ? `${age} yrs · ` : ""}{r.desired_age_group || r.player_gender || "—"} · {r.guardian_name || r.guardian_email}
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1.5">
                  {r.status === "waitlist" && <Flag icon={Hourglass}>Waitlist</Flag>}
                  {needsPayment(r) && <Flag icon={CreditCard}>Not paid</Flag>}
                  {needsWaiver(r) && <Flag icon={FileWarning}>No waiver</Flag>}
                  {r.checked_in && r.checked_in_at && (
                    <span className="text-[11px] text-status-success-700 font-medium">
                      In at {new Date(r.checked_in_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  )}
                </div>
              </div>
              {r.checked_in ? (
                <Button variant="ghost" size="icon" className="h-12 w-12 shrink-0" disabled={busyId === r.id}
                  onClick={() => setChecked(r, false)} aria-label={`Undo check-in for ${r.player_name}`}>
                  <Undo2 className="w-5 h-5" />
                </Button>
              ) : (
                <Button className="h-12 px-5 rounded-xl shrink-0" disabled={busyId === r.id} onClick={() => setChecked(r, true)}>
                  Check in
                </Button>
              )}
            </div>
          );
        })}
      </div>
      {shown.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-10 border border-dashed border-border rounded-2xl">
          {q ? "No player matches that search in this session." : filter === "waiting" ? "Everyone is checked in. 🎉" : "Nobody here."}
        </p>
      )}
    </div>
  );
}

function Flag({ icon: Icon, children }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-status-warning-50 text-status-warning-700">
      <Icon className="w-3 h-3" /> {children}
    </span>
  );
}
