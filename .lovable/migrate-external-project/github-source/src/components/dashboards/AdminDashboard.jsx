import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MultiSelectFilter from "@/components/calendar/MultiSelectFilter";
import TeamMatrix from "@/components/admin/TeamMatrix";
import PlayerManagementTable from "@/components/admin/PlayerManagementTable";
import AgeGroupManager from "@/components/admin/AgeGroupManager";
import EventsTable from "@/components/admin/EventsTable";
import WorkflowChecklist from "./WorkflowChecklist";
import PipelineOverview from "./PipelineOverview";
import DatabaseManagement from "./DatabaseManagement";
import StartSeasonDialog from "./StartSeasonDialog";
import PluginManager from "@/components/plugins/PluginManager";
import InviteMemberDialog from "@/components/admin/InviteMemberDialog";
import IntegrationsPanel from "./IntegrationsPanel";

import ModuleSettingsNav from "./ModuleSettingsNav";
import DashboardHeader from "./shared/DashboardHeader";
import DashboardSection from "./shared/DashboardSection";
import QuickActionsBar from "./shared/QuickActionsBar";
import DrillDownLinks from "./shared/DrillDownLinks";
import PriorityActions from "./shared/PriorityActions";
import ActionTimeline from "./shared/ActionTimeline";
import useDashboardData from "./shared/useDashboardData";
import { ADMIN_WORKFLOW } from "./shared/roleWorkflows";
import { useTenant } from "@/lib/TenantContext";
import {
  Users, DollarSign, ClipboardCheck, Building2, AlertCircle, FileX, Wallet,
  UserX, Shield, Trophy, Settings, Mail, Calendar, Zap, Megaphone,
  CheckCircle2, Clock, FileBarChart, MapPin, MessageSquare, Bell,
} from "lucide-react";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";

const ADMIN_ROLES = ["master_admin", "admin", "club_director", "club_admin"];

function KPITile({ icon: Icon, label, value, sublabel, tone = "emerald", to }) {
  const toneMap = {
    emerald: "text-emerald-600 bg-emerald-50", red: "text-red-600 bg-red-50",
    amber: "text-amber-600 bg-amber-50", blue: "text-blue-600 bg-blue-50",
    purple: "text-purple-600 bg-purple-50", slate: "text-slate-600 bg-slate-50",
  };
  const content = (
    <Card className={`border-border-subtle rounded-xl ${to ? "hover:shadow-md transition-all cursor-pointer" : ""}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-1">
          {Icon && <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${toneMap[tone]}`}><Icon className="w-3.5 h-3.5" /></div>}
          <p className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">{label}</p>
        </div>
        <p className="text-xl font-extrabold text-text-primary">{value}</p>
        {sublabel && <p className="text-[10px] text-text-secondary mt-0.5">{sublabel}</p>}
      </CardContent>
    </Card>
  );
  return to ? <Link to={to}>{content}</Link> : content;
}

