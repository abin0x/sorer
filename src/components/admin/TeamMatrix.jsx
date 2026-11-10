import React, { useMemo, useState } from "react";
import { Link } from '@/lib/router-compat';
import { Badge } from "@/components/ui/badge";
import { InlineSelect } from "@/components/admin/InlineSelect";
import { MultiAssignSelect } from "@/components/admin/MultiAssignSelect";
import { DollarSign, FileX, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { createPageUrl } from "@/utils";

const FORMAT_ORDER = ["4v4", "7v7", "9v9", "11v11"];

function SortHeader({ label, sortKey, currentSort, sortDir, onSort, className = "" }) {
  const isActive = currentSort === sortKey;
  return (
    <th
      className={`text-center py-2.5 px-2 font-semibold cursor-pointer hover:bg-muted/50 select-none whitespace-nowrap ${className}`}
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center justify-center gap-1">
        {label}
        {isActive ? (sortDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
      </div>
    </th>
  );
}

function getTeamBadges(team, registrations) {
  const playerIds = team.player_ids || [];
  const teamRegs = registrations.filter((r) => playerIds.includes(r.player_id));
  const missingPayments = teamRegs.filter((r) => r.payment_status !== "paid").length;
  const missingDocs = teamRegs.filter((r) => !r.paperwork_complete).length;
  const missingReg = playerIds.length - teamRegs.length;
  return { missingPayments, missingDocs, missingReg, total: playerIds.length };
}

export default function TeamMatrix({ teams, registrations, coaches, guardians, platforms, locations, ageGroups, onUpdateTeam }) {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState("asc");

  const coachOptions = useMemo(() => coaches.map((c) => ({ value: c.id, label: `${c.first_name} ${c.last_name}` })), [coaches]);
  const guardianOptions = useMemo(() => guardians.map((g) => ({ value: g.id, label: `${g.first_name} ${g.last_name}` })), [guardians]);
  const platformOptions = useMemo(() => platforms.map((p) => ({ value: p.name, label: p.name })), [platforms]);
  const locationOptions = useMemo(() => locations.map((l) => ({ value: l.name, label: l.name })), [locations]);
  const ageGroupOptions = useMemo(() => [...new Set(ageGroups.map((a) => a.age_group))].sort().map((a) => ({ value: a, label: a })), [ageGroups]);
  const formatOptions = FORMAT_ORDER.map((f) => ({ value: f, label: f }));

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sortTeams = (list) => {
    if (!sortKey) return list;
    return [...list].sort((a, b) => {
      let aVal, bVal;
      switch (sortKey) {
        case "name": aVal = a.name || ""; bVal = b.name || ""; break;
        case "format": aVal = a.playing_format || ""; bVal = b.playing_format || ""; break;
        case "platform": aVal = a.platform_name || ""; bVal = b.platform_name || ""; break;
        case "gender": aVal = a.gender || ""; bVal = b.gender || ""; break;
        case "age": aVal = a.age_group || ""; bVal = b.age_group || ""; break;
        case "branch": aVal = a.location_name || ""; bVal = b.location_name || ""; break;
        case "coach": aVal = a.coach_names?.[0] || a.coach_name || ""; bVal = b.coach_names?.[0] || b.coach_name || ""; break;
        case "roster": aVal = a.player_ids?.length || 0; bVal = b.player_ids?.length || 0; break;
        default: return 0;
      }
      if (typeof aVal === "string") aVal = aVal.toLowerCase();
      if (typeof bVal === "string") bVal = bVal.toLowerCase();
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  };

  const grouped = useMemo(() => {
    const map = new Map();
    for (const f of FORMAT_ORDER) map.set(f, []);
    for (const t of teams) {
      const fmt = t.playing_format || "11v11";
      if (!map.has(fmt)) map.set(fmt, []);
      map.get(fmt).push(t);
    }
    for (const [k, v] of map) map.set(k, sortTeams(v));
    return [...map.entries()];
  }, [teams, sortKey, sortDir]);

  const handleUpdate = (team, field, value) => onUpdateTeam(team.id, { [field]: value });

  const handleCoachesChange = (team, ids) => {
    const names = ids.map((id) => coaches.find((c) => c.id === id)).filter(Boolean).map((c) => `${c.first_name} ${c.last_name}`);
    onUpdateTeam(team.id, { coach_ids: ids, coach_names: names, coach_id: ids[0] || "", coach_name: names[0] || "" });
  };

  const handleManagersChange = (team, ids) => {
    const names = ids.map((id) => guardians.find((g) => g.id === id)).filter(Boolean).map((g) => `${g.first_name} ${g.last_name}`);
    onUpdateTeam(team.id, { team_manager_ids: ids, team_manager_names: names, team_manager_id: ids[0] || "", team_manager_name: names[0] || "" });
  };

  return (
    <div className="overflow-x-auto border border-border rounded-xl">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground uppercase">
            <th className="text-left py-2.5 px-3 font-semibold sticky left-0 bg-muted/30 z-10 min-w-40 cursor-pointer hover:bg-muted/50" onClick={() => handleSort("name")}>
              <div className="flex items-center gap-1">Team {sortKey === "name" ? (sortDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />}</div>
            </th>
            <SortHeader label="Format" sortKey="format" currentSort={sortKey} sortDir={sortDir} onSort={handleSort} />
            <SortHeader label="Platform" sortKey="platform" currentSort={sortKey} sortDir={sortDir} onSort={handleSort} className="min-w-32" />
            <SortHeader label="Gender" sortKey="gender" currentSort={sortKey} sortDir={sortDir} onSort={handleSort} />
            <SortHeader label="Age" sortKey="age" currentSort={sortKey} sortDir={sortDir} onSort={handleSort} />
            <SortHeader label="Branch" sortKey="branch" currentSort={sortKey} sortDir={sortDir} onSort={handleSort} className="min-w-28" />
            <SortHeader label="Coach(es)" sortKey="coach" currentSort={sortKey} sortDir={sortDir} onSort={handleSort} className="min-w-40" />
            <th className="text-left py-2.5 px-2 font-semibold min-w-40">Team Mgr(s)</th>
            <SortHeader label="Roster" sortKey="roster" currentSort={sortKey} sortDir={sortDir} onSort={handleSort} />
            <th className="text-center py-2.5 px-2 font-semibold min-w-28">Payments</th>
            <th className="text-center py-2.5 px-2 font-semibold min-w-28">Docs/Reg</th>
          </tr>
        </thead>
        <tbody>
          {grouped.map(([format, formatTeams]) => (
            <React.Fragment key={format}>
              <tr className="bg-primary/5 border-b border-border">
                <td colSpan={11} className="py-1.5 px-3 sticky left-0 z-10">
                  <span className="text-xs font-bold uppercase tracking-wide text-primary">{format}</span>
                  <span className="text-xs text-muted-foreground ml-2">({formatTeams.length} teams)</span>
                </td>
              </tr>
              {formatTeams.length === 0 ? (
                <tr className="border-b border-border/40"><td colSpan={11} className="py-3 px-3 text-xs text-muted-foreground italic">No {format} teams</td></tr>
              ) : formatTeams.map((team) => {
                const badges = getTeamBadges(team, registrations);
                return (
                  <tr key={team.id} className="border-b border-border/40 hover:bg-muted/20">
                    <td className="py-1.5 px-3 sticky left-0 bg-card z-10">
                      <Link to={`${createPageUrl("TeamDetail")}?id=${team.id}`} className="font-medium text-foreground hover:text-primary truncate block max-w-40">{team.name}</Link>
                    </td>
                    <td className="py-0.5 px-1 text-center"><InlineSelect value={team.playing_format} options={formatOptions} onChange={(v) => handleUpdate(team, "playing_format", v)} /></td>
                    <td className="py-0.5 px-1"><InlineSelect value={team.platform_name} options={platformOptions} onChange={(v) => handleUpdate(team, "platform_name", v)} /></td>
                    <td className="py-0.5 px-1 text-center"><InlineSelect value={team.gender} options={[{ value: "Boys", label: "Boys" }, { value: "Girls", label: "Girls" }, { value: "Boys and Girls", label: "B & G" }]} onChange={(v) => handleUpdate(team, "gender", v)} /></td>
                    <td className="py-0.5 px-1 text-center"><InlineSelect value={team.age_group} options={ageGroupOptions} onChange={(v) => handleUpdate(team, "age_group", v)} /></td>
                    <td className="py-0.5 px-1"><InlineSelect value={team.location_name} options={locationOptions} onChange={(v) => handleUpdate(team, "location_name", v)} /></td>
                    <td className="py-0.5 px-1"><MultiAssignSelect selected={team.coach_ids || (team.coach_id ? [team.coach_id] : [])} options={coachOptions} onChange={(ids) => handleCoachesChange(team, ids)} placeholder="Assign" /></td>
                    <td className="py-0.5 px-1"><MultiAssignSelect selected={team.team_manager_ids || (team.team_manager_id ? [team.team_manager_id] : [])} options={guardianOptions} onChange={(ids) => handleManagersChange(team, ids)} placeholder="Assign" /></td>
                    <td className="py-1.5 px-2 text-center"><span className="text-xs font-medium">{badges.total}/{team.max_roster_size || 18}</span></td>
                    <td className="py-1.5 px-2 text-center">
                      {badges.missingPayments > 0 ? <Badge variant="outline" className="text-[10px] bg-red-50 text-red-700 border-red-200"><DollarSign className="w-2.5 h-2.5 mr-0.5" />{badges.missingPayments}</Badge> : <span className="text-[10px] text-muted-foreground/40">—</span>}
                    </td>
                    <td className="py-1.5 px-2 text-center">
                      {badges.missingDocs + badges.missingReg > 0 ? <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200"><FileX className="w-2.5 h-2.5 mr-0.5" />{badges.missingDocs + badges.missingReg}</Badge> : <span className="text-[10px] text-muted-foreground/40">—</span>}
                    </td>
                  </tr>
                );
              })}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}