import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, CheckCircle2, Circle, Mail } from "lucide-react";
import { toast } from "sonner";
import { sendOffers, registrationChecklist } from "@/lib/tryoutDay";

/** Offers + registration checklist: send offers to rostered players, track acceptance. */
export default function OfferPanel({ plan, teams, clubId }) {
  const qc = useQueryClient();
  const [selectedTeam, setSelectedTeam] = useState(teams[0]?.id || "");
  const [sending, setSending] = useState(false);

  const team = teams.find((t) => t.id === selectedTeam);
  const rosteredIds = (team?.player_ids || []);

  const { data: players = [] } = useQuery({
    queryKey: ["offer-players", rosteredIds.join(",")],
    queryFn: () => Promise.all(rosteredIds.map((id) => base44.entities.Player.get(id).catch(() => null))).then((r) => r.filter(Boolean)),
    enabled: rosteredIds.length > 0,
  });

  const { data: finalRegs = [] } = useQuery({
    queryKey: ["offer-final-regs", plan?.id, selectedTeam],
    queryFn: () => base44.entities.TryoutFinalRegistration.filter({ tryout_plan_id: plan.id, team_id: selectedTeam }, "-invited_date", 500),
    enabled: !!plan?.id && !!selectedTeam,
  });

  const regByPlayer = Object.fromEntries(finalRegs.map((r) => [r.player_id, r]));
  const unoffered = players.filter((p) => !regByPlayer[p.id]);

  const sendAll = async () => {
    if (!team || unoffered.length === 0) return;
    if (!window.confirm(`Send offers to ${unoffered.length} player(s) on ${team.name}? This emails each family an invitation to complete registration.`)) return;
    setSending(true);
    try {
      await sendOffers({ clubId, plan, team, players: unoffered });
      toast.success(`${unoffered.length} offer(s) sent`);
      qc.invalidateQueries({ queryKey: ["offer-final-regs"] });
    } catch (e) { toast.error("Failed to send offers"); }
    setSending(false);
  };

  const resend = async (fr) => {
    await base44.entities.TryoutFinalRegistration.update(fr.id, { invited_date: new Date().toISOString(), status: "invited" });
    toast.success(`Invitation resent to ${fr.player_name}`);
    qc.invalidateQueries({ queryKey: ["offer-final-regs"] });
  };

  if (teams.length === 0) return <p className="text-sm text-muted-foreground">No teams in this plan.</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={selectedTeam} onValueChange={setSelectedTeam}>
          <SelectTrigger className="w-64"><SelectValue placeholder="Select team" /></SelectTrigger>
          <SelectContent>{teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
        </Select>
        {team && <Button onClick={sendAll} disabled={sending || unoffered.length === 0} className="gap-1.5"><Send className="w-4 h-4" /> Send {unoffered.length} offer(s)</Button>}
      </div>

      {team && (
        <div className="space-y-2">
          {players.map((p) => {
            const fr = regByPlayer[p.id];
            const checklist = registrationChecklist(p, fr);
            const done = checklist.filter((c) => c.done).length;
            return (
              <Card key={p.id}><CardContent className="p-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div>
                    <p className="text-sm font-semibold">{p.first_name} {p.last_name}</p>
                    <p className="text-xs text-muted-foreground">{p.guardian_name} · {p.guardian_email || "no email"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{done}/{checklist.length} steps</Badge>
                    {fr?.status === "paid" && <Badge className="bg-emerald-100 text-emerald-700 text-xs">Paid</Badge>}
                    {fr?.status === "submitted" && <Badge className="bg-blue-100 text-blue-700 text-xs">Submitted</Badge>}
                    {fr?.status === "invited" && <Badge className="bg-amber-100 text-amber-700 text-xs">Invited</Badge>}
                    {!fr && <Badge variant="outline" className="text-xs">No offer</Badge>}
                    {fr && fr.status === "invited" && <Button size="sm" variant="ghost" onClick={() => resend(fr)} className="h-7 gap-1"><Mail className="w-3.5 h-3.5" /> Resend</Button>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  {checklist.map((c) => (
                    <span key={c.key} className="flex items-center gap-1 text-xs">
                      {c.done ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Circle className="w-3.5 h-3.5 text-muted-foreground" />}
                      <span className={c.done ? "text-foreground" : "text-muted-foreground"}>{c.label}</span>
                    </span>
                  ))}
                </div>
              </CardContent></Card>
            );
          })}
          {players.length === 0 && <p className="text-sm text-muted-foreground border border-dashed rounded-xl p-6 text-center">No players rostered on {team.name} yet. Use the Roster Board to assign players.</p>}
        </div>
      )}
    </div>
  );
}