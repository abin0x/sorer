import React from "react";
import { Link } from '@/lib/router-compat';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, AlertCircle, Circle, ArrowRight, ShieldCheck, ShieldAlert } from "lucide-react";
import { computePhases, scopeDataToBranches, ownerOf, percentDone } from "@/lib/seasonLifecycle";
import useLifecycleContext from "./useLifecycleContext";
import useBranchCompliance from "./useBranchCompliance";

const STATUS = {
  done: { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
  in_progress: { icon: Clock, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
  blocked: { icon: AlertCircle, color: "text-red-600", bg: "bg-red-50", border: "border-red-200" },
  pending: { icon: Circle, color: "text-neutral-400", bg: "bg-neutral-50", border: "border-neutral-200" },
};

/** All-branches lifecycle matrix: one row per branch, labeled steps with icons, not just numbers. */
export default function BranchLifecycleBoard({ title = "All Branches · Season Lifecycle" }) {
  const { scope, data, locations, season } = useLifecycleContext();
  const { data: comp } = useBranchCompliance();
  const rows = locations.map((loc) => {
    const steps = computePhases(scopeDataToBranches(data, new Set([loc.id]), false), season);
    return { loc, steps, owner: ownerOf(scope, loc.id), pct: percentDone(steps), next: steps.find((s) => s.status !== "done") };
  });

  return (
    <Card className="border-border-subtle rounded-xl shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-bold tracking-wide">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 overflow-x-auto">
        {rows.length === 0 ? (
          <p className="text-sm text-text-secondary py-4 text-center">No branches yet.</p>
        ) : (
          <div className="min-w-[960px] space-y-2.5">
            <div className="flex items-center gap-3 px-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-text-secondary">
              <div className="w-36 shrink-0">Branch</div>
              <div className="flex-1">Season Lifecycle</div>
              <div className="w-28 shrink-0 text-center">Compliance</div>
              <div className="w-40 shrink-0 text-right">Progress</div>
            </div>
            {rows.map(({ loc, steps, owner, pct, next }) => (
              <div key={loc.id} className="flex items-center gap-3 p-3 rounded-lg bg-neutral-50 border border-border-subtle">
                <div className="w-36 shrink-0">
                  <p className="text-sm font-semibold truncate">{loc.name}</p>
                  <Badge variant="outline" className={`text-[10px] mt-0.5 ${owner === "club_admin" ? "bg-action/10 text-action border-action/20" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                    {owner === "club_admin" ? "Club Admin" : "Branch Director"}
                  </Badge>
                </div>
                <div className="flex items-center gap-0.5 flex-1">
                  {steps.map((s, i) => {
                    const cfg = STATUS[s.status] || STATUS.pending;
                    const Icon = cfg.icon;
                    const clickable = s.status !== "done" && s.to;
                    const content = (
                      <div className="flex flex-col items-center gap-0.5 w-[68px] shrink-0">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center border ${cfg.bg} ${cfg.border}`}>
                          <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                        </div>
                        <span className="text-[9px] font-medium text-center text-text-secondary leading-tight">{s.label}</span>
                      </div>
                    );
                    return (
                      <React.Fragment key={s.key}>
                        {clickable ? (
                          <Link to={s.to} className="hover:opacity-70 transition-opacity" title={`${s.label}: ${s.detail} — ${s.actionLabel || "Open"}`}>{content}</Link>
                        ) : (
                          <div title={`${s.label}: ${s.detail}`}>{content}</div>
                        )}
                        {i < steps.length - 1 && (
                          <div className={`h-0.5 w-2 ${steps[i].status === "done" ? "bg-emerald-400" : "bg-neutral-200"}`} />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
                <div className="w-28 shrink-0 text-center">
                  {(() => {
                    const c = comp?.byBranch?.[loc.id];
                    if (!comp?.hasSeason || !c || c.total === 0) return <span className="text-[10px] text-text-secondary">—</span>;
                    const ok = c.compliant === c.total;
                    const Icon = ok ? ShieldCheck : ShieldAlert;
                    return (
                      <Link to="/Compliance" className="hover:opacity-70" title={`${c.compliant}/${c.total} coaches compliant`}>
                        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold ${ok ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-orange-50 text-orange-700 border border-orange-200"}`}>
                          <Icon className="w-3 h-3" />{c.compliant}/{c.total}
                        </div>
                      </Link>
                    );
                  })()}
                </div>
                <div className="w-40 shrink-0 text-right">
                  <p className="text-sm font-bold">{pct}%</p>
                  <p className="text-[10px] text-text-secondary truncate">{next ? `Next: ${next.label}` : "All phases done"}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}