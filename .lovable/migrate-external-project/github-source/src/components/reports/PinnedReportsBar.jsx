import React from "react";
import { Pin, BarChart3 } from "lucide-react";

/**
 * Shows pinned saved reports as quick-access cards on the Reports Overview.
 * props: { pinnedReports, onOpen }
 */
export default function PinnedReportsBar({ pinnedReports, onOpen }) {
  if (!pinnedReports || pinnedReports.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Pin className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Pinned Reports</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {pinnedReports.map((sr) => (
          <button
            key={sr.id}
            onClick={() => onOpen(sr)}
            className="text-left p-3 rounded-xl border bg-card hover:border-primary/40 hover:shadow-md transition-all min-h-[80px] touch-target"
          >
            <div className="flex items-start gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <BarChart3 className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm text-foreground truncate">{sr.name}</p>
                <p className="text-xs text-muted-foreground truncate">{sr.report_name}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}