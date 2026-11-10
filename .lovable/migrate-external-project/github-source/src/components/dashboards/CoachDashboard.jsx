import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import DashboardHeader from "./shared/DashboardHeader";
import DashboardSection from "./shared/DashboardSection";
import QuickActionsBar from "./shared/QuickActionsBar";
import DrillDownLinks from "./shared/DrillDownLinks";
import PriorityActions from "./shared/PriorityActions";
import ActionTimeline from "./shared/ActionTimeline";
import CoachScheduleCard from "./CoachScheduleCard";
import UpcomingGameAttendanceCard from "./UpcomingGameAttendanceCard";
import MultiSelectFilter from "@/components/calendar/MultiSelectFilter";
import { getManageableTeams } from "@/lib/calendarPermissions";
import { ROLES } from "@/lib/rbac";
import { COACH_WORKFLOW } from "./shared/roleWorkflows";
import { createPageUrl } from "@/utils";
import {
  Users, Calendar, Trophy, Star, Search, ChevronRight, Mail, Phone,
  ClipboardCheck, Megaphone, Target, Activity, Plus, Receipt,
} from "lucide-react";

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
        <p className="text-xl font-extrabold text-text-action">{value}</p>
        {sublabel && <p className="text-[10px] text-text-secondary mt-0.5">{sublabel}</p>}
      </CardContent>
    </Card>
  );
  return to ? <Link to={to}>{content}</Link> : content;
}

