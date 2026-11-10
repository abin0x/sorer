import React from "react";
import { Link } from '@/lib/router-compat';
import { CheckCircle2, Circle, Clock, AlertCircle, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const STATUS_CONFIG = {
  done: { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200", ring: "ring-emerald-400", bar: "bg-emerald-400", label: "Done" },
  in_progress: { icon: Clock, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", ring: "ring-amber-400", bar: "bg-amber-400", label: "In Progress" },
  pending: { icon: Circle, color: "text-slate-400", bg: "bg-slate-50", border: "border-slate-200", ring: "ring-slate-300", bar: "bg-slate-200", label: "Pending" },
  blocked: { icon: AlertCircle, color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-200", ring: "ring-rose-400", bar: "bg-rose-400", label: "Blocked" },
};

/**
 * ActionTimeline — a beautiful horizontal visual timeline showing the key
 * workflow steps for a role. Each step is a clickable node with an icon,
 * label, status indicator, and connecting progress bar.
 *
 * Props:
 * - steps: [{ key, label, icon, status, to, detail }]
 * - title: section heading
 * - compact: show only the bar without labels (for tight spaces)
 */
export default function ActionTimeline({ steps = [], title = "Workflow Timeline", compact = false }) {
  const completedCount = steps.filter((s) => s.status === "done").length;
  const pct = steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0;
  const currentStep = steps.find((s) => s.status === "in_progress" || s.status === "pending" || s.status === "blocked");

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-neutral-100 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-action to-action/70 transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-xs font-semibold text-text-secondary shrink-0">{completedCount}/{steps.length}</span>
      </div>
    );
  }

  return (
    <Card className="border-border-subtle rounded-2xl shadow-sm overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <p className="text-xs font-bold uppercase tracking-wider text-text-secondary">{title}</p>
            <Badge variant="outline" className="text-[10px] bg-action/5 text-action border-action/20">{pct}%</Badge>
          </div>
          {currentStep && (
            <span className="text-xs text-text-secondary hidden sm:block">
              Next: <span className="font-semibold text-text-primary">{currentStep.label}</span>
            </span>
          )}
        </div>

        {/* Horizontal timeline with scroll on mobile */}
        <div className="overflow-x-auto pb-1 -mx-1 px-1">
          <div className="flex items-center gap-0 min-w-max">
            {steps.map((step, i) => {
              const cfg = STATUS_CONFIG[step.status] || STATUS_CONFIG.pending;
              const Icon = step.icon || cfg.icon;
              const isLast = i === steps.length - 1;
              const node = (
                <div className="flex flex-col items-center gap-1.5" style={{ minWidth: compact ? 48 : 72 }}>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 ${cfg.bg} ${cfg.border} ring-2 ${cfg.ring}/20 transition-all shrink-0`}>
                    <Icon className={`w-4 h-4 ${cfg.color}`} />
                  </div>
                  <span className="text-[10px] font-medium text-center text-text-secondary leading-tight truncate w-full px-0.5">{step.label}</span>
                </div>
              );
              return (
                <React.Fragment key={step.key}>
                  {step.to ? (
                    <Link to={step.to} className="hover:opacity-80 transition-opacity">{node}</Link>
                  ) : node}
                  {!isLast && (
                    <div className="flex-1 min-w-[16px] h-0.5 rounded-full overflow-hidden bg-neutral-100 mx-0.5 self-start mt-[18px]">
                      <div className={`h-full transition-all duration-500 ${step.status === "done" ? cfg.bar : "bg-transparent"}`} style={{ width: step.status === "done" ? "100%" : "0%" }} />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}