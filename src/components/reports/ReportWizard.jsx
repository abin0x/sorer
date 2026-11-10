import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ArrowRight, Check, ChevronDown, ChevronUp, X, Plus, Save, Filter, Columns3, Play, Database, Search } from "lucide-react";
import { getDataSourcesForAccess, buildSyntheticReport } from "@/lib/reports/customReportLibrary";
import { ADVANCED_OPERATORS } from "@/lib/reports/advancedFilters";
import { useReportData } from "@/hooks/useReportData";
import ReportTable from "@/components/reports/ReportTable";
import ReportExportBar from "@/components/reports/ReportExportBar";
import SaveReportDialog from "./SaveReportDialog";
import AsyncState from "@/components/shared/AsyncState";
import { cn } from "@/lib/utils";

const STEPS = [
  { key: "source", label: "Report type", icon: Database },
  { key: "filters", label: "Filters", icon: Filter },
  { key: "fields", label: "Columns", icon: Columns3 },
  { key: "run", label: "Results", icon: Play },
];

const pretty = (v) => String(v).replace(/_/g, " ");

/**
 * Step-by-step report generator: pick a data source, apply standard and
 * advanced filters, choose/reorder columns, then run, export or save.
 * props: { onBack, initialConfig, globalFilters, globalSummary, scope, access }
 */
