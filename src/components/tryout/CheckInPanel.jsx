import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, QrCode, CheckCircle2, Clock, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { checkInByCodeOrName, checkInRegistration, qrCheckInUrl } from "@/lib/tryoutDay";

/** Tryout day check-in: search by name or 6-char code, QR code per registration. */
export default function CheckInPanel({ event, clubId }) {
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [qrFor, setQrFor] = useState(null);

  const { data: regs = [], isLoading } = useQuery({
    queryKey: ["checkin-regs", event?.id],
    queryFn: () => base44.entities.TryoutRegistration.filter({ tryout_event_id: event.id }, "checked_in", 500),
    enabled: !!event?.id,
  });

  const checkedIn = regs.filter((r) => r.checked_in);
  const waitlist = regs.filter((r) => r.status === "waitlist");
  const notCheckedIn = regs.filter((r) => !r.checked_in && r.status !== "waitlist");

  const doCheckIn = async () => {
    if (!query.trim()) return;
    try {
      const reg = await checkInByCodeOrName(event.id, query);
      toast.success(`${reg.player_name} checked in`);
      setQuery("");
      qc.invalidateQueries({ queryKey: ["checkin-regs", event.id] });
    } catch (e) {
      toast.error(e.message);
    }
  };

  const manualCheckIn = async (reg) => {
    await checkInRegistration(reg.id);
    toast.success(`${reg.player_name} checked in`);
    qc.invalidateQueries({ queryKey: ["checkin-regs", event.id] });
  };

  if (!event) return <p className="text-sm text-muted-foreground">Select an event to manage check-in.</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Player name or 6-char code…" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && doCheckIn()} />
        </div>
        <Button onClick={doCheckIn} disabled={!query.trim()} className="gap-1.5"><UserCheck className="w-4 h-4" /> Check in</Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold text-foreground">{regs.length}</p><p className="text-xs text-muted-foreground">Registered</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold text-emerald-600">{checkedIn.length}</p><p className="text-xs text-muted-foreground">Checked in</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold text-amber-600">{waitlist.length}</p><p className="text-xs text-muted-foreground">Waitlist</p></CardContent></Card>
      </div>

      {qrFor && (
        <div className="flex flex-col items-center gap-2 border border-border rounded-xl p-4 bg-muted/30">
          <img src={qrCheckInUrl(event.id, qrFor.check_in_code)} alt="QR check-in code" className="w-40 h-40 rounded-lg" />
          <p className="text-sm font-medium">{qrFor.player_name}</p>
          <p className="text-xs text-muted-foreground font-mono">{qrFor.check_in_code}</p>
          <Button size="sm" variant="ghost" onClick={() => setQrFor(null)}>Close</Button>
        </div>
      )}

      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">Not checked in ({notCheckedIn.length})</p>
        <div className="border border-border rounded-lg divide-y divide-border max-h-64 overflow-y-auto">
          {notCheckedIn.map((r) => (
            <div key={r.id} className="flex items-center justify-between p-2.5 gap-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <div><p className="text-sm font-medium">{r.player_name}</p><p className="text-xs text-muted-foreground">{r.guardian_email}{r.source === "inside" && " · Inside"}</p></div>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => setQrFor(r)}><QrCode className="w-4 h-4" /></Button>
                <Button size="sm" variant="outline" onClick={() => manualCheckIn(r)}>Check in</Button>
              </div>
            </div>
          ))}
          {notCheckedIn.length === 0 && <p className="p-3 text-xs text-muted-foreground text-center">Everyone has checked in.</p>}
        </div>
      </div>

      {checkedIn.length > 0 && (
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">Checked in ({checkedIn.length})</p>
          <div className="border border-border rounded-lg divide-y divide-border max-h-48 overflow-y-auto">
            {checkedIn.map((r) => (
              <div key={r.id} className="flex items-center gap-2 p-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <p className="text-sm">{r.player_name}</p>
                <span className="text-xs text-muted-foreground ml-auto">{r.checked_in_at ? new Date(r.checked_in_at).toLocaleTimeString() : ""}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}