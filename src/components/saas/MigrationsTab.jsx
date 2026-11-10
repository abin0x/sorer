import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeftRight } from "lucide-react";
import SpecialistReviewPanel from "@/components/saas/migrations/SpecialistReviewPanel";
import MigrationApprovalPanel from "@/components/saas/migrations/MigrationApprovalPanel";
import CsvMigrationPanel from '@/components/migration/csv/CsvMigrationPanel';
import MigrationProgress from '@/components/migration/MigrationProgress';

const STATUS_META = {
  pending_approval: { label: "Needs Approval", color: "bg-amber-100 text-amber-800" },
  draft: { label: "Draft", color: "bg-slate-100 text-slate-600" },
  processing: { label: "Auto-Mapping", color: "bg-blue-100 text-blue-700" },
  client_review: { label: "Client Reviewing", color: "bg-sky-100 text-sky-700" },
  support_review: { label: "Needs Review", color: "bg-amber-100 text-amber-700" },
  needs_fixes: { label: "Sent Back", color: "bg-rose-100 text-rose-700" },
  completed: { label: "Completed", color: "bg-emerald-100 text-emerald-700" },
};

// Sort so the most urgent statuses appear first.
const STATUS_PRIORITY = ["support_review", "pending_approval", "client_review", "processing", "needs_fixes", "draft", "completed"];

export default function MigrationsTab({ clubs = [] }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);

  // Resolve the authoritative club name from the Club entity by club_id.
  // Falls back to the job's stored club_name only if the club isn't loaded.
  const clubNameFor = (j) => clubs.find((c) => c.id === j?.club_id)?.name || j?.club_name || "Club";

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await base44.functions.invoke('migrationRequests', { action: 'list' });
      const list = (data.jobs || []).slice().sort((a, b) => STATUS_PRIORITY.indexOf(a.status) - STATUS_PRIORITY.indexOf(b.status));
      setJobs(list);
      if (!selectedId && list.length) setSelectedId(list[0].id);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const selected = jobs.find((j) => j.id === selectedId);

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <Card>
      <CardContent className="p-4">
        {jobs.length === 0 ? (
          <div className="text-center py-10 text-sm text-slate-400">
            <ArrowLeftRight className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            No migrations yet.
          </div>
        ) : (
          <div className="grid lg:grid-cols-[minmax(0,320px)_1fr] gap-4">
            <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1">
              {jobs.map((j) => {
                const meta = STATUS_META[j.status] || STATUS_META.draft;
                const urgent = j.status === "support_review";
                return (
                  <button
                    key={j.id}
                    onClick={() => setSelectedId(j.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-colors relative ${
                      j.id === selectedId ? "border-primary bg-primary/5" : urgent ? "border-amber-300 bg-amber-50 hover:bg-amber-100" : "border-slate-200 hover:border-primary/40"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm truncate">{clubNameFor(j)}</span>
                      <Badge className={`text-[10px] ${meta.color}`}>{meta.label}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{j.requested_by_name || j.requested_by_email || 'Legacy request: requester not recorded'}</p>
                    <p className="text-xs text-slate-400 mt-0.5 capitalize">{j.competitor_source}</p>
                  </button>
                );
              })}
            </div>
            <div className="border-l border-slate-100 pl-4 lg:pl-6">
              {selected ? (
                selected.commit_progress?.pipeline === 'csv_rows' ? <CsvMigrationPanel key={selected.id} job={selected} reviewer onChanged={load} /> :
                (selected.status === "support_review" || selected.status === "client_review" || selected.status === 'processing' && selected.commit_progress?.phase) ? (
                  <>
                    {selected.status === "client_review" && (
                      <div className="rounded-lg border border-sky-200 bg-sky-50 p-2 mb-3 text-xs text-sky-800">
                        The club hasn't submitted their review yet. You can download the staged data or import it now without waiting.
                      </div>
                    )}
                    <SpecialistReviewPanel job={selected} clubName={clubNameFor(selected)} onReviewed={load} />
                  </>
                ) : selected.status === "pending_approval" ? (
                  <MigrationApprovalPanel job={selected} clubName={clubNameFor(selected)} onReviewed={load} />
                ) : (
                  <div className="space-y-2">
                    <h3 className="font-bold text-lg">{clubNameFor(selected)}</h3>
                    <Badge className={STATUS_META[selected.status]?.color}>{STATUS_META[selected.status]?.label}</Badge>
                    {selected.specialist_notes && <p className="text-sm text-slate-600 mt-2">"{selected.specialist_notes}"</p>}
                    {selected.status !== "support_review" && (
                      <p className="text-sm text-slate-400 mt-2">
                        {selected.status === "draft" ? "Waiting for the club to upload files." : selected.status === "completed" ? "This migration is live." : "This job isn't awaiting review right now."}
                      </p>
                    )}
                  </div>
                )
              ) : (
                <div className="text-center py-16 text-sm text-slate-400">Select a migration to view details.</div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}