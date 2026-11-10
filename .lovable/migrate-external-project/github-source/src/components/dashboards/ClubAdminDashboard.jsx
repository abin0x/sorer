import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashboardHeader from "./shared/DashboardHeader";
import QuickActionsBar from "./shared/QuickActionsBar";
import DrillDownLinks from "./shared/DrillDownLinks";
import SeasonCycleBar from "./shared/SeasonCycleBar";
import CycleChecklist from "./shared/CycleChecklist";
import PriorityActions from "./shared/PriorityActions";
import NextActionCard from "./clubadmin/NextActionCard";
import BlockersPanel from "./clubadmin/BlockersPanel";
import useDashboardData from "./shared/useDashboardData";
import useCycleData, { computeCycleState, getNextAction, computeBlockers, computeTeamBlockers } from "./shared/useCycleData";
import { resolveScope, scopeDataToBranches } from "@/lib/seasonLifecycle";
import LifecycleScopeCard from "./lifecycle/LifecycleScopeCard";
import BranchLifecycleBoard from "./lifecycle/BranchLifecycleBoard";
import SeasonAlertsPanel from "./lifecycle/SeasonAlertsPanel";
import { CLUB_ADMIN_WORKFLOW } from "./shared/roleWorkflows";
import IntegrationsPanel from "./IntegrationsPanel";
import DataMigrationCard from "./shared/DataMigrationCard";
import InviteMemberDialog from "@/components/admin/InviteMemberDialog";
import { useTenant } from "@/lib/TenantContext";
import { createPageUrl } from "@/utils";
import {
  Zap, Mail, Calendar, ClipboardCheck, Wallet, Users, Shield, AlertCircle,
  FileX, UserX, Megaphone, Clock, Activity, CheckCircle2, ArrowRight, Receipt,
} from "lucide-react";

/**
 * Club Admin Dashboard — redesigned per Role-Based Dashboard Design v2.0 §4.3.
 * Task-first, not data-first. The Next Action Card is the hero; the cycle
 * checklist is collapsible so the next action stays above the fold.
 */
