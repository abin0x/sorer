import React from "react";
import { CheckCircle2, Circle, Clock, AlertCircle } from "lucide-react";

const STATUS_CONFIG = {
  done: { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200", label: "Done" },
  in_progress: { icon: Clock, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", label: "In Progress" },
  pending: { icon: Circle, color: "text-neutral-400", bg: "bg-neutral-50", border: "border-neutral-200", label: "Pending" },
  blocked: { icon: AlertCircle, color: "text-red-600", bg: "bg-red-50", border: "border-red-200", label: "Blocked" },
};

/**
 * Horizontal 7-step season cycle progress bar.
 * Shows Rollover → Matrix → Tryout → Registration → Rosters → Final Reg
 * with visual status for each step.
 */
export default function SeasonCycleBar({ steps, compact = false }) {
  const completedCount = steps.filter((s) => s.status === "done").length;
  const pct = Math.round((completedCount / steps.length) * 100);

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-neutral-100 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-xs font-semibold text-text-secondary shrink-0">{completedCount}/{steps.length}</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-text-secondary">Season Cycle Progress</p>
        <span className="text-sm font-bold text-text-primary">{pct}%</span>
      </div>
      <div className="flex items-center gap-1">
        {steps.map((step, i) => {
          const cfg = STATUS_CONFIG[step.status] || STATUS_CONFIG.pending;
          const Icon = cfg.icon;
          return (
            <React.Fragment key={step.key}>
              <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${cfg.bg} ${cfg.border} shrink-0`}>
                  <Icon className={`w-4 h-4 ${cfg.color}`} />
                </div>
                <span className="text-[10px] font-medium text-center text-text-secondary leading-tight truncate w-full">{step.label}</span>
              </div>
              {i < steps.length - 1 && (
                <div className={`h-0.5 flex-1 min-w-[8px] ${step.status === "done" ? "bg-emerald-400" : "bg-neutral-200"}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}