export default function ReportWizard({ onBack, initialConfig, globalFilters, globalSummary = [], scope, access }) {
  const dataSources = useMemo(() => getDataSourcesForAccess(access), [access]);
  const [step, setStep] = useState(initialConfig ? 3 : 0);
  const [dsKey, setDsKey] = useState(initialConfig?.dataSource || dataSources[0]?.key);
  const ds = dataSources.find((d) => d.key === dsKey);
  const allFields = useMemo(() => ds?.fieldGroups.flatMap((g) => g.fields) || [], [ds]);

  const [selectedKeys, setSelectedKeys] = useState(() => initialConfig?.selectedFields || allFields.filter((f) => f.defaultVisible).map((f) => f.key));
  const [customFilters, setCustomFilters] = useState(() => initialConfig?.customFilters || {});
  const [groupBy, setGroupBy] = useState(initialConfig?.groupBy || null);
  const [sort, setSort] = useState(initialConfig?.sort || ds?.defaultSort || "-created_date");
  const [fieldSearch, setFieldSearch] = useState("");
  const [collapsed, setCollapsed] = useState({});
  const [showSave, setShowSave] = useState(false);

  const chooseSource = (key) => {
    const next = dataSources.find((d) => d.key === key);
    if (!next) return;
    setDsKey(key);
    setSelectedKeys(next.fieldGroups.flatMap((g) => g.fields).filter((f) => f.defaultVisible).map((f) => f.key));
    setCustomFilters({});
    setGroupBy(null);
    setSort(next.defaultSort || "-created_date");
  };

  const advanced = customFilters.__advanced || [];
  const setAdvanced = (rows) => setCustomFilters((p) => ({ ...p, __advanced: rows }));
  const filterableFields = allFields.filter((f) => !f.compute);

  const report = useMemo(() => (ds && selectedKeys.length ? buildSyntheticReport(ds, selectedKeys) : null), [ds, selectedKeys]);
  const query = useMemo(() => (report ? report.buildQuery(globalFilters, customFilters, scope) : null), [report, globalFilters, customFilters, scope]);
  const running = step === 3 && !!report;
  const { rows, totalCount, totals, hasMore, isFetchingMore, fetchNextPage, isLoading } = useReportData({
    report: report || { id: "none", entity: ds?.entity || "Player", columns: [], buildQuery: () => ({}) },
    query: query || {},
    sort,
    groupBy,
    scope: running ? scope : { scopeReady: false },
  });

  if (!dataSources.length) {
    return <AsyncState empty emptyTitle="No report data available" emptyMessage="Your role doesn't include any report data sources." />;
  }

  const activeFilterCount = Object.entries(customFilters).filter(([k, v]) => k !== "__advanced" && v != null && v !== "").length + advanced.filter((r) => r.field).length;
  const toggle = (key) => setSelectedKeys((p) => (p.includes(key) ? p.filter((k) => k !== key) : [...p, key]));
  const move = (i, d) => setSelectedKeys((p) => { const n = [...p]; const t = i + d; if (t < 0 || t >= n.length) return p; [n[i], n[t]] = [n[t], n[i]]; return n; });
  const q = fieldSearch.toLowerCase();

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} aria-label="Back to report center"><ArrowLeft className="w-4 h-4" /></Button>
        <div className="flex-1">
          <h2 className="text-lg font-bold">Report Wizard</h2>
          <p className="text-sm text-muted-foreground">Build any report in four steps — then export it, save it or schedule it.</p>
        </div>
      </div>

      {/* Stepper */}
      <ol className="grid grid-cols-4 gap-2">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const done = i < step;
          return (
            <li key={s.key}>
              <button
                onClick={() => (i <= step || selectedKeys.length) && setStep(i)}
                className={cn("w-full flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left transition-colors",
                  i === step ? "border-primary bg-primary/10" : done ? "border-primary/30 bg-card" : "bg-card text-muted-foreground")}
              >
                <span className={cn("w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                  i === step ? "bg-primary text-primary-foreground" : done ? "bg-primary/20 text-primary" : "bg-muted")}>
                  {done ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                </span>
                <span className="min-w-0">
                  <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">Step {i + 1}</span>
                  <span className="block text-sm font-semibold truncate">{s.label}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {step === 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {dataSources.map((d) => {
            const Icon = d.icon;
            const n = d.fieldGroups.reduce((a, g) => a + g.fields.length, 0);
            return (
              <button key={d.key} onClick={() => chooseSource(d.key)}
                className={cn("text-left p-4 rounded-xl border bg-card transition-all hover:border-primary/40",
                  d.key === dsKey && "border-primary ring-2 ring-primary/20")}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Icon className="w-5 h-5 text-primary" /></div>
                  <div className="flex-1">
                    <p className="font-semibold">{d.label}</p>
                    <p className="text-xs text-muted-foreground">{n} fields · {d.filters.length} quick filters</p>
                  </div>
                  {d.key === dsKey && <Check className="w-5 h-5 text-primary" />}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {step === 1 && ds && (
        <div className="space-y-4">
          <section className="rounded-xl border bg-card p-4">
            <h3 className="text-sm font-semibold mb-1">Club-wide filters</h3>
            <p className="text-xs text-muted-foreground mb-3">Season, branch, team, league and date range come from the filter bar at the top of the page.</p>
            <div className="flex flex-wrap gap-2">
              {globalSummary.length ? globalSummary.map((s) => (
                <span key={s} className="text-xs rounded-full bg-primary/10 text-primary px-2.5 py-1">{s}</span>
              )) : <span className="text-xs text-muted-foreground">No club-wide filters — all seasons, branches and teams.</span>}
            </div>
          </section>

          {ds.filters.length > 0 && (
            <section className="rounded-xl border bg-card p-4">
              <h3 className="text-sm font-semibold mb-3">{ds.label} filters</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {ds.filters.map((f) => (
                  <label key={f.key} className="flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground">{f.label}</span>
                    {f.type === "text" ? (
                      <Input value={customFilters[f.key] || ""} placeholder={`Any ${f.label.toLowerCase()}`}
                        onChange={(e) => setCustomFilters((p) => ({ ...p, [f.key]: e.target.value || undefined }))} />
                    ) : (
                      <Select value={customFilters[f.key] || "all"} onValueChange={(v) => setCustomFilters((p) => ({ ...p, [f.key]: v === "all" ? undefined : v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          {(f.type === "boolean" ? ["true", "false"] : f.options).map((o) => (
                            <SelectItem key={o} value={o}>{f.type === "boolean" ? (o === "true" ? "Yes" : "No") : pretty(o)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </label>
                ))}
              </div>
            </section>
          )}

          <section className="rounded-xl border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold">Advanced filters</h3>
                <p className="text-xs text-muted-foreground">Filter on any field — birth-date ranges, positions, amounts, missing guardians and more.</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setAdvanced([...advanced, { field: "", op: "equals", value: "" }])}>
                <Plus className="w-3.5 h-3.5" /> Add filter
              </Button>
            </div>
            {advanced.length === 0 && <p className="text-xs text-muted-foreground">No advanced filters yet.</p>}
            <div className="space-y-2">
              {advanced.map((row, i) => {
                const field = filterableFields.find((f) => f.key === row.field);
                const op = ADVANCED_OPERATORS.find((o) => o.key === row.op);
                const update = (patch) => setAdvanced(advanced.map((r, j) => (j === i ? { ...r, ...patch } : r)));
                return (
                  <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_180px_1fr_auto] gap-2 items-center">
                    <Select value={row.field || undefined} onValueChange={(v) => update({ field: v })}>
                      <SelectTrigger><SelectValue placeholder="Choose a field" /></SelectTrigger>
                      <SelectContent>
                        {filterableFields.map((f) => <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={row.op} onValueChange={(v) => update({ op: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ADVANCED_OPERATORS.map((o) => <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {op?.needsValue ? (
                      <Input type={field?.type === "date" ? "date" : field?.type === "currency" || field?.type === "number" ? "number" : "text"}
                        value={row.value || ""} onChange={(e) => update({ value: e.target.value })} placeholder="Value" />
                    ) : <span className="text-xs text-muted-foreground px-2">No value needed</span>}
                    <Button variant="ghost" size="icon" aria-label="Remove filter" onClick={() => setAdvanced(advanced.filter((_, j) => j !== i))}><X className="w-4 h-4" /></Button>
                  </div>
                );
              })}
            </div>
          </section>
          {activeFilterCount > 0 && (
            <Button variant="link" size="sm" className="px-0" onClick={() => setCustomFilters({})}>Reset {activeFilterCount} filter{activeFilterCount === 1 ? "" : "s"}</Button>
          )}
        </div>
      )}

      {step === 2 && ds && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <section className="rounded-xl border bg-card overflow-hidden">
              <div className="px-4 py-3 border-b bg-muted/30 flex items-center gap-2">
                <h3 className="text-sm font-semibold flex-1">Available fields</h3>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input value={fieldSearch} onChange={(e) => setFieldSearch(e.target.value)} placeholder="Find a field" className="h-8 pl-7 w-40" />
                </div>
              </div>
              <div className="max-h-[440px] overflow-y-auto p-2">
                {ds.fieldGroups.map((g) => {
                  const fields = g.fields.filter((f) => !q || f.label.toLowerCase().includes(q));
                  if (!fields.length) return null;
                  const allOn = fields.every((f) => selectedKeys.includes(f.key));
                  const open = !collapsed[g.label] || !!q;
                  return (
                    <div key={g.label} className="mb-1">
                      <div className="flex items-center gap-2 px-2 py-2 hover:bg-accent/40 rounded-lg">
                        <Checkbox checked={allOn} onCheckedChange={() => setSelectedKeys((p) => allOn ? p.filter((k) => !fields.some((f) => f.key === k)) : [...p, ...fields.map((f) => f.key).filter((k) => !p.includes(k))])} aria-label={`Select all ${g.label}`} />
                        <button className="flex-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground" onClick={() => setCollapsed((c) => ({ ...c, [g.label]: !c[g.label] }))}>
                          {g.label} <span className="ml-auto">{fields.length}</span>
                          {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      </div>
                      {open && fields.map((f) => (
                        <label key={f.key} className="flex items-center gap-2 py-1.5 pl-8 pr-2 cursor-pointer hover:bg-accent/40 rounded-lg">
                          <Checkbox checked={selectedKeys.includes(f.key)} onCheckedChange={() => toggle(f.key)} />
                          <span className="text-sm">{f.label}</span>
                        </label>
                      ))}
                    </div>
                  );
                })}
              </div>
            </section>
            <section className="rounded-xl border bg-card overflow-hidden">
              <div className="px-4 py-3 border-b bg-muted/30 flex items-center">
                <h3 className="text-sm font-semibold flex-1">Added columns ({selectedKeys.length})</h3>
                {selectedKeys.length > 0 && <Button variant="ghost" size="sm" onClick={() => setSelectedKeys([])}>Clear</Button>}
              </div>
              <div className="max-h-[440px] overflow-y-auto p-2">
                {!selectedKeys.length && <p className="text-sm text-muted-foreground p-6 text-center">Tick fields on the left to add columns.</p>}
                {selectedKeys.map((key, i) => {
                  const f = allFields.find((x) => x.key === key);
                  const grp = ds.fieldGroups.find((g) => g.fields.some((x) => x.key === key));
                  if (!f) return null;
                  return (
                    <div key={key} className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-accent/30">
                      <div className="flex flex-col">
                        <button aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)} className="disabled:opacity-20"><ChevronUp className="w-3 h-3" /></button>
                        <button aria-label="Move down" disabled={i === selectedKeys.length - 1} onClick={() => move(i, 1)} className="disabled:opacity-20"><ChevronDown className="w-3 h-3" /></button>
                      </div>
                      <span className="text-sm flex-1"><span className="text-muted-foreground">{grp?.label}: </span>{f.label}</span>
                      <button aria-label={`Remove ${f.label}`} onClick={() => toggle(key)} className="text-muted-foreground hover:text-destructive"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
          <section className="rounded-xl border bg-card p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Group rows by</span>
              <Select value={groupBy || "none"} onValueChange={(v) => setGroupBy(v === "none" ? null : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No grouping</SelectItem>
                  {allFields.filter((f) => f.groupable).map((f) => <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Sort by</span>
              <Select value={sort.replace(/^-/, "")} onValueChange={(v) => setSort((sort.startsWith("-") ? "-" : "") + v)}>
                <SelectTrigger><SelectValue placeholder="Default order" /></SelectTrigger>
                <SelectContent>
                  {[...new Set([sort.replace(/^-/, ""), ...allFields.filter((f) => f.sortable).map((f) => f.key)])].map((k) => (
                    <SelectItem key={k} value={k}>{allFields.find((f) => f.key === k)?.label || pretty(k)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          </section>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3">
            <span className="text-sm"><strong>{ds?.label}</strong> · {selectedKeys.length} columns · {activeFilterCount} filters{groupBy ? ` · grouped by ${allFields.find((f) => f.key === groupBy)?.label}` : ""}</span>
            <div className="ml-auto flex items-center gap-2 flex-wrap">
              {report && <ReportExportBar report={report} query={query} sort={sort} columns={report.columns} totalCount={totalCount} access={access} />}
              <Button size="sm" onClick={() => setShowSave(true)} disabled={!report}><Save className="w-3.5 h-3.5" /> Save report</Button>
            </div>
          </div>
          {!report ? (
            <AsyncState empty emptyTitle="No columns chosen" emptyMessage="Go back to Columns and add at least one field." />
          ) : (
            <ReportTable columns={report.columns} rows={rows} totals={totals} sort={sort} onSort={setSort}
              hasMore={hasMore} isFetchingMore={isFetchingMore} onLoadMore={fetchNextPage} isLoading={isLoading} groupBy={groupBy} />
          )}
        </div>
      )}

      {/* Footer nav */}
      <div className="flex items-center justify-between border-t pt-4">
        <Button variant="outline" onClick={() => (step === 0 ? onBack() : setStep(step - 1))}>
          <ArrowLeft className="w-4 h-4" /> {step === 0 ? "Cancel" : "Back"}
        </Button>
        {step < 3 && (
          <Button onClick={() => setStep(step + 1)} disabled={step === 2 && !selectedKeys.length}>
            {step === 2 ? <>Run report <Play className="w-4 h-4" /></> : <>Next <ArrowRight className="w-4 h-4" /></>}
          </Button>
        )}
      </div>

      {report && showSave && (
        <SaveReportDialog open={showSave} onClose={() => setShowSave(false)}
          report={{ id: `custom:${ds.key}`, name: ds.label, category: "custom" }}
          globalFilters={globalFilters} reportFilters={customFilters} visibleColumnKeys={selectedKeys}
          groupBy={groupBy} sort={sort}
          customConfig={{ dataSource: ds.key, selectedFields: selectedKeys, customFilters, groupBy, sort }} />
      )}
    </div>
  );
}
