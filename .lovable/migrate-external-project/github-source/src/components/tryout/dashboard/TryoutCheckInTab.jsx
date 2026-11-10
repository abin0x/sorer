import React, { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Printer, Undo2, UserCheck, Clock } from "lucide-react";
import { toast } from "sonner";
import { PaymentBadge, WaiverBadge } from "@/components/tryout/dashboard/StatusChips";
import { playerAge, printCheckInSheet, sessionOptionLabel } from "@/lib/tryoutDashboard";

/** Check-in desk: works on a phone at the field. Big targets, search by
 *  name or bib number, one tap to check a player in. */
export default function TryoutCheckInTab({ plans, events, registrations, onChanged }) {
  const today = new Date().toISOString().slice(0, 10);
  const ordered = useMemo(() => [...events].sort((a, b) => String(a.date).localeCompare(String(b.date))), [events]);
  const [sessionId, setSessionId] = useState("");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);

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
  const matches = q
    ? list.filter((r) => [r.player_name, r.bib_number ? String(r.bib_number) : "", r.check_in_code, r.guardian_name]
      .filter(Boolean).join(" ").toLowerCase().includes(q))
    : [];

  const waiting = list.filter((r) => !r.checked_in);
  const checkedIn = list.filter((r) => r.checked_in);
  const plan = plans.find((p) => p.id === activeSession?.tryout_plan_id);

  const setChecked = async (reg, checked) => {
    setBusy(true);
    try {
      await base44.entities.TryoutRegistration.update(reg.id, checked
        ? { checked_in: true, checked_in_at: new Date().toISOString(), attended: true, status: "checked_in" }
        : { checked_in: false, checked_in_at: "", attended: false, status: "registered" });
      toast.success(`${reg.player_name} ${checked ? "checked in" : "check-in undone"}`);
      onChanged();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const checkInFromSearch = async () => {
    if (!q) return;
    const byBib = list.find((r) => String(r.bib_number) === q);
    const byCode = list.find((r) => (r.check_in_code || "").toLowerCase() === q);
    const byName = list.find((r) => (r.player_name || "").trim().toLowerCase() === q);
    const match = byBib || byCode || byName || (matches.length === 1 ? matches[0] : null);
    if (!match) { toast.error("No player found for that name or bib number in this session."); return; }
    if (match.checked_in) { toast.info(`${match.player_name} is already checked in.`); setQuery(""); return; }
    await setChecked(match, true);
    setQuery("");
  };

  if (!ordered.length) {
    return <p className="text-sm text-muted-foreground text-center py-16 border border-dashed border-border rounded-xl">No tryout sessions have been scheduled yet.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <Select value={activeSession?.id || ""} onValueChange={setSessionId}>
          <SelectTrigger className="sm:w-80 h-11"><SelectValue placeholder="Pick a session" /></SelectTrigger>
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
          <Printer className="w-4 h-4" /> Print check-in sheet
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold">{waiting.length}</p><p className="text-xs text-muted-foreground">Waiting</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold text-emerald-600">{checkedIn.length}</p><p className="text-xs text-muted-foreground">Checked in</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold">{list.length}</p><p className="text-xs text-muted-foreground">Registered</p>
        </CardContent></Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9 h-12 text-base"
            placeholder="Search by name or bib number…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && checkInFromSearch()}
            inputMode="search"
          />
        </div>
        <Button className="h-12 gap-1.5" disabled={!q || busy} onClick={checkInFromSearch}>
          <UserCheck className="w-4 h-4" /> Check in
        </Button>
      </div>

      {q && matches.length > 0 && (
        <div className="border border-border rounded-xl divide-y divide-border">
          {matches.slice(0, 8).map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-2 p-3">
              <div>
                <p className="font-medium">{Number(r.bib_number) >= 1 ? `#${r.bib_number} ` : ""}{r.player_name}</p>
                <p className="text-xs text-muted-foreground">{r.desired_age_group || "—"} · {r.guardian_name || r.guardian_email}</p>
              </div>
              {r.checked_in
                ? <span className="text-xs text-emerald-600">Checked in</span>
                : <Button className="h-11" disabled={busy} onClick={() => setChecked(r, true)}>Check in</Button>}
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <p className="text-sm font-semibold">Waiting ({waiting.length})</p>
        {waiting.length === 0 && <p className="text-xs text-muted-foreground">Everyone registered for this session is checked in.</p>}
        <div className="grid gap-2 sm:grid-cols-2">
          {waiting.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 border border-border rounded-xl p-3">
              <div className="min-w-0">
                <p className="font-medium truncate">
                  {Number(r.bib_number) >= 1 && <span className="font-mono text-muted-foreground mr-1.5">#{r.bib_number}</span>}
                  {r.player_name}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {playerAge(r) !== null ? `${playerAge(r)} yrs · ` : ""}{r.desired_age_group || r.player_gender || "—"} · {r.guardian_name || r.guardian_email}
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {r.status === "waitlist" && <span className="text-[11px] text-amber-700">Waitlist</span>}
                  <PaymentBadge status={r.payment_status} />
                  <WaiverBadge status={r.waiver_status} />
                </div>
              </div>
              <Button className="h-12 px-5 shrink-0" disabled={busy} onClick={() => setChecked(r, true)}>Check in</Button>
            </div>
          ))}
        </div>
      </div>

      {checkedIn.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold">Checked in ({checkedIn.length})</p>
          <div className="border border-border rounded-xl divide-y divide-border">
            {checkedIn.map((r) => (
              <div key={r.id} className="flex items-center gap-2 p-2.5">
                <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
                <p className="text-sm truncate">
                  {Number(r.bib_number) >= 1 && <span className="font-mono text-muted-foreground mr-1.5">#{r.bib_number}</span>}
                  {r.player_name}
                </p>
                <span className="text-xs text-muted-foreground ml-auto shrink-0">
                  {r.checked_in_at ? new Date(r.checked_in_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                </span>
                <Button size="sm" variant="ghost" disabled={busy} onClick={() => setChecked(r, false)} title="Undo check-in">
                  <Undo2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}