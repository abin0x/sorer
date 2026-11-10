import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import DashboardHeader from "./shared/DashboardHeader";
import DashboardSection from "./shared/DashboardSection";
import QuickActionsBar from "./shared/QuickActionsBar";
import DrillDownLinks from "./shared/DrillDownLinks";
import SeasonCycleBar from "./shared/SeasonCycleBar";
import BranchLifecycleBoard from "./lifecycle/BranchLifecycleBoard";
import SeasonAlertsPanel from "./lifecycle/SeasonAlertsPanel";
import PriorityActions from "./shared/PriorityActions";
import ActionTimeline from "./shared/ActionTimeline";
import WorkflowChecklist from "./shared/WorkflowChecklist";
import BranchPlatformGrid from "./clubdirector/BranchPlatformGrid";
import useDashboardData from "./shared/useDashboardData";
import useCycleData, { computeCycleState } from "./shared/useCycleData";
import { CLUB_DIRECTOR_WORKFLOW } from "./shared/roleWorkflows";
import IntegrationsPanel from "./IntegrationsPanel";
import DataMigrationCard from "./shared/DataMigrationCard";
import InviteMemberDialog from "@/components/admin/InviteMemberDialog";
import { useTenant } from "@/lib/TenantContext";
import { createPageUrl } from "@/utils";
import { useQuery } from "@tanstack/react-query";
import {
  DollarSign, TrendingUp, Users, ShieldCheck, Target, AlertCircle,
  CheckCircle2, Building2, Download, Megaphone, Mail, Calendar,
} from "lucide-react";

function KPITile({ icon: Icon, label, value, sublabel, tone, to }) {
  const toneMap = {
    emerald: "text-emerald-600 bg-emerald-50", red: "text-red-600 bg-red-50",
    amber: "text-amber-600 bg-amber-50", blue: "text-blue-600 bg-blue-50",
    slate: "text-slate-600 bg-slate-50",
  };
  const content = (
    <Card className={"border-border-subtle rounded-xl " + (to ? "hover:shadow-md transition-all cursor-pointer" : "")}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-1">
          {Icon && <div className={"w-7 h-7 rounded-lg flex items-center justify-center " + (toneMap[tone] || toneMap.emerald)}><Icon className="w-3.5 h-3.5" /></div>}
          <p className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">{label}</p>
        </div>
        <p className="text-xl font-extrabold text-text-primary">{value}</p>
        {sublabel && <p className="text-[10px] text-text-secondary mt-0.5">{sublabel}</p>}
      </CardContent>
    </Card>
  );
  return to ? <Link to={to}>{content}</Link> : content;
}

/**
 * Club Director Dashboard — redesigned per Role-Based Dashboard Design v2.0 §4.2.
 * The Branch × Platform Health Grid is the hero; development metrics are
 * aggregated and anonymized. Never shows individual player data.
 */
