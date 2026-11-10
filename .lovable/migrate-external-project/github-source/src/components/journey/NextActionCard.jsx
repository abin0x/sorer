import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Clock, PartyPopper } from "lucide-react";

export default function NextActionCard({ action, canAct, onGo }) {
  if (!action) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800">
        <PartyPopper className="w-5 h-5" /> Every step is complete. Your club is running the full season cycle.
      </div>
    );
  }
  const { stage, step } = action;
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-2xl bg-primary text-primary-foreground shadow-md">
      <div className="flex-1 min-w-0">
        <div className="text-xs uppercase tracking-wide opacity-80">Next best action · Stage {stage.id}</div>
        <div className="text-lg font-bold">{step.title}</div>
        <div className="text-sm opacity-90 flex items-center gap-1"><Clock className="w-3.5 h-3.5" />About {step.minutes} min</div>
      </div>
      <Button variant="secondary" size="lg" disabled={!canAct} onClick={() => onGo(step)} className="gap-2">
        Do this next <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
}