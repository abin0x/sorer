import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Columns3, Group, Save } from "lucide-react";
import { useReportData } from "@/hooks/useReportData";
import ReportTable from "@/components/reports/ReportTable";
import ReportExportBar from "@/components/reports/ReportExportBar";
import SaveReportDialog from "./SaveReportDialog";

/**
 * Full report viewer: report-specific filters, column picker, group-by, sort,
 * paginated table with totals, and CSV/PDF export.
 * props: { report, onBack, globalFilters, scope, access, initialConfig }
 */
export default function ReportViewer({ report, onBack, globalFilters, scope, access, initialConfig }) {
  const [reportFilters, setReportFilters] = useState(() => initialConfig?.reportFilters || {});
  const [visibleColumnKeys, setVisibleColumnKeys] = useState(
    () => initialConfig?.columns || report.columns.filter((c) => c.defaultVisible).map((c) => c.key)
  );
  const [groupBy, setGroupBy] = useState(() => initialConfig?.groupBy || null);
  const [sort, setSort] = useState(() => initialConfig?.sort || report.defaultSort);
  const [showColPicker, setShowColPicker] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  const query = useMemo(
    () => report.buildQuery(globalFilters, reportFilters, scope),
    [report, globalFilters, reportFilters, scope]
  );

  const { rows, totalCount, totals, hasMore, isFetchingMore, fetchNextPage, isLoading } = useReportData({
    report, query, sort, groupBy, scope,
  });

  const columns = report.columns.filter((c) => visibleColumnKeys.includes(c.key));
  const groupableCols = report.columns.filter((c) => c.groupable);

  const toggleColumn = (key) => {
    setVisibleColumnKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="touch-target shrink-0">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h2 className="text-lg font-bold">{report.name}</h2>
          <p className="text-sm text-muted-foreground">{report.description}</p>
        </div>
      </div>

      {/* Report-specific filters */}
      {report.reportFilters.length > 0 && (
        <div className="flex flex-wrap items-end gap-3 p-3 rounded-xl border bg-card">
          {report.reportFilters.map((rf) => (
            <div key={rf.key} className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">{rf.label}</label>
              <Select
                value={reportFilters[rf.key] || "all"}
                onValueChange={(v) => setReportFilters((p) => ({ ...p, [rf.key]: v === "all" ? undefined : v }))}
              >
                <SelectTrigger className="w-[150px] h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All {rf.label}</SelectItem>
                  {rf.options.map((opt) => (
                    <SelectItem key={opt} value={opt}>{opt.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      )}

      {/* Toolbar: group-by, column picker, export */}
      <div className="flex items-center gap-3 flex-wrap">
        {groupableCols.length > 0 && (
          <div className="flex items-center gap-2">
            <Group className="w-4 h-4 text-muted-foreground" />
            <Select value={groupBy || "none"} onValueChange={(v) => setGroupBy(v === "none" ? null : v)}>
              <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="No grouping" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No grouping</SelectItem>
                {groupableCols.map((c) => (
                  <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Column picker */}
        <div className="relative">
          <Button variant="outline" size="sm" onClick={() => setShowColPicker((s) => !s)} className="touch-target">
            <Columns3 className="w-3.5 h-3.5" /> Columns
          </Button>
          {showColPicker && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowColPicker(false)} />
              <div className="absolute top-full left-0 mt-1 z-50 p-3 rounded-lg border bg-popover shadow-lg min-w-[220px] max-h-[300px] overflow-y-auto">
                {report.columns.map((c) => (
                  <label key={c.key} className="flex items-center gap-2 py-1.5 cursor-pointer hover:bg-accent/50 px-2 rounded">
                    <input
                      type="checkbox"
                      checked={visibleColumnKeys.includes(c.key)}
                      onChange={() => toggleColumn(c.key)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">{c.label}</span>
                  </label>
                ))}
              </div>
            </>
          )}
        </div>

        <ReportExportBar report={report} query={query} sort={sort} columns={columns} totalCount={totalCount} access={access} />

        <Button variant="outline" size="sm" onClick={() => setShowSaveDialog(true)} className="touch-target">
          <Save className="w-3.5 h-3.5" /> Save
        </Button>
      </div>

      {/* Table */}
      <ReportTable
        columns={columns}
        rows={rows}
        totals={totals}
        sort={sort}
        onSort={setSort}
        hasMore={hasMore}
        isFetchingMore={isFetchingMore}
        onLoadMore={fetchNextPage}
        isLoading={isLoading}
        groupBy={groupBy}
      />

      {showSaveDialog && (
        <SaveReportDialog
          open={showSaveDialog}
          onClose={() => setShowSaveDialog(false)}
          report={report}
          globalFilters={globalFilters}
          reportFilters={reportFilters}
          visibleColumnKeys={visibleColumnKeys}
          groupBy={groupBy}
          sort={sort}
        />
      )}
    </div>
  );
}