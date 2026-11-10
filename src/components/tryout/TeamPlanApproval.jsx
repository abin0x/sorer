import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Check, X, DollarSign, ClipboardCheck } from "lucide-react";
import { toast } from "sonner";
import { approveTeamPlan, rejectTeamPlan } from "@/lib/tryoutDay";

/** Team plan approval: admins review draft plans and approve (→ active) or reject (→ draft with reason). */
export default function TeamPlanApproval({ clubId }) {
  const qc = useQueryClient();
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const pendingQuery = useQuery({
    queryKey: ["team-plans-pending", clubId],
    queryFn: () => base44.entities.TeamPlan.filter({ club_id: clubId, status: "draft" }, "-created_date", 200),
    enabled: !!clubId,
    retry: 1,
  });
  const { data: plans = [], isLoading } = pendingQuery;

  const approvedQuery = useQuery({
    queryKey: ["team-plans-approved", clubId],
    queryFn: () => base44.entities.TeamPlan.filter({ club_id: clubId, status: "active" }, "-created_date", 50),
    enabled: !!clubId,
    retry: 1,
  });
  const { data: approved = [] } = approvedQuery;

  const refreshPlans = () => {
    qc.invalidateQueries({ queryKey: ["team-plans-pending", clubId] });
    qc.invalidateQueries({ queryKey: ["team-plans-approved", clubId] });
    qc.invalidateQueries({ queryKey: ["teamPlans", clubId] });
  };

  const approve = async (plan) => {
    setBusy(true);
    try {
      await approveTeamPlan(plan, clubId);
      toast.success(`${plan.team_name} approved`);
    } catch (e) { toast.error(e.message || "Could not approve plan"); }
    finally { refreshPlans(); setBusy(false); }
  };

  const doReject = async () => {
    if (!rejecting || !reason.trim()) return;
    setBusy(true);
    try {
      await rejectTeamPlan(rejecting, reason, clubId);
      toast.success(`${rejecting.team_name} sent back for revision`);
      setRejecting(null); setReason("");
    } catch (e) { toast.error(e.message || "Could not reject plan"); }
    finally { refreshPlans(); setBusy(false); }
  };

  if (!clubId) return <p className="text-sm text-muted-foreground">Select a club to review team plans.</p>;
  if (pendingQuery.error || approvedQuery.error) return <div role="alert" className="space-y-3 py-8"><p className="text-destructive">Could not load team plans. {(pendingQuery.error || approvedQuery.error)?.message}</p><Button variant="outline" onClick={() => { pendingQuery.refetch(); approvedQuery.refetch(); }}>Try again</Button></div>;
  if (isLoading) return <p className="text-sm text-muted-foreground">Loading team plans…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ClipboardCheck className="w-5 h-5 text-primary" />
        <h3 className="text-base font-semibold">Team Plan Approval</h3>
        <Badge variant="outline">{plans.length} pending</Badge>
      </div>

      {plans.length === 0 && <p className="text-sm text-muted-foreground border border-dashed rounded-xl p-6 text-center">No plans waiting for approval.</p>}

      <div className="space-y-2">
        {plans.map((plan) => (
          <Card key={plan.id}><CardContent className="p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{plan.team_name}</p>
                <p className="text-xs text-muted-foreground">{plan.age_group} {plan.gender} {plan.playing_format} · {plan.season || "No season"}{plan.coach_name ? ` · ${plan.coach_name}` : ""}</p>
                <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-muted-foreground">
                  {plan.club_dues > 0 && <span className="flex items-center gap-0.5"><DollarSign className="w-3 h-3" />{plan.club_dues}/yr</span>}
                  {plan.tournament_count > 0 && <span>{plan.tournament_count} tournaments</span>}
                  {plan.league_games && <span>{plan.league_games}</span>}
                  {(plan.fall_training || plan.winter_training || plan.spring_training) && <span>3-season training</span>}
                </div>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <Button size="sm" variant="outline" disabled={busy} className="gap-1 text-destructive hover:text-destructive" onClick={() => { setReason(""); setRejecting(plan); }}><X className="w-3.5 h-3.5" /> Reject</Button>
                <Button size="sm" disabled={busy} className="gap-1" onClick={() => approve(plan)}><Check className="w-3.5 h-3.5" /> Approve</Button>
              </div>
            </div>
          </CardContent></Card>
        ))}
      </div>

      {approved.length > 0 && (
        <div className="space-y-1.5 pt-3 border-t border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Recently Approved ({approved.length})</p>
          {approved.slice(0, 5).map((p) => (
            <div key={p.id} className="flex items-center gap-2 text-sm">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>{p.team_name}</span>
              <span className="text-xs text-muted-foreground">{p.age_group} {p.gender}</span>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!rejecting} onOpenChange={(o) => !o && setRejecting(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Reject {rejecting?.team_name}?</DialogTitle></DialogHeader>
          <Textarea placeholder="Reason for rejection (sent back to the coach for revision)…" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejecting(null)}>Cancel</Button>
            <Button variant="destructive" onClick={doReject} disabled={busy || !reason.trim()}>Send back</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}