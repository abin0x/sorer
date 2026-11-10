import React, { useState, useRef, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, Check, Undo2, Download, AlertTriangle, Users, UserCheck, Shield, FileWarning, RefreshCw, FileText, RotateCcw } from "lucide-react";
import { exportToCsv } from "@/lib/csvUtils";
import SpecialistFilesTab from "./SpecialistFilesTab";
import SpecialistIssuesTab from "./SpecialistIssuesTab";
import SpecialistRecordsTab from "./SpecialistRecordsTab";
import { isOpenIssue } from '@/components/saas/migrations/reviewState';
import useMigrationRunner from '@/components/saas/migrations/useMigrationRunner';
import MigrationProgress from '@/components/migration/MigrationProgress';

const GUARDIAN_FIELDS = [
  { key: "first_name", label: "First Name" },
  { key: "last_name", label: "Last Name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "street_address", label: "Address" },
  { key: "city", label: "City" },
  { key: "state", label: "State" },
  { key: "zip_code", label: "ZIP" },
  { key: "household_id", label: "Household ID" },
  { key: "is_team_parent", label: "Team Parent" },
];

const PLAYER_FIELDS = [
  { key: "first_name", label: "First Name" },
  { key: "last_name", label: "Last Name" },
  { key: "date_of_birth", label: "DOB" },
  { key: "gender", label: "Gender" },
  { key: "team_name", label: "Team" },
  { key: "program_title", label: "Program" },
  { key: "guardian_email", label: "Guardian Email" },
  { key: "status", label: "Status" },
  { key: "notes", label: "Notes" },
];

const TEAM_FIELDS = [
  { key: "name", label: "Team Name" },
  { key: "age_group", label: "Age Group" },
  { key: "gender", label: "Gender" },
  { key: "playing_format", label: "Format" },
  { key: "season", label: "Season" },
];

const DECISION_LABELS = {
  club_column_meaning: { branch: "Maps to a branch/location", ignore: "Ignore — just the club name" },
  leading_account_columns: { duplicate: "Duplicates Parent 1 — ignored", separate: "Separate account — import as guardian", unsure: "Reviewer should check" },
  cancelled_registrations: { inactive: "Import as inactive", exclude: "Exclude entirely" },
};

const PHASE_LABELS = { teams: "Teams", guardians: "Guardians", players: "Players", links: "Cross-links", done: "Done" };

export default function SpecialistReviewPanel({ job: initialJob, clubName, onReviewed }) {
  const { toast } = useToast();
  const [job, setJob] = useState(initialJob);
  const [notes, setNotes] = useState(initialJob.specialist_notes || "");
  const [busy, setBusy] = useState(null);
  const { commitState, setCommitState, commitError, running, paused, start: startPolling, stop: stopPolling } = useMigrationRunner(initialJob.id, (progress) => {
    toast({ title: 'Go-Live complete', description: `${progress.imported?.teams || 0} teams, ${progress.imported?.guardians || 0} guardians, ${progress.imported?.players || 0} players imported.` });
    onReviewed();
  });

  // Keep local job state in sync when parent passes a new job (e.g. after onReviewed reload)
  useEffect(() => {
    setJob(initialJob);
    setNotes(initialJob.specialist_notes || "");
  }, [initialJob.id, initialJob.updated_date]);

  // Fetch the latest job from the server — called after every fix action.
  // reprocess first (updates preview_counts on the server), then get_job
  // to fetch the job with the fresh counts.
  const refreshJob = useCallback(async () => {
    try {
      await base44.functions.invoke("migration-approve-and-run", {
        migrationJobId: initialJob.id,
        action: "reprocess",
      });
      const { data } = await base44.functions.invoke("migration-approve-and-run", {
        migrationJobId: initialJob.id,
        action: "get_job",
      });
      if (data?.job) setJob(data.job);
    } catch (e) {
      throw e;
    }
  }, [initialJob.id]);

  const staging = job.staging_data || {};
  const guardians = staging.guardians || [];
  const players = staging.players || [];
  const teams = (job.team_sheet && job.team_sheet.length > 0) ? job.team_sheet : (staging.teams || []);
  const exceptions = (staging.exceptions || []).filter((e) => !e._resolution);
  const duplicates = (staging.duplicates || []).filter((d) => !job.duplicate_decisions?.[d.id]);
  const issues = (staging.issues || []).filter((i) => isOpenIssue(job, i));
  const allIssues = staging.issues || [];
  const warnings = job.warnings || [];
  const counts = job.preview_counts || {};

  // Resume polling if the job is already processing when the panel mounts
  useEffect(() => {
    if (job.status === "processing") {
      setCommitState(job.commit_progress || { phase: "teams", imported: { teams: 0, guardians: 0, players: 0 }, total: { teams: 0, guardians: 0, players: 0 }, errors: [] });
      startPolling();
    }
    return () => stopPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job.id]);

  const retryCommit = () => startPolling();

  const handleApprove = async () => {
    setBusy("approve");
    try {
      const { data } = await base44.functions.invoke("migration-approve-and-run", { migrationJobId: job.id, action: "approve", specialistNotes: notes });
      setCommitState(data.progress || { phase: "teams", imported: { teams: 0, guardians: 0, players: 0 }, total: data.progress?.total });
      toast({ title: "Go-Live started", description: "Importing in the background — no timeout." });
      startPolling();
    } catch (e) {
      toast({ title: "Failed to start", description: e?.response?.data?.error || e?.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const handleSendBack = async () => {
    setBusy("send_back");
    try {
      await base44.functions.invoke("migration-approve-and-run", { migrationJobId: job.id, action: "send_back", specialistNotes: notes });
      toast({ title: "Sent back to club" });
      onReviewed();
    } catch (e) {
      toast({ title: "Failed", description: e?.response?.data?.error || e?.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const slug = (job.club_name || "club").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const isCommitting = job.status === "processing" || running || !!commitState?.phase && commitState.phase !== 'done';

  const prog = commitState || {};
  const total = prog.total || { teams: teams.length, guardians: guardians.length, players: players.length };
  const done = (prog.imported?.teams || 0) + (prog.imported?.guardians || 0) + (prog.imported?.players || 0);
  const totalAll = (total.teams || 0) + (total.guardians || 0) + (total.players || 0);
  const pct = totalAll > 0 ? Math.min(100, Math.round((done / totalAll) * 100)) : 0;

  const resolvedCount = allIssues.length - issues.length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-lg">{clubName || job.club_name || "Club"}</h3>
          <p className="text-xs text-slate-500">Source: {job.competitor_source} · Submitted {job.submitted_at ? new Date(job.submitted_at).toLocaleDateString() : "—"}</p>
        </div>
        <Badge className={job.status === "processing" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}>
          {job.status === "processing" ? "Importing…" : "Awaiting review"}
        </Badge>
      </div>

      {/* Blocking issue warning banner */}
      {issues.length > 0 && !isCommitting && job.status !== "completed" && (
        <div className="rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-3.5 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-bold text-amber-900">{issues.length} issue{issues.length !== 1 ? "s" : ""} need attention before Go-Live</p>
            <p className="text-xs text-amber-700 mt-0.5">Use the Issues tab to bulk-resolve, or edit records directly in the Records tab. Re-upload corrected files in the Files tab.</p>
          </div>
        </div>
      )}

      {/* Go-Live progress bar */}
      {isCommitting && <MigrationProgress job={job} progress={commitState || job.commit_progress} />}

      <Tabs defaultValue="overview">
        <TabsList className="w-full justify-start flex-wrap h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="files" className="gap-1.5"><FileText className="w-3.5 h-3.5" /> Files</TabsTrigger>
          <TabsTrigger value="issues" className="gap-1.5">
            Issues
            {issues.length > 0 && <Badge className="ml-1 text-[10px] h-4 px-1.5 bg-amber-100 text-amber-700">{issues.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="records">Records</TabsTrigger>
          <TabsTrigger value="golive">Go-Live</TabsTrigger>
        </TabsList>

        {/* ---- Overview ---- */}
        <TabsContent value="overview" className="space-y-3 mt-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              { k: "guardians", label: "Guardians", icon: Users, val: counts.guardians ?? guardians.length },
              { k: "players", label: "Players", icon: UserCheck, val: counts.players ?? players.length },
              { k: "teams", label: "Teams", icon: Shield, val: counts.teams ?? teams.length },
              { k: "exceptions", label: "Exceptions", icon: FileWarning, val: counts.exceptions ?? exceptions.length },
            ].map(({ k, label, icon: Icon, val }) => (
              <div key={k} className="rounded-xl border border-slate-200 bg-white p-3 text-center hover:border-primary/30 transition-colors">
                <Icon className="w-4 h-4 text-slate-400 mx-auto mb-1.5" />
                <div className="text-xl font-extrabold text-slate-800">{val}</div>
                <div className="text-[11px] text-slate-500 font-medium">{label}</div>
              </div>
            ))}
          </div>

          {resolvedCount > 0 && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" /> {resolvedCount} issue{resolvedCount !== 1 ? "s" : ""} already resolved
            </div>
          )}

          {warnings.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-1 max-h-32 overflow-y-auto">
              {warnings.map((w, i) => <p key={i} className="text-xs text-amber-800 flex items-start gap-1.5"><AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" /> {w}</p>)}
            </div>
          )}

          {/* Download staged data */}
          {(() => {
            const hasData = guardians.length > 0 || players.length > 0 || teams.length > 0;
            if (!hasData) return null;
            return (
              <div className="rounded-xl border border-slate-200 p-3.5 space-y-2.5">
                <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5"><Download className="w-3.5 h-3.5" /> Download staged data</p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => exportToCsv(`${slug}-guardians.csv`, guardians, GUARDIAN_FIELDS)} disabled={guardians.length === 0}>
                    Guardians ({guardians.length})
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => exportToCsv(`${slug}-players.csv`, players, PLAYER_FIELDS)} disabled={players.length === 0}>
                    Players ({players.length})
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => exportToCsv(`${slug}-teams.csv`, teams, TEAM_FIELDS)} disabled={teams.length === 0}>
                    Teams ({teams.length})
                  </Button>
                </div>
              </div>
            );
          })()}

          {/* Client decisions */}
          {job.client_decisions && Object.keys(job.client_decisions).length > 0 && (
            <div className="rounded-xl border border-slate-200 p-3.5 space-y-1">
              <p className="text-xs font-bold text-slate-700 mb-1">Client decisions</p>
              {Object.entries(job.client_decisions).map(([key, val]) => (
                <p key={key} className="text-xs text-slate-600">
                  <span className="font-medium capitalize">{key.replace(/_/g, " ")}:</span>{" "}
                  {DECISION_LABELS[key]?.[val] || val}
                </p>
              ))}
            </div>
          )}

          {/* Team sheet */}
          {job.team_sheet && job.team_sheet.length > 0 && (
            <div className="rounded-xl border border-slate-200 p-3.5 space-y-2">
              <p className="text-xs font-bold text-slate-700">Client-completed team sheet</p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {job.team_sheet.map((t, i) => (
                  <div key={i} className="text-xs text-slate-600 flex flex-wrap gap-x-3">
                    <span className="font-semibold">{t.name}</span>
                    <span>{t.age_group || "—"}</span>
                    <span>{t.gender || "—"}</span>
                    <span>{t.playing_format || "—"}</span>
                    <span>{t.season || "—"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* ---- Files ---- */}
        <TabsContent value="files" className="mt-3">
          <SpecialistFilesTab job={job} onReplaced={refreshJob} />
        </TabsContent>

        {/* ---- Issues with fix tools ---- */}
        <TabsContent value="issues" className="mt-3">
          <SpecialistIssuesTab job={job} onFixed={refreshJob} />
        </TabsContent>

        {/* ---- Records with inline editing ---- */}
        <TabsContent value="records" className="mt-3">
          <SpecialistRecordsTab job={job} onFixed={refreshJob} />
        </TabsContent>

        {/* ---- Go-Live ---- */}
        <TabsContent value="golive" className="space-y-3 mt-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
            <p className="text-xs text-slate-600 leading-relaxed">
              Approving processes one configurable chunk per request. Keep this panel open while importing; reopening it resumes the saved cursor.
              Requests run one at a time with pauses and automatic backoff for temporary errors. Send Back returns the job to the club with your note.
            </p>
          </div>

          {job.status === "completed" && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <p className="text-sm text-emerald-800">
                Go-Live complete: {job.imported_counts?.teams || 0} teams, {job.imported_counts?.guardians || 0} guardians, {job.imported_counts?.players || 0} players imported.
                {job.error_log?.length > 0 && ` ${job.error_log.length} error(s) recorded.`}
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Specialist note (shown to the club)</label>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Your data looks clean. Everything is ready to go." disabled={isCommitting} />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleApprove} disabled={!!busy || isCommitting} className="gap-2 flex-1">
              {busy === "approve" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {isCommitting ? "Importing…" : "Approve & Go Live"}
            </Button>
            <Button onClick={handleSendBack} disabled={!!busy || isCommitting} variant="outline" className="gap-2 flex-1">
              {busy === "send_back" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Undo2 className="w-4 h-4" />} Send Back
            </Button>
          </div>

          {commitError && job.status === "processing" && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 space-y-2">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-amber-600 animate-spin" />
                <p className="text-sm font-semibold text-amber-800">{paused ? 'Import needs attention — remaining rows are saved' : 'Import paused — retrying automatically'}</p>
              </div>
              <p className="text-xs text-amber-700">{commitError}</p>
              <p className="text-xs text-amber-600">Progress is saved. The import will resume from where it stopped — no data is lost. You can also retry manually.</p>
              <Button onClick={retryCommit} disabled={running} size="sm" variant="outline" className="gap-2">
                <RotateCcw className="w-3.5 h-3.5" /> Continue remaining rows
              </Button>
            </div>
          )}

          {job.error_log?.length > 0 && job.status === "completed" && (
            <details className="rounded-lg border border-rose-200 p-2">
              <summary className="text-xs font-semibold text-rose-700 cursor-pointer">Error log ({job.error_log.length})</summary>
              <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                {job.error_log.map((err, i) => <p key={i} className="text-xs text-rose-600">{err}</p>)}
              </div>
            </details>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}