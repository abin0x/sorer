import React, { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, Users, ChevronRight } from "lucide-react";
import { format as formatDate } from "date-fns";
import { Link } from '@/lib/router-compat';
import DataToolbar from "@/components/shared/DataToolbar";
import PlayerMatrix from "./PlayerMatrix";
import BulkAssignDialog from "./BulkAssignDialog";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { Layers } from "lucide-react";

const statusColor = {
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  waitlist: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  inactive: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

const csvFields = [
  { key: "unique_id", label: "Unique ID" },
  { key: "first_name", label: "First Name" },
  { key: "last_name", label: "Last Name" },
  { key: "date_of_birth", label: "Date of Birth" },
  { key: "gender", label: "Gender" },
  { key: "status", label: "Status" },
  { key: "team_name", label: "Team" },
  { key: "age_group", label: "Age Group" },
  { key: "league", label: "League" },
  { key: "coach_name", label: "Coach" },
  { key: "program_title", label: "Program" },
  { key: "location_name", label: "Branch" },
  { key: "guardian_name", label: "Guardian" },
  { key: "position", label: "Position" },
  { key: "jersey_number", label: "Jersey Number" },
];

const FORMAT_ORDER = ["4v4", "7v7", "9v9", "11v11"];
const ALL = "__all__";

export default function PlayersList({ genderFilter = "all" }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState("table");
  const [branchFilter, setBranchFilter] = useState(ALL);
  const [ageGroupFilter, setAgeGroupFilter] = useState(ALL);
  const [coachFilter, setCoachFilter] = useState(ALL);
  const [leagueFilter, setLeagueFilter] = useState(ALL);
  const [genderFilterLocal, setGenderFilterLocal] = useState(genderFilter || "all");
  const [platformFilter, setPlatformFilter] = useState(ALL);
  const [bulkOpen, setBulkOpen] = useState(false);

  // Sync the local gender filter when the parent division selector changes
  useEffect(() => {
    setGenderFilterLocal(genderFilter || "all");
  }, [genderFilter]);
  const [formatFilter, setFormatFilter] = useState(ALL);

  const { data: players = [], isLoading } = useQuery({ queryKey: ["players-list"], queryFn: () => base44.entities.Player.list("-created_date", 500) });
  const { data: teams = [] } = useQuery({ queryKey: ["teams-for-players-matrix"], queryFn: () => base44.entities.Team.list("-created_date", 200) });
  const { data: locations = [] } = useQuery({ queryKey: ["locations-for-players"], queryFn: () => base44.entities.Location.list("name", 100) });
  const { data: ageGroups = [] } = useQuery({ queryKey: ["age-groups-for-players"], queryFn: () => base44.entities.AgeGroup.list("order", 200) });
  const { data: guardians = [] } = useQuery({ queryKey: ["guardians-for-players"], queryFn: () => base44.entities.Guardian.list("last_name", 300) });
  const { data: registrations = [] } = useQuery({ queryKey: ["regs-for-players-matrix"], queryFn: () => base44.entities.Registration.list("-created_date", 500) });

  const teamMap = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);

  const branches = useMemo(() => [...new Set(players.map((p) => p.location_name).filter(Boolean))].sort(), [players]);
  const ageGroupOpts = useMemo(() => [...new Set(players.map((p) => p.age_group).filter(Boolean))].sort(), [players]);
  const coaches = useMemo(() => [...new Set(players.map((p) => p.coach_name).filter(Boolean))].sort(), [players]);
  const leagues = useMemo(() => [...new Set(players.map((p) => p.league).filter(Boolean))].sort(), [players]);
  const platforms = useMemo(() => [...new Set(teams.map((t) => t.platform_name).filter(Boolean))].sort(), [teams]);
  const formats = useMemo(() => [...new Set(teams.map((t) => t.playing_format).filter(Boolean))].sort(), [teams]);

  const filtered = players.filter((p) => {
    const team = p.team_id ? teamMap.get(p.team_id) : null;
    const matchGender = genderFilterLocal === "all" || p.gender === genderFilterLocal;
    const matchBranch = branchFilter === ALL || p.location_name === branchFilter;
    const matchAgeGroup = ageGroupFilter === ALL || p.age_group === ageGroupFilter;
    const matchCoach = coachFilter === ALL || p.coach_name === coachFilter;
    const matchLeague = leagueFilter === ALL || p.league === leagueFilter;
    const matchPlatform = platformFilter === ALL || team?.platform_name === platformFilter;
    const matchFormat = formatFilter === ALL || team?.playing_format === formatFilter;
    const matchSearch = !search ||
      `${p.first_name} ${p.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
      p.team_name?.toLowerCase().includes(search.toLowerCase());
    return matchGender && matchBranch && matchAgeGroup && matchCoach && matchLeague && matchPlatform && matchFormat && matchSearch;
  });

  // Group by format for card view
  const groupedPlayers = useMemo(() => {
    const map = new Map();
    for (const f of [...FORMAT_ORDER, "Unassigned"]) map.set(f, []);
    for (const p of filtered) {
      const team = p.team_id ? teamMap.get(p.team_id) : null;
      const fmt = team?.playing_format || "Unassigned";
      if (!map.has(fmt)) map.set(fmt, []);
      map.get(fmt).push(p);
    }
    return [...map.entries()];
  }, [filtered, teamMap]);

  const updatePlayer = async (playerId, data) => {
    try {
      await base44.entities.Player.update(playerId, data);
      queryClient.invalidateQueries({ queryKey: ["players-list"] });
      toast.success("Player updated");
    } catch { toast.error("Failed to update player"); }
  };

  const bulkAssignPlayers = async (ids, values) => {
    const patch = { ...values };
    if (values.team_id) {
      const team = teams.find((t) => t.id === values.team_id);
      patch.team_name = team?.name || "";
      patch.age_group = team?.age_group || patch.age_group;
      patch.location_id = team?.location_id || patch.location_id;
      patch.location_name = team?.location_name || patch.location_name;
      patch.coach_name = team?.coach_name || patch.coach_name;
      patch.league = team?.league || patch.league;
    }
    if (values.location_id) {
      const loc = locations.find((l) => l.id === values.location_id);
      patch.location_name = loc?.name || "";
    }
    await base44.entities.Player.bulkUpdate(ids.map((id) => ({ id, ...patch })));
    queryClient.invalidateQueries({ queryKey: ["players-list"] });
  };

  const teamFieldOpts = teams.map((t) => ({ value: t.id, label: `${t.name}${t.age_group ? ` (${t.age_group})` : ""}` }));
  const branchFieldOpts = locations.map((l) => ({ value: l.id, label: l.name }));

  const resetFilters = () => { setSearch(""); setBranchFilter(ALL); setAgeGroupFilter(ALL); setCoachFilter(ALL); setLeagueFilter(ALL); setGenderFilterLocal("all"); setPlatformFilter(ALL); setFormatFilter(ALL); };
  const filtersActive = branchFilter !== ALL || ageGroupFilter !== ALL || coachFilter !== ALL || leagueFilter !== ALL || genderFilterLocal !== "all" || platformFilter !== ALL || formatFilter !== ALL || search;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5 text-emerald-600" /> Players ({filtered.length})</CardTitle>
          <DataToolbar
            entityName="Player"
            records={filtered}
            csvFields={csvFields}
            queryKey={["players-list"]}
            viewMode={viewMode}
            setViewMode={setViewMode}
            importTitle="Import Players from CSV"
            sampleRecords={players.slice(0, 1)}
          />
          <Button size="sm" variant="outline" onClick={() => setBulkOpen(true)} disabled={filtered.length === 0}>
            <Layers className="w-4 h-4 mr-1" /> Bulk Assign
          </Button>
        </div>
        <div className="relative mt-2">
          <Search className="w-4 h-4 absolute left-2 top-2.5 text-slate-400" />
          <Input placeholder="Search players or teams..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
        </div>
        <div className="flex items-center gap-2 flex-wrap mt-3">
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="w-[150px] h-8 text-xs"><SelectValue placeholder="Branch" /></SelectTrigger>
            <SelectContent><SelectItem value={ALL}>All Branches</SelectItem>{branches.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={ageGroupFilter} onValueChange={setAgeGroupFilter}>
            <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="Age Group" /></SelectTrigger>
            <SelectContent><SelectItem value={ALL}>All Age Groups</SelectItem>{ageGroupOpts.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={coachFilter} onValueChange={setCoachFilter}>
            <SelectTrigger className="w-[150px] h-8 text-xs"><SelectValue placeholder="Coach" /></SelectTrigger>
            <SelectContent><SelectItem value={ALL}>All Coaches</SelectItem>{coaches.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={leagueFilter} onValueChange={setLeagueFilter}>
            <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="League" /></SelectTrigger>
            <SelectContent><SelectItem value={ALL}>All Leagues</SelectItem>{leagues.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={genderFilterLocal} onValueChange={setGenderFilterLocal}>
            <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue placeholder="Gender" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All Genders</SelectItem><SelectItem value="Boys">Boys</SelectItem><SelectItem value="Girls">Girls</SelectItem></SelectContent>
          </Select>
          <Select value={platformFilter} onValueChange={setPlatformFilter}>
            <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="Platform" /></SelectTrigger>
            <SelectContent><SelectItem value={ALL}>All Platforms</SelectItem>{platforms.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={formatFilter} onValueChange={setFormatFilter}>
            <SelectTrigger className="w-[100px] h-8 text-xs"><SelectValue placeholder="Format" /></SelectTrigger>
            <SelectContent><SelectItem value={ALL}>All Formats</SelectItem>{formats.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
          </Select>
          {filtersActive && <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={resetFilters}>Reset</Button>}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
        ) : viewMode === "table" ? (
          <PlayerMatrix
            players={filtered}
            teams={teams}
            locations={locations}
            ageGroups={ageGroups}
            registrations={registrations}
            guardians={guardians}
            onUpdatePlayer={updatePlayer}
          />
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">No players yet. Submit a registration or import via CSV to get started.</div>
        ) : (
          <div className="space-y-5">
            {groupedPlayers.map(([format, formatPlayers]) => (
              <div key={format}>
                <div className="flex items-center gap-2 mb-2 pb-1 border-b border-border">
                  <span className="text-xs font-bold uppercase tracking-wide text-primary">{format}</span>
                  <span className="text-xs text-muted-foreground">({formatPlayers.length} players)</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {formatPlayers.map((p) => (
                    <Link key={p.id} to={`${createPageUrl("PlayerDetail")}?id=${p.id}`} className="block border border-slate-200 dark:border-slate-700 rounded-lg p-3 hover:shadow-sm hover:border-emerald-300 dark:hover:border-emerald-700 transition-all group">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white font-semibold text-sm">{p.first_name?.[0]}{p.last_name?.[0]}</div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-900 dark:text-white truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-400">{p.first_name} {p.last_name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{p.date_of_birth ? formatDate(new Date(p.date_of_birth), "MMM d, yyyy") : "—"}{p.gender ? ` · ${p.gender}` : ""}</p>
                        </div>
                        <Badge className={`text-xs ${statusColor[p.status] || statusColor.pending}`}>{p.status}</Badge>
                      </div>
                      <div className="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-400">
                        {p.team_name && <p>Team: <span className="font-medium text-slate-800 dark:text-slate-200">{p.team_name}</span>{p.age_group ? ` (${p.age_group})` : ""}</p>}
                        {p.location_name && <p>Branch: {p.location_name}</p>}
                        {p.coach_name && <p>Coach: {p.coach_name}</p>}
                        {p.position && <p>Position: {p.position}</p>}
                        {p.guardian_name && <p>Guardian: {p.guardian_name}</p>}
                      </div>
                      <div className="flex items-center justify-end mt-2 text-xs text-emerald-700 dark:text-emerald-400 font-medium">View Profile <ChevronRight className="w-3 h-3" /></div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <BulkAssignDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        title="Bulk Assign Players"
        items={filtered}
        getItemLabel={(p) => `${p.first_name} ${p.last_name}${p.team_name ? ` — ${p.team_name}` : ""}`}
        fields={[
          { key: "team_id", label: "Team", options: teamFieldOpts, optional: true },
          { key: "location_id", label: "Branch", options: branchFieldOpts, optional: true },
        ]}
        onApply={bulkAssignPlayers}
      />
    </Card>
  );
}