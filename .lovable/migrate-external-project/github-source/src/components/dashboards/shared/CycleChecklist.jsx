import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, CheckCircle2, Circle, Clock, AlertCircle, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const STATUS_CONFIG = {
  done: { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50", label: "Done" },
  in_progress: { icon: Clock, color: "text-amber-600", bg: "bg-amber-50", label: "In Progress" },
  pending: { icon: Circle, color: "text-neutral-400", bg: "bg-neutral-50", label: "Pending" },
  blocked: { icon: AlertCircle, color: "text-red-600", bg: "bg-red-50", label: "Blocked" },
};

/**
 * Collapsible 7-step cycle checklist with detailed status per step.
 * Collapsible so the Next Action Card can stay above the fold.
 */
export default function CycleChecklist({ steps, readOnly = false, title = "Cycle Checklist" }) {
  const [open, setOpen] = useState(true);
  const completed = steps.filter((s) => s.status === "done").length;

  return (
    <Card className="border-border-subtle rounded-xl shadow-sm">
      <CardHeader className="pb-3">
        <button onClick={() => setOpen((v) => !v)} className="flex items-center justify-between w-full text-left">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-bold tracking-wide text-text-primary">{title}</CardTitle>
            <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">{completed}/{steps.length}</Badge>
          </div>
          <ChevronDown className={`w-4 h-4 text-text-secondary transition-transform ${open ? "" : "rotate-180"}`} />
        </button>
      </CardHeader>
      {open && (
        <CardContent className="pt-0">
          <div className="space-y-1.5">
            {steps.map((step, i) => {
              const cfg = STATUS_CONFIG[step.status] || STATUS_CONFIG.pending;
              const Icon = cfg.icon;
              return (
                <div key={step.key} className="flex items-center gap-3 p-2.5 rounded-lg bg-neutral-50 hover:bg-neutral-100 transition-colors">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${cfg.bg}`}>
                    <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-text-secondary">#{i + 1}</span>
                      <p className="text-sm font-semibold text-text-primary">{step.label}</p>
                    </div>
                    <p className="text-xs text-text-secondary mt-0.5">{step.detail}</p>
                  </div>
                  <Badge variant="outline" className={`text-[10px] shrink-0 ${cfg.bg} ${cfg.color} border-current/20`}>{cfg.label}</Badge>
                  {step.status !== "done" && step.to && !readOnly && (
                    <Link to={step.to} className="shrink-0">
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                        {step.actionLabel || "Fix"} <ArrowRight className="w-3 h-3" />
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