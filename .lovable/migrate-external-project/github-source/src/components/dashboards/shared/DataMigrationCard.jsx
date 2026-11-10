import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeftRight, Loader2, ShieldCheck, Clock, AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";
import { useClubDataExists } from "@/lib/useClubDataExists";
import { useTenant } from "@/lib/TenantContext";
import MigrationProgress from '@/components/migration/MigrationProgress';

const STATUS_META = {
  pending_approval: { label: "Awaiting Approval", color: "bg-amber-100 text-amber-700", icon: Clock, iconColor: "text-amber-600" },
  draft: { label: "Ready to Upload", color: "bg-blue-100 text-blue-700", icon: ShieldCheck, iconColor: "text-blue-600" },
  processing: { label: "Processing", color: "bg-blue-100 text-blue-700", icon: Loader2, iconColor: "text-blue-600" },
  client_review: { label: "Your Review Needed", color: "bg-indigo-100 text-indigo-700", icon: AlertTriangle, iconColor: "text-indigo-600" },
  support_review: { label: "In Specialist Review", color: "bg-amber-100 text-amber-700", icon: Clock, iconColor: "text-amber-600" },
  needs_fixes: { label: "Sent Back for Fixes", color: "bg-rose-100 text-rose-700", icon: AlertTriangle, iconColor: "text-rose-600" },
  completed: { label: "Completed", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2, iconColor: "text-emerald-600" },
};

/**
 * Shown at the TOP of the Club Admin and Club Director dashboards.
 *
 * Prioritizes migration above all other dashboard content when a migration
 * is in progress. Also shows for clubs that already have data (so they can
 * request a new migration, which requires system-owner approval).
 */
export default function DataMigrationCard() {
  const { effectiveClubId: clubId } = useTenant();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { hasData } = useClubDataExists(clubId);
  const [requesting, setRequesting] = useState(false);

  const { data: jobRows = [] } = useQuery({
    queryKey: ["dashboardMigrationProgress", clubId],
    queryFn: () => base44.entities.MigrationJob.filter({ club_id: clubId }, "-created_date", 1, 0, ['id', 'status', 'commit_progress', 'specialist_notes', 'updated_date']),
    refetchInterval: 4000,
    enabled: !!clubId,
  });
  const job = jobRows[0];

  const isActiveMigration = job && job.status !== "completed";
  const migrationCompleted = job?.status === "completed";
  const noData = hasData === false;
  // Wait for the data check when there's no active migration to decide.
  if (hasData === undefined && !isActiveMigration) return null;
  // Hide only when migration is done AND the club already has data.
  // Show prominently when the club has no data and migration isn't completed.
  if (migrationCompleted && hasData === true) return null;

  const requestMigration = async () => {
    setRequesting(true);
    try {
      await base44.functions.invoke('migrationRequests', { action: 'request', club_id: clubId });
      toast({ title: "Migration requested", description: "A system owner will review your request before you can proceed." });
      queryClient.invalidateQueries({ queryKey: ["latestMigrationJob", clubId] });
      queryClient.invalidateQueries({ queryKey: ["dashboardMigrationProgress", clubId] });
    } catch (e) {
      toast({ title: "Request failed", description: e?.response?.data?.error || e?.message, variant: "destructive" });
    } finally {
      setRequesting(false);
    }
  };

  const meta = job ? STATUS_META[job.status] : null;
  const isPriority = isActiveMigration && ["processing", "client_review", "needs_fixes", "draft"].includes(job.status);
  const isUrgent = noData && !job;

  const actionButton = (() => {
    if (noData && !job) {
      return <Button onClick={() => navigate("/MigrationWizard")} className="w-full gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white">Start Migration <ArrowRight className="w-4 h-4" /></Button>;
    }
    if (!job || job.status === "completed" || job.status === "needs_fixes") {
      return (
        <Button onClick={requestMigration} disabled={requesting} className="w-full gap-2">
          {requesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowLeftRight className="w-4 h-4" />}
          {job?.status === "needs_fixes" ? "Re-request Migration" : "Request Data Migration"}
        </Button>
      );
    }
    if (job.status === "draft") {
      return <Button onClick={() => navigate("/MigrationWizard")} className="w-full gap-2">Continue Migration <ArrowRight className="w-4 h-4" /></Button>;
    }
    if (["processing", "client_review", "support_review", "pending_approval"].includes(job.status)) {
      return <Button variant="outline" onClick={() => navigate("/MigrationWizard")} className="w-full gap-2">View Migration <ArrowRight className="w-4 h-4" /></Button>;
    }
    return null;
  })();

  return (
    <Card className={`rounded-xl shadow-sm ${isUrgent ? "border-violet-300 ring-2 ring-violet-200 bg-gradient-to-br from-violet-50/50 to-indigo-50/30" : isPriority ? "border-action/40 ring-2 ring-action/20" : "border-amber-200/60"}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-bold tracking-wide text-text-primary flex items-center gap-2">
          <ArrowLeftRight className={`w-4 h-4 ${isUrgent ? "text-violet-600" : isPriority ? "text-action" : "text-amber-600"}`} />
          Data Migration
          {isUrgent && <Badge className="text-[10px] bg-violet-600 text-white">Action Needed</Badge>}
          {isPriority && <Badge className="text-[10px] bg-action text-action-text">Priority</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isActiveMigration ? (
          <>
            {meta && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-neutral-50">
                <meta.icon className={`w-4 h-4 ${meta.iconColor} ${job.status === "processing" ? "animate-spin" : ""}`} />
                <Badge className={`text-[10px] ${meta.color}`}>{meta.label}</Badge>
                <span className="text-xs text-text-secondary ml-auto">
                  {job.status === "pending_approval" ? "Waiting for system owner" : job.status === "draft" ? "Approved — ready to upload" : job.status === "client_review" ? "Action needed from you" : ""}
                </span>
              </div>
            )}
            {job.status === "needs_fixes" && job.specialist_notes && (
              <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2">{job.specialist_notes}</p>
            )}
            {job.status === "client_review" && (
              <p className="text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg p-2">
                Your migration data is ready for review. Open the migration wizard to check the mapped records and submit to a specialist.
              </p>
            )}
          </>
        ) : noData ? (
          <div className="space-y-1.5">
            <p className="text-sm font-semibold text-text-primary">Your club has no teams, branches, or players yet.</p>
            <p className="text-xs text-text-secondary">Use the step-by-step migration wizard to import your existing data from your previous platform.</p>
          </div>
        ) : (
          <p className="text-xs text-text-secondary">
            Your club already has teams and players. A data migration requires system-owner approval before it can proceed, to protect your existing data.
          </p>
        )}
        {job?.commit_progress?.phase && <MigrationProgress job={job} />}
        {actionButton}
      </CardContent>
    </Card>
  );
}