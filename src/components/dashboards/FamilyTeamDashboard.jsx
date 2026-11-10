import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from '@/lib/router-compat';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import DashboardHeader from "./shared/DashboardHeader";
import DashboardSection from "./shared/DashboardSection";
import QuickActionsBar from "./shared/QuickActionsBar";
import DrillDownLinks from "./shared/DrillDownLinks";
import PriorityActions from "./shared/PriorityActions";
import ActionTimeline from "./shared/ActionTimeline";
import CoachScheduleCard from "./CoachScheduleCard";
import UpcomingGameAttendanceCard from "./UpcomingGameAttendanceCard";
import MultiSelectFilter from "@/components/calendar/MultiSelectFilter";
import { ROLES } from "@/lib/rbac";
import { FAMILY_WORKFLOW } from "./shared/roleWorkflows";
import { createPageUrl } from "@/utils";
import { format, parseISO, isAfter, startOfDay, isSameDay } from "date-fns";
import {
  Users, Calendar, Trophy, Search, ChevronRight, Mail, Phone,
  AlertCircle, Wallet, FileX, CheckCircle2, Megaphone, Star,
  Clock, MapPin, Bell, HeartHandshake, Target, FileText, Upload,
} from "lucide-react";

function KPITile({ icon: Icon, label, value, sublabel, tone = "emerald", to }) {
  const toneMap = {
    emerald: "text-emerald-600 bg-emerald-50", red: "text-red-600 bg-red-50",
    amber: "text-amber-600 bg-amber-50", blue: "text-blue-600 bg-blue-50",
    purple: "text-purple-600 bg-purple-50", slate: "text-slate-600 bg-slate-50",
    pink: "text-pink-600 bg-pink-50",
  };
  const content = (
    <Card className={`border-border-subtle rounded-xl ${to ? "hover:shadow-md transition-all cursor-pointer" : ""}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-1">
          {Icon && <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${toneMap[tone]}`}><Icon className="w-3.5 h-3.5" /></div>}
          <p className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">{label}</p>
        </div>
        <p className="text-xl font-extrabold text-text-action">{value}</p>
        {sublabel && <p className="text-[10px] text-text-secondary mt-0.5">{sublabel}</p>}
      </CardContent>
    </Card>
  );
  return to ? <Link to={to}>{content}</Link> : content;
}

export function PlayerStatusBadges({ player, registrations }) {
  const reg = registrations.find((r) => r.player_id === player.id);
  const badges = [];
  if (!reg) {
    badges.push({ label: "Missing Registration", cls: "bg-red-100 text-red-700 border-red-300" });
  } else {
    if (reg.status === "pending") badges.push({ label: "Pending Approval", cls: "bg-amber-100 text-amber-700 border-amber-300" });
    if (reg.payment_status === "unpaid" || (reg.amount_due > 0 && reg.amount_paid === 0)) badges.push({ label: "Missing Payment", cls: "bg-red-100 text-red-700 border-red-300" });
    else if (reg.payment_status === "partial" || (reg.amount_paid > 0 && reg.amount_paid < reg.amount_due)) badges.push({ label: "Partial Payment", cls: "bg-amber-100 text-amber-700 border-amber-300" });
    if (!reg.paperwork_complete) badges.push({ label: "Missing Docs", cls: "bg-orange-100 text-orange-700 border-orange-300" });
  }
  if (badges.length === 0 && reg) return <Badge variant="outline" className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-300"><CheckCircle2 className="w-2.5 h-2.5 mr-0.5" /> All Complete</Badge>;
  return <div className="flex items-center gap-1.5 flex-wrap">{badges.map((b, i) => <Badge key={i} variant="outline" className={`text-[10px] ${b.cls}`}>{b.label}</Badge>)}</div>;
}

