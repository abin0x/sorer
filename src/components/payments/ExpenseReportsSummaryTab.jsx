import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from '@/lib/router-compat';
import { ClipboardCheck, Clock, CheckCircle2, DollarSign, ArrowRight, Receipt as ReceiptIcon, X } from "lucide-react";
import { useTenant } from "@/lib/TenantContext";
import { useToast } from "@/components/ui/use-toast";
import ExpenseStatusBadge from "@/components/expenses/ExpenseStatusBadge";
import ReportReviewDialog from "@/components/expenses/ReportReviewDialog";
import { APPROVAL_QUEUE_STATUSES, round2 } from "@/lib/expenseHelpers";
import { createPageUrl } from "@/utils";

const ALL = "all";

function MiniStat({ icon: Icon, label, value, tone }) {
  const tones = {
    amber: "text-amber-600 bg-amber-50", emerald: "text-emerald-600 bg-emerald-50",
    teal: "text-teal-600 bg-teal-50", slate: "text-slate-600 bg-slate-50",
  };
  return (
    <Card className="border-border/60 rounded-xl">
      <CardContent className="p-3 flex items-center gap-2.5">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tones[tone]}`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        <div>
          <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="text-base font-extrabold text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ExpenseReportsSummaryTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const tenant = useTenant();
  const clubId = tenant.effectiveClubId || tenant.club?.id;
  const [user, setUser] = useState(null);
  const [activeReport, setActiveReport] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [teamFilter, setTeamFilter] = useState(ALL);
  const [branchFilter, setBranchFilter] = useState(ALL);
  const [genderFilter, setGenderFilter] = useState(ALL);
  const [platformFilter, setPlatformFilter] = useState(ALL);
  const [submitterFilter, setSubmitterFilter] = useState(ALL);

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["expense-approval-queue", clubId],
    queryFn: () => base44.entities.ExpenseReport.filter({ club_id: clubId }, "-created_date"),
    enabled: !!clubId,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ["expense-reports-teams", clubId],
    queryFn: () => base44.entities.Team.filter({ club_id: clubId }),
    enabled: !!clubId,
  });

  const { data: locations = [] } = useQuery({
    queryKey: ["expense-reports-locations", clubId],
    queryFn: () => base44.entities.Location.filter({ club_id: clubId }),
    enabled: !!clubId,
  });

  const teamMetaById = useMemo(() => {
    const map = {};
    teams.forEach((t) => { map[t.id] = t; });
    return map;
  }, [teams]);

  const platformOptions = useMemo(() => {
    const set = new Set(teams.map((t) => t.platform_name).filter(Boolean));
    return Array.from(set).sort();
  }, [teams]);

  const submitterOptions = useMemo(() => {
    const map = new Map();
    reports.forEach((r) => { if (r.submitter_id) map.set(r.submitter_id, r.submitter_name); });
    return Array.from(map.entries());
  }, [reports]);

  const filteredReports = useMemo(() => reports.filter((r) => {
    const reportTeams = (r.default_team_ids || []).map((id) => teamMetaById[id]).filter(Boolean);
    const matchTeam = teamFilter === ALL || (r.default_team_ids || []).includes(teamFilter);
    const matchBranch = branchFilter === ALL || r.location === branchFilter;
    const matchGender = genderFilter === ALL || reportTeams.some((t) => t.gender === genderFilter);
    const matchPlatform = platformFilter === ALL || reportTeams.some((t) => t.platform_name === platformFilter);
    const matchSubmitter = submitterFilter === ALL || r.submitter_id === submitterFilter;
    return matchTeam && matchBranch && matchGender && matchPlatform && matchSubmitter;
  }), [reports, teamFilter, branchFilter, genderFilter, platformFilter, submitterFilter, teamMetaById]);

  const queue = useMemo(
    () => filteredReports.filter((r) => APPROVAL_QUEUE_STATUSES.includes(r.status) && r.submitter_id !== user?.id),
    [filteredReports, user]
  );
  const approved = useMemo(
    () => filteredReports.filter((r) => r.status === "approved" || r.status === "exported_to_quickbooks"),
    [filteredReports]
  );
  const paid = useMemo(() => filteredReports.filter((r) => r.status === "paid"), [filteredReports]);

  const stats = useMemo(() => {
    const queueTotal = queue.reduce((s, r) => s + round2(r.submitted_total), 0);
    const approvedTotal = approved.reduce((s, r) => s + round2(r.approved_total), 0);
    const paidTotal = paid.reduce((s, r) => s + round2(r.approved_total), 0);
    return { queueCount: queue.length, queueTotal, approvedCount: approved.length, approvedTotal, paidCount: paid.length, paidTotal };
  }, [queue, approved, paid]);

  const openReport = (r) => { setActiveReport(r); setDialogOpen(true); };

  const recentReports = useMemo(() => filteredReports.slice(0, 8), [filteredReports]);

  const hasActiveFilters = teamFilter !== ALL || branchFilter !== ALL || genderFilter !== ALL || platformFilter !== ALL || submitterFilter !== ALL;
  const clearFilters = () => {
    setTeamFilter(ALL); setBranchFilter(ALL); setGenderFilter(ALL); setPlatformFilter(ALL); setSubmitterFilter(ALL);
  };

  return (
    <div className="space-y-4">
      {/* Header with link to full approvals page */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
            <ReceiptIcon className="w-4 h-4 text-primary" /> Expense Reports
          </h3>
          <p className="text-xs text-muted-foreground">Coach & staff expense reports awaiting approval or payment.</p>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5" asChild>
          <Link to={createPageUrl("ExpenseApprovals")}>
            <ClipboardCheck className="w-3.5 h-3.5" /> Open Full Approvals <ArrowRight className="w-3 h-3" />
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Select value={teamFilter} onValueChange={setTeamFilter}>
          <SelectTrigger className="w-[150px] rounded-xl"><SelectValue placeholder="Team" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All Teams</SelectItem>
            {teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={branchFilter} onValueChange={setBranchFilter}>
          <SelectTrigger className="w-[150px] rounded-xl"><SelectValue placeholder="Branch" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All Branches</SelectItem>
            {locations.map((l) => <SelectItem key={l.id} value={l.name}>{l.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={genderFilter} onValueChange={setGenderFilter}>
          <SelectTrigger className="w-[140px] rounded-xl"><SelectValue placeholder="Gender" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All Genders</SelectItem>
            <SelectItem value="Boys">Boys</SelectItem>
            <SelectItem value="Girls">Girls</SelectItem>
            <SelectItem value="Boys and Girls">Boys and Girls</SelectItem>
          </SelectContent>
        </Select>
        <Select value={platformFilter} onValueChange={setPlatformFilter}>
          <SelectTrigger className="w-[150px] rounded-xl"><SelectValue placeholder="Platform" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All Platforms</SelectItem>
            {platformOptions.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={submitterFilter} onValueChange={setSubmitterFilter}>
          <SelectTrigger className="w-[160px] rounded-xl"><SelectValue placeholder="Coach / Staff" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All Staff</SelectItem>
            {submitterOptions.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
          </SelectContent>
        </Select>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
            <X className="w-3.5 h-3.5 mr-1" /> Clear
          </Button>
        )}
      </div>

      {/* Mini stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <MiniStat icon={Clock} label="In Queue" value={stats.queueCount} tone="amber" />
        <MiniStat icon={DollarSign} label="Queue Total" value={`$${stats.queueTotal.toFixed(2)}`} tone="slate" />
        <MiniStat icon={CheckCircle2} label="Ready to Pay" value={stats.approvedCount} tone="emerald" />
        <MiniStat icon={ReceiptIcon} label="Reimbursed" value={`$${stats.paidTotal.toFixed(2)}`} tone="teal" />
      </div>

      {/* Recent reports list */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
      ) : recentReports.length === 0 ? (
        <Card className="border-border/60 rounded-xl">
          <CardContent className="py-10 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
              <ReceiptIcon className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="font-semibold text-foreground mb-1">No expense reports</p>
            <p className="text-sm text-muted-foreground">{hasActiveFilters ? "No reports match these filters." : "Submitted expense reports will appear here for approval."}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-1.5">
          {recentReports.map((r) => (
            <button key={r.id} onClick={() => openReport(r)} className="w-full text-left group">
              <Card className="border-border/60 rounded-xl group-hover:border-primary/40 group-hover:shadow-sm transition-all">
                <CardContent className="p-3 flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">{r.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{r.submitter_name} · {r.report_date}{r.location ? ` · ${r.location}` : ""}</p>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="font-bold text-sm">${round2(r.approved_total || r.submitted_total).toFixed(2)}</span>
                    <ExpenseStatusBadge status={r.status} />
                  </div>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      )}

      <ReportReviewDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        report={activeReport}
        reviewer={user}
        onUpdated={() => queryClient.invalidateQueries({ queryKey: ["expense-approval-queue", clubId] })}
      />
    </div>
  );
}