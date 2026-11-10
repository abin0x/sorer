import React from "react";
import { ClipboardList, UserCheck, Shield, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TRYOUT_PHASES } from "@/lib/tryoutWorkflow";
import { cn } from "@/lib/utils";

const icons = [ClipboardList, UserCheck, Shield];

export default function TryoutWorkflowNav({ tab, onGoToTab }) {
  return <nav aria-label="Tryout phases" className="grid grid-cols-1 sm:grid-cols-3 border-y border-border py-3 gap-2">
    {TRYOUT_PHASES.map((phase, i) => {
      const Icon = icons[i];
      const active = phase.tabs.includes(tab);
      return <Button key={phase.id} variant="ghost" aria-current={active ? "step" : undefined}
        onClick={() => onGoToTab(phase.tabs[0])}
        className={cn("h-auto min-h-16 justify-start gap-3 px-3 text-left whitespace-normal", active ? "bg-primary/10 text-primary" : "text-muted-foreground")}>
        <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", active ? "bg-primary text-primary-foreground" : "bg-muted")}><Icon className="h-4 w-4" /></span>
        <span className="min-w-0 flex-1"><span className="block text-xs font-normal">Phase {i + 1}</span><span className="block text-sm font-semibold">{phase.label}</span></span>
        <ArrowRight className="h-4 w-4 shrink-0" />
      </Button>;
    })}
  </nav>;
}