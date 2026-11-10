import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Grid3x3, ChevronDown } from "lucide-react";

const STATUS_STYLES = {
  done: { bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-300", label: "On Track" },
  in_progress: { bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-300", label: "In Progress" },
  pending: { bg: "bg-neutral-100", text: "text-neutral-500", border: "border-neutral-200", label: "Not Started" },
  blocked: { bg: "bg-red-100", text: "text-red-700", border: "border-red-300", label: "Behind" },
};

/**
 * The hero of the Club Director dashboard — a Branch × Platform health grid.
 * One row per branch, one column per platform; each cell shows cycle status.
 * Clicking a cell expands it to show which step that branch+platform combo is on.
 */
export default function BranchPlatformGrid({ branches, platforms, cellStatuses }) {
  const [expanded, setExpanded] = useState(null);

  // If no branches or platforms, show a simplified branch-only view
  if (platforms.length === 0) {
    return (
      <Card className="border-border-subtle rounded-xl shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold tracking-wide text-text-action flex items-center gap-2">
            <Grid3x3 className="w-4 h-4 text-action" /> Branch Health
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            {branches.map((b) => {
              const status = cellStatuses[`${b.id}__all`] || { status: "pending", detail: "No data" };
              const s = STATUS_STYLES[status.status] || STATUS_STYLES.pending;
              return (
                <div key={b.id} className={`p-3 rounded-lg border ${s.bg} ${s.border}`}>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-text-action">{b.name}</p>
                    <Badge variant="outline" className={`text-[10px] ${s.bg} ${s.text}`}>{s.label}</Badge>
                  </div>
                  <p className="text-xs text-text-secondary mt-1">{status.detail}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border-subtle rounded-xl shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-bold tracking-wide text-text-action flex items-center gap-2">
          <Grid3x3 className="w-4 h-4 text-action" /> Branch × Platform Health Grid
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left text-[10px] font-bold uppercase tracking-wider text-text-secondary p-2 sticky left-0 bg-surface-card">Branch</th>
                {platforms.map((p) => (
                  <th key={p.id} className="text-center text-[10px] font-bold uppercase tracking-wider text-text-secondary p-2 min-w-[100px]">
                    {p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {branches.map((branch) => (
                <tr key={branch.id} className="border-t border-border-subtle">
                  <td className="p-2 font-semibold text-text-action text-xs sticky left-0 bg-surface-card">{branch.name}</td>
                  {platforms.map((platform) => {
                    const key = `${branch.id}__${platform.id}`;
                    const status = cellStatuses[key] || { status: "pending", detail: "No data" };
                    const s = STATUS_STYLES[status.status] || STATUS_STYLES.pending;
                    const isExpanded = expanded === key;
                    return (
                      <td key={platform.id} className="p-1.5 text-center">
                        <button
                          onClick={() => setExpanded(isExpanded ? null : key)}
                          className={`w-full p-2 rounded-lg border ${s.bg} ${s.border} hover:shadow-sm transition-all`}
                        >
                          <span className={`text-[10px] font-bold ${s.text}`}>{s.label}</span>
                        </button>
                        {isExpanded && (
                          <div className="mt-1 p-2 rounded-lg bg-neutral-50 border border-border-subtle text-left">
                            <p className="text-[10px] text-text-secondary">{status.detail}</p>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Legend */}
        <div className="flex items-center gap-3 mt-3 flex-wrap">
          {Object.entries(STATUS_STYLES).map(([key, s]) => (
            <div key={key} className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded ${s.bg} border ${s.border}`} />
              <span className="text-[10px] text-text-secondary">{s.label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}