export default function FamilyTeamDashboard({ user }) {
  const isTeamManager = user?.custom_role === ROLES.TEAM_MANAGER;
  const canManageEvents = isTeamManager;
  const [search, setSearch] = useState("");
  const [rosterTeamFilter, setRosterTeamFilter] = useState([]);

  const { data: guardians = [] } = useQuery({ queryKey: ["family-dash-guardians"], queryFn: () => base44.entities.Guardian.list("-created_date", 500) });
  const { data: players = [] } = useQuery({ queryKey: ["family-dash-players"], queryFn: () => base44.entities.Player.list("-created_date", 500) });
  const { data: teams = [] } = useQuery({ queryKey: ["family-dash-teams"], queryFn: () => base44.entities.Team.list("-created_date", 200) });
  const { data: registrations = [] } = useQuery({ queryKey: ["family-dash-regs"], queryFn: () => base44.entities.Registration.list("-created_date", 500) });
  const { data: events = [] } = useQuery({ queryKey: ["family-dash-events"], queryFn: () => base44.entities.CalendarEvent.list("start_datetime", 500) });
  const { data: evaluations = [] } = useQuery({ queryKey: ["family-dash-evals"], queryFn: () => base44.entities.PlayerEvaluation.list("-created_date", 200).catch(() => []) });
  const { data: tryouts = [] } = useQuery({ queryKey: ["family-dash-tryouts"], queryFn: () => base44.entities.TryoutEvent.list("-created_date", 100).catch(() => []) });

  // Resolve "me" as guardian (parents only)
  const myGuardian = !isTeamManager ? guardians.find((g) => g.email?.toLowerCase() === user?.email?.toLowerCase()) : null;
  const myChildren = myGuardian ? players.filter((p) => (p.guardian_ids?.length ? p.guardian_ids : [p.guardian_id]).includes(myGuardian.id)) : [];

  // Teams: team manager → managed teams; parent → children's teams
  const myTeams = useMemo(() => {
    if (isTeamManager) return teams.filter((t) => (t.team_manager_ids?.length ? t.team_manager_ids : [t.team_manager_id]).includes(user.id));
    const teamIds = new Set(myChildren.map((c) => c.team_id).filter(Boolean));
    return teams.filter((t) => teamIds.has(t.id));
  }, [isTeamManager, teams, user, myChildren]);

  const myTeamIds = useMemo(() => new Set(myTeams.map((t) => t.id)), [myTeams]);
  const myPlayers = useMemo(() => {
    if (isTeamManager) {
      const playerIds = new Set(myTeams.flatMap((t) => t.player_ids || []));
      return players.filter((p) => playerIds.has(p.id));
    }
    return myChildren;
  }, [isTeamManager, myTeams, players, myChildren]);

  const myRegs = useMemo(() => registrations.filter((r) => myPlayers.some((p) => p.id === r.player_id)), [registrations, myPlayers]);

  // KPI stats
  const missingRegCount = myPlayers.filter((p) => !registrations.find((r) => r.player_id === p.id)).length;
  const missingPaymentCount = myRegs.filter((r) => r.payment_status !== "paid" && r.amount_due > 0).length;
  const missingDocsCount = myRegs.filter((r) => !r.paperwork_complete).length;
  const pendingActionCount = missingRegCount + missingPaymentCount + missingDocsCount;

  const totalDue = myRegs.reduce((s, r) => s + (r.amount_due || 0), 0);
  const totalPaid = myRegs.reduce((s, r) => s + (r.amount_paid || 0), 0);
  const paymentPct = totalDue > 0 ? Math.round((totalPaid / totalDue) * 100) : 0;

  const today = new Date();
  const nextEvent = events
    .filter((e) => e.start_datetime && new Date(e.start_datetime) >= today && (e.team_ids || []).some((id) => myTeamIds.has(id)))
    .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime))[0];

  // Coach feedback
  const myPlayerIds = new Set(myPlayers.map((p) => p.id));
  const newEvaluations = evaluations.filter((e) => myPlayerIds.has(e.player_id));
  const upcomingTryouts = tryouts.filter((t) => t.tryout_date && new Date(t.tryout_date) >= today);

  // Pending RSVPs (team manager)
  const pendingRsvpCount = isTeamManager ? events.filter((e) => {
    const teamIds = e.team_ids || [];
    return myTeamIds.has(teamIds[0]) && e.rsvps && Object.keys(e.rsvps).length < (myPlayers.length || 1);
  }).length : 0;

  const scopedCalendarUrl = `${createPageUrl("TeamCalendar")}?teams=${myTeams.map((t) => t.id).join(",")}`;

  const timelineSteps = FAMILY_WORKFLOW.timelineSteps({ isTeamManager, nextEvent, totalDue, totalPaid, missingDocsCount, pendingActionCount });
  const priorityActions = FAMILY_WORKFLOW.priorityActions({ isTeamManager, nextEvent, totalDue, totalPaid, missingDocsCount, missingPaymentCount });

  // Roster by team
  const rosterByTeam = myTeams.map((team) => {
    const teamPlayers = (team.player_ids || [])
      .map((pid) => players.find((p) => p.id === pid))
      .filter(Boolean)
      .filter((p) => `${p.first_name} ${p.last_name}`.toLowerCase().includes(search.toLowerCase()));
    return { team, players: teamPlayers };
  });
  const visibleRosterByTeam = rosterTeamFilter.length > 0 ? rosterByTeam.filter((r) => rosterTeamFilter.includes(r.team.id)) : rosterByTeam;

  const quickActions = isTeamManager ? [
    { label: "Create Event", desc: "Practice, game, tournament", icon: Calendar, to: createPageUrl("TeamCalendar"), cardColor: "bg-blue-50 border-blue-200 text-blue-700", iconBg: "bg-blue-500", iconColor: "text-white" },
    { label: "Send Message", desc: "To team or parents", icon: Megaphone, to: createPageUrl("CommunicationPortal"), cardColor: "bg-amber-50 border-amber-200 text-amber-700", iconBg: "bg-amber-500", iconColor: "text-white" },
    { label: "Track RSVPs", desc: "View attendance", icon: CheckCircle2, to: createPageUrl("TeamCalendar"), cardColor: "bg-emerald-50 border-emerald-200 text-emerald-700", iconBg: "bg-emerald-500", iconColor: "text-white" },
    { label: "Upload Document", desc: "Team documents", icon: Upload, to: createPageUrl("CommunicationPortal"), cardColor: "bg-violet-50 border-violet-200 text-violet-700", iconBg: "bg-violet-500", iconColor: "text-white" },
  ] : [
    { label: "RSVP to Events", desc: "Confirm attendance", icon: CheckCircle2, to: scopedCalendarUrl, cardColor: "bg-emerald-50 border-emerald-200 text-emerald-700", iconBg: "bg-emerald-500", iconColor: "text-white" },
    { label: "Make Payment", desc: "Pay registration fees", icon: Wallet, to: createPageUrl("FamilyAccount"), cardColor: "bg-blue-50 border-blue-200 text-blue-700", iconBg: "bg-blue-500", iconColor: "text-white" },
    { label: "Upload Document", desc: "Forms & waivers", icon: Upload, to: createPageUrl("FamilyAccount"), cardColor: "bg-violet-50 border-violet-200 text-violet-700", iconBg: "bg-violet-500", iconColor: "text-white" },
    { label: "Message Coach", desc: "Contact coach or manager", icon: Mail, to: createPageUrl("CommunicationPortal"), cardColor: "bg-amber-50 border-amber-200 text-amber-700", iconBg: "bg-amber-500", iconColor: "text-white" },
  ];

  const drillDowns = isTeamManager ? [
    { label: "Player Detail", description: "Team-relevant info only", to: `${createPageUrl("Registration")}?tab=players` },
    { label: "Event Detail", description: "Attendance, location, conflicts", to: createPageUrl("TeamCalendar") },
    { label: "Team Roster", description: "Contact info, payment status", to: `${createPageUrl("Registration")}?tab=teams` },
  ] : [
    { label: "Child Detail", description: "Development, attendance, payments", to: createPageUrl("FamilyAccount") },
    { label: "Team Detail", description: "Roster, schedule, communication", to: scopedCalendarUrl },
    { label: "Event Detail", description: "Location, travel time, attendance", to: scopedCalendarUrl },
  ];

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-[1400px] mx-auto bg-surface-page min-h-screen">
      <DashboardHeader
        roleLabel={isTeamManager ? "Team Manager Dashboard" : "Family Dashboard"}
        userName={user?.full_name}
        subtitle={isTeamManager ? "Manage your teams, roster, schedule and attendance — all in one place." : "Track your child's registrations, payments, schedule and team updates."}
        primaryQuestion={isTeamManager ? "What does my team need this week, and what do I need to organize?" : "What do I need to know and do for each of my children today?"}
        accent={isTeamManager ? "#65a30d" : "#ec4899"}
      />

      {/* Priority Actions — the hero widget */}
      <PriorityActions actions={priorityActions} maxVisible={2} />

      {/* Workflow Timeline */}
      <ActionTimeline steps={timelineSteps} title={isTeamManager ? "Team Workflow" : "Family Workflow"} />

      {/* Quick Actions */}
      <QuickActionsBar actions={quickActions} />

      {/* At-a-Glance KPI Header */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KPITile icon={Calendar} label="Next Event" value={nextEvent ? new Date(nextEvent.start_datetime).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"} sublabel={nextEvent ? nextEvent.title : "Nothing scheduled"} tone="blue" to={scopedCalendarUrl} />
        <KPITile icon={Wallet} label="Payment Due" value={totalDue - totalPaid > 0 ? `$${(totalDue - totalPaid).toLocaleString()}` : "Paid"} sublabel={totalDue > 0 ? `${paymentPct}% complete` : "—"} tone={totalDue - totalPaid > 0 ? "red" : "emerald"} to={createPageUrl("FamilyAccount")} />
        <KPITile icon={FileX} label="Forms Needed" value={missingDocsCount} sublabel="Outstanding documents" tone={missingDocsCount > 0 ? "amber" : "emerald"} to={createPageUrl("FamilyAccount")} />
        <KPITile icon={Star} label="Coach Feedback" value={newEvaluations.length} sublabel="New evaluations" tone="purple" to={createPageUrl("CenterOfExcellence")} />
        <KPITile icon={AlertCircle} label="Pending Actions" value={pendingActionCount} sublabel={pendingActionCount === 0 ? "All clear" : `${missingRegCount} reg · ${missingPaymentCount} pay`} tone={pendingActionCount > 0 ? "amber" : "emerald"} to={isTeamManager ? scopedCalendarUrl : createPageUrl("FamilyAccount")} />
      </div>

      {/* Payment summary bar (parent only) */}
      {!isTeamManager && totalDue > 0 && (
        <Card className="border-border-subtle shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center"><Wallet className="w-5 h-5 text-action" /></div>
                <div>
                  <p className="text-sm font-medium text-text-action">Family Payment Status</p>
                  <p className="text-xs text-text-secondary">${totalPaid} paid of ${totalDue} total</p>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-1 max-w-xs">
                <Progress value={paymentPct} className="h-2.5 flex-1" />
                <span className="text-sm font-bold text-text-action">{paymentPct}%</span>
              </div>
              <Link to={createPageUrl("FamilyAccount")}><Badge variant="outline" className="cursor-pointer hover:bg-neutral-100">Manage →</Badge></Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action items badges */}
      {pendingActionCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap p-3 rounded-xl bg-amber-50/50 border border-amber-200/50">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span className="text-xs font-semibold text-amber-800 uppercase tracking-wide">Action Items</span>
          <div className="flex items-center gap-1.5 flex-wrap ml-2">
            {missingRegCount > 0 && <Badge variant="outline" className="text-[10px] bg-red-100 text-red-700 border-red-300">{missingRegCount} missing registration</Badge>}
            {missingPaymentCount > 0 && <Badge variant="outline" className="text-[10px] bg-red-100 text-red-700 border-red-300"><Wallet className="w-2.5 h-2.5 mr-0.5" />{missingPaymentCount} missing payments</Badge>}
            {missingDocsCount > 0 && <Badge variant="outline" className="text-[10px] bg-orange-100 text-orange-700 border-orange-300"><FileX className="w-2.5 h-2.5 mr-0.5" />{missingDocsCount} missing documents</Badge>}
          </div>
        </div>
      )}

      {/* Family Calendar / Team Calendar Management */}
      <CoachScheduleCard myTeams={myTeams} canManage={canManageEvents} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Payments & Documents (parent) / Team Payments (team manager) */}
        <DashboardSection title="Payments & Documents" icon={Wallet} description={isTeamManager ? "Team-level payment status and outstanding forms" : "Registration fees, payment plans, outstanding forms"} viewAllLink={createPageUrl("FamilyAccount")}>
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-center">
                <p className="text-lg font-extrabold text-emerald-700">${totalPaid.toLocaleString()}</p>
                <p className="text-[10px] text-text-secondary">Paid</p>
              </div>
              <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-center">
                <p className="text-lg font-extrabold text-red-700">${(totalDue - totalPaid).toLocaleString()}</p>
                <p className="text-[10px] text-text-secondary">Outstanding</p>
              </div>
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-center">
                <p className="text-lg font-extrabold text-amber-700">{missingDocsCount}</p>
                <p className="text-[10px] text-text-secondary">Docs Needed</p>
              </div>
            </div>
            <Link to={createPageUrl("FamilyAccount")} className="flex items-center justify-between p-2.5 rounded-lg bg-action/5 border border-action/20 hover:bg-neutral-100 transition-all">
              <span className="text-sm font-medium text-action">View Payment History & Receipts</span>
              <ChevronRight className="w-4 h-4 text-action" />
            </Link>
          </div>
        </DashboardSection>

        {/* Player Development (parent) / Team Development (team manager) */}
        <DashboardSection title={isTeamManager ? "Team Development Overview" : "Player Development"} icon={Target} description={isTeamManager ? "Coach evaluations, team goals, attendance history" : "Coach feedback, evaluations, development goals"} viewAllLink={createPageUrl("CenterOfExcellence")}>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-neutral-50">
              <span className="text-sm text-text-secondary">Evaluations on file</span>
              <span className="text-sm font-bold text-text-action">{newEvaluations.length}</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-neutral-50">
              <span className="text-sm text-text-secondary">Players evaluated</span>
              <span className="text-sm font-bold text-text-action">{new Set(newEvaluations.map((e) => e.player_id)).size} / {myPlayers.length}</span>
            </div>
            <Link to={createPageUrl("CenterOfExcellence")} className="flex items-center justify-between p-2.5 rounded-lg bg-violet-50 border border-violet-200 hover:shadow-sm transition-all">
              <span className="text-sm font-medium text-violet-700">View Development Hub</span>
              <Target className="w-4 h-4 text-violet-600" />
            </Link>
          </div>
        </DashboardSection>

        {/* Team Communication */}
        <DashboardSection title="Team Communication" icon={Megaphone} description="Announcements, coach messages, club communications" viewAllLink={createPageUrl("CommunicationPortal")}>
          <Link to={createPageUrl("CommunicationPortal")} className="flex items-center justify-between p-3 rounded-xl bg-action/5 border border-action/20 hover:bg-neutral-100 transition-all">
            <div className="flex items-center gap-3">
              <Megaphone className="w-5 h-5 text-action" />
              <div>
                <p className="font-medium text-sm text-text-action">Communication Portal</p>
                <p className="text-xs text-text-secondary">{isTeamManager ? "Message your coaches and parents" : "Message your coaches and club staff"}</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-action" />
          </Link>
        </DashboardSection>

        {/* Tryout & Registration Info (parent) / Support Resources */}
        <DashboardSection title={isTeamManager ? "Support Resources" : "Tryout & Registration Info"} icon={isTeamManager ? HeartHandshake : Trophy} description={isTeamManager ? "Support requests, injury notes, concerns" : "Tryout schedules, registration status, placement"} viewAllLink={isTeamManager ? createPageUrl("CommunicationPortal") : createPageUrl("TryoutSignup")}>
          <div className="space-y-2">
            {!isTeamManager && upcomingTryouts.length > 0 && (
              <div className="space-y-1 max-h-28 overflow-y-auto">
                {upcomingTryouts.slice(0, 3).map((t) => (
                  <div key={t.id} className="flex items-center justify-between text-xs p-1.5 rounded bg-neutral-50">
                    <span className="text-text-action truncate">{t.title}</span>
                    <span className="text-text-secondary shrink-0">{t.tryout_date ? format(new Date(t.tryout_date), "MMM d") : "—"}</span>
                  </div>
                ))}
              </div>
            )}
            <Link to={createPageUrl("CommunicationPortal")} className="flex items-center justify-between p-2.5 rounded-lg bg-pink-50 border border-pink-200 hover:shadow-sm transition-all">
              <span className="text-sm font-medium text-pink-700">Submit Support Request</span>
              <HeartHandshake className="w-4 h-4 text-pink-600" />
            </Link>
          </div>
        </DashboardSection>
      </div>

      {/* Roster by team */}
      <DashboardSection title={isTeamManager ? "My Roster" : "My Children's Teams"} icon={Users}>
        <div className="flex items-center gap-2 flex-wrap mb-4">
          {myTeams.length > 1 && (
            <MultiSelectFilter label="Teams" options={myTeams.map((t) => ({ value: t.id, label: t.name }))} selected={rosterTeamFilter} onChange={setRosterTeamFilter} />
          )}
          <div className="relative w-48 ml-auto">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
            <Input placeholder="Search players…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-8 text-sm rounded-xl" />
          </div>
        </div>
        <div className="space-y-6">
          {visibleRosterByTeam.length === 0 || visibleRosterByTeam.every((r) => r.players.length === 0) ? (
            <p className="text-sm text-text-secondary py-8 text-center">
              {myTeams.length === 0 ? (isTeamManager ? "No teams assigned to you yet." : "No children linked to your account yet.") : "No players on the roster yet."}
            </p>
          ) : (
            visibleRosterByTeam.map(({ team, players: teamPlayers }) => (
              <div key={team.id}>
                {myTeams.length > 1 && (
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border-subtle">
                    <Trophy className="w-3.5 h-3.5 text-action" />
                    <span className="text-sm font-semibold text-text-action">{team.name}</span>
                    <Badge variant="outline" className="text-[10px]">{team.age_group || "—"}</Badge>
                    <span className="text-xs text-text-secondary">{teamPlayers.length} players</span>
                  </div>
                )}
                <div className="space-y-2">
                  {teamPlayers.map((p) => {
                    const guardian = guardians.find((g) => g.id === p.guardian_id);
                    const reg = registrations.find((r) => r.player_id === p.id);
                    const pct = reg && reg.amount_due > 0 ? Math.round(((reg.amount_paid || 0) / reg.amount_due) * 100) : 0;
                    return (
                      <div key={p.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-neutral-100 transition-colors border border-border-subtle">
                        <Avatar className="w-9 h-9 shrink-0">
                          <AvatarFallback className="bg-neutral-100 text-action text-xs">{p.first_name?.[0]}{p.last_name?.[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div>
                              <p className="font-medium text-sm text-text-action truncate">{p.first_name} {p.last_name}</p>
                              <p className="text-xs text-text-secondary">{p.position || "No position"}{p.jersey_number ? ` · #${p.jersey_number}` : ""}</p>
                            </div>
                            <PlayerStatusBadges player={p} registrations={registrations} />
                          </div>
                          {reg && reg.amount_due > 0 && (
                            <div>
                              <div className="flex justify-between text-[10px] mb-0.5">
                                <span className="text-text-secondary">Payment</span>
                                <span className="font-medium">{pct}% · ${reg.amount_paid || 0}/${reg.amount_due}</span>
                              </div>
                              <Progress value={pct} className="h-1.5" />
                            </div>
                          )}
                          {guardian && (
                            <div className="flex items-center gap-3 text-xs text-text-secondary flex-wrap">
                              <span className="text-text-action font-medium">{guardian.first_name} {guardian.last_name}</span>
                              {guardian.email && <a href={`mailto:${guardian.email}`} onClick={(e) => e.preventDefault()} className="flex items-center gap-1 hover:text-action"><Mail className="w-3 h-3" />{guardian.email}</a>}
                              {guardian.phone && <a href={`tel:${guardian.phone}`} onClick={(e) => e.preventDefault()} className="flex items-center gap-1 hover:text-action"><Phone className="w-3 h-3" />{guardian.phone}</a>}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </DashboardSection>

      {/* Upcoming game attendance */}
      <UpcomingGameAttendanceCard events={events} myTeams={myTeams} myPlayers={myPlayers} />

      {/* Drill-Down Views */}
      <DrillDownLinks items={drillDowns} />
    </div>
  );
}