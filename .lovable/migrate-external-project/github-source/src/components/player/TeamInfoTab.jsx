import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Trophy, Calendar, Clock, MapPin, Users, TrendingUp, ChevronRight } from "lucide-react";
import { createPageUrl } from "@/utils";
import { format, parseISO } from "date-fns";

export default function TeamInfoTab({ team, player, events = [], rosterPlayers = [], playerEvals = [], skillScores = [], physicalAssessments = [] }) {
  const today = new Date();
  const upcomingEvents = useMemo(() =>
    events
      .filter((e) => e.start_datetime && new Date(e.start_datetime) >= today)
      .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime))
      .slice(0, 6),
    [events]
  );

  // Team averages for comparison
  const teamAverages = useMemo(() => {
    const rosterIds = new Set(rosterPlayers.map((p) => p.id));
    const teamSkill = skillScores.filter((s) => rosterIds.has(s.player_id));
    const teamPhys = physicalAssessments.filter((a) => rosterIds.has(a.player_id));
    const teamEvals = playerEvals.filter((e) => rosterIds.has(e.player_id));
    return {
      skill: teamSkill.length ? Math.round(teamSkill.reduce((s, x) => s + x.score, 0) / teamSkill.length) : null,
      physical: teamPhys.length ? Math.round(teamPhys.reduce((s, x) => s + (x.overall || 0), 0) / teamPhys.length) : null,
      evaluation: teamEvals.length ? (teamEvals.reduce((s, x) => s + (x.overall_score || 0), 0) / teamEvals.length).toFixed(1) : null,
    };
  }, [rosterPlayers, skillScores, physicalAssessments, playerEvals]);

  // This player's averages
  const myAverages = useMemo(() => {
    const mySkill = skillScores.filter((s) => s.player_id === player?.id);
    const myPhys = physicalAssessments.filter((a) => a.player_id === player?.id);
    const myEvals = playerEvals.filter((e) => e.player_id === player?.id);
    return {
      skill: mySkill.length ? Math.round(mySkill.reduce((s, x) => s + x.score, 0) / mySkill.length) : null,
      physical: myPhys.length ? Math.round(myPhys.reduce((s, x) => s + (x.overall || 0), 0) / myPhys.length) : null,
      evaluation: myEvals.length ? (myEvals.reduce((s, x) => s + (x.overall_score || 0), 0) / myEvals.length).toFixed(1) : null,
    };
  }, [player, skillScores, physicalAssessments, playerEvals]);

  if (!team) {
    return (
      <Card className="adisal-card">
        <CardContent className="py-12 text-center">
          <Trophy className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No team assigned to this player.</p>
        </CardContent>
      </Card>
    );
  }

  const ComparisonRow = ({ label, myValue, teamValue, suffix = "" }) => {
    const myNum = myValue != null ? parseFloat(myValue) : null;
    const teamNum = teamValue != null ? parseFloat(teamValue) : null;
    const delta = myNum != null && teamNum != null ? Math.round((myNum - teamNum) * 10) / 10 : null;
    return (
      <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
        <span className="text-xs text-muted-foreground">{label}</span>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">{myValue != null ? `${myValue}${suffix}` : "—"}</span>
          <span className="text-xs text-muted-foreground">vs team {teamValue != null ? `${teamValue}${suffix}` : "—"}</span>
          {delta != null && (
            <Badge variant="outline" className={`text-[10px] ${delta >= 0 ? "bg-emerald-100 text-emerald-700 border-emerald-300" : "bg-red-100 text-red-700 border-red-300"}`}>
              {delta >= 0 ? "+" : ""}{delta}
            </Badge>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Team Details + Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="adisal-card">
          <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Trophy className="w-4 h-4 text-primary" /> Team Details</CardTitle></CardHeader>
          <CardContent className="space-y-1.5">
            <Link to={`${createPageUrl("TeamDetail")}?id=${team.id}`} className="text-sm font-semibold hover:text-primary">{team.name}</Link>
            <div className="flex items-center justify-between py-1.5 border-b border-border"><span className="text-xs text-muted-foreground">Age Group</span><span className="text-xs font-medium">{team.age_group || "—"}</span></div>
            <div className="flex items-center justify-between py-1.5 border-b border-border"><span className="text-xs text-muted-foreground">Gender</span><span className="text-xs font-medium">{team.gender || "—"}</span></div>
            <div className="flex items-center justify-between py-1.5 border-b border-border"><span className="text-xs text-muted-foreground">Format</span><span className="text-xs font-medium">{team.playing_format || "—"}</span></div>
            <div className="flex items-center justify-between py-1.5 border-b border-border"><span className="text-xs text-muted-foreground">Coach</span><span className="text-xs font-medium">{team.coach_name || "—"}</span></div>
            <div className="flex items-center justify-between py-1.5 border-b border-border"><span className="text-xs text-muted-foreground">Season</span><span className="text-xs font-medium">{team.season || "—"}</span></div>
            <div className="flex items-center justify-between py-1.5"><span className="text-xs text-muted-foreground">Platform</span><span className="text-xs font-medium">{team.platform_name || "—"}</span></div>
          </CardContent>
        </Card>

        <Card className="adisal-card">
          <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /> My Performance vs Team Average</CardTitle></CardHeader>
          <CardContent>
            <ComparisonRow label="Skill Test Avg" myValue={myAverages.skill} teamValue={teamAverages.skill} />
            <ComparisonRow label="Physical Avg" myValue={myAverages.physical} teamValue={teamAverages.physical} />
            <ComparisonRow label="Evaluation Avg" myValue={myAverages.evaluation} teamValue={teamAverages.evaluation} />
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Events */}
      <Card className="adisal-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2"><Calendar className="w-4 h-4 text-primary" /> Upcoming Team Events</CardTitle>
            <Link to={`${createPageUrl("TeamCalendar")}?teams=${team.id}`} className="text-xs text-primary hover:underline">View Calendar →</Link>
          </div>
        </CardHeader>
        <CardContent>
          {upcomingEvents.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">No upcoming events.</p>
          ) : (
            <div className="space-y-2">
              {upcomingEvents.map((e) => (
                <div key={e.id} className="flex items-start gap-3 p-2.5 rounded-lg border border-border/40 hover:bg-muted/30 transition-colors">
                  <div className="flex flex-col items-center justify-center w-12 shrink-0 bg-primary/5 rounded-lg py-1">
                    <span className="text-[10px] font-bold uppercase text-primary">{format(parseISO(e.start_datetime), "MMM")}</span>
                    <span className="text-lg font-bold text-foreground leading-none">{format(parseISO(e.start_datetime), "d")}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                      <Badge variant="outline" className="text-[10px] capitalize">{e.event_type}</Badge>
                    </div>
                    <p className="font-medium text-sm text-foreground truncate">{e.title}</p>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{format(parseISO(e.start_datetime), "h:mm a")}</span>
                      {e.location_text && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{e.location_text}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Roster */}
      <Card className="adisal-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> Team Roster ({rosterPlayers.length})</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {rosterPlayers.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">No players on the roster.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {rosterPlayers.map((p) => (
                <Link key={p.id} to={`${createPageUrl("PlayerDetail")}?id=${p.id}`} className="flex items-center gap-3 p-2.5 rounded-lg border border-border/40 hover:border-primary/40 hover:bg-primary/5 transition-all group">
                  <Avatar className="w-8 h-8 shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">{p.first_name?.[0]}{p.last_name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate group-hover:text-primary">{p.first_name} {p.last_name}</p>
                    <p className="text-[10px] text-muted-foreground">{p.position || "—"}{p.jersey_number ? ` · #${p.jersey_number}` : ""}</p>
                  </div>
                  {p.id === player?.id && <Badge variant="outline" className="text-[9px] bg-primary/10 text-primary border-primary/30">You</Badge>}
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}