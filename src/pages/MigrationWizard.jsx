import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ShieldAlert, Cog, ShieldCheck, AlertTriangle } from "lucide-react";
import MigrationStageBar from "@/components/migration/MigrationStageBar";
import PrepareStep from "@/components/migration/PrepareStep";
import UploadStep from "@/components/migration/UploadStep";
import ClientReviewStep from "@/components/migration/ClientReviewStep";
import ReviewPendingCard from "@/components/migration/ReviewPendingCard";
import CompleteCard from "@/components/migration/CompleteCard";
import NeedsFixesCard from "@/components/migration/NeedsFixesCard";
import ImportProjectsPanel from "@/components/migration/import/ImportProjectsPanel";
import ProjectView from "@/components/migration/import/ProjectView";
import { useTenant } from '@/lib/TenantContext';
import { useNavigate } from '@/lib/router-compat';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import CsvMigrationPanel from '@/components/migration/csv/CsvMigrationPanel';
import MigrationProgress from '@/components/migration/MigrationProgress';

export default function MigrationWizard() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [processError, setProcessError] = useState('');
  const { effectiveClubId: clubId } = useTenant();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [job, setJob] = useState(null);
  const [starting, setStarting] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [files, setFiles] = useState({});
  const [mode, setMode] = useState('guided'); // 'guided' | 'import'
  const [importProjectId, setImportProjectId] = useState(null);

  const [isJourneyClub, setIsJourneyClub] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const u = await base44.auth.me();
      setUser(u);
      if (!clubId) { setJob(null); setFiles({}); return; }
      const { data } = await base44.functions.invoke('migrationRequests', { action: 'load', club_id: clubId });
      const jobs = data.jobs;
      setJob(jobs[0] || null);
      setFiles(jobs[0]?.files || {});
      // Detect journey clubs so the back button returns to the Setup Journey.
      const club = await base44.entities.Club.filter({ id: clubId }).then((r) => (Array.isArray(r) ? r : r.items || [])[0]).catch(() => null);
      setIsJourneyClub(['invited', 'onboarding'].includes(club?.tenant_status));
    } catch (e) {
      toast({ title: "Failed to load", description: e?.response?.data?.error || e?.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [clubId]);

  // Report migration progress back to the Setup Journey (Stage B) so the journey
  // tracks the import and sign-off steps automatically.
  useEffect(() => {
    if (!job?.status || !isJourneyClub) return;
    base44.functions.invoke('journey-action', { action: 'sync_migration', status: job.status }).catch(() => {});
  }, [job?.status, isJourneyClub]);

  const startMigration = async (competitor_source) => {
    setStarting(true);
    try {
      const { data } = await base44.functions.invoke('migrationRequests', { action: 'request', club_id: clubId, competitor_source });
      setJob(data.job);
    } catch (e) {
      toast({ title: "Couldn't start migration", description: e?.response?.data?.error || e?.message, variant: "destructive" });
    } finally {
      setStarting(false);
    }
  };

  const processFiles = async () => {
    if (!job) return;
    setProcessing(true);
    setProcessError('');
    try {
      await base44.functions.invoke("migration-process-files", { migrationJobId: job.id, files });
      const refreshed = await base44.entities.MigrationJob.get(job.id);
      setJob(refreshed);
    } catch (e) {
      setProcessError(e?.response?.data?.error || e?.message);
      toast({ title: "Processing failed", description: e?.response?.data?.error || e?.message, variant: "destructive" });
      // Reload the job — the backend resets it to draft with the error stored
      try { const refreshed = await base44.entities.MigrationJob.get(job.id); setJob(refreshed); } catch {}
    } finally {
      setProcessing(false);
    }
  };

  const retry = async () => {
    if (!job) return;
    try {
      const { data } = await base44.functions.invoke('migrationRequests', { action: 'retry', migrationJobId: job.id });
      setJob(data.job);
    } catch (e) {
      toast({ title: "Retry failed", description: e?.response?.data?.error || e?.message, variant: "destructive" });
    }
  };

  const reupload = async () => {
    if (!job) return;
    try {
      const { data } = await base44.functions.invoke('migrationRequests', { action: 'reset_to_upload', migrationJobId: job.id });
      setJob(data.job);
      setFiles(data.job.files || {});
    } catch (e) {
      toast({ title: "Couldn't reset", description: e?.response?.data?.error || e?.message, variant: "destructive" });
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!clubId) {
    return (
      <div className="p-8 max-w-md mx-auto text-center space-y-3">
        <ShieldAlert className="w-10 h-10 text-amber-500 mx-auto" />
        <h2 className="font-bold text-lg">No Club Assigned</h2>
        <p className="text-sm text-slate-500">Your account isn't linked to a club yet.</p>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <Button variant="ghost" className="mb-3" disabled={processing} onClick={() => job?.commit_progress?.pipeline === 'csv_rows' ? navigate(isJourneyClub ? '/SetupJourney' : '/home') : ['client_review', 'processing'].includes(job?.status) ? reupload() : navigate(isJourneyClub ? '/SetupJourney' : '/home')}><ArrowLeft /> Back{['client_review', 'processing'].includes(job?.status) ? ' to upload' : isJourneyClub ? ' to Setup Journey' : ' to dashboard'}</Button>
        <h1 className="text-2xl font-extrabold text-slate-900">Migration</h1>
        <p className="text-slate-500 text-sm">Upload, click migrate, and watch your data flow into Club Rudder.</p>
      </div>

      <div className="flex gap-2 border-b border-slate-200 pb-2">
        <button onClick={() => setMode('guided')} className={`px-3 py-1.5 text-sm font-medium rounded-t-lg ${mode === 'guided' ? 'bg-primary text-primary-foreground' : 'text-slate-500 hover:text-slate-700'}`}>Guided migration</button>
        <button onClick={() => setMode('import')} className={`px-3 py-1.5 text-sm font-medium rounded-t-lg ${mode === 'import' ? 'bg-primary text-primary-foreground' : 'text-slate-500 hover:text-slate-700'}`}>Import tool</button>
      </div>

      {mode === 'import' && (
        <div className="pb-8">
          {importProjectId ? (
            <ProjectView projectId={importProjectId} onBack={() => setImportProjectId(null)} />
          ) : (
            <ImportProjectsPanel clubId={clubId} onOpenProject={setImportProjectId} />
          )}
        </div>
      )}

      {mode === 'guided' && (<>
      {job && <MigrationStageBar status={job.status} />}
      {processError && <div role="alert" className="rounded-lg border border-destructive p-4 text-sm text-destructive">{processError} Check your headers and CSV formatting using the file-fixing guide, then try again.</div>}

      <Card>
        <CardContent className="p-6">
          {!job && <PrepareStep onStart={startMigration} starting={starting} />}
          {job && job.status === "pending_approval" && (
            <div className="text-center py-10 space-y-3">
              <ShieldCheck className="w-10 h-10 text-amber-500 mx-auto" />
              <p className="text-sm font-semibold text-slate-700">Awaiting system-owner approval</p>
              <p className="text-sm text-slate-500 max-w-md mx-auto">Your migration request was submitted. A Club Rudder migration specialist will review it before you can upload files and proceed. You'll be able to continue here once we setup the mapping for your data.</p>
            </div>
          )}
          {job && job.status === "draft" && (
            <UploadStep files={files} onFilesChange={setFiles} onProcess={processFiles} processing={processing} />
          )}
          {job?.commit_progress?.pipeline === 'csv_rows' && job.status !== 'draft' && <CsvMigrationPanel job={job} onChanged={setJob} />}
          {job && job.commit_progress?.pipeline !== 'csv_rows' && job.commit_progress?.phase && <MigrationProgress job={job} />}
          {job && job.commit_progress?.pipeline !== 'csv_rows' && !job.commit_progress?.phase && job.status === "processing" && (() => {
            const stale = job.updated_date && (Date.now() - new Date(job.updated_date).getTime() > 2 * 60 * 1000);
            const lastError = job.error_log?.[job.error_log.length - 1];
            return (
              <div className="text-center py-10 space-y-3">
                {stale ? (
                  <>
                    <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
                    <p className="text-sm font-semibold text-rose-700">Auto-mapping appears to have stalled.</p>
                    {lastError && <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg p-2 max-w-md mx-auto">{lastError}</p>}
                    <p className="text-xs text-slate-500">The process didn't finish within the expected time. Use Start over to re-upload your files and try again.</p>
                  </>
                ) : (
                  <>
                    <Cog className="w-10 h-10 text-primary mx-auto animate-spin" />
                    <p className="text-sm text-slate-500">Auto-mapping and validating your data…</p>
                    <p className="text-xs text-slate-400">This usually takes a minute or two. If it's been stuck for a while, you can start over and re-upload your files.</p>
                  </>
                )}
                <Button variant="outline" size="sm" disabled={processing} onClick={reupload} className="gap-2">
                  <ArrowLeft className="w-3.5 h-3.5" /> Start over — back to upload
                </Button>
              </div>
            );
          })()}
          {job && job.commit_progress?.pipeline !== 'csv_rows' && job.status === "client_review" && (
            <ClientReviewStep job={job} onSubmitted={(updated) => setJob(updated)} onReupload={reupload} />
          )}
          {job && job.status === "support_review" && <ReviewPendingCard job={job} />}
          {job && job.commit_progress?.pipeline !== 'csv_rows' && job.status === "needs_fixes" && <NeedsFixesCard job={job} onRetry={retry} />}
          {job && job.status === "completed" && <CompleteCard job={job} />}
        </CardContent>
      </Card>
      </>)}
    </div>
  );
}