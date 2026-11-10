import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Grid3x3, ChevronDown } from "lucide-react";

const STATUS_STYLES = {
  done: { bg: "bg-status-success-50", text: "text-status-success-700", border: "border-status-success/20", label: "On Track" },
  in_progress: { bg: "bg-status-warning-50", text: "text-status-warning-700", border: "border-status-warning/20", label: "In Progress" },
  pending: { bg: "bg-muted", text: "text-muted-foreground", border: "border-border", label: "Not Started" },
  blocked: { bg: "bg-status-danger-50", text: "text-status-danger-700", border: "border-status-danger/20", label: "Behind" },
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
      <Card className="border-border rounded-lg shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold tracking-wide text-text-action flex items-center gap-2">
            <Grid3x3 className="w-4 h-4 text-action" /> Branch Health
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            {branches.length === 0 && <p className="py-6 text-sm text-muted-foreground">No branches configured yet.</p>}
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
    <Card className="border-border rounded-lg shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-bold tracking-wide text-text-action flex items-center gap-2">
          <Grid3x3 className="w-4 h-4 text-action" /> Branch × Platform Health
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
                        <Button variant="outline"
                          aria-label={`${branch.name}, ${platform.name}: ${s.label}`}
                          aria-expanded={isExpanded}
                          onClick={() => setExpanded(isExpanded ? null : key)}
                          className={`w-full min-h-10 p-2 rounded-md border ${s.bg} ${s.border} ${s.text} hover:opacity-80 transition-all`}
                        >
                          <span className={`text-[10px] font-bold ${s.text}`}>{s.label}</span>
                        </Button>
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