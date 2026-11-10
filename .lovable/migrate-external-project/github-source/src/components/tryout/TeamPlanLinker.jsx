import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useTenant } from "@/lib/TenantContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Users, Link2, X } from "lucide-react";
import { toast } from "sonner";

/**
 * Popover dialog that links teams to a team plan.
 * A team can only be assigned to one plan; checking a team here reassigns it
 * from its previous plan to this one.
 */
export default function TeamPlanLinker({ plan, open, onOpenChange }) {
  const tenant = useTenant();
  const clubId = tenant.effectiveClubId || tenant.club?.id;
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);

  const { data: allTeams = [], isLoading } = useQuery({
    queryKey: ["teams-for-plan-linking", clubId],
    queryFn: () => base44.entities.Team.filter({ club_id: clubId }, "name", 500),
    enabled: !!clubId && open,
  });

  const linkedTeams = allTeams.filter((t) => t.team_plan_id === plan?.id);

  const toggleTeam = async (team) => {
    setSaving(true);
    try {
      if (team.team_plan_id === plan.id) {
        // Unlink
        await base44.entities.Team.update(team.id, { team_plan_id: "" });
      } else {
        // Link (reassigns from previous plan if any)
        await base44.entities.Team.update(team.id, { team_plan_id: plan.id });
      }
      qc.invalidateQueries({ queryKey: ["teams-for-plan-linking", clubId] });
      qc.invalidateQueries({ queryKey: ["teamPlans", clubId] });
      qc.invalidateQueries({ queryKey: ["teams", clubId] });
    } catch (e) {
      toast.error("Could not update team assignment");
    }
    setSaving(false);
  };

  if (!plan) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col overflow-hidden p-0">
        <DialogHeader className="p-5 pb-3 border-b border-border/60">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Link2 className="w-4 h-4 text-primary" />
            Link teams to {plan.team_name}
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            {linkedTeams.length} team{linkedTeams.length !== 1 ? "s" : ""} linked. A team can only be assigned to one plan at a time.
          </p>
        </DialogHeader>

        <div className="overflow-y-auto p-5 flex-1 space-y-1">
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Loading teams…</p>
          ) : allTeams.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No teams in this club yet.</p>
          ) : (
            allTeams.map((team) => {
              const isLinked = team.team_plan_id === plan.id;
              const otherPlan = team.team_plan_id && team.team_plan_id !== plan.id;
              return (
                <label
                  key={team.id}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/40 cursor-pointer border border-transparent hover:border-border/60 transition-colors"
                >
                  <Checkbox
                    checked={isLinked}
                    disabled={saving}
                    onCheckedChange={() => toggleTeam(team)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{team.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {team.age_group && <span className="text-[11px] text-muted-foreground">{team.age_group}</span>}
                      {otherPlan && (
                        <Badge variant="outline" className="text-[10px] h-4 px-1.5 text-amber-600 border-amber-300">
                          On another plan
                        </Badge>
                      )}
                    </div>
                  </div>
                </label>
              );
            })
          )}
        </div>

        <div className="p-4 border-t border-border/60 flex justify-end">
          <Button size="sm" variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Compact trigger button + count badge for use on plan cards/rows. */
export function TeamPlanLinkerButton({ plan, teams }) {
  const [open, setOpen] = useState(false);
  const linkedCount = teams.filter((t) => t.team_plan_id === plan.id).length;

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="h-7 gap-1.5"
        onClick={() => setOpen(true)}
        title="Link teams to this plan"
      >
        <Users className="w-3.5 h-3.5" />
        {linkedCount > 0 ? `${linkedCount} team${linkedCount !== 1 ? "s" : ""}` : "Link teams"}
      </Button>
      <TeamPlanLinker plan={plan} open={open} onOpenChange={setOpen} />
    </>
  );
}