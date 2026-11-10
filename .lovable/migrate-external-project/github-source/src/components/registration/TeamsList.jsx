import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Users, Shield, ChevronRight, Settings } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import TeamRosterDialog from "./TeamRosterDialog";
import BulkAssignDialog from "./BulkAssignDialog";
import DataToolbar from "@/components/shared/DataToolbar";
import TeamMatrix from "@/components/admin/TeamMatrix";
import { createPageUrl } from "@/utils";
import { Layers } from "lucide-react";
import { useTenant } from "@/lib/TenantContext";
import useCoachCompliance, { coachStatus } from "@/components/compliance/useCoachCompliance";
import CoachComplianceBadge from "@/components/compliance/CoachComplianceBadge";

const FORMAT_ORDER = ["4v4", "7v7", "9v9", "11v11"];

export default function TeamsList({ genderFilter = "all" }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", age_group: "", gender: "Boys and Girls", playing_format: "", season: "", coach_id: "", location_id: "", team_manager_id: "" });
  const [rosterTeam, setRosterTeam] = useState(null);
  const [viewMode, setViewMode] = useState("table");
  const [branchFilter, setBranchFilter] = useState("__all__");
  const [platformFilter, setPlatformFilter] = useState("__all__");
  const [coachFilter, setCoachFilter] = useState("__all__");
  const [formatFilter, setFormatFilter] = useState("__all__");
  const [ageGroupFilter, setAgeGroupFilter] = useState("__all__");
  const [leagueFilter, setLeagueFilter] = useState("__all__");
  const [genderFilterLocal, setGenderFilterLocal] = useState("__all__");
  const [bulkOpen, setBulkOpen] = useState(false);

  const csvFields = [
    { key: "unique_id", label: "Unique ID" },
    { key: "name", label: "Team Name" },
    { key: "age_group", label: "Age Group" },
    { key: "gender", label: "Gender" },
    { key: "playing_format", label: "Playing Format" },
    { key: "season", label: "Season" },
    { key: "coach_name", label: "Coach" },
    { key: "location_name", label: "Location" },
    { key: "program_title", label: "Program" },
    { key: "max_roster_size", label: "Max Roster", type: "number" },
  ];

  const { data: teams = [], isLoading } = useQuery({
    queryKey: ["teams-list"],
    queryFn: () => base44.entities.Team.list("-created_date", 200),
  });
  const { data: coaches = [] } = useQuery({ queryKey: ["coaches-list"], queryFn: () => base44.entities.Coach.list("-created_date", 200) });
  const { data: locations = [] } = useQuery({ queryKey: ["locations-for-teams"], queryFn: () => base44.entities.Location.list("name", 100) });
  const { data: guardians = [] } = useQuery({ queryKey: ["guardians-for-teams"], queryFn: () => base44.entities.Guardian.list("last_name", 300) });
  const { data: registrations = [] } = useQuery({ queryKey: ["regs-for-teams-matrix"], queryFn: () => base44.entities.Registration.list("-created_date", 500) });
  const { data: platforms = [] } = useQuery({ queryKey: ["platforms-for-teams"], queryFn: () => base44.entities.Platform.list("name", 100) });
  const { data: ageGroups = [] } = useQuery({ queryKey: ["age-groups-for-teams"], queryFn: () => base44.entities.AgeGroup.list("order", 200) });
  const { effectiveClubId } = useTenant();
  const { data: comp } = useCoachCompliance(effectiveClubId);

  // Filter by gender (division selector)
  const filteredTeams = useMemo(() => {
    return teams.filter((t) => {
      const matchGender = genderFilter === "all" || t.gender === genderFilter || t.gender === "Boys and Girls";
      const matchGenderLocal = genderFilterLocal === "__all__" || t.gender === genderFilterLocal || t.gender === "Boys and Girls";
      const matchBranch = branchFilter === "__all__" || t.location_name === branchFilter;
      const matchPlatform = platformFilter === "__all__" || t.platform_name === platformFilter;
      const matchCoach = coachFilter === "__all__" || t.coach_name === coachFilter;
      const matchFormat = formatFilter === "__all__" || t.playing_format === formatFilter;
      const matchAgeGroup = ageGroupFilter === "__all__" || t.age_group === ageGroupFilter;
      const matchLeague = leagueFilter === "__all__" || t.league === leagueFilter;
      return matchGender && matchGenderLocal && matchBranch && matchPlatform && matchCoach && matchFormat && matchAgeGroup && matchLeague;
    });
  }, [teams, genderFilter, genderFilterLocal, branchFilter, platformFilter, coachFilter, formatFilter, ageGroupFilter, leagueFilter]);

  const branchOpts = useMemo(() => [...new Set(teams.map((t) => t.location_name).filter(Boolean))].sort(), [teams]);
  const platformOpts = useMemo(() => [...new Set(teams.map((t) => t.platform_name).filter(Boolean))].sort(), [teams]);
  const coachOpts = useMemo(() => [...new Set(teams.map((t) => t.coach_name).filter(Boolean))].sort(), [teams]);
  const formatOpts = useMemo(() => [...new Set(teams.map((t) => t.playing_format).filter(Boolean))].sort(), [teams]);
  const ageGroupOpts = useMemo(() => [...new Set(teams.map((t) => t.age_group).filter(Boolean))].sort(), [teams]);
  const leagueOpts = useMemo(() => [...new Set(teams.map((t) => t.league).filter(Boolean))].sort(), [teams]);

  // Group by format for card view
  const groupedTeams = useMemo(() => {
    const map = new Map();
    for (const f of FORMAT_ORDER) map.set(f, []);
    for (const t of filteredTeams) {
      const fmt = t.playing_format || "11v11";
      if (!map.has(fmt)) map.set(fmt, []);
      map.get(fmt).push(t);
    }
    return [...map.entries()];
  }, [filteredTeams]);

  const updateTeam = async (teamId, data) => {
    try {
      await base44.entities.Team.update(teamId, data);
      queryClient.invalidateQueries({ queryKey: ["teams-list"] });
      toast.success("Team updated");
    } catch { toast.error("Failed to update team"); }
  };

  const bulkAssignTeams = async (ids, values) => {
    const patch = { ...values };
    if (values.location_id) {
      const loc = locations.find((l) => l.id === values.location_id);
      patch.location_name = loc?.name || "";
    }
    if (values.platform_id) {
      const plat = platforms.find((p) => p.id === values.platform_id);
      patch.platform_name = plat?.name || "";
    }
    await base44.entities.Team.bulkUpdate(ids.map((id) => ({ id, ...patch })));
    queryClient.invalidateQueries({ queryKey: ["teams-list"] });
  };

  const branchFieldOpts = locations.map((l) => ({ value: l.id, label: l.name }));
  const platformFieldOpts = platforms.map((p) => ({ value: p.id, label: p.name }));
  const leagueFieldOpts = [...new Set(teams.map((t) => t.league).filter(Boolean))].sort()
    .map((l) => ({ value: l, label: l }));

  const createTeam = async (e) => {
    e.preventDefault();
    if (!form.name) { toast.error("Team name is required."); return; }
    if (!form.playing_format) { toast.error("Playing format is required."); return; }
    setSaving(true);
    try {
      const coach = coaches.find((c) => c.id === form.coach_id);
      const location = locations.find((l) => l.id === form.location_id);
      const manager = guardians.find((g) => g.id === form.team_manager_id);
      await base44.entities.Team.create({
        name: form.name, age_group: form.age_group, gender: form.gender, playing_format: form.playing_format, season: form.season,
        coach_id: form.coach_id || "", coach_name: coach ? `${coach.first_name} ${coach.last_name}` : "",
        location_id: location?.id || "", location_name: location?.name || "",
        team_manager_id: form.team_manager_id || "", team_manager_name: manager ? `${manager.first_name} ${manager.last_name}` : "",
        player_ids: [],
      });
      queryClient.invalidateQueries({ queryKey: ["teams-list"] });
      setForm({ name: "", age_group: "", gender: "Boys and Girls", playing_format: "", season: "", coach_id: "", location_id: "", team_manager_id: "" });
      setShowForm(false);
      toast.success("Team created.");
    } catch { toast.error("Could not create team."); } finally { setSaving(false); }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5 text-emerald-600" /> Teams ({filteredTeams.length})</CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <DataToolbar
              entityName="Team"
              records={filteredTeams}
              csvFields={csvFields}
              queryKey={["teams-list"]}
              viewMode={viewMode}
              setViewMode={setViewMode}
              importTitle="Import Teams from CSV"
              sampleRecords={teams.slice(0, 1)}
            />
            <Button size="sm" onClick={() => setShowForm((s) => !s)} variant="outline"><Plus className="w-4 h-4 mr-1" /> New Team</Button>
            <Button size="sm" variant="outline" onClick={() => setBulkOpen(true)} disabled={filteredTeams.length === 0}>
              <Layers className="w-4 h-4 mr-1" /> Bulk Assign
            </Button>
          </div>
        </div>
        {showForm && (
          <form onSubmit={createTeam} className="grid grid-cols-2 gap-3 mt-3 p-3 border border-slate-200 dark:border-slate-700 rounded-lg">
            <div className="col-span-2"><Label>Team Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. U14 Jaguars" /></div>
            <div><Label>Age Group</Label><Input value={form.age_group} onChange={(e) => setForm({ ...form, age_group: e.target.value })} placeholder="e.g. U14" /></div>
            <div>
              <Label>Gender</Label>
              <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Boys">Boys</SelectItem>
                  <SelectItem value="Girls">Girls</SelectItem>
                  <SelectItem value="Boys and Girls">Boys and Girls</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Playing Format *</Label>
              <Select value={form.playing_format} onValueChange={(v) => setForm({ ...form, playing_format: v })}>
                <SelectTrigger><SelectValue placeholder="Select format" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="4v4">4v4</SelectItem>
                  <SelectItem value="7v7">7v7</SelectItem>
                  <SelectItem value="9v9">9v9</SelectItem>
                  <SelectItem value="11v11">11v11</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Season</Label><Input value={form.season} onChange={(e) => setForm({ ...form, season: e.target.value })} placeholder="e.g. 2026-2027" /></div>
            <div>
              <Label>Head Coach</Label>
              <Select value={form.coach_id} onValueChange={(v) => setForm({ ...form, coach_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select coach" /></SelectTrigger>
                <SelectContent>{coaches.map((c) => <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>)}</SelectContent>
              </Select>
              {form.coach_id && comp?.byEmail && (() => {
                const c = coaches.find((x) => x.id === form.coach_id);
                if (!c?.email) return null;
                const st = coachStatus([c.email], comp.byEmail);
                if (st === "compliant") return null;
                return <CoachComplianceBadge coaches={[c]} byEmail={comp.byEmail} compact />;
              })()}
            </div>
            <div>
              <Label>Location</Label>
              <Select value={form.location_id} onValueChange={(v) => setForm({ ...form, location_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
                <SelectContent>{locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Team Manager</Label>
              <Select value={form.team_manager_id} onValueChange={(v) => setForm({ ...form, team_manager_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select guardian" /></SelectTrigger>
                <SelectContent>{guardians.map((g) => <SelectItem key={g.id} value={g.id}>{g.first_name} {g.last_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2 flex gap-2">
              <Button type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Team"}</Button>
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </form>
        )}

        {/* Filter bar — horizontally scrollable on mobile to prevent page-level overflow */}
        <div className="flex items-center gap-2 flex-nowrap overflow-x-auto pb-1 mt-3 sm:flex-wrap sm:overflow-visible">
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="w-[150px] h-8 text-xs"><SelectValue placeholder="Branch" /></SelectTrigger>
            <SelectContent><SelectItem value="__all__">All Branches</SelectItem>{branchOpts.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={platformFilter} onValueChange={setPlatformFilter}>
            <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="Platform" /></SelectTrigger>
            <SelectContent><SelectItem value="__all__">All Platforms</SelectItem>{platformOpts.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={coachFilter} onValueChange={setCoachFilter}>
            <SelectTrigger className="w-[150px] h-8 text-xs"><SelectValue placeholder="Coach" /></SelectTrigger>
            <SelectContent><SelectItem value="__all__">All Coaches</SelectItem>{coachOpts.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={formatFilter} onValueChange={setFormatFilter}>
            <SelectTrigger className="w-[100px] h-8 text-xs"><SelectValue placeholder="Format" /></SelectTrigger>
            <SelectContent><SelectItem value="__all__">All Formats</SelectItem>{formatOpts.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={ageGroupFilter} onValueChange={setAgeGroupFilter}>
            <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue placeholder="Age Group" /></SelectTrigger>
            <SelectContent><SelectItem value="__all__">All Age Groups</SelectItem>{ageGroupOpts.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={leagueFilter} onValueChange={setLeagueFilter}>
            <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue placeholder="League" /></SelectTrigger>
            <SelectContent><SelectItem value="__all__">All Leagues</SelectItem>{leagueOpts.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={genderFilterLocal} onValueChange={setGenderFilterLocal}>
            <SelectTrigger className="w-[110px] h-8 text-xs"><SelectValue placeholder="Gender" /></SelectTrigger>
            <SelectContent><SelectItem value="__all__">All Genders</SelectItem><SelectItem value="Boys">Boys</SelectItem><SelectItem value="Girls">Girls</SelectItem><SelectItem value="Boys and Girls">Boys and Girls</SelectItem></SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
        ) : viewMode === "table" ? (
          <TeamMatrix
            teams={filteredTeams}
            registrations={registrations}
            coaches={coaches}
            guardians={guardians}
            platforms={platforms}
            locations={locations}
            ageGroups={ageGroups}
            onUpdateTeam={updateTeam}
          />
        ) : filteredTeams.length === 0 ? (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">No teams yet. Create one or import via CSV to start rostering players.</div>
        ) : (
          <div className="space-y-5">
            {groupedTeams.map(([format, formatTeams]) => (
              <div key={format}>
                <div className="flex items-center gap-2 mb-2 pb-1 border-b border-border">
                  <span className="text-xs font-bold uppercase tracking-wide text-primary">{format}</span>
                  <span className="text-xs text-muted-foreground">({formatTeams.length} teams)</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {formatTeams.map((t) => (
                    <div key={t.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 hover:shadow-sm">
                      <div className="flex items-center justify-between cursor-pointer" onClick={() => setRosterTeam(t)}>
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">{t.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{t.age_group || "—"} · {t.gender} · {t.playing_format || "—"} · {t.season || "—"}</p>
                        </div>
                        <Badge className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900 dark:text-emerald-300">
                          <Users className="w-3 h-3 mr-1" />{t.player_ids?.length || 0}/{t.max_roster_size || 18}
                        </Badge>
                      </div>
                      {t.coach_name && <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">Coach: {t.coach_name}</p>}
                      {t.location_name && <p className="text-xs text-slate-500 dark:text-slate-500 mt-0.5">Location: {t.location_name}</p>}
                      <div className="flex items-center justify-between mt-2">
                        <Link to={`${createPageUrl("TeamDetail")}?id=${t.id}`} onClick={(e) => e.stopPropagation()}>
                          <span className="text-xs text-blue-600 dark:text-blue-400 font-medium flex items-center hover:underline">
                            <Settings className="w-3 h-3 mr-1" /> Manage
                          </span>
                        </Link>
                        <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium cursor-pointer flex items-center" onClick={() => setRosterTeam(t)}>
                          Roster <ChevronRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <TeamRosterDialog open={!!rosterTeam} onOpenChange={(o) => !o && setRosterTeam(null)} team={rosterTeam} />
      <BulkAssignDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        title="Bulk Assign Teams"
        items={filteredTeams}
        getItemLabel={(t) => `${t.name}${t.age_group ? ` (${t.age_group})` : ""}${t.location_name ? ` — ${t.location_name}` : ""}`}
        fields={[
          { key: "location_id", label: "Branch", options: branchFieldOpts },
          { key: "league", label: "League", options: leagueFieldOpts, optional: true },
          { key: "platform_id", label: "Platform", options: platformFieldOpts, optional: true },
        ]}
        onApply={bulkAssignTeams}
      />
    </Card>
  );
}