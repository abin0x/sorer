import React, { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useTenant } from "@/lib/TenantContext";
import { useModuleAccess } from "@/lib/useModuleAccess";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import AsyncState from "@/components/shared/AsyncState";
import SaveReportDialog from "./SaveReportDialog";
import ScheduleReportDialog from "./ScheduleReportDialog";
import ModulePreviewSection from "./ModulePreviewSection";
import { getReportById, getReportsForAccess } from "@/lib/reports/reportLibrary";
import { getReportAccess } from "@/lib/reportsAccess";
import {
  Pin, PinOff, Clock, Mail, Trash2, Play, Calendar, AlertCircle, CheckCircle2,
  BookmarkPlus, FileText, Users, Globe, Lock as LockIcon,
} from "lucide-react";

const VISIBILITY_META = {
  private: { label: "Private", icon: LockIcon, color: "bg-slate-100 text-slate-600" },
  role: { label: "Role", icon: Users, color: "bg-blue-100 text-blue-700" },
  club: { label: "Club", icon: Globe, color: "bg-emerald-100 text-emerald-700" },
};

function canOpenSavedReport(sr, user, access) {
  if (sr.visibility === "private") return sr.owner_id === user.id || user.role === "admin";
  if (sr.visibility === "role") {
    const role = user.custom_role || user.role;
    return role === sr.shared_role || user.role === "admin" || access[sr.requiresAccess];
  }
  // club
  return true;
}

function formatDate(iso) {
  if (!iso) return "Never";
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
    timeZone: "America/New_York",
  });
}

/**
 * Saved & Scheduled tab — lists saved reports (filtered by visibility),
 * email schedules with last-run status, and locked module previews.
 * props: { onOpenSavedReport }
 */
