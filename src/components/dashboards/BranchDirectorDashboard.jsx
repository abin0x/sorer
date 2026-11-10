import React, { useMemo } from "react";
import { Link } from '@/lib/router-compat';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import DrillDownLinks from "./shared/DrillDownLinks";
import ActionTimeline from "./shared/ActionTimeline";
import BranchLifecycleCard from "./lifecycle/BranchLifecycleCard";
import useDashboardData from "./shared/useDashboardData";
import { BRANCH_DIRECTOR_WORKFLOW } from "./shared/roleWorkflows";
import { createPageUrl } from "@/utils";
import {
  Users, DollarSign, Shield, Activity, Building2, ClipboardCheck,
  AlertCircle, MapPin, Calendar, TrendingUp, Megaphone, UserPlus,
  CheckCircle2, Clock, Target, Wallet, Receipt,
} from "lucide-react";


import { WorkspaceHeader as DashboardHeader, WorkspaceMetric as KPITile, WorkspaceSection as DashboardSection, WorkspaceActions as QuickActionsBar, WorkspacePriorities as PriorityActions, WorkspaceTabs, NextEventSpotlight } from "./shared/DashboardWorkspace";

export default function BranchDirectorDashboard({ user }) {
  const {
    registrations, players, teams, programs, expenses, locations,
    events, coaches, guardians, evaluations, facilities,
  } = useDashboardData();

  const locationId = user?.location_id || user?.branch_id;
  const scope = (list) => (locationId ? list.filter((i) => i.location_id === locationId) : list);

  const branchRegs = scope(registrations);
  const branchPlayers = scope(players);
  const branchTeams = scope(teams);
  const branchPrograms = scope(programs);
  const branchFacilities = facilities.filter((f) => f.location_id === locationId);

  const timelineSteps = BRANCH_DIRECTOR_WORKFLOW.timelineSteps({ branchPlayers, branchTeams, branchRegs, branchFacilities });
  const priorityActions = BRANCH_DIRECTOR_WORKFLOW.priorityActions({ branchPlayers, branchTeams, branchRegs });

  // KPI stats
  const activePlayers = branchPlayers.filter((p) => p.status === "active").length;
  const waitlisted = branchRegs.filter((r) => r.status === "waitlist" || r.status === "waitlisted");
  const rostered = branchPlayers.filter((p) => p.team_id).length;
  const revenue = branchRegs.reduce((s, r) => s + (r.amount_paid || 0), 0);
  const outstanding = branchRegs.reduce((s, r) => s + ((r.amount_due || 0) - (r.amount_paid || 0)), 0);
  const branchProgramIds = new Set(branchPrograms.map((p) => p.id));
  const branchExpenses = expenses.filter((e) => branchProgramIds.has(e.program_id));
  const expenseTotal = branchExpenses.reduce((s, e) => s + (e.amount || 0), 0);
  const profit = revenue - expenseTotal;
  const retentionRate = branchPlayers.length > 0 ? Math.round((activePlayers / branchPlayers.length) * 100) : 0;
  const donePrograms = branchPrograms.filter((p) => p.status === "done");
  const programCompletion = branchPrograms.length > 0 ? Math.round((donePrograms.length / branchPrograms.length) * 100) : 0;

  // Teams & rosters
  const rosterIncomplete = branchTeams.filter((t) => (t.player_ids?.length || 0) < (t.max_roster_size || 18));
  const coachlessTeams = branchTeams.filter((t) => !t.coach_id);
  const unassignedPlayers = branchPlayers.filter((p) => !p.team_id);

  // Fields & facilities
  const todayISO = new Date().toISOString().split("T")[0];
  const weekAhead = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
  const branchEvents = events.filter((e) => {
    const eventTeams = e.team_ids || [];
    return branchTeams.some((t) => eventTeams.includes(t.id));
  });
  const thisWeekEvents = branchEvents.filter((e) => e.start_datetime && e.start_datetime.split("T")[0] >= todayISO && e.start_datetime.split("T")[0] <= weekAhead);
  const fieldUtilization = branchFacilities.length > 0
    ? Math.round((branchFacilities.filter((f) => f.is_active).length / branchFacilities.length) * 100)
    : 0;

  // Staffing
  const branchCoachIds = new Set(branchTeams.flatMap((t) => (t.coach_ids?.length ? t.coach_ids : [t.coach_id]).filter(Boolean)));
  const branchCoaches = coaches.filter((c) => branchCoachIds.has(c.id));
  const evalCompletion = branchTeams.length > 0
    ? Math.round((new Set(evaluations.filter((e) => branchPlayers.some((p) => p.id === e.player_id)).map((e) => e.player_id)).size / Math.max(branchPlayers.length, 1)) * 100)
    : 0;

  // Tasks
  const overdueTasks = branchPrograms.filter((p) => p.due_date && p.due_date < todayISO && p.status !== "done");
  const highPriority = branchPrograms.filter((p) => p.priority === "high" && p.status !== "done");

  // Growth indicators
  const newPlayers = branchPlayers.filter((p) => p.status === "pending").length;
  const returningPlayers = activePlayers;

  const quickActions = [
    { label: "Assign Players", desc: "Place on teams", icon: UserPlus, to: `${createPageUrl("Registration")}?tab=players` },
    { label: "Approve Expenses", desc: "Branch-level approvals", icon: Wallet, to: createPageUrl("PaymentSettings") },
    { label: "Resolve Conflicts", desc: "Field & schedule", icon: Calendar, to: createPageUrl("TeamCalendar") },
    { label: "Branch Message", desc: "Send to branch", icon: Megaphone, to: createPageUrl("CommunicationPortal") },
    { label: "Manage Coaches", desc: "Assign & review", icon: Shield, to: createPageUrl("ClubStaff") },
    { label: "Kanban Board", desc: "Branch tasks", icon: ClipboardCheck, to: createPageUrl("Kanban") },
  ];

  const drillDowns = [
    { label: "Team Detail", description: "Roster, schedule, payments, development", to: `${createPageUrl("Registration")}?tab=teams` },
    { label: "Player / Family Profile", description: "Full shared record", to: `${createPageUrl("Registration")}?tab=players` },
    { label: "Field / Facility Detail", description: "Availability, events, conflicts", to: createPageUrl("Facilities") },
    { label: "Program Detail", description: "Registration, capacity, budget", to: createPageUrl("ProgramsList") },
  ];

  return (
    <div className="dashboard-workspace p-4 lg:p-8 space-y-6 max-w-[1400px] mx-auto bg-background min-h-screen">
      <DashboardHeader
        title="Branch command center"
        roleLabel="Branch Director Dashboard"
        userName={user?.full_name}
        subtitle={`${user?.location_name || "Your branch"} — teams, fields, staffing, and finances.`}
      />

      {/* At-a-Glance KPI Header */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-3">
        <KPITile icon={Users} label="Branch Players" value={branchPlayers.length} sublabel={`${activePlayers} active · ${waitlisted.length} waitlist`} tone="emerald" to={`${createPageUrl("Registration")}?tab=players`} />
        <KPITile icon={DollarSign} label="Branch Revenue" value={`$${revenue.toLocaleString()}`} sublabel="Season to date" tone="emerald" to={createPageUrl("PaymentSettings")} />
        <KPITile icon={Receipt} label="Branch Expenses" value={`$${expenseTotal.toLocaleString()}`} sublabel={`${branchExpenses.length} entries`} tone="amber" to={createPageUrl("PaymentSettings")} />
        <KPITile icon={TrendingUp} label="Profit / Margin" value={`$${profit.toLocaleString()}`} sublabel={`${revenue > 0 ? Math.round((profit / revenue) * 100) : 0}% margin`} tone={profit >= 0 ? "emerald" : "red"} to={createPageUrl("Analytics")} />
        <KPITile icon={Shield} label="Active players" value={`${retentionRate}%`} sublabel={`${activePlayers}/${branchPlayers.length}`} tone="blue" to={`${createPageUrl("Registration")}?tab=players`} />
        <KPITile icon={CheckCircle2} label="Program Completion" value={`${programCompletion}%`} sublabel={`${donePrograms.length}/${branchPrograms.length}`} tone="purple" to={createPageUrl("ProgramsList")} />
        <KPITile icon={MapPin} label="Active facilities" value={`${fieldUtilization}%`} sublabel={`${branchFacilities.length} facilities`} tone="slate" to={createPageUrl("Facilities")} />
        <KPITile icon={AlertCircle} label="Outstanding" value={`$${outstanding.toLocaleString()}`} sublabel={`${branchRegs.length} registrations`} tone="red" to={createPageUrl("PaymentSettings")} />
      </div>
<QuickActionsBar actions={quickActions} />
<PriorityActions actions={priorityActions} />
<WorkspaceTabs panels={[
{ id: "teams", label: "Teams & players", content: <>
<div className="grid gap-6 lg:grid-cols-2">        {/* Branch Performance Overview */}
        <DashboardSection title="Branch Performance Overview" icon={TrendingUp} description="Players, revenue trends, growth, retention risk" viewAllLink={createPageUrl("Analytics")}>
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2.5 rounded-lg bg-status-success-50 border border-status-success/20 text-center">
                <p className="text-lg font-extrabold text-status-success-700">{returningPlayers}</p>
                <p className="text-[10px] text-text-secondary">Active</p>
              </div>
              <div className="p-2.5 rounded-lg bg-status-info-50 border border-status-info/20 text-center">
                <p className="text-lg font-extrabold text-status-info-700">{newPlayers}</p>
                <p className="text-[10px] text-text-secondary">New / Pending</p>
              </div>
              <div className="p-2.5 rounded-lg bg-status-warning-50 border border-status-warning/20 text-center">
                <p className="text-lg font-extrabold text-status-warning-700">{rostered}</p>
                <p className="text-[10px] text-text-secondary">Rostered</p>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-text-secondary">Players by Program</p>
              <div className="space-y-1 max-h-28 overflow-y-auto">
                {branchPrograms.slice(0, 5).map((p) => {
                  const count = branchRegs.filter((r) => r.program_id === p.id).length;
                  return (
                    <div key={p.id} className="flex items-center justify-between text-xs p-1.5 rounded bg-neutral-50">
                      <span className="text-text-primary truncate">{p.title}</span>
                      <span className="font-bold">{count}</span>
                    </div>
                  );
                })}
                {branchPrograms.length === 0 && <p className="text-xs text-text-secondary text-center py-2">No programs yet</p>}
              </div>
            </div>
          </div>
        </DashboardSection>

        {/* Teams & Rosters */}
        <DashboardSection title="Teams & Rosters" icon={Shield} description="Roster status, coach assignments, unassigned players" viewAllLink={`${createPageUrl("Registration")}?tab=teams`}>
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2.5 rounded-lg bg-status-warning-50 border border-status-warning/20 text-center">
                <p className="text-lg font-extrabold text-status-warning-700">{rosterIncomplete.length}</p>
                <p className="text-[10px] text-text-secondary">Rosters Incomplete</p>
              </div>
              <div className="p-2.5 rounded-lg bg-status-danger-50 border border-status-danger/20 text-center">
                <p className="text-lg font-extrabold text-status-danger-700">{coachlessTeams.length}</p>
                <p className="text-[10px] text-text-secondary">No Coach</p>
              </div>
              <div className="p-2.5 rounded-lg bg-status-info-50 border border-status-info/20 text-center">
                <p className="text-lg font-extrabold text-status-info-700">{unassignedPlayers.length}</p>
                <p className="text-[10px] text-text-secondary">Unassigned</p>
              </div>
            </div>
            <div className="space-y-1 max-h-28 overflow-y-auto">
              {branchTeams.slice(0, 6).map((t) => (
                <Link key={t.id} to={`${createPageUrl("TeamDetail")}?id=${t.id}`} className="flex items-center justify-between text-xs p-1.5 rounded bg-neutral-50 hover:bg-neutral-100 transition-colors">
                  <span className="text-text-primary font-medium truncate">{t.name}</span>
                  <span className="text-text-secondary">{t.player_ids?.length || 0}/{t.max_roster_size || 18}</span>
                </Link>
              ))}
              {branchTeams.length === 0 && <p className="text-xs text-text-secondary text-center py-2">No teams yet</p>}
            </div>
          </div>
        </DashboardSection>

</div>
</> },
{ id: "operations", label: "Fields & staffing", content: <>
<div className="grid gap-6 lg:grid-cols-2">        {/* Fields & Facilities */}
        <DashboardSection title="Fields & Facilities" icon={MapPin} description="Availability, utilization, events, conflicts" viewAllLink={createPageUrl("Facilities")}>
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-lg bg-status-success-50 border border-status-success/20 text-center">
                <p className="text-lg font-extrabold text-status-success-700">{branchFacilities.filter((f) => f.is_active).length}</p>
                <p className="text-[10px] text-text-secondary">Active Facilities</p>
              </div>
              <div className="p-2.5 rounded-lg bg-status-info-50 border border-status-info/20 text-center">
                <p className="text-lg font-extrabold text-status-info-700">{thisWeekEvents.length}</p>
                <p className="text-[10px] text-text-secondary">Events This Week</p>
              </div>
            </div>
            <div className="space-y-1 max-h-28 overflow-y-auto">
              {branchFacilities.slice(0, 5).map((f) => (
                <div key={f.id} className="flex items-center justify-between text-xs p-1.5 rounded bg-neutral-50">
                  <span className="text-text-primary truncate">{f.name}</span>
                  <Badge variant="outline" className="text-[10px] capitalize">{f.surface_type}</Badge>
                </div>
              ))}
              {branchFacilities.length === 0 && <p className="text-xs text-text-secondary text-center py-2">No facilities linked to this branch</p>}
            </div>
          </div>
        </DashboardSection>

        {/* Staffing & Coaches */}
        <DashboardSection title="Staffing & Coaches" icon={Users} description="Coach assignments, evaluations, onboarding" viewAllLink={createPageUrl("ClubStaff")}>
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20 text-center">
                <p className="text-lg font-extrabold text-primary">{branchCoaches.length}</p>
                <p className="text-[10px] text-text-secondary">Assigned Coaches</p>
              </div>
              <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20 text-center">
                <p className="text-lg font-extrabold text-primary">{evalCompletion}%</p>
                <p className="text-[10px] text-text-secondary">Eval Completion</p>
              </div>
            </div>
            <div className="space-y-1 max-h-28 overflow-y-auto">
              {branchCoaches.slice(0, 5).map((c) => {
                const coachTeams = branchTeams.filter((t) => (t.coach_ids?.length ? t.coach_ids : [t.coach_id]).includes(c.id));
                return (
                  <div key={c.id} className="flex items-center justify-between text-xs p-1.5 rounded bg-neutral-50">
                    <span className="text-text-primary font-medium truncate">{c.first_name} {c.last_name}</span>
                    <span className="text-text-secondary">{coachTeams.length} team{coachTeams.length !== 1 ? "s" : ""}</span>
                  </div>
                );
              })}
              {branchCoaches.length === 0 && <p className="text-xs text-text-secondary text-center py-2">No coaches assigned yet</p>}
            </div>
          </div>
        </DashboardSection>

</div>
</> },
{ id: "finance", label: "Finance & tasks", content: <>
<div className="grid gap-6 lg:grid-cols-2">        {/* Payments & Issues */}
        <DashboardSection title="Payments & Issues" icon={Wallet} description="Outstanding payments, financial aid, support cases" viewAllLink={createPageUrl("PaymentSettings")}>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-status-danger-50 border border-status-danger/20">
              <span className="text-sm font-medium text-status-danger-700">Outstanding Payments</span>
              <span className="text-lg font-extrabold text-status-danger-700">${outstanding.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-status-warning-50 border border-status-warning/20">
              <span className="text-sm font-medium text-status-warning-700">Waitlisted Players</span>
              <span className="text-lg font-extrabold text-status-warning-700">{waitlisted.length}</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-status-info-50 border border-status-info/20">
              <span className="text-sm font-medium text-status-info-700">Registration Exceptions</span>
              <span className="text-lg font-extrabold text-status-info-700">{branchRegs.filter((r) => r.status === "pending").length}</span>
            </div>
          </div>
        </DashboardSection>

        {/* Tasks & Operations */}
        <DashboardSection title="Tasks & Operations" icon={ClipboardCheck} description="Branch Kanban, overdue tasks, approvals" viewAllLink={createPageUrl("Kanban")}>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-status-danger-50 border border-status-danger/20">
              <span className="text-sm font-medium text-status-danger-700">Overdue Tasks</span>
              <span className="text-lg font-extrabold text-status-danger-700">{overdueTasks.length}</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-status-warning-50 border border-status-warning/20">
              <span className="text-sm font-medium text-status-warning-700">High Priority</span>
              <span className="text-lg font-extrabold text-status-warning-700">{highPriority.length}</span>
            </div>
            <Link to={createPageUrl("Kanban")} className="flex items-center justify-between p-2.5 rounded-lg bg-neutral-50 border border-border-subtle hover:bg-neutral-100 transition-colors">
              <span className="text-sm font-medium text-text-primary">View Kanban Board</span>
              <ClipboardCheck className="w-4 h-4 text-text-secondary" />
            </Link>
          </div>
        </DashboardSection>
      </div>
</> },
{ id: "season", label: "Branch workflow", content: <>
<BranchLifecycleCard branchId={locationId} branchName={user?.location_name} />
<ActionTimeline steps={timelineSteps} title="Branch Workflow" />
</> }
]} />
<DrillDownLinks items={drillDowns} />
    </div>
  );
}