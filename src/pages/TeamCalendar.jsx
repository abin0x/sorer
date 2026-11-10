import React, { useState, useMemo, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";
import { usePullToRefresh } from "@/lib/PullToRefreshContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, Plus, MapPin, Clock, Pencil, Users, List, CalendarDays, Grid, Filter } from "lucide-react";
import { format, parseISO, isAfter, startOfDay, isSameDay, addDays } from "date-fns";
import TeamEventDialog from "@/components/calendar/TeamEventDialog";
import WeekView from "@/components/calendar/WeekView";
import MonthView from "@/components/calendar/MonthView";
import GoogleCalendarSync from "@/components/calendar/GoogleCalendarSync";
import MultiSelectFilter from "@/components/calendar/MultiSelectFilter";
import { getManageableTeams, getVisibleTeams, canCreateEvents, canManageEvent, isClubWideCalendarRole } from "@/lib/calendarPermissions";
import { ROLES } from "@/lib/rbac";
import SeasonSelector from "@/components/seasons/SeasonSelector";
import { useSelectedSeason } from "@/lib/useSelectedSeason";

const TYPE_COLORS = {
  practice: "bg-emerald-100 text-emerald-700 border-emerald-200",
  game: "bg-blue-100 text-blue-700 border-blue-200",
  tournament: "bg-purple-100 text-purple-700 border-purple-200",
  meeting: "bg-amber-100 text-amber-700 border-amber-200",
  camp: "bg-cyan-100 text-cyan-700 border-cyan-200",
  clinic: "bg-pink-100 text-pink-700 border-pink-200",
  other: "bg-slate-100 text-slate-700 border-slate-200",
};

const STAFF_ROLES = [ROLES.MASTER_ADMIN, ROLES.ADMIN, ROLES.CLUB_DIRECTOR, ROLES.CLUB_ADMIN, ROLES.BRANCH_DIRECTOR, ROLES.BRANCH_ADMIN];

export default function TeamCalendar() {
  // Pull-to-refresh: re-fetch all active queries on this page.
  const handleRefresh = useCallback(() => queryClientInstance.refetchQueries({ type: "active" }), []);
  usePullToRefresh(handleRefresh);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [view, setView] = useState("agenda");
  const [navDate, setNavDate] = useState(new Date());
  const [filters, setFilters] = useState({ team: [], branch: [], ageGroup: [], league: [], format: [], coach: [] });
  const [initialFilterApplied, setInitialFilterApplied] = useState(false);

  useEffect(() => {
    if (!initialFilterApplied) {
      const urlParams = new URLSearchParams(window.location.search);
      const teamsParam = urlParams.get("teams");
      if (teamsParam) {
        const teamIds = teamsParam.split(",").filter(Boolean);
        if (teamIds.length > 0) {
          setFilters(f => ({ ...f, team: teamIds }));
        }
      }
      setInitialFilterApplied(true);
    }
  }, [initialFilterApplied]);

  const { selected: selectedSeason, seasons: seasonList, setSelectedSeason } = useSelectedSeason();
  const { data: user } = useQuery({ queryKey: ["current-user-calendar"], queryFn: () => base44.auth.me() });
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["calendar-events"],
    queryFn: () => base44.entities.CalendarEvent.list("start_datetime", 300),
  });
  const { data: teams = [] } = useQuery({ queryKey: ["teams-for-calendar"], queryFn: () => base44.entities.Team.list("name", 200) });
  const { data: coaches = [] } = useQuery({ queryKey: ["coaches-for-calendar"], queryFn: () => base44.entities.Coach.list("last_name", 200) });
  const { data: guardians = [] } = useQuery({ queryKey: ["guardians-for-calendar"], queryFn: () => base44.entities.Guardian.list("-created_date", 200) });
  const { data: players = [] } = useQuery({ queryKey: ["players-for-calendar"], queryFn: () => base44.entities.Player.list("-created_date", 300) });

  const manageableTeams = getManageableTeams(user, teams, coaches);
  const canCreate = canCreateEvents(user, teams, coaches);
  const isStaff = user && STAFF_ROLES.includes(user.custom_role);
  const visibleTeams = useMemo(() => getVisibleTeams(user, teams, coaches, guardians, players), [user, teams, coaches, guardians, players]);
  const visibleTeamIds = useMemo(() => new Set(visibleTeams.map((t) => t.id)), [visibleTeams]);
  const isClubWide = isClubWideCalendarRole(user);

  // Build unique filter options from teams
  const teamOptions = useMemo(() => visibleTeams.map((t) => ({ value: t.id, label: t.name })), [visibleTeams]);
  const branchOptions = useMemo(() => [...new Set(visibleTeams.map((t) => t.location_name).filter(Boolean))].sort().map((b) => ({ value: b, label: b })), [visibleTeams]);
  const ageGroupOptions = useMemo(() => [...new Set(visibleTeams.map((t) => t.age_group).filter(Boolean))].sort().map((a) => ({ value: a, label: a })), [visibleTeams]);
  const leagueOptions = useMemo(() => [...new Set(visibleTeams.map((t) => t.league).filter(Boolean))].sort().map((l) => ({ value: l, label: l })), [visibleTeams]);
  const formatOptions = useMemo(() => [...new Set(visibleTeams.map((t) => t.playing_format).filter(Boolean))].sort().map((f) => ({ value: f, label: f })), [visibleTeams]);
  const coachOptions = useMemo(() => coaches.map((c) => ({ value: c.id, label: `${c.first_name || ""} ${c.last_name || ""}`.trim() })), [coaches]);

  // Teams that match all team-based filters (AND across dimensions, OR within)
  const matchingTeamIds = useMemo(() => {
    return new Set(
      visibleTeams.filter((t) => {
        if (filters.team.length > 0 && !filters.team.includes(t.id)) return false;
        if (filters.branch.length > 0 && !filters.branch.includes(t.location_name)) return false;
        if (filters.ageGroup.length > 0 && !filters.ageGroup.includes(t.age_group)) return false;
        if (filters.league.length > 0 && !filters.league.includes(t.league)) return false;
        if (filters.format.length > 0 && !filters.format.includes(t.playing_format)) return false;
        if (filters.coach.length > 0 && !filters.coach.includes(t.coach_id)) return false;
        return true;
      }).map((t) => t.id)
    );
  }, [visibleTeams, filters]);

  const noTeamFilters = filters.team.length === 0 && filters.branch.length === 0 && filters.ageGroup.length === 0 && filters.league.length === 0 && filters.format.length === 0 && filters.coach.length === 0;

  const inSeasonRange = (e) => {
    if (!selectedSeason?.start_date && !selectedSeason?.end_date) return true;
    const d = (e.start_datetime || "").slice(0, 10);
    if (!d) return true;
    if (selectedSeason.start_date && d < selectedSeason.start_date) return false;
    if (selectedSeason.end_date && d > selectedSeason.end_date) return false;
    return true;
  };

  const filteredEvents = useMemo(() => {
    return events.filter(inSeasonRange).filter((e) => {
      const eventTeamIds = e.team_ids || [];
      if (eventTeamIds.length === 0) return isClubWide && noTeamFilters;
      if (!isClubWide && !eventTeamIds.some((id) => visibleTeamIds.has(id))) return false;
      return eventTeamIds.some((id) => matchingTeamIds.has(id));
    });
  }, [events, matchingTeamIds, noTeamFilters, isClubWide, visibleTeamIds, selectedSeason]);

  const today = startOfDay(new Date());
  const upcoming = filteredEvents
    .filter((e) => e.start_datetime && (isAfter(parseISO(e.start_datetime), today) || isSameDay(parseISO(e.start_datetime), today)))
    .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));

  const grouped = {};
  upcoming.forEach((e) => {
    const key = format(parseISO(e.start_datetime), "yyyy-MM-dd");
    grouped[key] = grouped[key] || [];
    grouped[key].push(e);
  });

  const openCreate = () => { setEditingEvent(null); setDialogOpen(true); };
  const openView = (e) => {
    if (["game","match"].includes(String(e?.event_type || "").toLowerCase())) { window.location.assign(`/gameview?id=${e.id}`); return; }
    setEditingEvent(e); setDialogOpen(true);
  };
  const setFilter = (key, value) => setFilters((f) => ({ ...f, [key]: value }));
  const clearAll = () => setFilters({ team: [], branch: [], ageGroup: [], league: [], format: [], coach: [] });
  const hasActiveFilters = !noTeamFilters;

  if (isLoading) {
    return <div className="flex items-center justify-center h-[60vh]"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-white p-4 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="text-xs font-bold tracking-wider uppercase text-primary mb-1">Club Nexus · Engagement</div>
            <h1 className="text-2xl font-extrabold text-foreground">Team Calendar</h1>
            <p className="text-sm text-muted-foreground mt-1">Practices, games, tournaments, and meetings — one connected calendar.</p>
          </div>
          <div className="flex items-center gap-2">
            <SeasonSelector seasons={seasonList} value={selectedSeason?.id} onChange={setSelectedSeason} />
            {canCreate && (
              <Button onClick={openCreate} className="bg-primary hover:bg-primary/90 text-white rounded-lg">
                <Plus className="w-4 h-4 mr-2" /> New Event
              </Button>
            )}
          </div>
        </div>

        <GoogleCalendarSync manageableTeams={manageableTeams} canCreate={canCreate} />

        {/* Multi-select filter bar */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
          <MultiSelectFilter label="Teams" options={teamOptions} selected={filters.team} onChange={(v) => setFilter("team", v)} />
          <MultiSelectFilter label="Branches" options={branchOptions} selected={filters.branch} onChange={(v) => setFilter("branch", v)} />
          <MultiSelectFilter label="Ages" options={ageGroupOptions} selected={filters.ageGroup} onChange={(v) => setFilter("ageGroup", v)} />
          <MultiSelectFilter label="Leagues" options={leagueOptions} selected={filters.league} onChange={(v) => setFilter("league", v)} />
          <MultiSelectFilter label="Formats" options={formatOptions} selected={filters.format} onChange={(v) => setFilter("format", v)} />
          {isStaff && (
            <MultiSelectFilter label="Coaches" options={coachOptions} selected={filters.coach} onChange={(v) => setFilter("coach", v)} />
          )}
          {hasActiveFilters && (
            <Button size="sm" variant="ghost" onClick={clearAll} className="h-8 text-xs text-muted-foreground hover:text-foreground">
              Clear All
            </Button>
          )}
          <div className="flex items-center gap-1 border border-border rounded-lg p-1 ml-auto">
            <Button size="sm" variant={view === "agenda" ? "default" : "ghost"} className={view === "agenda" ? "bg-primary text-white h-7" : "h-7"} onClick={() => setView("agenda")}>
              <List className="w-3.5 h-3.5 mr-1" /> Agenda
            </Button>
            <Button size="sm" variant={view === "week" ? "default" : "ghost"} className={view === "week" ? "bg-primary text-white h-7" : "h-7"} onClick={() => setView("week")}>
              <Grid className="w-3.5 h-3.5 mr-1" /> Week
            </Button>
            <Button size="sm" variant={view === "month" ? "default" : "ghost"} className={view === "month" ? "bg-primary text-white h-7" : "h-7"} onClick={() => setView("month")}>
              <CalendarDays className="w-3.5 h-3.5 mr-1" /> Month
            </Button>
          </div>
        </div>

        {view === "week" && (
          <WeekView events={filteredEvents} onEventClick={openView} currentDate={navDate} onNavigate={setNavDate} />
        )}

        {view === "month" && (
          <MonthView events={filteredEvents} onEventClick={openView} currentDate={navDate} onNavigate={setNavDate} />
        )}

        {view === "agenda" && (
          <>
            {Object.keys(grouped).length === 0 ? (
              <Card className="border-border rounded-xl"><CardContent className="py-16 text-center">
                <CalendarClock className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No upcoming events{hasActiveFilters ? " for these filters" : ""}.</p>
              </CardContent></Card>
            ) : (
              Object.entries(grouped).map(([dateKey, dayEvents]) => {
                const d = parseISO(dateKey);
                const isToday = isSameDay(d, today);
                const isTomorrow = isSameDay(d, addDays(today, 1));
                return (
                  <Card key={dateKey} className="border-border rounded-xl overflow-hidden">
                    <CardHeader className="py-3 bg-muted/40">
                      <CardTitle className="text-xs font-bold uppercase tracking-wide text-foreground">
                        {isToday ? "Today" : isTomorrow ? "Tomorrow" : format(d, "EEEE, MMMM d, yyyy")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 divide-y divide-border">
                      {dayEvents.map((e) => {
                        const editable = canManageEvent(user, e, teams, coaches);
                        return (
                          <button
                            key={e.id}
                            onClick={() => openView(e)}
                            className="flex items-center gap-4 p-4 hover:bg-muted/30 w-full text-left transition-colors cursor-pointer"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge className={`text-[10px] capitalize border ${TYPE_COLORS[e.event_type] || TYPE_COLORS.other}`}>{e.event_type}</Badge>
                                {e.status !== "confirmed" && <Badge variant="outline" className="text-[10px] capitalize">{e.status}</Badge>}
                                {e.rsvp_required && <Badge className="text-[10px] bg-amber-100 text-amber-700 border border-amber-200">RSVP</Badge>}
                                <p className="font-semibold text-sm text-foreground truncate">{e.title}</p>
                              </div>
                              <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
                                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{format(parseISO(e.start_datetime), "h:mm a")}{e.end_datetime ? ` – ${format(parseISO(e.end_datetime), "h:mm a")}` : ""}</span>
                                {e.location_text && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{e.location_text}</span>}
                                {e.team_names?.length > 0 && <span className="flex items-center gap-1"><Users className="w-3 h-3" />{e.team_names.join(", ")}</span>}
                              </div>
                            </div>
                            {editable ? (
                              <span className="shrink-0 text-xs text-primary font-semibold flex items-center gap-1">
                                <Pencil className="w-3.5 h-3.5" /> Edit
                              </span>
                            ) : (
                              <span className="shrink-0 text-xs text-muted-foreground">View</span>
                            )}
                          </button>
                        );
                      })}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </>
        )}
      </div>

      <TeamEventDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        event={editingEvent}
        manageableTeams={manageableTeams}
        readOnly={editingEvent ? !canManageEvent(user, editingEvent, teams, coaches) : false}
      />
    </div>
  );
}