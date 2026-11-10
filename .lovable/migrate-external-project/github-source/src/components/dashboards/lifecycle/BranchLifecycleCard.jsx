import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import SeasonCycleBar from "../shared/SeasonCycleBar";
import CycleChecklist from "../shared/CycleChecklist";
import { computePhases, scopeDataToBranches, ownerOf } from "@/lib/seasonLifecycle";
import useLifecycleContext from "./useLifecycleContext";

/** A branch director's view of their own branch lifecycle; actionable only if the branch is delegated to them. */
export default function BranchLifecycleCard({ branchId, branchName }) {
  const { scope, data, season } = useLifecycleContext();
  if (!branchId) return null;
  const steps = computePhases(scopeDataToBranches(data, new Set([branchId]), false), season);
  const mine = ownerOf(scope, branchId) === "branch_leads";

  return (
    <div className="space-y-3">
      <Card className={`rounded-xl shadow-sm ${mine ? "border-amber-200 bg-amber-50/40" : "border-border-subtle"}`}>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold">{branchName || "Your branch"} · Season Lifecycle</p>
            <Badge variant="outline" className="text-[10px]">
              {mine ? "You own this branch's lifecycle" : "Managed by Club Admin · view only"}
            </Badge>
          </div>
          <SeasonCycleBar steps={steps} />
        </CardContent>
      </Card>
      <CycleChecklist steps={steps} readOnly={!mine} title="Branch Lifecycle Checklist" />
    </div>
  );
}