export default function SavedReportsTab({ onOpenSavedReport }) {
  const { user } = useAuth();
  const { effectiveClubId } = useTenant();
  const { hasModule } = useModuleAccess();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [scheduleTarget, setScheduleTarget] = useState(null);
  const access = useMemo(() => getReportAccess(user), [user]);

  const savedQuery = useQuery({
    queryKey: ["saved-reports", effectiveClubId],
    queryFn: () => base44.entities.SavedReport.filter({ club_id: effectiveClubId }, { sort: "-created_date", limit: 200 }),
    enabled: !!effectiveClubId,
  });

  const scheduleQuery = useQuery({
    queryKey: ["report-schedules", effectiveClubId],
    queryFn: () => base44.entities.ReportSchedule.filter({ club_id: effectiveClubId }, { sort: "-created_date", limit: 200 }),
    enabled: !!effectiveClubId,
  });

  const savedReports = (savedQuery.data?.items || savedQuery.data || []).filter((sr) => {
    if (sr.visibility === "private") return sr.owner_id === user.id || user.role === "admin";
    if (sr.visibility === "role") {
      const role = user.custom_role || user.role;
      return role === sr.shared_role || user.role === "admin";
    }
    return true;
  });

  const schedules = scheduleQuery.data?.items || scheduleQuery.data || [];

  const handleTogglePin = async (sr) => {
    try {
      await base44.entities.SavedReport.update(sr.id, { pinned: !sr.pinned });
      qc.invalidateQueries({ queryKey: ["saved-reports", effectiveClubId] });
      toast({ title: sr.pinned ? "Unpinned" : "Pinned to Overview" });
    } catch (err) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async (sr) => {
    if (!confirm(`Delete "${sr.name}"?`)) return;
    try {
      // Also delete linked schedules
      const linkedSchedules = schedules.filter((s) => s.saved_report_id === sr.id);
      if (linkedSchedules.length > 0) {
        await base44.entities.ReportSchedule.deleteMany({ saved_report_id: sr.id });
      }
      await base44.entities.SavedReport.delete(sr.id);
      qc.invalidateQueries({ queryKey: ["saved-reports", effectiveClubId] });
      qc.invalidateQueries({ queryKey: ["report-schedules", effectiveClubId] });
      toast({ title: "Report deleted" });
    } catch (err) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
  };

  const handleDeleteSchedule = async (sched) => {
    if (!confirm(`Delete schedule for "${sched.saved_report_name}"?`)) return;
    try {
      await base44.entities.ReportSchedule.delete(sched.id);
      qc.invalidateQueries({ queryKey: ["report-schedules", effectiveClubId] });
      toast({ title: "Schedule deleted" });
    } catch (err) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
  };

  const handleRunNow = async (sched) => {
    try {
      const res = await base44.functions.invoke("run-report-schedules", { schedule_id: sched.id });
      toast({
        title: "Report sent",
        description: `${res.data?.results?.[0]?.successCount || 0} recipient(s) emailed.`,
      });
      qc.invalidateQueries({ queryKey: ["report-schedules", effectiveClubId] });
    } catch (err) {
      toast({ title: "Run failed", description: err.message, variant: "destructive" });
    }
  };

  const handleToggleSchedule = async (sched) => {
    try {
      await base44.entities.ReportSchedule.update(sched.id, { is_active: !sched.is_active });
      qc.invalidateQueries({ queryKey: ["report-schedules", effectiveClubId] });
      toast({ title: sched.is_active ? "Schedule paused" : "Schedule activated" });
    } catch (err) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-8">
      {/* Saved Reports */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <BookmarkPlus className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Saved Reports</h3>
        </div>
        <AsyncState isLoading={savedQuery.isLoading} loadingLabel="Loading saved reports…">
          {savedReports.length === 0 ? (
            <Card>
              <CardContent className="py-10 px-6 text-center">
                <p className="text-sm text-muted-foreground">
                  No saved reports yet. Open a report, set your filters and columns, then click <strong>Save</strong> to keep it here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {savedReports.map((sr) => {
                const reportDef = getReportById(sr.report_id);
                const canOpen = canOpenSavedReport(sr, user, access);
                const vis = VISIBILITY_META[sr.visibility] || VISIBILITY_META.private;
                const VisIcon = vis.icon;
                const hasSchedule = schedules.some((s) => s.saved_report_id === sr.id);
                return (
                  <div
                    key={sr.id}
                    className="p-4 rounded-xl border bg-card hover:border-primary/30 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm text-foreground truncate">{sr.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{sr.report_name}</p>
                      </div>
                      {sr.pinned && <Pin className="w-3.5 h-3.5 text-primary shrink-0" />}
                    </div>
                    <div className="flex items-center gap-1.5 mb-3">
                      <Badge variant="secondary" className={`text-xs gap-1 ${vis.color}`}>
                        <VisIcon className="w-2.5 h-2.5" />
                        {vis.label}
                      </Badge>
                      {sr.visibility === "role" && (
                        <span className="text-xs text-muted-foreground">{sr.shared_role?.replace(/_/g, " ")}</span>
                      )}
                      {hasSchedule && (
                        <Badge variant="secondary" className="text-xs gap-1 bg-amber-100 text-amber-700">
                          <Clock className="w-2.5 h-2.5" /> Scheduled
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => canOpen ? onOpenSavedReport(sr) : toast({ title: "No access", variant: "destructive" })}
                        disabled={!canOpen || !reportDef}
                        className="touch-target h-8"
                      >
                        <FileText className="w-3.5 h-3.5" /> Open
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleTogglePin(sr)}
                        title={sr.pinned ? "Unpin from Overview" : "Pin to Overview"}
                      >
                        {sr.pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setScheduleTarget(sr)}
                        title="Schedule email"
                      >
                        <Mail className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:text-destructive"
                        onClick={() => handleDelete(sr)}
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </AsyncState>
      </div>

      {/* Scheduled Reports */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Email Schedules</h3>
        </div>
        <AsyncState isLoading={scheduleQuery.isLoading} loadingLabel="Loading schedules…">
          {schedules.length === 0 ? (
            <Card>
              <CardContent className="py-8 px-6 text-center">
                <p className="text-sm text-muted-foreground">
                  No scheduled emails yet. Save a report, then click the <Mail className="inline w-3 h-3" /> icon to schedule recurring delivery.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {schedules.map((sched) => {
                const statusColor =
                  sched.last_run_status === "success" ? "text-emerald-600" :
                  sched.last_run_status === "partial" ? "text-amber-600" :
                  sched.last_run_status === "failed" ? "text-red-600" : "text-muted-foreground";
                const StatusIcon = sched.last_run_status === "success" ? CheckCircle2 :
                  sched.last_run_status === "failed" ? AlertCircle : Clock;
                return (
                  <div key={sched.id} className="p-3 rounded-xl border bg-card flex items-center gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{sched.saved_report_name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span className="capitalize">{sched.frequency}</span>
                        {sched.frequency === "weekly" && <span>· {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][sched.day_of_week || 0]}</span>}
                        {sched.frequency === "monthly" && <span>· day {sched.day_of_month}</span>}
                        <span>· {sched.recipients.length} recipient(s)</span>
                        <span>· {sched.format.toUpperCase()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`flex items-center gap-1 text-xs ${statusColor}`}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{formatDate(sched.last_run)}</span>
                      </div>
                      {!sched.is_active && <Badge variant="secondary" className="text-xs">Paused</Badge>}
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleRunNow(sched)} title="Run now" disabled={!sched.is_active}>
                        <Play className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleToggleSchedule(sched)} title={sched.is_active ? "Pause" : "Activate"}>
                        <Clock className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={() => handleDeleteSchedule(sched)} title="Delete schedule">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    {sched.last_error && (
                      <div className="w-full text-xs text-red-600 bg-red-50 dark:bg-red-950/20 rounded p-2 mt-1">
                        {sched.last_error}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </AsyncState>
      </div>

      {/* Module Previews */}
      <ModulePreviewSection hasModule={hasModule} />

      {/* Schedule Dialog */}
      {scheduleTarget && (
        <ScheduleReportDialog
          open={!!scheduleTarget}
          savedReport={scheduleTarget}
          onClose={() => setScheduleTarget(null)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["report-schedules", effectiveClubId] });
            setScheduleTarget(null);
          }}
        />
      )}
    </div>
  );
}