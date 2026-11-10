import React from "react";
import { REPORT_CATEGORIES, getReportsForAccess } from "@/lib/reports/reportLibrary";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Report library grid, grouped by category. Only shows categories the role can access.
 * Module-specific categories only appear when the club has that module.
 * props: { access, onSelectReport, hasModule, onOpenCustomBuilder }
 */
export default function ReportLibraryTab({ access, onSelectReport, hasModule, onOpenCustomBuilder }) {
  const reports = getReportsForAccess(access, hasModule);

  return (
    <div className="space-y-6">
      {/* Custom Report Builder entry */}
      <div className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-4 flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground">Custom Report Builder</p>
          <p className="text-xs text-muted-foreground mt-0.5">Build a report from scratch — choose any data source, pick from all available fields, and configure flexible filters.</p>
        </div>
        <Button onClick={onOpenCustomBuilder} className="touch-target shrink-0">
          <Sparkles className="w-3.5 h-3.5" /> Create Custom Report
        </Button>
      </div>
      {REPORT_CATEGORIES.map((cat) => {
        if (cat.module && hasModule && !hasModule(cat.module)) return null;
        const catReports = reports.filter((r) => r.category === cat.key);
        if (catReports.length === 0) return null;
        const CatIcon = cat.icon;
        return (
          <div key={cat.key}>
            <div className="flex items-center gap-2 mb-3">
              <CatIcon className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{cat.label}</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {catReports.map((r) => {
                const Icon = r.icon;
                return (
                  <button
                    key={r.id}
                    onClick={() => onSelectReport(r.id)}
                    className="text-left p-4 rounded-xl border bg-card hover:border-primary/40 hover:shadow-md transition-all min-h-[100px] touch-target"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-foreground">{r.name}</p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.description}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}