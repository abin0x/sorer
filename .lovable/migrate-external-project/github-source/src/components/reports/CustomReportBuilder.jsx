import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, ChevronDown, ChevronUp, X, Plus, Save, Columns3, Group, Filter, Loader2 } from "lucide-react";
import { getDataSourcesForAccess, buildSyntheticReport } from "@/lib/reports/customReportLibrary";
import { useReportData } from "@/hooks/useReportData";
import ReportTable from "@/components/reports/ReportTable";
import ReportExportBar from "@/components/reports/ReportExportBar";
import SaveReportDialog from "./SaveReportDialog";
import AsyncState from "@/components/shared/AsyncState";

/**
 * Custom Report Builder — pick a data source, select fields from a categorized
 * library, configure flexible filters, preview live data, and save as a reusable template.
 * props: { onBack, initialConfig, globalFilters, scope, access }
 */
export default function CustomReportBuilder({ onBack, initialConfig, globalFilters, scope, access }) {
  const dataSources = useMemo(() => getDataSourcesForAccess(access), [access]);

  const [dsKey, setDsKey] = useState(() => {
    if (initialConfig?.dataSource) return initialConfig.dataSource;
    return dataSources[0]?.key || "player";
  });
  const ds = useMemo(() => dataSources.find((d) => d.key === dsKey), [dataSources, dsKey]);

  const allFields = useMemo(() => ds?.fieldGroups.flatMap((g) => g.fields) || [], [ds]);

  const [selectedKeys, setSelectedKeys] = useState(() => {
    if (initialConfig?.selectedFields) return initialConfig.selectedFields;
    if (initialConfig?.columns) return initialConfig.columns;
    // Default: all fields marked defaultVisible
    return allFields.filter((f) => f.defaultVisible).map((f) => f.key);
  });
  const [customFilters, setCustomFilters] = useState(() => initialConfig?.customFilters || initialConfig?.reportFilters || {});
  const [groupBy, setGroupBy] = useState(() => initialConfig?.groupBy || null);
  const [sort, setSort] = useState(() => initialConfig?.sort || ds?.defaultSort || "-created_date");
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState({});

  // Reset selection when data source changes
  const handleDsChange = (newKey) => {
    const newDs = dataSources.find((d) => d.key === newKey);
    if (!newDs) return;
    setDsKey(newKey);
    const newFields = newDs.fieldGroups.flatMap((g) => g.fields);
    setSelectedKeys(newFields.filter((f) => f.defaultVisible).map((f) => f.key));
    setCustomFilters({});
    setGroupBy(null);
    setSort(newDs.defaultSort || "-created_date");
    setExpandedGroups({});
  };

  // Build synthetic report for data fetching
  const report = useMemo(() => {
    if (!ds || selectedKeys.length === 0) return null;
    return buildSyntheticReport(ds, selectedKeys);
  }, [ds, selectedKeys]);

  const query = useMemo(() => {
    if (!report) return null;
    return report.buildQuery(globalFilters, customFilters, scope);
  }, [report, globalFilters, customFilters, scope]);

  const { rows, totalCount, totals, hasMore, isFetchingMore, fetchNextPage, isLoading } = useReportData({
    report: report || { entity: ds?.entity, columns: [], buildQuery: () => ({}) },
    query: query || {},
    sort,
    groupBy,
    scope,
  });

  const columns = report?.columns || [];
  const groupableCols = allFields.filter((f) => f.groupable);

  const toggleField = (key) => {
    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const moveField = (index, direction) => {
    setSelectedKeys((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const removeField = (key) => {
    setSelectedKeys((prev) => prev.filter((k) => k !== key));
  };

  const toggleGroup = (label) => {
    setExpandedGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  if (dataSources.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-sm text-muted-foreground">You don't have access to any report data sources.</p>
        <Button variant="outline" onClick={onBack} className="mt-4">Back to Reports</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="touch-target shrink-0">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h2 className="text-lg font-bold">Custom Report Builder</h2>
          <p className="text-sm text-muted-foreground">Choose a data source, select fields, and configure filters to build a custom report.</p>
        </div>
      </div>

      {/* Data source selector */}
      <div className="flex items-center gap-3 p-3 rounded-xl border bg-card">
        <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">Data Source</label>
        <Select value={dsKey} onValueChange={handleDsChange}>
          <SelectTrigger className="w-[220px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            {dataSources.map((d) => {
              const Icon = d.icon;
              return (
                <SelectItem key={d.key} value={d.key}>
                  <div className="flex items-center gap-2">
                    <Icon className="w-3.5 h-3.5" />
                    {d.label}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground ml-auto">{allFields.length} fields available · {selectedKeys.length} selected</span>
      </div>

      {/* Field picker: two panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Available Fields */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b bg-muted/30 flex items-center gap-2">
            <Columns3 className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Available Fields</h3>
          </div>
          <div className="max-h-[400px] overflow-y-auto p-2">
            {ds.fieldGroups.map((group) => {
              const isExpanded = expandedGroups[group.label] !== false; // default expanded
              return (
                <div key={group.label} className="mb-1">
                  <button
                    onClick={() => toggleGroup(group.label)}
                    className="w-full flex items-center gap-1.5 px-2 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:bg-accent/50 rounded-lg"
                  >
                    {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                    {group.label}
                    <span className="ml-auto text-muted-foreground/60">{group.fields.length}</span>
                  </button>
                  {isExpanded && (
                    <div className="ml-2">
                      {group.fields.map((field) => {
                        const isSelected = selectedKeys.includes(field.key);
                        return (
                          <label
                            key={field.key}
                            className="flex items-center gap-2 py-1.5 px-2 cursor-pointer hover:bg-accent/50 rounded-lg"
                          >
                            <Checkbox checked={isSelected} onCheckedChange={() => toggleField(field.key)} />
                            <span className="text-sm flex-1">{field.label}</span>
                            {field.groupable && <span className="text-[10px] text-muted-foreground/60">group</span>}
                            {field.totalable && <span className="text-[10px] text-muted-foreground/60">sum</span>}
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Added Fields */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b bg-muted/30 flex items-center gap-2">
            <Plus className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Added Fields ({selectedKeys.length})</h3>
            <span className="text-xs text-muted-foreground ml-auto">Drag to reorder</span>
          </div>
          <div className="max-h-[400px] overflow-y-auto p-2">
            {selectedKeys.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                No fields selected. Check fields from the left panel to add them.
              </div>
            ) : (
              selectedKeys.map((key, index) => {
                const field = allFields.find((f) => f.key === key);
                if (!field) return null;
                return (
                  <div key={key} className="flex items-center gap-2 py-1.5 px-2 hover:bg-accent/30 rounded-lg group">
                    <div className="flex flex-col">
                      <button
                        onClick={() => moveField(index, -1)}
                        disabled={index === 0}
                        className="text-muted-foreground hover:text-foreground disabled:opacity-20"
                      >
                        <ChevronUp className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => moveField(index, 1)}
                        disabled={index === selectedKeys.length - 1}
                        className="text-muted-foreground hover:text-foreground disabled:opacity-20"
                      >
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    </div>
                    <span className="text-sm flex-1">{field.label}</span>
                    {field.groupable && <span className="text-[10px] text-muted-foreground/60">group</span>}
                    {field.totalable && <span className="text-[10px] text-muted-foreground/60">sum</span>}
                    <button
                      onClick={() => removeField(key)}
                      className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      {ds.filters.length > 0 && (
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Filters</h3>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            {ds.filters.map((f) => (
              <div key={f.key} className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">{f.label}</label>
                {f.type === "select" ? (
                  <Select
                    value={customFilters[f.key] || "all"}
                    onValueChange={(v) => setCustomFilters((p) => ({ ...p, [f.key]: v === "all" ? undefined : v }))}
                  >
                    <SelectTrigger className="w-[160px] h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All {f.label}</SelectItem>
                      {f.options.map((opt) => (
                        <SelectItem key={opt} value={opt}>{opt.replace(/_/g, " ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : f.type === "boolean" ? (
                  <Select
                    value={customFilters[f.key] || "all"}
                    onValueChange={(v) => setCustomFilters((p) => ({ ...p, [f.key]: v === "all" ? undefined : v }))}
                  >
                    <SelectTrigger className="w-[160px] h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="true">Yes</SelectItem>
                      <SelectItem value="false">No</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={customFilters[f.key] || ""}
                    onChange={(e) => setCustomFilters((p) => ({ ...p, [f.key]: e.target.value || undefined }))}
                    placeholder={`Search ${f.label}...`}
                    className="w-[160px] h-9"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Toolbar: group-by, export, save */}
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

        {report && (
          <ReportExportBar report={report} query={query} sort={sort} columns={columns} totalCount={totalCount} access={access} />
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowSaveDialog(true)}
          disabled={selectedKeys.length === 0}
          className="touch-target"
        >
          <Save className="w-3.5 h-3.5" /> Save as Template
        </Button>
      </div>

      {/* Preview Table */}
      {selectedKeys.length === 0 ? (
        <AsyncState empty emptyTitle="No fields selected" emptyMessage="Select at least one field from the Available Fields panel to see data." />
      ) : (
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
      )}

      {/* Save Dialog */}
      {report && showSaveDialog && (
        <SaveReportDialog
          open={showSaveDialog}
          onClose={() => setShowSaveDialog(false)}
          report={{
            id: `custom:${ds.key}`,
            name: ds.label,
            category: "custom",
          }}
          globalFilters={globalFilters}
          reportFilters={customFilters}
          visibleColumnKeys={selectedKeys}
          groupBy={groupBy}
          sort={sort}
          customConfig={{ dataSource: ds.key, selectedFields: selectedKeys, customFilters }}
        />
      )}
    </div>
  );
}