export default function CoachDashboard({ user }) {
  const [search, setSearch] = useState("");
  const [rosterTeamFilter, setRosterTeamFilter] = useState([]);

  const { data: coaches = [] } = useQuery({
    queryKey: ["coach-dash-coaches"],
    queryFn: () => base44.entities.Coach.list("-created_date", 100),
  });
  const myCoach = coaches.find((c) => c.email?.toLowerCase() === user?.email?.toLowerCase());

  const { data: teams = [] } = useQuery({
    queryKey: ["coach-dash-teams"],
    queryFn: () => base44.entities.Team.list("-created_date", 200),
  });
  const myTeams = user ? getManageableTeams(user, teams, coaches) : [];
  const isTeamManager = user?.custom_role === ROLES.TEAM_MANAGER;

  const { data: players = [] } = useQuery({
    queryKey: ["coach-dash-players"],
    queryFn: () => base44.entities.Player.list("-created_date", 300),
  });
  const { data: guardians = [] } = useQuery({
    queryKey: ["coach-dash-guardians"],
    queryFn: () => base44.entities.Guardian.list("-created_date", 300),
  });
  const { data: events = [] } = useQuery({
    queryKey: ["coach-dash-events"],
    queryFn: () => base44.entities.CalendarEvent.list("start_datetime", 400),
  });
  const { data: evaluations = [] } = useQuery({
    queryKey: ["coach-dash-evals"],
    queryFn: () => base44.entities.PlayerEvaluation.list("-created_date", 200).catch(() => []),
  });

  // Roster per team
  const rosterByTeam = myTeams.map((team) => {
    const teamPlayers = (team.player_ids || [])
      .map((pid) => players.find((p) => p.id === pid))
      .filter(Boolean)
      .filter((p) => `${p.first_name} ${p.last_name}`.toLowerCase().includes(search.toLowerCase()));
    return { team, players: teamPlayers };
  });
  const visibleRosterByTeam = rosterTeamFilter.length > 0
    ? rosterByTeam.filter((r) => rosterTeamFilter.includes(r.team.id))
    : rosterByTeam;

  const totalRoster = rosterByTeam.reduce((s, r) => s + r.players.length, 0);

  // Next event
  const today = new Date();
  const myTeamIds = new Set(myTeams.map((t) => t.id));
  const nextEvent = events
    .filter((e) => e.start_datetime && new Date(e.start_datetime) >= today && (e.team_ids || []).some((id) => myTeamIds.has(id)))
    .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime))[0];

  // Evaluations
  const myPlayerIds = new Set(myTeams.flatMap((t) => t.player_ids || []));
  const myEvaluations = evaluations.filter((e) => myPlayerIds.has(e.player_id));
  const evalsCompleted = myEvaluations.filter((e) => e.status === "completed").length;
  const evalsPending = myPlayerIds.size - evalsCompleted;

  const timelineSteps = COACH_WORKFLOW.timelineSteps({ myTeams, nextEvent, evalsPending, totalRoster });
  const priorityActions = COACH_WORKFLOW.priorityActions({ nextEvent, evalsPending });

  const quickActions = [
    { label: "Create Event", desc: "Practice, game, meeting", icon: Plus, to: createPageUrl("TeamCalendar"), cardColor: "bg-blue-50 border-blue-200 text-blue-700", iconBg: "bg-blue-500", iconColor: "text-white" },
    { label: "Log Evaluation", desc: "Score a player", icon: ClipboardCheck, to: createPageUrl("CenterOfExcellence"), cardColor: "bg-emerald-50 border-emerald-200 text-emerald-700", iconBg: "bg-emerald-500", iconColor: "text-white" },
    { label: "Send Message", desc: "To team or parents", icon: Megaphone, to: createPageUrl("CommunicationPortal"), cardColor: "bg-amber-50 border-amber-200 text-amber-700", iconBg: "bg-amber-500", iconColor: "text-white" },
    { label: "Skill Tests", desc: "Log test scores", icon: Target, to: createPageUrl("SkillTests"), cardColor: "bg-violet-50 border-violet-200 text-violet-700", iconBg: "bg-violet-500", iconColor: "text-white" },
    { label: "Test Day", desc: "Manage test sessions", icon: Activity, to: createPageUrl("TestDayManager"), cardColor: "bg-rose-50 border-rose-200 text-rose-700", iconBg: "bg-rose-500", iconColor: "text-white" },
    { label: "Tryout Planner", desc: "Plan tryouts & tasks", icon: Trophy, to: createPageUrl("TryoutDashboard"), cardColor: "bg-cyan-50 border-cyan-200 text-cyan-700", iconBg: "bg-cyan-500", iconColor: "text-white" },
    { label: "My Expenses", desc: "Submit travel & costs", icon: Receipt, to: createPageUrl("StaffExpenses"), cardColor: "bg-teal-50 border-teal-200 text-teal-700", iconBg: "bg-teal-500", iconColor: "text-white" },
  ];

  const drillDowns = [
    { label: "Team Detail", description: "Roster, schedule, payments", to: `${createPageUrl("TeamDetail")}?id=${myTeams[0]?.id || ""}` },
    { label: "Player Detail", description: "Development, attendance, evaluations", to: `${createPageUrl("Registration")}?tab=players` },
    { label: "Event Detail", description: "Location, attendance, conflicts", to: createPageUrl("TeamCalendar") },
    { label: "Center of Excellence", description: "Player development hub", to: createPageUrl("CenterOfExcellence") },
  ];

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-[1400px] mx-auto bg-surface-page min-h-screen">
      <DashboardHeader
        roleLabel={isTeamManager ? "Team Manager Dashboard" : "Coach Dashboard"}
        userName={user?.full_name}
        subtitle="Your teams, roster, schedule, and player development — focused and clutter-free."
        primaryQuestion={isTeamManager ? "What does my team need this week, and what do I need to organize?" : "How are my teams and players performing, and what needs my attention?"}
      />

      {/* Priority Actions — the hero widget */}
      <PriorityActions actions={priorityActions} />

      {/* Workflow Timeline */}
      <ActionTimeline steps={timelineSteps} title="Coaching Workflow" />

      {/* Quick Actions */}
      <QuickActionsBar actions={quickActions} />

      {/* At-a-Glance KPI Header */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPITile icon={Trophy} label="My Teams" value={myTeams.length} sublabel="Assigned" tone="emerald" to={`${createPageUrl("TeamCalendar")}?teams=${myTeams.map(t => t.id).join(",")}`} />
        <KPITile icon={Users} label="Roster Size" value={totalRoster} sublabel="Total players" tone="blue" to={`${createPageUrl("TeamCalendar")}?teams=${myTeams.map(t => t.id).join(",")}`} />
        <KPITile icon={Calendar} label="Next Event" value={nextEvent ? new Date(nextEvent.start_datetime).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"} sublabel={nextEvent ? nextEvent.title : "Nothing scheduled"} tone="amber" to={`${createPageUrl("TeamCalendar")}?teams=${myTeams.map(t => t.id).join(",")}`} />
        <KPITile icon={Star} label="Evaluations" value={evalsCompleted} sublabel={`${evalsPending} pending`} tone="purple" to={createPageUrl("CenterOfExcellence")} />
      </div>

      {/* Schedule + Teams */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <CoachScheduleCard myTeams={myTeams} canManage />
        </div>
        <DashboardSection title="My Teams" icon={Trophy}>
          <div className="space-y-2">
            {myTeams.length === 0 ? (
              <p className="text-sm text-text-secondary py-4 text-center">No teams assigned.</p>
            ) : (
              myTeams.map((t) => (
                <Link key={t.id} to={`${createPageUrl("TeamDetail")}?id=${t.id}`} className="block p-3 rounded-xl bg-neutral-50 border border-border-subtle hover:border-action/40 hover:bg-action/5 transition-all group">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-text-action truncate">{t.name}</p>
                      <p className="text-xs text-text-secondary">{t.age_group || "—"} · {t.gender} · {t.season || "—"}</p>
                      <p className="text-xs text-text-secondary mt-0.5">{t.player_ids?.length || 0} / {t.max_roster_size || 18} players</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-text-secondary group-hover:text-action shrink-0" />
                  </div>
                </Link>
              ))
            )}
          </div>
        </DashboardSection>
      </div>

      {/* Upcoming Game Attendance */}
      <UpcomingGameAttendanceCard events={events} myTeams={myTeams} myPlayers={players} />

      {/* Roster by team */}
      <DashboardSection title={`My Roster${myTeams.length > 1 ? " by Team" : ""}`} icon={Users}>
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
              {myTeams.length === 0 ? "No teams assigned yet." : "No players on your roster yet."}
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
                    const hasEval = myEvaluations.some((e) => e.player_id === p.id);
                    return (
                      <Link key={p.id} to={`${createPageUrl("PlayerDetail")}?id=${p.id}`} className="flex items-start gap-3 p-3 rounded-xl hover:bg-neutral-100 transition-colors border border-border-subtle">
                        <Avatar className="w-9 h-9 shrink-0">
                          <AvatarFallback className="bg-neutral-100 text-action text-xs">{p.first_name?.[0]}{p.last_name?.[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div>
                              <p className="font-medium text-sm text-text-action truncate">{p.first_name} {p.last_name}</p>
                              <p className="text-xs text-text-secondary">{p.position || "No position"}{p.jersey_number ? ` · #${p.jersey_number}` : ""}</p>
                            </div>
                            {hasEval && <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200"><Star className="w-2.5 h-2.5 mr-0.5" />Evaluated</Badge>}
                          </div>
                          {guardian && (
                            <div className="flex items-center gap-3 mt-1.5 text-xs text-text-secondary flex-wrap">
                              <span className="text-text-action font-medium">{guardian.first_name} {guardian.last_name}</span>
                              {guardian.email && <a href={`mailto:${guardian.email}`} onClick={(e) => e.preventDefault()} className="flex items-center gap-1 hover:text-action"><Mail className="w-3 h-3" />{guardian.email}</a>}
                              {guardian.phone && <a href={`tel:${guardian.phone}`} onClick={(e) => e.preventDefault()} className="flex items-center gap-1 hover:text-action"><Phone className="w-3 h-3" />{guardian.phone}</a>}
                            </div>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </DashboardSection>

      {/* Drill-Down Views */}
      <DrillDownLinks items={drillDowns} />
    </div>
  );
}