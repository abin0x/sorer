import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from '@/lib/router-compat';
import { AdisalPageHeader, AdisalTabs, AdisalCard } from "@/components/adisal/ui";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UserPlus, Upload, Mail, Search, Table, LayoutGrid, Check, X } from "lucide-react";
import { createPageUrl } from "@/utils";
import ResponsiveSelect from "@/components/shared/ResponsiveSelect";
import { toast } from "sonner";

const TABS = [
  { key: "roster", label: "Roster" },
  { key: "skill", label: "Skill Mastery" },
  { key: "physical", label: "Physical" },
  { key: "skills", label: "Skills" },
];

export default function PlayerRoster() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("roster");
  const [search, setSearch] = useState("");
  const [posFilter, setPosFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");
  const [ageFilter, setAgeFilter] = useState("all");
  const [genderFilter, setGenderFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [view, setView] = useState("cards");
  const [editing, setEditing] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: players = [], isLoading } = useQuery({
    queryKey: ["adisal-players"],
    queryFn: () => base44.entities.Player.list("-created_date", 200),
  });
  const { data: scores = [] } = useQuery({
    queryKey: ["adisal-scores"],
    queryFn: () => base44.entities.SkillTestScore.list("-created_date", 500),
  });
  const { data: physical = [] } = useQuery({
    queryKey: ["adisal-physical"],
    queryFn: () => base44.entities.PhysicalAssessment.list("-created_date", 200),
  });
  const { data: teams = [] } = useQuery({
    queryKey: ["adisal-teams"],
    queryFn: () => base44.entities.Team.list("-created_date", 200),
  });
  const { data: skillTests = [] } = useQuery({
    queryKey: ["adisal-skill-tests"],
    queryFn: () => base44.entities.SkillTest.list("-created_date", 50),
  });

  const teamMap = useMemo(() => new Map(teams.map(t => [t.id, t])), [teams]);

  const teamNames = useMemo(() => [...new Set(players.map(p => p.team_name).filter(Boolean))], [players]);
  const positions = useMemo(() => [...new Set(players.map(p => p.position).filter(Boolean))], [players]);
  const ageGroups = useMemo(() => [...new Set(players.map(p => p.age_group || p.team_name?.match(/U(\d+)/)?.[1] || "").filter(Boolean))], [players]);
  const platforms = useMemo(() => [...new Set(teams.map(t => t.platform_name).filter(Boolean))], [teams]);

  const filtered = useMemo(() => {
    return players.filter(p => {
      if (search && !`${p.first_name} ${p.last_name}`.toLowerCase().includes(search.toLowerCase())) return false;
      if (posFilter !== "all" && p.position !== posFilter) return false;
      if (teamFilter !== "all" && p.team_name !== teamFilter) return false;
      if (ageFilter !== "all") {
        const age = p.age_group || p.team_name?.match(/U(\d+)/)?.[1];
        if (age !== ageFilter) return false;
      }
      if (genderFilter !== "all") {
        const team = teamMap.get(p.team_id);
        const gender = team?.gender || p.gender;
        if (gender !== genderFilter) return false;
      }
      if (platformFilter !== "all") {
        const team = teamMap.get(p.team_id);
        if (team?.platform_name !== platformFilter) return false;
      }
      return true;
    });
  }, [players, search, posFilter, teamFilter, ageFilter, genderFilter, platformFilter, teamMap]);

  const getPlayerScore = (playerId) => {
    const playerScores = scores.filter(s => s.player_id === playerId);
    if (playerScores.length === 0) return null;
    const avg = playerScores.reduce((sum, s) => sum + s.score, 0) / playerScores.length;
    return Math.round(avg * 10) / 10;
  };

  const getPlayerPhysical = (playerId) => {
    const p = physical.filter(a => a.player_id === playerId).sort((a, b) => new Date(b.assessment_date) - new Date(a.assessment_date))[0];
    return p?.overall || null;
  };

  // Build per-player latest skill score by test
  const playerSkillByTest = useMemo(() => {
    const map = {};
    scores.forEach(s => {
      if (!map[s.player_id]) map[s.player_id] = {};
      if (!map[s.player_id][s.test_id] || new Date(s.test_date) > new Date(map[s.player_id][s.test_id].test_date)) {
        map[s.player_id][s.test_id] = s;
      }
    });
    return map;
  }, [scores]);

  const startEdit = (playerId, testId, currentVal) => {
    setEditing({ playerId, testId });
    setEditValue(currentVal != null ? String(currentVal) : "");
  };
  const cancelEdit = () => { setEditing(null); setEditValue(""); };

  const saveEdit = async () => {
    if (!editing) return;
    const test = skillTests.find(t => t.id === editing.testId);
    if (!test) { cancelEdit(); return; }
    const val = parseFloat(editValue);
    if (isNaN(val)) { cancelEdit(); return; }
    const player = players.find(p => p.id === editing.playerId);
    setSaving(true);
    try {
      const existing = playerSkillByTest[editing.playerId]?.[editing.testId];
      if (existing?.id) {
        await base44.entities.SkillTestScore.update(existing.id, { score: val });
      } else {
        await base44.entities.SkillTestScore.create({
          player_id: editing.playerId,
          player_name: player ? `${player.first_name} ${player.last_name}` : "",
          test_id: editing.testId,
          test_title: test.title || "",
          score: val,
          test_date: new Date().toISOString().split("T")[0],
        });
      }
      toast.success("Score updated");
      queryClient.invalidateQueries({ queryKey: ["adisal-scores"] });
      cancelEdit();
    } catch (e) {
      toast.error("Failed to save: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      <AdisalPageHeader
        breadcrumb="Roster Management"
        title="PLAYER"
        titleAccent="ROSTER"
        subtitle="View and manage all players across teams. Track skill mastery, physical assessments, and performance indexes."
        actions={
          <>
            <Button variant="outline" size="sm"><Upload className="w-3.5 h-3.5 mr-1.5" /> Quick Import</Button>
            <Button size="sm" className="bg-primary hover:bg-primary/90"><UserPlus className="w-3.5 h-3.5 mr-1.5" /> Add Player</Button>
            <Button size="sm" variant="secondary"><Mail className="w-3.5 h-3.5 mr-1.5" /> Invite Player</Button>
          </>
        }
      />

      <AdisalTabs tabs={TABS} active={tab} onChange={setTab} />

      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap mb-4 p-4 bg-card border border-border rounded-lg">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search players..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <ResponsiveSelect
          value={genderFilter}
          onChange={setGenderFilter}
          label="Gender"
          options={[{ value: "all", label: "All Genders" }, { value: "Boys", label: "Boys" }, { value: "Girls", label: "Girls" }, { value: "Boys and Girls", label: "Both" }]}
        />
        <ResponsiveSelect
          value={platformFilter}
          onChange={setPlatformFilter}
          label="Platform"
          options={[{ value: "all", label: "All Platforms" }, ...platforms.map(p => ({ value: p, label: p }))]}
        />
        <ResponsiveSelect
          value={teamFilter}
          onChange={setTeamFilter}
          label="Team"
          options={[{ value: "all", label: "All Teams" }, ...teamNames.map(t => ({ value: t, label: t }))]}
        />
        <ResponsiveSelect
          value={posFilter}
          onChange={setPosFilter}
          label="Position"
          options={[{ value: "all", label: "All Positions" }, ...positions.map(p => ({ value: p, label: p }))]}
        />
        <ResponsiveSelect
          value={ageFilter}
          onChange={setAgeFilter}
          label="Age Group"
          options={[{ value: "all", label: "All Age Groups" }, ...ageGroups.map(a => ({ value: String(a), label: `U-${a}` }))]}
        />
        <div className="flex items-center gap-1 ml-auto border border-border rounded-md p-0.5">
          <button onClick={() => setView("cards")} className={`p-1.5 rounded ${view === "cards" ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted"}`} title="Card view"><LayoutGrid className="w-4 h-4" /></button>
          <button onClick={() => setView("table")} className={`p-1.5 rounded ${view === "table" ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted"}`} title="Table view"><Table className="w-4 h-4" /></button>
        </div>
        <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setPosFilter("all"); setTeamFilter("all"); setAgeFilter("all"); setGenderFilter("all"); setPlatformFilter("all"); }}>Reset</Button>
      </div>

      {isLoading ? (
        <div className="text-center py-20 text-muted-foreground">Loading roster...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">No players found. Adjust filters or add a player.</div>
      ) : view === "cards" ? (
        <>
          <div className="text-xs font-bold tracking-wider uppercase text-muted-foreground mb-3">{filtered.length} PLAYERS</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(p => {
              const skill = getPlayerScore(p.id);
              const phys = getPlayerPhysical(p.id);
              const perfIdx = skill && phys ? Math.round((skill + phys) / 2) : skill || phys;
              return (
                <Link key={p.id} to={`${createPageUrl("PlayerDetail")}?id=${p.id}`}>
                  <AdisalCard className="p-4 group cursor-pointer">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-lg font-bold text-foreground shrink-0 overflow-hidden">
                        {p.photo_url ? <img src={p.photo_url} alt="" className="w-full h-full object-cover" /> : `${p.first_name?.[0] || ""}${p.last_name?.[0] || ""}`}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-sm uppercase tracking-wide text-foreground truncate">{p.first_name} {p.last_name}</h3>
                        <p className="text-xs text-muted-foreground truncate">{p.position || "Unassigned"}</p>
                        <p className="text-[10px] text-muted-foreground/70 truncate mt-0.5">{p.team_name || "No team"}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-border">
                      <div className="text-center">
                        <div className="text-[10px] font-semibold tracking-wide uppercase text-muted-foreground">Physical</div>
                        <div className="text-sm font-bold text-foreground mt-0.5">{phys ?? "—"}</div>
                      </div>
                      <div className="text-center border-x border-border">
                        <div className="text-[10px] font-semibold tracking-wide uppercase text-muted-foreground">Skill</div>
                        <div className="text-sm font-bold text-foreground mt-0.5">{skill ?? "—"}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-[10px] font-semibold tracking-wide uppercase text-muted-foreground">Perf Index</div>
                        <div className="text-sm font-bold text-primary mt-0.5">{perfIdx ?? "—"}</div>
                      </div>
                    </div>
                  </AdisalCard>
                </Link>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <div className="text-xs font-bold tracking-wider uppercase text-muted-foreground mb-3">{filtered.length} PLAYERS · Click any skill score cell to edit inline</div>
          <div className="bg-card border border-border rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="text-left text-[10px] text-muted-foreground font-semibold uppercase border-b border-border">
                  <th className="py-2 px-3 sticky left-0 bg-muted/50 z-10">Player</th>
                  <th className="py-2 px-3">Team</th>
                  <th className="py-2 px-3">Pos</th>
                  <th className="py-2 px-3">Age</th>
                  <th className="py-2 px-3">Gender</th>
                  <th className="py-2 px-3 text-center">Physical</th>
                  <th className="py-2 px-3 text-center">Skill</th>
                  <th className="py-2 px-3 text-center">Perf Index</th>
                  {skillTests.map(t => <th key={t.id} className="py-2 px-3 text-center whitespace-nowrap">{t.title.substring(0, 12)}</th>)}
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const skill = getPlayerScore(p.id);
                  const phys = getPlayerPhysical(p.id);
                  const perfIdx = skill && phys ? Math.round((skill + phys) / 2) : skill || phys;
                  const team = teamMap.get(p.team_id);
                  const age = p.age_group || p.team_name?.match(/U(\d+)/)?.[1] || "—";
                  const gender = team?.gender || p.gender || "—";
                  return (
                    <tr key={p.id} className="border-b border-border/40 hover:bg-muted/20">
                      <td className="py-1.5 px-3 sticky left-0 bg-card z-10">
                        <Link to={`${createPageUrl("PlayerDetail")}?id=${p.id}`} className="font-medium hover:text-primary">{p.first_name} {p.last_name}</Link>
                      </td>
                      <td className="py-1.5 px-3 text-muted-foreground">{p.team_name || "—"}</td>
                      <td className="py-1.5 px-3 text-muted-foreground">{p.position || "—"}</td>
                      <td className="py-1.5 px-3 text-muted-foreground">{age}</td>
                      <td className="py-1.5 px-3 text-muted-foreground">{gender}</td>
                      <td className="py-1.5 px-3 text-center font-medium">{phys ?? "—"}</td>
                      <td className="py-1.5 px-3 text-center font-medium">{skill ?? "—"}</td>
                      <td className="py-1.5 px-3 text-center font-bold text-primary">{perfIdx ?? "—"}</td>
                      {skillTests.map(t => {
                        const score = playerSkillByTest[p.id]?.[t.id]?.score;
                        const isEditing = editing?.playerId === p.id && editing?.testId === t.id;
                        if (isEditing) {
                          return (
                            <td key={t.id} className="py-1 px-2 text-center">
                              <div className="flex items-center gap-1 justify-center">
                                <input
                                  type="number"
                                  value={editValue}
                                  onChange={e => setEditValue(e.target.value)}
                                  onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEdit(); }}
                                  autoFocus
                                  className="w-12 h-6 text-xs border border-primary rounded px-1 focus:outline-none"
                                />
                                <button onClick={saveEdit} disabled={saving} className="text-emerald-600 hover:text-emerald-700"><Check className="w-3.5 h-3.5" /></button>
                                <button onClick={cancelEdit} className="text-gray-400 hover:text-gray-600"><X className="w-3.5 h-3.5" /></button>
                              </div>
                            </td>
                          );
                        }
                        return (
                          <td
                            key={t.id}
                            className="py-1.5 px-3 text-center cursor-text hover:bg-primary/5"
                            onClick={() => startEdit(p.id, t.id, score)}
                          >
                            {score != null ? <span className="text-xs font-medium">{score}</span> : <span className="text-muted-foreground/40">—</span>}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}