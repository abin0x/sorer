import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import RosterBoard from "@/components/tryout/RosterBoard";
import OfferPanel from "@/components/tryout/OfferPanel";
import { Button } from "@/components/ui/button";
import { useTenant } from "@/lib/TenantContext";

/** Rosters tab on the Tryout Dashboard: pick a tryout, then move players from the pool onto its teams. */
export default function TryoutRostersTab({ plans, events, user, view = "rosters", onGoToTab }) {
  const { effectiveClubId: clubId } = useTenant();
  const [planId, setPlanId] = useState("");
  const plan = plans.find((p) => p.id === planId) || plans[0] || null;
  const mainTryout = events.find((e) => e.tryout_plan_id === plan?.id && e.type === "main_tryout") || null;

  const { data: teams = [], isLoading, error, refetch } = useQuery({
    queryKey: ["tryoutPlanTeams", clubId, plan?.team_ids?.join(",")],
    queryFn: () => base44.entities.Team.filter({ club_id: clubId, id: { $in: plan.team_ids } }, "name", 200),
    enabled: !!clubId && !!plan?.team_ids?.length,
  });

  if (!plans.length) return <div className="text-center py-12 space-y-3"><p className="text-sm text-muted-foreground">Create a tryout group before placing players or sending offers.</p><Button variant="outline" onClick={() => onGoToTab?.("matrix")}>Set up tryouts</Button></div>;

  return (
    <div className="space-y-4">
      <Select value={plan?.id || ""} onValueChange={setPlanId}>
        <SelectTrigger className="sm:w-96 h-11"><SelectValue placeholder="Pick a tryout" /></SelectTrigger>
        <SelectContent>
          {plans.map((p) => <SelectItem key={p.id} value={p.id}>{p.title || "Tryout"}</SelectItem>)}
        </SelectContent>
      </Select>
      {error ? <div role="alert" className="space-y-2"><p className="text-destructive">Could not load teams. {error.message}</p><Button variant="outline" onClick={() => refetch()}>Try again</Button></div>
        : isLoading ? <p role="status" className="py-12 text-center text-muted-foreground">Loading teams…</p>
        : view === "offers" ? <OfferPanel key={`${clubId}-${plan?.id}`} plan={plan} teams={teams} clubId={clubId} />
        : <><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Team placement</h2><Button variant="outline" onClick={() => onGoToTab?.("offers")}>Review offers & acceptance</Button></div><RosterBoard key={`${clubId}-${plan?.id}`} plan={plan} teams={teams} mainTryout={mainTryout} currentUser={user} /></>}
    </div>
  );
}
