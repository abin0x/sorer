import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { isOpenIssue } from '@/components/saas/migrations/reviewState';
import IssueRowEditor from '@/components/saas/migrations/IssueRowEditor';
import MissingGuardianEditor from '@/components/saas/migrations/MissingGuardianEditor';
import ExceptionRowEditor from '@/components/saas/migrations/ExceptionRowEditor';
import ResolutionHistory from '@/components/saas/migrations/ResolutionHistory';
import DuplicateReviewList from '@/components/saas/migrations/DuplicateReviewList';
import { Loader2, Check, Copy, AlertTriangle, FileWarning, GitMerge, Trash2, SkipForward, CheckCircle2, Filter, ChevronDown, ChevronRight } from "lucide-react";

export default function SpecialistIssuesTab({ job, onFixed }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(null);
  const [query, setQuery] = useState("");
  const [expandedGroups, setExpandedGroups] = useState({});
  const [showResolved, setShowResolved] = useState(false);

  const staging = job.staging_data || {};
  const allIssues = (staging.issues || []).map((i, idx) => ({ ...i, _idx: idx }));
  const exceptions = (staging.exceptions || []).map((e, _idx) => ({ ...e, _idx })).filter((e) => !e._resolution);
  const duplicates = (staging.duplicates || []).filter((d) => !job.duplicate_decisions?.[d.id]);
  const dupDecisions = job.duplicate_decisions || {};

  // Split issues into open and resolved
  const openIssues = allIssues.filter((i) => isOpenIssue(job, i));
  const resolvedIssues = allIssues.filter((i) => !isOpenIssue(job, i));

  // Group open issues by field + category for manageable navigation
  const grouped = useMemo(() => {
    const term = query.trim().toLowerCase();
    const filtered = term
      ? openIssues.filter((i) => (i.message || "").toLowerCase().includes(term) || (i.field || "").toLowerCase().includes(term))
      : openIssues;
    const map = {};
    for (const iss of filtered) {
      if (iss.type === 'duplicate') continue;
      const key = `${iss.field || "general"}|${iss.category || "needs_human_review"}`;
      if (!map[key]) map[key] = { field: iss.field || "general", category: iss.category || "needs_human_review", items: [] };
      map[key].items.push(iss);
    }
    return Object.values(map).sort((a, b) => b.items.length - a.items.length);
  }, [openIssues, query]);

  const call = async (label, payload, successMsg) => {
    setBusy(label);
    try {
      await base44.functions.invoke("migration-approve-and-run", { migrationJobId: job.id, ...payload });
      await onFixed();
      toast({ title: successMsg || "Saved; removed from open issues" });
      return true;
    } catch (e) {
      toast({ title: "Failed", description: e?.response?.data?.error || e?.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const bulkResolve = (resolution, category, field) => {
    const label = `bulk-${resolution}-${category || "all"}-${field || "all"}`;
    call(label, { action: "bulk_resolve_issues", resolution, category, field },
      `Resolved ${field ? field + " " : ""}${category || "all"} issues`);
  };

  const resolveIssue = (idx, resolution) =>
    call(`issue-${idx}`, { action: "resolve_issue", issue_index: idx, resolution }, "Issue resolved");

  const resolveDuplicate = (dupId, decision) =>
    call(`dup-${dupId}`, { action: "resolve_duplicate", duplicate_id: dupId, decision }, `Duplicate marked: ${decision}`);

  const bulkResolveDuplicates = (decision) =>
    call(`bulk-dup-${decision}`, { action: "bulk_resolve_duplicates", decision }, `All duplicates marked: ${decision}`);

  const toggleGroup = (key) => setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="space-y-4">
      {busy && <p role="status" className="text-xs text-primary flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Saving changes and refreshing issues…</p>}
      {/* Bulk action toolbar */}
      {openIssues.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              {openIssues.length} open issue{openIssues.length !== 1 ? "s" : ""} across {grouped.length} categor{grouped.length !== 1 ? "ies" : "y"}
            </p>
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" variant="default" className="h-8 gap-1.5" disabled={!!busy}
                onClick={() => bulkResolve("resolved")}>
                {busy === "bulk-resolved-all-all" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                Resolve All
              </Button>
              <Button size="sm" variant="outline" className="h-8 gap-1.5" disabled={!!busy}
                onClick={() => bulkResolve("ignored", "client_fixable")}>
                Ignore Fixable
              </Button>
              <Button size="sm" variant="outline" className="h-8 gap-1.5" disabled={!!busy}
                onClick={() => bulkResolve("accepted", "needs_human_review")}>
                Accept Reviews
              </Button>
            </div>
          </div>
          {/* Search */}
          <div className="relative">
            <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search issues by message or field…" className="pl-8 h-8 text-xs" />
          </div>
        </div>
      )}

      <ResolutionHistory job={job} />

      {/* Grouped open issues */}
      {grouped.length > 0 && (
        <div className="space-y-2">
          {grouped.map((grp) => {
            const groupKey = `${grp.field}|${grp.category}`;
            const isExpanded = expandedGroups[groupKey] !== false; // default expanded
            return (
              <div key={groupKey} className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="flex items-center justify-between gap-2 px-3 py-2.5 bg-white hover:bg-slate-50 cursor-pointer"
                  onClick={() => toggleGroup(groupKey)}>
                  <div className="flex items-center gap-2 min-w-0">
                    {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                    <Badge className={`text-[10px] shrink-0 ${grp.category === "needs_human_review" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>
                      {grp.category === "needs_human_review" ? "Review" : "Fixable"}
                    </Badge>
                    <span className="text-sm font-semibold text-slate-700 truncate">{grp.field}</span>
                    <Badge className="text-[10px] bg-slate-100 text-slate-600 shrink-0">{grp.items.length}</Badge>
                  </div>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1 shrink-0"
                    disabled={!!busy}
                    onClick={(e) => { e.stopPropagation(); bulkResolve("resolved", grp.category, grp.field); }}>
                    {busy === `bulk-resolved-${grp.category}-${grp.field}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                    Resolve all
                  </Button>
                </div>
                {isExpanded && (
                  <div className="border-t border-slate-100 divide-y divide-slate-50">
                    {grp.items.slice(0, 50).map((iss) => (
                      <div key={iss._idx} className="flex items-start gap-2 px-3 py-2 hover:bg-slate-50">
                        <div className="flex-1 space-y-2 min-w-0"><p className="text-xs text-slate-600">{iss.message}</p>{iss.type === 'missing_email' ? <MissingGuardianEditor issue={iss} busy={!!busy} onSave={(payload) => call(`edit-issue-${iss._idx}`, payload, 'Guardian correction saved')} /> : <IssueRowEditor job={job} issue={iss} busy={!!busy} onSave={(payload) => call(`edit-issue-${iss._idx}`, payload, 'Correction saved')} />}
                        <Button size="sm" variant="ghost" disabled={!!busy} onClick={() => resolveIssue(iss._idx, 'ignored')}>Ignore issue (retain record)</Button></div>
                        <Button size="sm" variant="ghost" className="h-6 px-1.5 text-xs gap-1 shrink-0"
                          disabled={!!busy}
                          onClick={() => resolveIssue(iss._idx, "resolved")}>
                          {busy === `issue-${iss._idx}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Resolve
                        </Button>
                      </div>
                    ))}
                    {grp.items.length > 50 && (
                      <p className="text-xs text-slate-400 text-center py-1.5">Showing 50 of {grp.items.length}. Use search to narrow.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Exceptions */}
      {exceptions.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
            <FileWarning className="w-3.5 h-3.5 text-rose-500" /> Exceptions ({exceptions.length}) — missing required fields
          </p>
          <div className="max-h-48 overflow-y-auto space-y-1.5 rounded-xl border border-rose-200 p-2 bg-rose-50/30">
            {exceptions.map((ex) => <ExceptionRowEditor key={ex._idx} exception={ex} index={ex._idx} busy={!!busy} onSave={(payload) => call(`exception-${ex._idx}`, payload, 'Exception resolved')} />)}

          </div>
          <p className="text-xs text-slate-500 italic">Edit the missing values here and save the corrected player, or skip/delete the row from import.</p>
        </div>
      )}

      <DuplicateReviewList duplicates={duplicates} busy={!!busy} onSave={(payload) => call('duplicates', payload, 'Duplicate decision saved; removed from open issues')} />

      {openIssues.length === 0 && exceptions.length === 0 && duplicates.length === 0 && (
        <div className="text-center py-10">
          <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-400" />
          <p className="text-sm font-medium text-emerald-600">All issues resolved. Data looks clean.</p>
        </div>
      )}
    </div>
  );
}