export default function ClubDirectorDashboard({ user }) {
  const dash = useDashboardData();
  const cycle = useCycleData();
  const { effectiveClubId } = useTenant();
  const [inviteOpen, setInviteOpen] = React.useState(false);

  const { data: migrationJobRows = [] } = useQuery({
    queryKey: ["director-migration-status", effectiveClubId],
    queryFn: () => base44.entities.MigrationJob.filter({ club_id: effectiveClubId }, "-created_date", 1).catch(() => []),
    enabled: !!effectiveClubId,
  });
  const migrationActive = migrationJobRows[0] && migrationJobRows[0].status !== "completed";

  const cycleData = {
    seasons: cycle.seasons, ageGroups: cycle.ageGroups, tryoutPlans: cycle.tryoutPlans,
    tryouts: dash.tryouts, tryoutRegs: dash.tryoutRegs, teams: dash.teams,
    players: dash.players, finalRegs: cycle.finalRegs,
    teamPlans: cycle.teamPlans, posts: cycle.posts,
  };
  const cycleSteps = useMemo(() => computeCycleState(cycleData), [cycleData]);

  const timelineSteps = CLUB_DIRECTOR_WORKFLOW.timelineSteps({ dash, cycleSteps, migrationActive });
  const priorityActions = CLUB_DIRECTOR_WORKFLOW.priorityActions({ dash, migrationActive });

  // --- Club Snapshot ---
  const totalPlayers = dash.players.length;
  const activePlayers = dash.players.filter((p) => p.status === "active").length;
  const totalTeams = dash.teams.length;
  const totalCoaches = dash.coaches.length;
  const totalRevenue = dash.registrations.reduce((s, r) => s + (r.amount_paid || 0), 0);
  const totalOutstanding = dash.registrations.reduce((s, r) => s + Math.max((r.amount_due || 0) - (r.amount_paid || 0), 0), 0);
  const retentionRate = totalPlayers > 0 ? Math.round((activePlayers / totalPlayers) * 100) : 0;

  // --- Branch × Platform Grid cell statuses ---
  const cellStatuses = useMemo(() => {
    const statuses = {};
    dash.locations.forEach((loc) => {
      dash.platforms.forEach((plat) => {
        const teams = dash.teams.filter((t) => t.location_id === loc.id && (t.platform_id === plat.id || t.platform_name === plat.name));
        if (teams.length === 0) {
          statuses[loc.id + "__" + plat.id] = { status: "pending", detail: "No teams" };
          return;
        }
        const teamIds = new Set(teams.map((t) => t.id));
        const players = dash.players.filter((p) => p.team_id && teamIds.has(p.team_id));
        const rosterFill = teams.reduce((sum, t) => sum + (t.player_ids?.length || 0), 0);
        const maxRoster = teams.reduce((sum, t) => sum + (t.max_roster_size || 18), 0);
        const fillPct = maxRoster > 0 ? Math.round((rosterFill / maxRoster) * 100) : 0;
        const regs = dash.registrations.filter((r) => r.location_id === loc.id);
        const paid = regs.filter((r) => r.payment_status === "paid").length;
        const regPct = regs.length > 0 ? Math.round((paid / regs.length) * 100) : 0;

        let status, detail;
        if (fillPct >= 80 && regPct >= 80) { status = "done"; detail = fillPct + "% roster fill, " + regPct + "% paid"; }
        else if (fillPct >= 50 || regPct >= 50) { status = "in_progress"; detail = fillPct + "% roster fill, " + regPct + "% paid"; }
        else { status = "blocked"; detail = fillPct + "% roster fill, " + regPct + "% paid"; }
        statuses[loc.id + "__" + plat.id] = { status, detail };
      });
      // Branch-only status (for the simplified view when no platforms)
      const branchTeams = dash.teams.filter((t) => t.location_id === loc.id);
      const branchPlayers = dash.players.filter((p) => p.location_id === loc.id);
      const branchRegs = dash.registrations.filter((r) => r.location_id === loc.id);
      const fillPct = branchTeams.length > 0
        ? Math.round(branchTeams.reduce((s, t) => s + (t.player_ids?.length || 0), 0) / (branchTeams.reduce((s, t) => s + (t.max_roster_size || 18), 0)) * 100)
        : 0;
      statuses[loc.id + "__all"] = {
        status: fillPct >= 80 ? "done" : fillPct >= 50 ? "in_progress" : "pending",
        detail: branchPlayers.length + " players, " + branchTeams.length + " teams, " + branchRegs.length + " regs, " + fillPct + "% fill",
      };
    });
    return statuses;
  }, [dash.locations, dash.platforms, dash.teams, dash.players, dash.registrations]);

  // --- Development Overview (aggregated, anonymized) ---
  const evalCompletionRate = dash.players.length > 0
    ? Math.round((new Set(dash.evaluations.map((e) => e.player_id)).size / dash.players.length) * 100)
    : 0;
  const playersWithGoals = new Set(dash.evaluations.filter((e) => e.training_focus).map((e) => e.player_id)).size;

  // --- Escalations (items flagged by admins/directors) ---
  const escalations = useMemo(() => {
    const items = [];
    const coachless = dash.teams.filter((t) => !t.coach_id && (!t.coach_ids || t.coach_ids.length === 0));
    if (coachless.length > 0) items.push({ label: coachless.length + " teams without coaches", to: createPageUrl("Registration") + "?tab=teams", severity: "high" });
    const rosterIncomplete = dash.teams.filter((t) => (t.player_ids?.length || 0) < (t.max_roster_size || 18) * 0.5);
    if (rosterIncomplete.length > 0) items.push({ label: rosterIncomplete.length + " teams under 50% roster", to: createPageUrl("Registration") + "?tab=teams", severity: "medium" });
    const missingPayments = dash.registrations.filter((r) => r.payment_status !== "paid" && r.amount_due > 0);
    if (missingPayments.length > 0) items.push({ label: "$" + totalOutstanding.toLocaleString() + " outstanding payments", to: createPageUrl("PaymentSettings"), severity: "high" });
    const overduePrograms = dash.programs.filter((p) => p.due_date && p.due_date < new Date().toISOString().split("T")[0] && p.status !== "done");
    if (overduePrograms.length > 0) items.push({ label: overduePrograms.length + " overdue programs", to: createPageUrl("ProgramsList"), severity: "medium" });
    return items;
  }, [dash.teams, dash.registrations, dash.programs, totalOutstanding]);

  // --- Upcoming Milestones ---
  const upcomingMilestones = useMemo(() => {
    const now = new Date();
    const items = [];
    dash.tryouts.filter((e) => e.date && new Date(e.date) >= now).sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 5).forEach((e) => {
      items.push({ label: e.type === "main_tryout" ? "Main Tryout" : e.type === "open_training" ? "Open Training" : "Supplemental", date: e.date, detail: e.location || "" });
    });
    cycle.seasons.filter((s) => s.start_date && new Date(s.start_date) >= now).slice(0, 2).forEach((s) => {
      items.push({ label: "Season Start: " + s.name, date: s.start_date, detail: s.status });
    });
    return items.sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 6);
  }, [dash.tryouts, cycle.seasons]);

  // --- Quick Actions ---
  const quickActions = [
    { label: "Export Reports", desc: "Financial, registration", icon: Download, to: createPageUrl("Analytics"), cardColor: "bg-blue-50 border-blue-200 text-blue-700", iconBg: "bg-blue-500", iconColor: "text-white" },
    { label: "Club Announcement", desc: "Send to all branches", icon: Megaphone, to: createPageUrl("CommunicationPortal"), cardColor: "bg-amber-50 border-amber-200 text-amber-700", iconBg: "bg-amber-500", iconColor: "text-white" },
    { label: "Financial Overview", desc: "Payments & expenses", icon: DollarSign, to: createPageUrl("PaymentSettings"), cardColor: "bg-emerald-50 border-emerald-200 text-emerald-700", iconBg: "bg-emerald-500", iconColor: "text-white" },
    { label: "Invite Member", desc: "Send role-based invite", icon: Mail, onClick: () => setInviteOpen(true), cardColor: "bg-cyan-50 border-cyan-200 text-cyan-700", iconBg: "bg-cyan-500", iconColor: "text-white" },
  ];

  const drillDowns = [
    { label: "Branch Detail", description: "Location overview", to: createPageUrl("Locations") },
    { label: "Program Detail", description: "Registration, roster, budget", to: createPageUrl("ProgramsList") },
    { label: "Financial Reports", description: "Revenue, expenses, budgets", to: createPageUrl("Analytics") },
    { label: "Tryout Planner", description: "Plans, events, rosters", to: createPageUrl("TryoutDashboard") },
    { label: "Seasons", description: "Rollover, age group matrix", to: createPageUrl("Seasons") },
    { label: "Communication", description: "Messages and announcements", to: createPageUrl("CommunicationPortal") },
  ];

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-[1400px] mx-auto bg-surface-page min-h-screen">
      <DashboardHeader
        roleLabel="Club Director Dashboard"
        userName={user?.full_name}
        subtitle={"Strategic oversight across " + dash.locations.length + " branches and " + dash.platforms.length + " platforms."}
        primaryQuestion="How is the club performing across all branches and platforms, and where do I need to intervene?"
      />

      {/* Priority Actions — the hero widget */}
      <PriorityActions actions={priorityActions} />

      {/* Data Migration — prioritized */}
      <DataMigrationCard />

      {/* Workflow Timeline */}
      <ActionTimeline steps={timelineSteps} title="Strategic Workflow" />

      {/* Season Cycle Bar */}
      <Card className="border-border-subtle rounded-xl shadow-sm">
        <CardContent className="p-4">
          <SeasonCycleBar steps={cycleSteps} />
        </CardContent>
      </Card>

      {/* Lifecycle visibility across every branch */}
      <BranchLifecycleBoard />
      <SeasonAlertsPanel />

      {/* Quick Actions */}
      <QuickActionsBar actions={quickActions} />

      {/* Branch × Platform Health Grid — THE HERO */}
      <BranchPlatformGrid branches={dash.locations} platforms={dash.platforms} cellStatuses={cellStatuses} />

      {/* Club Snapshot KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        <KPITile icon={Users} label="Players" value={totalPlayers} sublabel={activePlayers + " active (" + retentionRate + "%)"} tone="emerald" to={createPageUrl("Registration") + "?tab=players"} />
        <KPITile icon={ShieldCheck} label="Teams" value={totalTeams} sublabel={dash.locations.length + " branches"} tone="blue" to={createPageUrl("Registration") + "?tab=teams"} />
        <KPITile icon={Building2} label="Coaches" value={totalCoaches} sublabel="Active staff" tone="slate" to={createPageUrl("ClubStaff")} />
        <KPITile icon={DollarSign} label="Revenue" value={"$" + totalRevenue.toLocaleString()} sublabel="Season to date" tone="emerald" to={createPageUrl("PaymentSettings")} />
        <KPITile icon={AlertCircle} label="Outstanding" value={"$" + totalOutstanding.toLocaleString()} sublabel="Receivables" tone="red" to={createPageUrl("PaymentSettings")} />
        <KPITile icon={TrendingUp} label="Retention" value={retentionRate + "%"} sublabel={activePlayers + "/" + totalPlayers} tone="blue" to={createPageUrl("Registration") + "?tab=players"} />
      </div>

      {/* Escalations + Development Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Escalations */}
        <DashboardSection title="Escalations" icon={AlertCircle} description="Items flagged by Club Admin, Branch Directors, Platform Directors" viewAllLink={createPageUrl("RoleDashboard")}>
          {escalations.length === 0 ? (
            <div className="flex items-center gap-2 py-4">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <p className="text-sm text-text-secondary">No escalations — all clear.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {escalations.map((item, i) => (
                <Link key={i} to={item.to} className="flex items-center gap-3 p-2.5 rounded-lg bg-red-50/40 border border-red-200/50 hover:shadow-sm transition-all">
                  <AlertCircle className={"w-4 h-4 " + (item.severity === "high" ? "text-red-600" : "text-amber-600")} />
                  <p className="text-sm font-medium text-text-primary flex-1">{item.label}</p>
                  {item.severity === "high" && <Badge variant="outline" className="text-[10px] bg-red-50 text-red-700 border-red-200">High</Badge>}
                </Link>
              ))}
            </div>
          )}
        </DashboardSection>

        {/* Development Overview (aggregated, anonymized) */}
        <DashboardSection title="Development Overview" icon={Target} description="Aggregated, anonymized development metrics across the club" viewAllLink={createPageUrl("CenterOfExcellence")}>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-text-secondary">Evaluation Completion</span>
                <span className="font-bold text-text-primary">{evalCompletionRate}%</span>
              </div>
              <Progress value={evalCompletionRate} className="h-2" />
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-neutral-50">
              <span className="text-sm text-text-secondary">Players with Active Goals</span>
              <span className="text-sm font-bold text-text-primary">{playersWithGoals}</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-neutral-50">
              <span className="text-sm text-text-secondary">Total Evaluations</span>
              <span className="text-sm font-bold text-text-primary">{dash.evaluations.length}</span>
            </div>
          </div>
        </DashboardSection>
      </div>

      {/* Financial Overview + Upcoming Milestones */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DashboardSection title="Financial Overview" icon={DollarSign} description="Registration revenue, outstanding payments, refunds" viewAllLink={createPageUrl("PaymentSettings")}>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
              <p className="text-[10px] font-bold uppercase text-emerald-700">Revenue Collected</p>
              <p className="text-lg font-extrabold text-emerald-700">${totalRevenue.toLocaleString()}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-red-50 border border-red-200">
              <p className="text-[10px] font-bold uppercase text-red-700">Outstanding</p>
              <p className="text-lg font-extrabold text-red-700">${totalOutstanding.toLocaleString()}</p>
            </div>
          </div>
        </DashboardSection>

        <DashboardSection title="Upcoming Milestones" icon={Calendar} description="Tryout dates, deadlines, season start" viewAllLink={createPageUrl("TeamCalendar")}>
          {upcomingMilestones.length === 0 ? (
            <p className="text-sm text-text-secondary py-4 text-center">No upcoming milestones.</p>
          ) : (
            <div className="space-y-2">
              {upcomingMilestones.map((m, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-neutral-50">
                  <div className="w-10 text-center shrink-0">
                    <p className="text-[10px] font-bold uppercase text-text-secondary">{new Date(m.date).toLocaleDateString("en-US", { month: "short" })}</p>
                    <p className="text-lg font-extrabold text-text-primary">{new Date(m.date).getDate()}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text-primary">{m.label}</p>
                    {m.detail && <p className="text-xs text-text-secondary truncate">{m.detail}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DashboardSection>
      </div>

      {/* Integrations */}
      <IntegrationsPanel user={user} />

      {/* Drill-Down Views */}
      <DrillDownLinks items={drillDowns} />

      <InviteMemberDialog open={inviteOpen} onOpenChange={setInviteOpen} user={user} />
    </div>
  );
}