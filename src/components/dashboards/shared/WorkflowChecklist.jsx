import React, { useState } from "react";
import { Link } from '@/lib/router-compat';
import { ChevronDown, CheckCircle2, Circle, Clock, AlertCircle, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const STATUS_CONFIG = {
  done: { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200", label: "Done" },
  in_progress: { icon: Clock, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", label: "In Progress" },
  pending: { icon: Circle, color: "text-neutral-400", bg: "bg-neutral-50", border: "border-neutral-200", label: "Pending" },
  blocked: { icon: AlertCircle, color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-200", label: "Blocked" },
};

/**
 * WorkflowChecklist — a prioritized, collapsible checklist of the most
 * important workflow steps for a role. Each step shows status, detail,
 * and a CTA button to take action. Steps are sorted so incomplete items
 * appear first.
 *
 * Props:
 * - steps: [{ key, label, status, detail, to, actionLabel, icon }]
 * - title: section heading
 * - defaultOpen: whether the checklist starts expanded
 */
export default function WorkflowChecklist({ steps = [], title = "Workflow Checklist", defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  const completed = steps.filter((s) => s.status === "done").length;
  const incomplete = steps.filter((s) => s.status !== "done");

  // Sort: blocked first, then in_progress, then pending, then done
  const sortOrder = { blocked: 0, in_progress: 1, pending: 2, done: 3 };
  const sortedSteps = [...steps].sort((a, b) => (sortOrder[a.status] ?? 9) - (sortOrder[b.status] ?? 9));

  return (
    <Card className="border-border-subtle rounded-2xl shadow-sm">
      <CardHeader className="pb-3">
        <button onClick={() => setOpen((v) => !v)} className="flex items-center justify-between w-full text-left">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-bold tracking-wide text-text-primary">{title}</CardTitle>
            <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">{completed}/{steps.length}</Badge>
            {incomplete.length > 0 && (
              <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">{incomplete.length} to do</Badge>
            )}
          </div>
          <ChevronDown className={`w-4 h-4 text-text-secondary transition-transform ${open ? "" : "rotate-180"}`} />
        </button>
      </CardHeader>
      {open && (
        <CardContent className="pt-0">
          <div className="space-y-1.5">
            {sortedSteps.map((step, i) => {
              const cfg = STATUS_CONFIG[step.status] || STATUS_CONFIG.pending;
              const Icon = step.icon || cfg.icon;
              return (
                <div key={step.key} className={`flex items-center gap-3 p-2.5 rounded-xl bg-neutral-50 hover:bg-neutral-100 transition-colors ${step.status === "blocked" ? "ring-1 ring-rose-200/50" : ""}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${cfg.bg} border ${cfg.border}`}>
                    <Icon className={`w-4 h-4 ${cfg.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text-primary leading-tight">{step.label}</p>
                    {step.detail && <p className="text-xs text-text-secondary mt-0.5 leading-tight">{step.detail}</p>}
                  </div>
                  <Badge variant="outline" className={`text-[10px] shrink-0 ${cfg.bg} ${cfg.color} border-current/20`}>{cfg.label}</Badge>
                  {step.status !== "done" && step.to && (
                    <Link to={step.to} className="shrink-0">
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                        {step.actionLabel || "Go"} <ArrowRight className="w-3 h-3" />
                      </Button>
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      )}
    </Card>
  );
}