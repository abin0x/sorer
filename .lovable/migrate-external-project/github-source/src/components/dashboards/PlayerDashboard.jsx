import React, { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import DashboardHeader from "./shared/DashboardHeader";
import DashboardSection from "./shared/DashboardSection";
import QuickActionsBar from "./shared/QuickActionsBar";
import DrillDownLinks from "./shared/DrillDownLinks";
import PriorityActions from "./shared/PriorityActions";
import ActionTimeline from "./shared/ActionTimeline";
import { PLAYER_WORKFLOW } from "./shared/roleWorkflows";
import { createPageUrl } from "@/utils";
import { format, parseISO, isAfter, startOfDay, isSameDay } from "date-fns";
import {
  Calendar, Star, Target, Mail, Users, Trophy, Clock, MapPin,
  CheckCircle2, ChevronRight, Megaphone, HeartHandshake, Activity,
  Zap, Video, ClipboardCheck, Bell,
} from "lucide-react";

function KPITile({ icon: Icon, label, value, sublabel, tone = "emerald", to }) {
  const toneMap = {
    emerald: "text-emerald-600 bg-emerald-50", red: "text-red-600 bg-red-50",
    amber: "text-amber-600 bg-amber-50", blue: "text-blue-600 bg-blue-50",
    purple: "text-purple-600 bg-purple-50", slate: "text-slate-600 bg-slate-50",
    teal: "text-teal-600 bg-teal-50",
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

export default function PlayerDashboard({ user }) {
  const [playerId, setPlayerId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      if (user?.player_id) { setPlayerId(user.player_id); return; }
      try {
        const players = await base44.entities.Player.list("-created_date", 500);
        const me = players.find((p) => `${p.first_name} ${p.last_name}`.toLowerCase() === user?.full_name?.toLowerCase());
        if (me) setPlayerId(me.id);
        else setError("No player profile linked to your account.");
      } catch { setError("Could not load your player profile."); }
    })();
  }, [user]);

  const { data: player } = useQuery({
    queryKey: ["player-dash-player", playerId],
    queryFn: () => base44.entities.Player.get(playerId),
    enabled: !!playerId,
  });

  const { data: teams = [] } = useQuery({ queryKey: ["player-dash-teams"], queryFn: () => base44.entities.Team.list("-created_date", 200) });
  const { data: players = [] } = useQuery({ queryKey: ["player-dash-players"], queryFn: () => base44.entities.Player.list("-created_date", 300) });
  const { data: events = [] } = useQuery({ queryKey: ["player-dash-events"], queryFn: () => base44.entities.CalendarEvent.list("start_datetime", 400) });
  const { data: evaluations = [] } = useQuery({ queryKey: ["player-dash-evals"], queryFn: () => base44.entities.PlayerEvaluation.filter({ player_id: playerId }, "-evaluation_date", 50).catch(() => []) , enabled: !!playerId });
  const { data: skillScores = [] } = useQuery({ queryKey: ["player-dash-skill"], queryFn: () => base44.entities.SkillTestScore.filter({ player_id: playerId }, "-test_date", 50).catch(() => []), enabled: !!playerId });
  const { data: physicalAssessments = [] } = useQuery({ queryKey: ["player-dash-physical"], queryFn: () => base44.entities.PhysicalAssessment.filter({ player_id: playerId }, "-assessment_date", 50).catch(() => []), enabled: !!playerId });

  const myTeam = useMemo(() => teams.find((t) => t.id === player?.team_id), [teams, player]);
  const myTeamIds = useMemo(() => new Set(myTeam ? [myTeam.id] : []), [myTeam]);

  // Next event
  const today = startOfDay(new Date());
  const upcomingEvents = useMemo(() =>
    events
      .filter((e) => e.start_datetime && (isAfter(parseISO(e.start_datetime), today) || isSameDay(parseISO(e.start_datetime), today)))
      .filter((e) => (e.team_ids || []).some((id) => myTeamIds.has(id)))
      .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime)),
    [events, myTeamIds, today]
  );
  const nextEvent = upcomingEvents[0];

  // Attendance
  const myRsvpStatus = nextEvent?.rsvps?.[playerId];
  const pastEvents = useMemo(() =>
    events.filter((e) => e.start_datetime && new Date(e.start_datetime) < new Date() && (e.team_ids || []).some((id) => myTeamIds.has(id))),
    [events, myTeamIds]
  );
  const myAttendanceRate = useMemo(() => {
    let attending = 0, total = 0;
    pastEvents.forEach((e) => {
      const status = e.rsvps?.[playerId];
      if (status) { total++; if (status === "attending") attending++; }
    });
    return total > 0 ? Math.round((attending / total) * 100) : null;
  }, [pastEvents, playerId]);

  // Development
  const evalsCompleted = evaluations.filter((e) => e.status === "completed").length;
  const activeGoals = evaluations.filter((e) => e.training_focus).length;
  const latestEval = evaluations[0];

  const timelineSteps = PLAYER_WORKFLOW.timelineSteps({ nextEvent, myAttendanceRate, evalsCompleted, activeGoals });
  const priorityActions = PLAYER_WORKFLOW.priorityActions({ nextEvent, myAttendanceRate, evalsCompleted });

  // Team roster
  const teammates = useMemo(() => {
    if (!myTeam) return [];
    return (myTeam.player_ids || [])
      .map((pid) => players.find((p) => p.id === pid))
      .filter(Boolean)
      .filter((p) => p.id !== playerId);
  }, [myTeam, players, playerId]);

  if (error) {
    return (
      <div className="p-8 max-w-md mx-auto text-center py-24">
        <p className="text-sm text-text-secondary mb-4">{error}</p>
        <Link to={createPageUrl("Features")}>
          <Badge variant="outline" className="cursor-pointer">Explore Features →</Badge>
        </Link>
      </div>
    );
  }

  if (!playerId) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-action" />
      </div>
    );
  }

  const quickActions = [
    { label: "RSVP to Events", desc: "Confirm attendance", icon: CheckCircle2, to: `${createPageUrl("TeamCalendar")}?teams=${myTeam?.id || ""}`, cardColor: "bg-emerald-50 border-emerald-200 text-emerald-700", iconBg: "bg-emerald-500", iconColor: "text-white" },
    { label: "My Development", desc: "View evaluations", icon: Star, to: `${createPageUrl("PlayerDetail")}?id=${playerId}`, cardColor: "bg-violet-50 border-violet-200 text-violet-700", iconBg: "bg-violet-500", iconColor: "text-white" },
    { label: "Message Coach", desc: "Contact your coach", icon: Mail, to: createPageUrl("CommunicationPortal"), cardColor: "bg-amber-50 border-amber-200 text-amber-700", iconBg: "bg-amber-500", iconColor: "text-white" },
    { label: "E.P.I.C. Tenets", desc: "Development framework", icon: Zap, to: createPageUrl("EpicTenet"), cardColor: "bg-blue-50 border-blue-200 text-blue-700", iconBg: "bg-blue-500", iconColor: "text-white" },
    { label: "Video Library", desc: "Training videos", icon: Video, to: createPageUrl("VideoLibrary"), cardColor: "bg-rose-50 border-rose-200 text-rose-700", iconBg: "bg-rose-500", iconColor: "text-white" },
    { label: "Support Request", desc: "Get help", icon: HeartHandshake, to: createPageUrl("CommunicationPortal"), cardColor: "bg-pink-50 border-pink-200 text-pink-700", iconBg: "bg-pink-500", iconColor: "text-white" },
  ];

  const drillDowns = [
    { label: "My Full Profile", description: "Development, attendance, payments", to: `${createPageUrl("PlayerDetail")}?id=${playerId}` },
    { label: "Event Detail", description: "Location, attendance, team", to: `${createPageUrl("TeamCalendar")}?teams=${myTeam?.id || ""}` },
    { label: "Evaluation Detail", description: "Feedback, goals, training", to: `${createPageUrl("PlayerDetail")}?id=${playerId}` },
    { label: "Team Detail", description: "Roster, schedule, communication", to: `${createPageUrl("TeamDetail")}?id=${myTeam?.id || ""}` },
  ];

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-[1400px] mx-auto bg-surface-page min-h-screen">
      <DashboardHeader
        roleLabel="Player Dashboard"
        userName={user?.full_name}
        subtitle={`${myTeam?.name || "Unassigned"} · ${myTeam?.age_group || ""} · ${player?.position || "No position"}`}
        primaryQuestion="What do I need to know about my soccer life right now?"
        accent="#0d9488"
      />

      {/* Priority Actions — the hero widget */}
      <PriorityActions actions={priorityActions} maxVisible={2} />

      {/* Workflow Timeline */}
      <ActionTimeline steps={timelineSteps} title="My Season" />

      {/* Quick Actions */}
      <QuickActionsBar actions={quickActions} />

      {/* At-a-Glance KPI Header */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KPITile icon={Calendar} label="Next Event" value={nextEvent ? format(parseISO(nextEvent.start_datetime), "MMM d") : "—"} sublabel={nextEvent ? nextEvent.title : "Nothing scheduled"} tone="blue" to={`${createPageUrl("TeamCalendar")}?teams=${myTeam?.id || ""}`} />
        <KPITile icon={CheckCircle2} label="My Attendance" value={myAttendanceRate === null ? "—" : `${myAttendanceRate}%`} sublabel={myRsvpStatus ? `Next: ${myRsvpStatus}` : "RSVP needed"} tone={myAttendanceRate === null ? "slate" : myAttendanceRate >= 80 ? "emerald" : "amber"} to={`${createPageUrl("TeamCalendar")}?teams=${myTeam?.id || ""}`} />
        <KPITile icon={Star} label="Coach Feedback" value={evalsCompleted} sublabel="Evaluations" tone="purple" to={`${createPageUrl("PlayerDetail")}?id=${playerId}`} />
        <KPITile icon={Target} label="Active Goals" value={activeGoals} sublabel="Development goals" tone="amber" to={`${createPageUrl("PlayerDetail")}?id=${playerId}`} />
        <KPITile icon={Mail} label="Messages" value="—" sublabel="Unread" tone="slate" to={createPageUrl("CommunicationPortal")} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* My Schedule */}
        <DashboardSection title="My Schedule" icon={Calendar} description="Practices, games, tournaments — RSVP and attendance" viewAllLink={`${createPageUrl("TeamCalendar")}?teams=${myTeam?.id || ""}`}>
          <div className="space-y-2">
            {upcomingEvents.length === 0 ? (
              <p className="text-sm text-text-secondary text-center py-4">No upcoming events.</p>
            ) : (
              upcomingEvents.slice(0, 5).map((e) => {
                const rsvp = e.rsvps?.[playerId];
                return (
                  <Link key={e.id} to={`${createPageUrl("TeamCalendar")}?teams=${myTeam?.id || ""}`} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-neutral-100 transition-colors border border-border-subtle">
                    <div className="flex flex-col items-center justify-center w-12 shrink-0 bg-action/5 rounded-lg py-1">
                      <span className="text-[10px] font-bold uppercase text-action">{format(parseISO(e.start_datetime), "MMM")}</span>
                      <span className="text-lg font-bold text-text-action leading-none">{format(parseISO(e.start_datetime), "d")}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Badge variant="outline" className="text-[10px] capitalize">{e.event_type}</Badge>
                        {rsvp === "attending" && <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">Attending</Badge>}
                        {rsvp === "not_attending" && <Badge variant="outline" className="text-[10px] bg-red-50 text-red-700 border-red-200">Not Attending</Badge>}
                        {!rsvp && <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">RSVP Needed</Badge>}
                      </div>
                      <p className="font-medium text-sm text-text-action truncate">{e.title}</p>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-text-secondary flex-wrap">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{format(parseISO(e.start_datetime), "h:mm a")}</span>
                        {e.location_text && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{e.location_text}</span>}
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </DashboardSection>

        {/* My Development */}
        <DashboardSection title="My Development" icon={Star} description="Evaluations, E.P.I.C. scores, goals, training plans" viewAllLink={`${createPageUrl("PlayerDetail")}?id=${playerId}`}>
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2.5 rounded-lg bg-violet-50 border border-violet-200 text-center">
                <p className="text-lg font-extrabold text-violet-700">{evalsCompleted}</p>
                <p className="text-[10px] text-text-secondary">Evaluations</p>
              </div>
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-center">
                <p className="text-lg font-extrabold text-amber-700">{skillScores.length}</p>
                <p className="text-[10px] text-text-secondary">Skill Tests</p>
              </div>
              <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-center">
                <p className="text-lg font-extrabold text-blue-700">{physicalAssessments.length}</p>
                <p className="text-[10px] text-text-secondary">Physical Tests</p>
              </div>
            </div>
            {latestEval && (
              <div className="p-2.5 rounded-lg bg-neutral-50 border border-border-subtle">
                <p className="text-xs font-semibold text-text-secondary mb-1">Latest Evaluation</p>
                <p className="text-sm font-bold text-text-action">Overall: {latestEval.overall_score?.toFixed(1) || "—"}/10</p>
                {latestEval.strengths && <p className="text-xs text-text-secondary mt-0.5 truncate">Strengths: {latestEval.strengths.substring(0, 60)}</p>}
              </div>
            )}
            <Link to={`${createPageUrl("PlayerDetail")}?id=${playerId}`} className="flex items-center justify-between p-2.5 rounded-lg bg-violet-50 border border-violet-200 hover:shadow-sm transition-all">
              <span className="text-sm font-medium text-violet-700">View Full Development Profile</span>
              <ChevronRight className="w-4 h-4 text-violet-600" />
            </Link>
          </div>
        </DashboardSection>

        {/* My Team */}
        <DashboardSection title="My Team" icon={Trophy} description="Roster, schedule, team chat" viewAllLink={`${createPageUrl("TeamDetail")}?id=${myTeam?.id || ""}`}>
          <div className="space-y-2">
            {myTeam ? (
              <>
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-neutral-50">
                  <Trophy className="w-4 h-4 text-action" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-text-action truncate">{myTeam.name}</p>
                    <p className="text-xs text-text-secondary">{myTeam.age_group} · {myTeam.gender} · {myTeam.season}</p>
                  </div>
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {teammates.slice(0, 6).map((p) => (
                    <div key={p.id} className="flex items-center gap-2 p-1.5 rounded bg-neutral-50">
                      <Avatar className="w-6 h-6"><AvatarFallback className="bg-neutral-100 text-action text-[9px]">{p.first_name?.[0]}{p.last_name?.[0]}</AvatarFallback></Avatar>
                      <span className="text-xs font-medium truncate">{p.first_name} {p.last_name}</span>
                      {p.position && <Badge variant="outline" className="text-[9px] ml-auto">{p.position}</Badge>}
                    </div>
                  ))}
                  {teammates.length === 0 && <p className="text-xs text-text-secondary text-center py-2">No teammates yet</p>}
                </div>
              </>
            ) : (
              <p className="text-sm text-text-secondary text-center py-4">Not assigned to a team yet.</p>
            )}
          </div>
        </DashboardSection>

        {/* Messaging & Support */}
        <DashboardSection title="Messaging & Support" icon={Megaphone} description="Coach messages, team chat, support resources" viewAllLink={createPageUrl("CommunicationPortal")}>
          <div className="space-y-2">
            <Link to={createPageUrl("CommunicationPortal")} className="flex items-center justify-between p-2.5 rounded-lg bg-action/5 border border-action/20 hover:bg-neutral-100 transition-all">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-action" />
                <span className="text-sm font-medium text-action">Message My Coach</span>
              </div>
              <ChevronRight className="w-4 h-4 text-action" />
            </Link>
            <Link to={createPageUrl("CommunicationPortal")} className="flex items-center justify-between p-2.5 rounded-lg bg-amber-50 border border-amber-200 hover:shadow-sm transition-all">
              <div className="flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-700">Team Announcements</span>
              </div>
              <ChevronRight className="w-4 h-4 text-amber-600" />
            </Link>
            <Link to={createPageUrl("CommunicationPortal")} className="flex items-center justify-between p-2.5 rounded-lg bg-pink-50 border border-pink-200 hover:shadow-sm transition-all">
              <div className="flex items-center gap-2">
                <HeartHandshake className="w-4 h-4 text-pink-600" />
                <span className="text-sm font-medium text-pink-700">Support Request</span>
              </div>
              <ChevronRight className="w-4 h-4 text-pink-600" />
            </Link>
          </div>
        </DashboardSection>
      </div>

      {/* Drill-Down Views */}
      <DrillDownLinks items={drillDowns} />
    </div>
  );
}