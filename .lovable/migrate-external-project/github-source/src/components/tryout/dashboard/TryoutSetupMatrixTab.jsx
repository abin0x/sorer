import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import TryoutMatrixGrid from "@/components/tryout/TryoutMatrixGrid";
import CreatePlanDialog from "@/components/tryout/CreatePlanDialog";
import DuplicatePlanDialog from "@/components/tryout/DuplicatePlanDialog";
import { canManageTryouts, filterPlansForUser, tryoutBranchScope } from "@/lib/tryoutAccess";

/** Tryout coverage: which team, age group and platform still needs a tryout. */
export default function TryoutSetupMatrixTab({ user, plans, onPlansChanged }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [segment, setSegment] = useState(null);
  const [showDuplicate, setShowDuplicate] = useState(false);

  const { data: teams = [], isLoading: loadingTeams } = useQuery({
    queryKey: ["tryoutTeams"],
    queryFn: () => base44.entities.Team.list(),
  });
  const { data: ageGroups = [] } = useQuery({
    queryKey: ["tryoutAgeGroups"],
    queryFn: () => base44.entities.AgeGroup.list("order"),
  });
  const { data: staff = [] } = useQuery({
    queryKey: ["tryoutStaff"],
    queryFn: () => base44.entities.UserRoles.filter({ status: "active" }),
  });

  const canManage = canManageTryouts(user);
  const branchScopeId = tryoutBranchScope(user);
  const visiblePlans = filterPlansForUser(plans || [], user);

  const openCreate = (seg) => {
    if (!canManage) {
      toast.error("Only club and branch admins can set up tryouts.");
      return;
    }
    setSegment(seg);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-sm text-muted-foreground max-w-2xl">
          Every team, age group and platform that needs a tryout. Tap a cell to set one up.
        </p>
        {canManage && visiblePlans.length > 0 && (
          <Button variant="outline" onClick={() => setShowDuplicate(true)} className="gap-1.5">
            <Copy className="w-4 h-4" /> Duplicate a previous tryout
          </Button>
        )}
      </div>

      {loadingTeams ? (
        <div className="flex items-center justify-center py-24">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
        </div>
      ) : (
        <TryoutMatrixGrid teams={teams} ageGroups={ageGroups} plans={visiblePlans} onCreatePlan={openCreate} />
      )}

      <CreatePlanDialog
        segment={segment}
        staff={staff}
        branchScopeId={branchScopeId}
        onClose={() => setSegment(null)}
        onCreated={() => {
          setSegment(null);
          queryClient.invalidateQueries({ queryKey: ["tryoutTeams"] });
          onPlansChanged?.();
        }}
      />

      <DuplicatePlanDialog
        open={showDuplicate}
        plans={visiblePlans}
        onClose={() => setShowDuplicate(false)}
        onDuplicated={(planId) => {
          setShowDuplicate(false);
          onPlansChanged?.();
          navigate(`/TryoutPlanDetail?id=${planId}`);
        }}
      />
    </div>
  );
}