export default function AdminDashboard({ user }) {
  const queryClient = useQueryClient();
  const { effectiveClubId } = useTenant();
  const {
    registrations, players, teams, programs, locations,
    events, coaches, guardians, facilities, platforms,
  } = useDashboardData();

  const { data: migrationJobRows = [] } = useQuery({
    queryKey: ["admin-migration-status", effectiveClubId],
    queryFn: () => base44.entities.MigrationJob.filter({ club_id: effectiveClubId }, "-created_date", 1).catch(() => []),
    enabled: !!effectiveClubId,
  });
  const migrationActive = migrationJobRows[0] && migrationJobRows[0].status !== "completed";

  const dash = { registrations, players, teams, programs, locations, events, coaches, guardians, facilities, platforms };
  const timelineSteps = ADMIN_WORKFLOW.timelineSteps({ dash, migrationActive });
  const priorityActions = ADMIN_WORKFLOW.priorityActions({ dash, migrationActive });

  const { data: ageGroups = [] } = useQuery({ queryKey: ["admin-age-groups"], queryFn: () => base44.entities.AgeGroup.list("order", 200) });
  const { data: tryouts = [] } = useQuery({ queryKey: ["admin-tryouts"], queryFn: () => base44.entities.TryoutEvent.list("-created_date", 100) });
  const { data: tryoutRegs = [] } = useQuery({ queryKey: ["admin-tryout-regs"], queryFn: () => base44.entities.TryoutRegistration.list("-created_date", 200) });
  const { data: messages = [] } = useQuery({ queryKey: ["admin-messages"], queryFn: () => base44.entities.Message.list("-created_date", 50).catch(() => []) });

  const isAdmin = ADMIN_ROLES.includes(user?.custom_role);
  const userLocationId = user?.location_id || user?.branch_id;
  const [seasonOpen, setSeasonOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [filters, setFilters] = useState({ gender: [], platform: [], ageGroup: [], branch: [] });
  const [activeTab, setActiveTab] = useState("teams");

  const scope = (list) => (isAdmin || !userLocationId ? list : list.filter((r) => r.location_id === userLocationId));
  const scopedRegs = scope(registrations);
  const scopedPlayers = scope(players);
  const scopedTeams = scope(teams);
  const scopedPrograms = scope(programs);


  // KPI stats
  const pendingRegs = scopedRegs.filter((r) => r.status === "pending");
  const missingPayments = scopedRegs.filter((r) => r.payment_status !== "paid" && r.amount_due > 0);
  const missingDocs = scopedRegs.filter((r) => !r.paperwork_complete);
  const unassignedPlayers = scopedPlayers.filter((p) => !p.team_id);
  const coachlessTeams = scopedTeams.filter((t) => !t.coach_id);
  const rosterIncomplete = scopedTeams.filter((t) => (t.player_ids?.length || 0) < (t.max_roster_size || 18));
  const totalRevenue = scopedRegs.reduce((sum, r) => sum + (r.amount_paid || 0), 0);
  const outstanding = scopedRegs.reduce((sum, r) => sum + ((r.amount_due || 0) - (r.amount_paid || 0)), 0);
  const activePlayers = scopedPlayers.filter((p) => p.status === "active").length;
  const unreadMessages = messages.filter((m) => !m.read).length;

  // Schedule conflicts (simple: events at same facility, same time)
  const todayISO = new Date().toISOString().split("T")[0];
  const weekAhead = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
  const thisWeekEvents = events.filter((e) => e.start_datetime && e.start_datetime.split("T")[0] >= todayISO && e.start_datetime.split("T")[0] <= weekAhead);
  const facilityConflicts = useMemo(() => {
    const byFacility = {};
    thisWeekEvents.forEach((e) => {
      const key = `${e.facility_id || e.location_text}_${(e.start_datetime || "").split("T")[0]}`;
      if (!byFacility[key]) byFacility[key] = [];
      byFacility[key].push(e);
    });
    return Object.values(byFacility).filter((arr) => arr.length > 1).length;
  }, [thisWeekEvents]);

  // Workflow + pipeline counts
  const workflowCounts = {
    locations: locations.length, programs: scopedPrograms.length, teams: scopedTeams.length,
    tryouts: tryouts.length, tryoutRegs: tryoutRegs.length,
    registrations: scopedRegs.length,
  };
  const pipelineCounts = {
    tryouts: tryouts.length, tryoutRegs: tryoutRegs.length,
    registrations: scopedRegs.length,
  };

  // Filter options
  const filterOptions = useMemo(() => ({
    gender: [...new Set(scopedTeams.map((t) => t.gender).filter(Boolean))].map((g) => ({ value: g, label: g })),
    platform: [...new Set(scopedTeams.map((t) => t.platform_name).filter(Boolean))].map((p) => ({ value: p, label: p })),
    ageGroup: [...new Set(scopedTeams.map((t) => t.age_group).filter(Boolean))].sort().map((a) => ({ value: a, label: a })),
    branch: locations.map((l) => ({ value: l.name, label: l.name })),
  }), [scopedTeams, locations]);

  const filteredTeams = useMemo(() => scopedTeams.filter((t) =>
    (filters.gender.length === 0 || filters.gender.includes(t.gender)) &&
    (filters.platform.length === 0 || filters.platform.includes(t.platform_name)) &&
    (filters.ageGroup.length === 0 || filters.ageGroup.includes(t.age_group)) &&
    (filters.branch.length === 0 || filters.branch.includes(t.location_name))
  ), [scopedTeams, filters]);

  const teamIdToPlatform = useMemo(() => new Map(scopedTeams.map((t) => [t.id, t.platform_name])), [scopedTeams]);
  const filteredPlayers = useMemo(() => scopedPlayers.filter((p) =>
    (filters.gender.length === 0 || filters.gender.includes(p.gender)) &&
    (filters.platform.length === 0 || (p.team_id && filters.platform.includes(teamIdToPlatform.get(p.team_id)))) &&
    (filters.ageGroup.length === 0 || filters.ageGroup.includes(p.age_group)) &&
    (filters.branch.length === 0 || filters.branch.includes(p.location_name))
  ), [scopedPlayers, filters, teamIdToPlatform]);

  const seasons = useMemo(() => [...new Set(ageGroups.map((a) => a.season).filter(Boolean))].sort().reverse(), [ageGroups]);
  const hasActiveFilters = filters.gender.length > 0 || filters.platform.length > 0 || filters.ageGroup.length > 0 || filters.branch.length > 0;

  const updateTeam = async (teamId, data) => {
    try { await base44.entities.Team.update(teamId, data); queryClient.invalidateQueries({ queryKey: ["dash-teams"] }); toast.success("Team updated"); }
    catch { toast.error("Failed to update team"); }
  };
  const updatePlayer = async (playerId, data) => {
    try { await base44.entities.Player.update(playerId, data); queryClient.invalidateQueries({ queryKey: ["dash-players"] }); toast.success("Player updated"); }
    catch { toast.error("Failed to update player"); }
  };
  const updateAgeGroup = async (id, data) => {
    try { await base44.entities.AgeGroup.update(id, data); queryClient.invalidateQueries({ queryKey: ["admin-age-groups"] }); toast.success("Age group updated"); }
    catch { toast.error("Failed to update age group"); }
  };

  const quickActions = [
    { label: "Add Team", desc: "Create & assign coaches", icon: Shield, to: `${createPageUrl("Registration")}?tab=teams`, cardColor: "bg-emerald-50 border-emerald-200 text-emerald-700", iconBg: "bg-emerald-500", iconColor: "text-white" },
    { label: "Add Player", desc: "Register a new player", icon: UserX, to: `${createPageUrl("Registration")}?tab=players`, cardColor: "bg-blue-50 border-blue-200 text-blue-700", iconBg: "bg-blue-500", iconColor: "text-white" },
    { label: "Send Message", desc: "Club, branch, or team", icon: Megaphone, to: createPageUrl("CommunicationPortal"), cardColor: "bg-amber-50 border-amber-200 text-amber-700", iconBg: "bg-amber-500", iconColor: "text-white" },
    { label: "Schedule Event", desc: "Practice, game, meeting", icon: Calendar, to: createPageUrl("TeamCalendar"), cardColor: "bg-violet-50 border-violet-200 text-violet-700", iconBg: "bg-violet-500", iconColor: "text-white" },
    { label: "Tryout Planner", desc: "Plan tryouts & tasks", icon: ClipboardCheck, to: createPageUrl("TryoutDashboard"), cardColor: "bg-rose-50 border-rose-200 text-rose-700", iconBg: "bg-rose-500", iconColor: "text-white" },
    { label: "Invite Member", desc: "Send role-based invite", icon: Mail, onClick: () => setInviteOpen(true), cardColor: "bg-cyan-50 border-cyan-200 text-cyan-700", iconBg: "bg-cyan-500", iconColor: "text-white" },
    { label: "Manage Users", desc: "View & assign roles", icon: Users, to: createPageUrl("UserPanel"), cardColor: "bg-teal-50 border-teal-200 text-teal-700", iconBg: "bg-teal-500", iconColor: "text-white" },
    { label: "Payments", desc: "Invoices & expenses", icon: Wallet, to: createPageUrl("PaymentSettings"), cardColor: "bg-indigo-50 border-indigo-200 text-indigo-700", iconBg: "bg-indigo-500", iconColor: "text-white" },
    { label: "Start Season", desc: "Launch new season", icon: Zap, onClick: () => setSeasonOpen(true), cardColor: "bg-purple-50 border-purple-200 text-purple-700", iconBg: "bg-purple-500", iconColor: "text-white" },
  ];

  const drillDowns = [
    { label: "Player / Family Profile", description: "Full shared record", to: `${createPageUrl("Registration")}?tab=players` },
    { label: "Team Detail", description: "Roster, schedule, payments", to: `${createPageUrl("Registration")}?tab=teams` },
    { label: "Program Detail", description: "Registration, capacity, budget", to: createPageUrl("ProgramsList") },
    { label: "Facility / Field Detail", description: "Availability, events, conflicts", to: createPageUrl("Facilities") },
    { label: "Kanban Board", description: "Tasks and approvals", to: createPageUrl("Kanban") },
    { label: "Communication Portal", description: "Messages and announcements", to: createPageUrl("CommunicationPortal") },
  ];

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-[1400px] mx-auto bg-surface-page min-h-screen">
      <DashboardHeader
        roleLabel={isAdmin ? "Club Administrator Dashboard" : "Branch Administrator Dashboard"}
        userName={user?.full_name}
        subtitle={isAdmin ? "Club-wide overview" : `${user?.location_name || "Your branch"} overview`}
        primaryQuestion="What needs my attention right now to keep registration, rosters, schedules, and communication running?"
      />

      {/* Priority Actions — the hero widget */}
      <PriorityActions actions={priorityActions} />

      {/* Workflow Timeline */}
      <ActionTimeline steps={timelineSteps} title="Operations Workflow" />

      {/* Quick Actions */}
      <QuickActionsBar actions={quickActions} />

      {/* At-a-Glance KPI Header */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <KPITile icon={ClipboardCheck} label="Pending Registrations" value={pendingRegs.length} sublabel={`${scopedRegs.length} total`} tone="amber" to={createPageUrl("Registration")} />
        <KPITile icon={Shield} label="Rosters Incomplete" value={rosterIncomplete.length} sublabel={`${coachlessTeams.length} no coach`} tone="red" to={`${createPageUrl("Registration")}?tab=teams`} />
        <KPITile icon={Wallet} label="Payments Overdue" value={missingPayments.length} sublabel={`$${outstanding.toLocaleString()}`} tone="red" to={createPageUrl("PaymentSettings")} />
        <KPITile icon={FileX} label="Documents Awaiting" value={missingDocs.length} sublabel="Need verification" tone="amber" to={createPageUrl("Registration")} />
        <KPITile icon={Calendar} label="Schedule Conflicts" value={facilityConflicts} sublabel="This week" tone={facilityConflicts > 0 ? "red" : "emerald"} to={createPageUrl("TeamCalendar")} />
        <KPITile icon={Bell} label="Unread Messages" value={unreadMessages} sublabel="Need response" tone={unreadMessages > 0 ? "amber" : "emerald"} to={createPageUrl("CommunicationPortal")} />
      </div>

      {/* Action items badges */}
      {(pendingRegs.length > 0 || missingPayments.length > 0 || missingDocs.length > 0 || unassignedPlayers.length > 0 || coachlessTeams.length > 0) && (
        <div className="flex items-center gap-2 flex-wrap p-3 rounded-xl bg-amber-50/50 border border-amber-200/50">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span className="text-xs font-semibold text-amber-800 uppercase tracking-wide">Action Items</span>
          <div className="flex items-center gap-1.5 flex-wrap ml-2">
            {pendingRegs.length > 0 && <Badge variant="outline" className="text-[10px] bg-amber-100 text-amber-700 border-amber-300">{pendingRegs.length} pending approvals</Badge>}
            {missingPayments.length > 0 && <Badge variant="outline" className="text-[10px] bg-red-100 text-red-700 border-red-300"><Wallet className="w-2.5 h-2.5 mr-0.5" />{missingPayments.length} missing payments</Badge>}
            {missingDocs.length > 0 && <Badge variant="outline" className="text-[10px] bg-orange-100 text-orange-700 border-orange-300"><FileX className="w-2.5 h-2.5 mr-0.5" />{missingDocs.length} missing documents</Badge>}
            {unassignedPlayers.length > 0 && <Badge variant="outline" className="text-[10px] bg-blue-100 text-blue-700 border-blue-300"><UserX className="w-2.5 h-2.5 mr-0.5" />{unassignedPlayers.length} unassigned players</Badge>}
            {coachlessTeams.length > 0 && <Badge variant="outline" className="text-[10px] bg-purple-100 text-purple-700 border-purple-300"><Shield className="w-2.5 h-2.5 mr-0.5" />{coachlessTeams.length} teams without coaches</Badge>}
          </div>
        </div>
      )}

      {/* Workflow checklist + Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <WorkflowChecklist counts={workflowCounts} />
        <PipelineOverview counts={pipelineCounts} />
      </div>

      {/* Integrations (QuickBooks + Stripe) */}
      <IntegrationsPanel user={user} />

      {/* Registration & Family Management Queue */}
      <DashboardSection title="Registration & Family Management Queue" icon={ClipboardCheck} description="New registrations, eligibility, waitlist, financial aid, documents" viewAllLink={createPageUrl("Registration")}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Link to={createPageUrl("Registration")} className="p-3 rounded-lg bg-amber-50 border border-amber-200 hover:shadow-sm transition-all">
            <p className="text-lg font-extrabold text-amber-700">{pendingRegs.length}</p>
            <p className="text-[10px] text-text-secondary">Pending Review</p>
          </Link>
          <Link to={createPageUrl("Registration")} className="p-3 rounded-lg bg-blue-50 border border-blue-200 hover:shadow-sm transition-all">
            <p className="text-lg font-extrabold text-blue-700">{unassignedPlayers.length}</p>
            <p className="text-[10px] text-text-secondary">Unassigned Players</p>
          </Link>
          <Link to={createPageUrl("Registration")} className="p-3 rounded-lg bg-orange-50 border border-orange-200 hover:shadow-sm transition-all">
            <p className="text-lg font-extrabold text-orange-700">{missingDocs.length}</p>
            <p className="text-[10px] text-text-secondary">Documents to Verify</p>
          </Link>
          <Link to={createPageUrl("Registration")} className="p-3 rounded-lg bg-red-50 border border-red-200 hover:shadow-sm transition-all">
            <p className="text-lg font-extrabold text-red-700">{missingPayments.length}</p>
            <p className="text-[10px] text-text-secondary">Missing Payments</p>
          </Link>
        </div>
      </DashboardSection>

      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap p-3 rounded-xl bg-neutral-50 border border-border-subtle">
        <span className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Filters:</span>
        <MultiSelectFilter label="Gender" options={filterOptions.gender} selected={filters.gender} onChange={(v) => setFilters({ ...filters, gender: v })} />
        <MultiSelectFilter label="Platform" options={filterOptions.platform} selected={filters.platform} onChange={(v) => setFilters({ ...filters, platform: v })} />
        <MultiSelectFilter label="Age Groups" options={filterOptions.ageGroup} selected={filters.ageGroup} onChange={(v) => setFilters({ ...filters, ageGroup: v })} />
        <MultiSelectFilter label="Branches" options={filterOptions.branch} selected={filters.branch} onChange={(v) => setFilters({ ...filters, branch: v })} />
        {hasActiveFilters && (
          <Button size="sm" variant="ghost" className="h-8 text-xs text-text-secondary" onClick={() => setFilters({ gender: [], platform: [], ageGroup: [], branch: [] })}>
            Clear All
          </Button>
        )}
        <span className="text-xs text-text-secondary ml-auto">
          {activeTab === "teams" ? `${filteredTeams.length} teams` : activeTab === "players" ? `${filteredPlayers.length} players` : ""}
        </span>
      </div>

      {/* Roster & Team Management + Scheduling tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="teams"><Building2 className="w-3.5 h-3.5 mr-1.5" /> Team Matrix</TabsTrigger>
          <TabsTrigger value="players"><Users className="w-3.5 h-3.5 mr-1.5" /> Player Roster</TabsTrigger>
          <TabsTrigger value="agegroups"><Settings className="w-3.5 h-3.5 mr-1.5" /> Age Groups</TabsTrigger>
          <TabsTrigger value="events"><Calendar className="w-3.5 h-3.5 mr-1.5" /> Events</TabsTrigger>
        </TabsList>
        <TabsContent value="teams" className="mt-4">
          <TeamMatrix teams={filteredTeams} registrations={registrations} coaches={coaches} guardians={guardians} platforms={platforms} locations={locations} ageGroups={ageGroups} onUpdateTeam={updateTeam} />
        </TabsContent>
        <TabsContent value="players" className="mt-4">
          <PlayerManagementTable players={filteredPlayers} teams={teams} guardians={guardians} registrations={registrations} locations={locations} ageGroups={ageGroups} season="2026-2027" onUpdatePlayer={updatePlayer} />
        </TabsContent>
        <TabsContent value="agegroups" className="mt-4">
          <AgeGroupManager ageGroups={ageGroups} seasons={seasons} onUpdateAgeGroup={updateAgeGroup} />
        </TabsContent>
        <TabsContent value="events" className="mt-4">
          <EventsTable events={events} teams={teams} />
        </TabsContent>
      </Tabs>

      {/* Drill-Down Views */}
      <DrillDownLinks items={drillDowns} />

      {/* Module Settings */}
      <ModuleSettingsNav user={user} />


      {/* Plugins */}
      <PluginManager user={user} />

      {/* Database Management — admin only */}
      {isAdmin && <DatabaseManagement />}

      <StartSeasonDialog open={seasonOpen} onOpenChange={setSeasonOpen} />
      <InviteMemberDialog open={inviteOpen} onOpenChange={setInviteOpen} user={user} />
    </div>
  );
}