export default function ClubAdminDashboard({ user }) {
  const fullDash = useDashboardData();
  const cycleAll = useCycleData();
  // Club Admin only works the branches in their lifecycle scope; the rest
  // belong to branch leads (still visible in the All Branches board below).
  const scope = resolveScope(cycleAll.lifecycleSeason, fullDash.locations);
  const sd = scopeDataToBranches({
    teams: fullDash.teams, players: fullDash.players, tryoutPlans: cycleAll.tryoutPlans,
    tryouts: fullDash.tryouts, tryoutRegs: fullDash.tryoutRegs, finalRegs: cycleAll.finalRegs,
    teamPlans: cycleAll.teamPlans,
  }, scope.adminIds, scope.isAll);
  const dash = scope.isAll ? fullDash : {
    ...fullDash,
    teams: sd.teams, players: sd.players, tryouts: sd.tryouts, tryoutRegs: sd.tryoutRegs,
    registrations: fullDash.registrations.filter((r) => scope.adminIds.has(r.location_id)),
    locations: fullDash.locations.filter((l) => scope.adminIds.has(l.id)),
  };
  const cycle = scope.isAll ? cycleAll : {
    ...cycleAll, tryoutPlans: sd.tryoutPlans, finalRegs: sd.finalRegs, teamPlans: sd.teamPlans,
  };
  const queryClient = useQueryClient();
  const { effectiveClubId } = useTenant();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [scopeTab, setScopeTab] = useState("all");

  // Migration status for priority actions
  const { data: migrationJobRows = [] } = useQuery({
    queryKey: ["dash-migration-status", effectiveClubId],
    queryFn: () => base44.entities.MigrationJob.filter({ club_id: effectiveClubId }, "-created_date", 1).catch(() => []),
    enabled: !!effectiveClubId,
  });
  const migrationActive = migrationJobRows[0] && migrationJobRows[0].status !== "completed";

  // Merge shared + cycle data for cycle computation
  const cycleData = {
    seasons: cycle.seasons,
    ageGroups: cycle.ageGroups,
    tryoutPlans: cycle.tryoutPlans,
    tryouts: dash.tryouts,
    tryoutRegs: dash.tryoutRegs,
    teams: dash.teams,
    players: dash.players,
    finalRegs: cycle.finalRegs,
    teamPlans: cycle.teamPlans,
    posts: cycle.posts,
  };

  const cycleSteps = useMemo(() => computeCycleState(cycleData), [cycleData]);
  const nextAction = useMemo(() => getNextAction(cycleSteps, cycleData), [cycleSteps, cycleData]);
  const blockers = useMemo(() => computeBlockers(cycleSteps), [cycleSteps]);
  const teamBlockers = useMemo(() => computeTeamBlockers(dash.teams, cycle.teamPlans), [dash.teams, cycle.teamPlans]);
  const allBlockers = useMemo(() => [...blockers, ...teamBlockers], [blockers, teamBlockers]);

  // --- Today's Tasks (auto-generated from data) ---
  const tasks = useMemo(() => {
    const t = [];
    const pendingRegs = dash.registrations.filter((r) => r.status === "pending");
    if (pendingRegs.length > 0) t.push({ label: "Approve " + pendingRegs.length + " pending registrations", to: createPageUrl("Registration"), icon: ClipboardCheck, priority: "high" });

    const missingPayments = dash.registrations.filter((r) => r.payment_status !== "paid" && r.amount_due > 0);
    if (missingPayments.length > 0) t.push({ label: "Follow up on " + missingPayments.length + " missing payments", to: createPageUrl("PaymentSettings"), icon: Wallet, priority: "high" });

    const missingDocs = dash.registrations.filter((r) => !r.paperwork_complete);
    if (missingDocs.length > 0) t.push({ label: "Verify " + missingDocs.length + " missing documents", to: createPageUrl("Registration"), icon: FileX, priority: "medium" });

    const unassigned = dash.players.filter((p) => !p.team_id);
    if (unassigned.length > 0) t.push({ label: "Place " + unassigned.length + " unassigned players", to: createPageUrl("Registration") + "?tab=teams", icon: UserX, priority: "medium" });

    const coachless = dash.teams.filter((team) => !team.coach_id && (!team.coach_ids || team.coach_ids.length === 0));
    if (coachless.length > 0) t.push({ label: "Assign coaches to " + coachless.length + " teams", to: createPageUrl("Registration") + "?tab=teams", icon: Shield, priority: "medium" });

    const teamsNeedingPlan = dash.teams.filter((team) => {
      const plan = cycle.teamPlans.find((p) => p.id === team.team_plan_id);
      return plan?.status !== "active";
    });
    if (teamsNeedingPlan.length > 0) t.push({ label: "Assign plans to " + teamsNeedingPlan.length + " teams", to: createPageUrl("TryoutDashboard") + "?tab=plans", icon: Wallet, priority: "high" });

    if (cycle.tryoutPlans.length === 0 && cycle.seasons.length > 0) t.push({ label: "Create a tryout plan for the new season", to: createPageUrl("TryoutDashboard"), icon: ClipboardCheck, priority: "high" });

    if (cycle.finalRegs.length === 0 && dash.players.filter((p) => p.team_id).length > 0) t.push({ label: "Send final registration invites", to: createPageUrl("TryoutDashboard"), icon: Mail, priority: "high" });

    return t;
  }, [dash.registrations, dash.players, dash.teams, cycle.tryoutPlans, cycle.seasons, cycle.finalRegs, cycle.teamPlans]);

  // Filter tasks by scope tab
  const scopedTasks = useMemo(() => {
    if (scopeTab === "all") return tasks;
    const loc = dash.locations.find((l) => l.id === scopeTab);
    if (!loc) return tasks;
    return tasks; // Tasks are club-level; scope filtering would need per-task branch data
  }, [tasks, scopeTab, dash.locations]);

  // --- Recent Activity (last 24h) ---
  const recentActivity = useMemo(() => {
    const now = Date.now();
    const cutoff = now - 24 * 60 * 60 * 1000;
    const items = [];
    dash.registrations.forEach((r) => {
      const d = new Date(r.created_date || r.updated_date).getTime();
      if (d > cutoff) items.push({ label: "New registration: " + (r.player_name || "Unknown"), time: d, to: createPageUrl("Registration") });
    });
    dash.tryoutRegs.forEach((r) => {
      const d = new Date(r.created_date).getTime();
      if (d > cutoff) items.push({ label: "Tryout signup: " + (r.player_name || "Unknown"), time: d, to: createPageUrl("TryoutDashboard") });
    });
    return items.sort((a, b) => b.time - a.time).slice(0, 8);
  }, [dash.registrations, dash.tryoutRegs]);

  // --- Quick Actions ---
  const quickActions = [
    { label: "Roll Over Season", desc: "Clone teams to new season", icon: Zap, to: createPageUrl("Seasons"), cardColor: "bg-purple-50 border-purple-200 text-purple-700", iconBg: "bg-purple-500", iconColor: "text-white" },
    { label: "Create Tryout", desc: "Plan & schedule tryouts", icon: ClipboardCheck, to: createPageUrl("TryoutDashboard"), cardColor: "bg-rose-50 border-rose-200 text-rose-700", iconBg: "bg-rose-500", iconColor: "text-white" },
    { label: "Assign Team Plans", desc: "Dues & payment plans per team", icon: Wallet, to: createPageUrl("TryoutDashboard") + "?tab=plans", cardColor: "bg-indigo-50 border-indigo-200 text-indigo-700", iconBg: "bg-indigo-500", iconColor: "text-white" },
    { label: "Send Invites", desc: "Invite members by role", icon: Mail, onClick: () => setInviteOpen(true), cardColor: "bg-cyan-50 border-cyan-200 text-cyan-700", iconBg: "bg-cyan-500", iconColor: "text-white" },
    { label: "View Payments", desc: "Ledger & outstanding", icon: Wallet, to: createPageUrl("PaymentSettings"), cardColor: "bg-emerald-50 border-emerald-200 text-emerald-700", iconBg: "bg-emerald-500", iconColor: "text-white" },
    { label: "Schedule Event", desc: "Practice, game, meeting", icon: Calendar, to: createPageUrl("TeamCalendar"), cardColor: "bg-violet-50 border-violet-200 text-violet-700", iconBg: "bg-violet-500", iconColor: "text-white" },
    { label: "Send Message", desc: "Club, branch, or team", icon: Megaphone, to: createPageUrl("CommunicationPortal"), cardColor: "bg-amber-50 border-amber-200 text-amber-700", iconBg: "bg-amber-500", iconColor: "text-white" },
    { label: "Expense Approvals", desc: "Review coach & staff costs", icon: Receipt, to: createPageUrl("ExpenseApprovals"), cardColor: "bg-teal-50 border-teal-200 text-teal-700", iconBg: "bg-teal-500", iconColor: "text-white" },
  ];

  const drillDowns = [
    { label: "Registration Queue", description: "Pending approvals, documents", to: createPageUrl("Registration") },
    { label: "Team Matrix", description: "Rosters, coaches, assignments", to: createPageUrl("Registration") + "?tab=teams" },
    { label: "Tryout Planner", description: "Plans, events, tasks", to: createPageUrl("TryoutDashboard") },
    { label: "Payment Ledger", description: "Revenue, outstanding, expenses", to: createPageUrl("PaymentSettings") },
    { label: "Expense Approvals", description: "Coach & staff expense reports", to: createPageUrl("ExpenseApprovals") },
    { label: "Seasons", description: "Rollover, age group matrix", to: createPageUrl("Seasons") },
    { label: "Communication", description: "Messages and announcements", to: createPageUrl("CommunicationPortal") },
  ];

  const scopeTabs = [{ id: "all", label: "All" }, ...dash.locations.slice(0, 6).map((l) => ({ id: l.id, label: l.name }))];

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-[1400px] mx-auto bg-surface-page min-h-screen">
      <DashboardHeader
        roleLabel="Club Admin Dashboard"
        userName={user?.full_name}
        subtitle={scope.isAll ? "Execute the seasonal cycle across the entire club." : `Running the seasonal cycle for ${scope.adminIds.size} selected branch${scope.adminIds.size === 1 ? "" : "es"}; the rest are owned by their branch leads.`}
        primaryQuestion="What needs my attention right now to keep registration, rosters, schedules, and communication running?"
      />

      {/* Priority Actions — the hero widget */}
      <PriorityActions actions={CLUB_ADMIN_WORKFLOW.priorityActions({ cycleSteps, migrationActive, dash, cycle })} />

      {/* Data Migration — prioritized above everything else */}
      <DataMigrationCard />

      {/* Next Action Card — single most important cycle step */}
      <NextActionCard action={nextAction} />

      {/* Season Cycle Bar + Cycle Checklist (collapsible) */}
      <Card className="border-border-subtle rounded-xl shadow-sm">
        <CardContent className="p-4">
          <SeasonCycleBar steps={cycleSteps} />
        </CardContent>
      </Card>

      <CycleChecklist steps={cycleSteps} />

      {/* Ownership: whole club or selected branches */}
      <LifecycleScopeCard />

      {/* Visibility on ALL branches, including those delegated to branch leads */}
      <BranchLifecycleBoard />
      <SeasonAlertsPanel />

      {/* Blockers + Quick Actions side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BlockersPanel blockers={allBlockers} />
        <QuickActionsBar actions={quickActions} title="Quick Actions" />
      </div>

      {/* Branch / Platform Tabs — filter Today's Tasks by scope */}
      <Card className="border-border-subtle rounded-xl shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <CardTitle className="text-sm font-bold tracking-wide text-text-primary flex items-center gap-2">
              <Activity className="w-4 h-4 text-action" /> Today's Tasks
            </CardTitle>
            <div className="flex items-center gap-1 ml-auto flex-wrap">
              {scopeTabs.map((t) => (
                <Button key={t.id} size="sm" variant={scopeTab === t.id ? "default" : "outline"}
                  className="h-7 text-xs px-2.5" onClick={() => setScopeTab(t.id)}>
                  {t.label}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {scopedTasks.length === 0 ? (
            <div className="flex items-center gap-2 py-6 text-center">
              <CheckCircle2 className="w-5 h-5 text-status-success mx-auto" />
              <p className="text-sm text-text-secondary">All caught up — no tasks pending.</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {scopedTasks.map((task, i) => {
                const Icon = task.icon;
                return (
                  <Link key={i} to={task.to} className="flex items-center gap-3 p-2.5 rounded-lg bg-neutral-50 hover:bg-neutral-50 border border-border-subtle hover:border-action/30 transition-all group">
                    <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-action" />
                    </div>
                    <p className="text-sm font-medium text-text-primary flex-1">{task.label}</p>
                    {task.priority === "high" && <Badge variant="outline" className="text-[10px] bg-red-50 text-red-700 border-red-200">High</Badge>}
                    <ArrowRight className="w-4 h-4 text-text-secondary group-hover:text-action shrink-0" />
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="border-border-subtle rounded-xl shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold tracking-wide text-text-primary flex items-center gap-2">
            <Clock className="w-4 h-4 text-action" /> Recent Activity (24h)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {recentActivity.length === 0 ? (
            <p className="text-sm text-text-secondary py-4 text-center">No activity in the last 24 hours.</p>
          ) : (
            <div className="space-y-1.5">
              {recentActivity.map((item, i) => (
                <Link key={i} to={item.to} className="flex items-center gap-3 p-2 rounded-lg hover:bg-neutral-50 transition-colors">
                  <div className="w-2 h-2 rounded-full bg-action shrink-0" />
                  <p className="text-sm text-text-primary flex-1">{item.label}</p>
                  <span className="text-[10px] text-text-secondary shrink-0">
                    {new Date(item.time).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Integrations */}
      <IntegrationsPanel user={user} />

      {/* Drill-Down Views */}
      <DrillDownLinks items={drillDowns} />

      <InviteMemberDialog open={inviteOpen} onOpenChange={setInviteOpen} user={user} />
    </div>
  );
}