import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ClipboardList } from "lucide-react";
import TryoutMatrixGrid from "@/components/tryout/TryoutMatrixGrid";
import CreatePlanDialog from "@/components/tryout/CreatePlanDialog";

export default function TryoutPlanner() {
  const queryClient = useQueryClient();
  const [segment, setSegment] = useState(null);

  const { data: teams = [], isLoading: loadingTeams } = useQuery({
    queryKey: ["tryoutTeams"],
    queryFn: () => base44.entities.Team.list(),
  });
  const { data: ageGroups = [] } = useQuery({
    queryKey: ["tryoutAgeGroups"],
    queryFn: () => base44.entities.AgeGroup.list("order"),
  });
  const { data: plans = [], isLoading: loadingPlans } = useQuery({
    queryKey: ["tryoutPlans"],
    queryFn: () => base44.entities.TryoutPlan.list("-created_date"),
  });
  const { data: staff = [] } = useQuery({
    queryKey: ["tryoutStaff"],
    queryFn: () => base44.entities.UserRoles.filter({ status: "active" }),
  });

  const loading = loadingTeams || loadingPlans;

  const handleCreated = () => {
    setSegment(null);
    queryClient.invalidateQueries({ queryKey: ["tryoutPlans"] });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <ClipboardList className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tryout Planner</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Coverage matrix of every age group by format and gender. Create a tryout plan for any segment in a few clicks.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
        </div>
      ) : (
        <TryoutMatrixGrid teams={teams} ageGroups={ageGroups} plans={plans} onCreatePlan={setSegment} />
      )}

      <CreatePlanDialog
        segment={segment}
        staff={staff}
        onClose={() => setSegment(null)}
        onCreated={handleCreated}
      />
    </div>
  );
}