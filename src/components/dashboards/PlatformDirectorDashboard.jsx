import React, { useMemo } from "react";
import { Link } from '@/lib/router-compat';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import DashboardHeader from "./shared/DashboardHeader";
import DashboardSection from "./shared/DashboardSection";
import QuickActionsBar from "./shared/QuickActionsBar";
import DrillDownLinks from "./shared/DrillDownLinks";
import PriorityActions from "./shared/PriorityActions";
import ActionTimeline from "./shared/ActionTimeline";
import useDashboardData from "./shared/useDashboardData";
import { PLATFORM_DIRECTOR_WORKFLOW } from "./shared/roleWorkflows";
import PlatformAttendanceStats from "@/components/platform/PlatformAttendanceStats";
import { createPageUrl } from "@/utils";
import { format, parseISO, isAfter, startOfDay, isSameDay } from "date-fns";
import {
  Trophy, Users, Calendar, Shield, Activity, Target, AlertCircle,
  CheckCircle2, Clock, Mail, ChevronRight, UserPlus, Star, Megaphone,
  TrendingUp, HeartHandshake,
} from "lucide-react";

function KPITile({ icon: Icon, label, value, sublabel, tone = "emerald", to }) {
  const toneMap = {
    emerald: "text-emerald-600 bg-emerald-50", red: "text-red-600 bg-red-50",
    amber: "text-amber-600 bg-amber-50", blue: "text-blue-600 bg-blue-50",
    purple: "text-purple-600 bg-purple-50", slate: "text-slate-600 bg-slate-50",
    fuchsia: "text-fuchsia-600 bg-fuchsia-50",
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

export default function PlatformDirectorDashboard({ user }) {
  const {
    platforms, teams, players, coaches, events, evaluations,
    registrations, platformAccess,
  } = useDashboardData();

  // Resolve the director's platform
  const myPlatform = useMemo(() => {
    if (user?.platform_id) return platforms.find((p) => p.id === user.platform_id);
    const access = platformAccess?.find((a) => a.user_id === user?.id || a.user_email?.toLowerCase() === user?.email?.toLowerCase());
    return access ? platforms.find((p) => p.id === access.platform_id) : platforms[0];
  }, [user, platforms, platformAccess]);

  const myPlatformId = myPlatform?.id;
  const myTeams = useMemo(() => (myPlatformId ? teams.filter((t) => t.platform_id === myPlatformId) : []), [teams, myPlatformId]);
  const myTeamIds = useMemo(() => new Set(myTeams.map((t) => t.id)), [myTeams]);
  const myPlayers = useMemo(() => players.filter((p) => myTeamIds.has(p.team_id)), [players, myTeamIds]);
  const myCoachIds = useMemo(
    () => new Set(myTeams.flatMap((t) => (t.coach_ids?.length ? t.coach_ids : [t.coach_id]).filter(Boolean))),
    [myTeams]
  );
  const myCoaches = useMemo(() => coaches.filter((c) => myCoachIds.has(c.id)), [coaches, myCoachIds]);

  // KPI stats
  const rosterCompleteness = useMemo(() => {
    if (myTeams.length === 0) return 0;
    const full = myTeams.filter((t) => (t.player_ids?.length || 0) >= (t.max_roster_size || 18)).length;
    return Math.round((full / myTeams.length) * 100);
  }, [myTeams]);

  const attendanceRate = useMemo(() => {
    const pastEvents = events.filter((e) => e.start_datetime && new Date(e.start_datetime) < new Date() && (e.team_ids || []).some((id) => myTeamIds.has(id)));
    let attending = 0, total = 0;
    pastEvents.forEach((e) => {
      Object.values(e.rsvps || {}).forEach((v) => { total++; if (v === "attending") attending++; });
    });
    return total > 0 ? Math.round((attending / total) * 100) : null;
  }, [events, myTeamIds]);

  const evalCompletion = useMemo(() => {
    if (myPlayers.length === 0) return 0;
    const evaluated = new Set(evaluations.filter((e) => myTeamIds.has(players.find((p) => p.id === e.player_id)?.team_id)).map((e) => e.player_id));
    return Math.round((evaluated.size / myPlayers.length) * 100);
  }, [evaluations, myPlayers, myTeamIds, players]);

  const activePlayers = myPlayers.filter((p) => p.status === "active").length;
  const retentionRate = myPlayers.length > 0 ? Math.round((activePlayers / myPlayers.length) * 100) : 0;
  const playersWithGoals = new Set(evaluations.filter((e) => e.training_focus && myPlayers.some((p) => p.id === e.player_id)).map((e) => e.player_id)).size;

  const today = startOfDay(new Date());
  const upcomingEvents = useMemo(
    () => events
      .filter((e) => e.start_datetime && (isAfter(parseISO(e.start_datetime), today) || isSameDay(parseISO(e.start_datetime), today)))
      .filter((e) => (e.team_ids || []).some((id) => myTeamIds.has(id)))
      .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime))
      .slice(0, 6),
    [events, myTeamIds, today]
  );

  const myPlatformEvents = useMemo(
    () => events.filter((e) => (e.team_ids || []).some((id) => myTeamIds.has(id))),
    [events, myTeamIds]
  );

  // No-show rate
  const noShowRate = useMemo(() => {
    const pastEvents = myPlatformEvents.filter((e) => e.start_datetime && new Date(e.start_datetime) < new Date());
    let notAttending = 0, total = 0;
    pastEvents.forEach((e) => {
      Object.values(e.rsvps || {}).forEach((v) => { total++; if (v === "not_attending") notAttending++; });
    });
    return total > 0 ? Math.round((notAttending / total) * 100) : 0;
  }, [myPlatformEvents]);

  const unassignedPlayers = myPlayers.filter((p) => !p.team_id);

  const timelineSteps = PLATFORM_DIRECTOR_WORKFLOW.timelineSteps({ rosterCompleteness, attendanceRate, evalCompletion, retentionRate, upcomingEvents });
  const priorityActions = PLATFORM_DIRECTOR_WORKFLOW.priorityActions({ rosterCompleteness, evalCompletion, retentionRate, unassignedPlayers });

  const quickActions = [
    { label: "Assign Coaches", desc: "To platform teams", icon: UserPlus, to: createPageUrl("ClubStaff"), cardColor: "bg-cyan-50 border-cyan-200 text-cyan-700", iconBg: "bg-cyan-500", iconColor: "text-white" },
    { label: "Review Evaluations", desc: "Approve player evals", icon: CheckCircle2, to: createPageUrl("CenterOfExcellence"), cardColor: "bg-emerald-50 border-emerald-200 text-emerald-700", iconBg: "bg-emerald-500", iconColor: "text-white" },
    { label: "Flag Retention Risk", desc: "At-risk players", icon: AlertCircle, to: `${createPageUrl("Registration")}?tab=players`, cardColor: "bg-amber-50 border-amber-200 text-amber-700", iconBg: "bg-amber-500", iconColor: "text-white" },
    { label: "Development Goals", desc: "Create player goals", icon: Target, to: createPageUrl("CenterOfExcellence"), cardColor: "bg-violet-50 border-violet-200 text-violet-700", iconBg: "bg-violet-500", iconColor: "text-white" },
    { label: "Adjust Schedules", desc: "Platform events", icon: Calendar, to: createPageUrl("TeamCalendar"), cardColor: "bg-blue-50 border-blue-200 text-blue-700", iconBg: "bg-blue-500", iconColor: "text-white" },
    { label: "Message Platform", desc: "Coaches & parents", icon: Megaphone, to: createPageUrl("CommunicationPortal"), cardColor: "bg-rose-50 border-rose-200 text-rose-700", iconBg: "bg-rose-500", iconColor: "text-white" },
  ];

  const drillDowns = [
    { label: "Team Detail", description: "Roster, attendance, evaluations, goals", to: createPageUrl("PlatformDashboard") },
    { label: "Coach Detail", description: "Assignments, evaluations, feedback", to: createPageUrl("ClubStaff") },
    { label: "Player Detail", description: "Development history, attendance, support", to: `${createPageUrl("Registration")}?tab=players` },
    { label: "Program Detail", description: "Teams, schedules, progress", to: createPageUrl("ProgramsList") },
  ];

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-[1400px] mx-auto bg-surface-page min-h-screen">
      <DashboardHeader
        roleLabel="Platform Director Dashboard"
        userName={user?.full_name}
        subtitle={`${myPlatform?.name || "Platform"} — teams, rosters, attendance, coaching, and player progress.`}
        primaryQuestion="How are the platform's teams, rosters, attendance, coaching staff, and player progress performing?"
        accent="#d946ef"
      />

      {/* Priority Actions — the hero widget */}
      <PriorityActions actions={priorityActions} />

      {/* Workflow Timeline */}
      <ActionTimeline steps={timelineSteps} title="Platform Workflow" />

      {/* Quick Actions */}
      <QuickActionsBar actions={quickActions} />

      {/* At-a-Glance KPI Header */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        <KPITile icon={Trophy} label="Active Teams" value={myTeams.length} sublabel="Across all branches" tone="fuchsia" to={createPageUrl("PlatformDashboard")} />
        <KPITile icon={Shield} label="Roster Completeness" value={`${rosterCompleteness}%`} sublabel="Teams at full roster" tone="emerald" to={createPageUrl("PlatformDashboard")} />
        <KPITile icon={Activity} label="Attendance Rate" value={attendanceRate === null ? "—" : `${attendanceRate}%`} sublabel={`${noShowRate}% no-show`} tone={attendanceRate !== null && attendanceRate >= 80 ? "emerald" : "amber"} to={createPageUrl("TeamCalendar")} />
        <KPITile icon={CheckCircle2} label="Eval Completion" value={`${evalCompletion}%`} sublabel="Submitted" tone="blue" to={createPageUrl("CenterOfExcellence")} />
        <KPITile icon={HeartHandshake} label="Player Retention" value={`${retentionRate}%`} sublabel={`${activePlayers}/${myPlayers.length} active`} tone="purple" to={`${createPageUrl("Registration")}?tab=players`} />
        <KPITile icon={Target} label="Active Goals" value={playersWithGoals} sublabel="Players with goals" tone="amber" to={createPageUrl("CenterOfExcellence")} />
        <KPITile icon={Calendar} label="Schedule Adherence" value={upcomingEvents.length} sublabel="Upcoming events" tone="slate" to={createPageUrl("TeamCalendar")} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Teams & Rosters */}
        <DashboardSection title="Teams & Rosters" icon={Trophy} description="All teams with roster status, coach, team manager" viewAllLink={createPageUrl("PlatformDashboard")}>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {myTeams.length === 0 ? (
              <p className="text-sm text-text-secondary text-center py-4">No teams in your platform yet.</p>
            ) : (
              myTeams.map((t) => (
                <Link key={t.id} to={`${createPageUrl("TeamDetail")}?id=${t.id}`} className="flex items-center justify-between p-2 rounded-lg bg-neutral-50 hover:bg-neutral-100 transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{t.name}</p>
                    <p className="text-xs text-text-secondary">{t.age_group || "—"} · {t.gender} · {t.season || "—"}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-text-primary">{t.player_ids?.length || 0}/{t.max_roster_size || 18}</p>
                    <p className="text-[10px] text-text-secondary">roster</p>
                  </div>
                </Link>
              ))
            )}
            {unassignedPlayers.length > 0 && (
              <div className="flex items-center justify-between p-2 rounded-lg bg-amber-50 border border-amber-200">
                <span className="text-xs font-medium text-amber-700">Unassigned Players</span>
                <span className="text-sm font-bold text-amber-700">{unassignedPlayers.length}</span>
              </div>
            )}
          </div>
        </DashboardSection>

        {/* Attendance & Schedules */}
        <DashboardSection title="Attendance & Schedules" icon={Calendar} description="Trends, upcoming events, RSVP status" viewAllLink={createPageUrl("TeamCalendar")}>
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-center">
                <p className="text-lg font-extrabold text-emerald-700">{attendanceRate ?? "—"}{attendanceRate != null ? "%" : ""}</p>
                <p className="text-[10px] text-text-secondary">Attending</p>
              </div>
              <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-center">
                <p className="text-lg font-extrabold text-red-700">{noShowRate}%</p>
                <p className="text-[10px] text-text-secondary">No-Show</p>
              </div>
              <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-center">
                <p className="text-lg font-extrabold text-blue-700">{upcomingEvents.length}</p>
                <p className="text-[10px] text-text-secondary">Upcoming</p>
              </div>
            </div>
            <div className="space-y-1 max-h-28 overflow-y-auto">
              {upcomingEvents.slice(0, 4).map((e) => (
                <div key={e.id} className="flex items-center gap-2 text-xs p-1.5 rounded bg-neutral-50">
                  <Badge variant="outline" className="text-[10px] capitalize shrink-0">{e.event_type}</Badge>
                  <span className="text-text-primary truncate flex-1">{e.title}</span>
                  <span className="text-text-secondary shrink-0">{format(parseISO(e.start_datetime), "MMM d")}</span>
                </div>
              ))}
              {upcomingEvents.length === 0 && <p className="text-xs text-text-secondary text-center py-2">No upcoming events</p>}
            </div>
          </div>
        </DashboardSection>

        {/* Coaching Staff */}
        <DashboardSection title="Coaching Staff" icon={Users} description="Assignments, workload, evaluation submission" viewAllLink={createPageUrl("ClubStaff")}>
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-lg bg-cyan-50 border border-cyan-200 text-center">
                <p className="text-lg font-extrabold text-cyan-700">{myCoaches.length}</p>
                <p className="text-[10px] text-text-secondary">Coaches</p>
              </div>
              <div className="p-2.5 rounded-lg bg-purple-50 border border-purple-200 text-center">
                <p className="text-lg font-extrabold text-purple-700">{evalCompletion}%</p>
                <p className="text-[10px] text-text-secondary">Eval Submission</p>
              </div>
            </div>
            <div className="space-y-1 max-h-28 overflow-y-auto">
              {myCoaches.slice(0, 5).map((c) => {
                const coachTeams = myTeams.filter((t) => (t.coach_ids?.length ? t.coach_ids : [t.coach_id]).includes(c.id));
                return (
                  <div key={c.id} className="flex items-center justify-between text-xs p-1.5 rounded bg-neutral-50">
                    <span className="text-text-primary font-medium truncate">{c.first_name} {c.last_name}</span>
                    <Badge variant="outline" className="text-[10px]">{coachTeams.length} team{coachTeams.length !== 1 ? "s" : ""}</Badge>
                  </div>
                );
              })}
              {myCoaches.length === 0 && <p className="text-xs text-text-secondary text-center py-2">No coaches assigned yet</p>}
            </div>
          </div>
        </DashboardSection>

        {/* Player Progress & Retention */}
        <DashboardSection title="Player Progress & Retention" icon={Target} description="Evaluations, goals, retention risk" viewAllLink={createPageUrl("CenterOfExcellence")}>
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-center">
                <p className="text-lg font-extrabold text-emerald-700">{evalCompletion}%</p>
                <p className="text-[10px] text-text-secondary">Eval Done</p>
              </div>
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-center">
                <p className="text-lg font-extrabold text-amber-700">{playersWithGoals}</p>
                <p className="text-[10px] text-text-secondary">Active Goals</p>
              </div>
              <div className="p-2.5 rounded-lg bg-purple-50 border border-purple-200 text-center">
                <p className="text-lg font-extrabold text-purple-700">{retentionRate}%</p>
                <p className="text-[10px] text-text-secondary">Retention</p>
              </div>
            </div>
            <Link to={createPageUrl("CenterOfExcellence")} className="flex items-center justify-between p-2.5 rounded-lg bg-fuchsia-50 border border-fuchsia-200 hover:shadow-sm transition-all">
              <span className="text-sm font-medium text-fuchsia-700">View Center of Excellence</span>
              <ChevronRight className="w-4 h-4 text-fuchsia-600" />
            </Link>
          </div>
        </DashboardSection>
      </div>

      {/* Attendance Analytics */}
      <PlatformAttendanceStats
        platformName={myPlatform?.name || "Platform"}
        teams={myTeams}
        players={myPlayers}
        events={myPlatformEvents}
      />

      {/* Drill-Down Views */}
      <DrillDownLinks items={drillDowns} />
    </div>
  );
}