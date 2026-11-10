import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { InlineSelect } from "@/components/admin/InlineSelect";
import { InlineSearchSelect } from "@/components/admin/InlineSearchSelect";
import { InlineDateInput } from "@/components/admin/InlineDateInput";
import { MultiAssignSelect } from "@/components/admin/MultiAssignSelect";
import { DollarSign, FileX, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { createPageUrl } from "@/utils";
import { POSITION_OPTIONS } from "@/lib/positions";

const FORMAT_ORDER = ["4v4", "7v7", "9v9", "11v11"];
const GENDER_OPTIONS = [
  { value: "Boys", label: "Boys" },
  { value: "Girls", label: "Girls" },
];

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

export default function PlayerMatrix({ players, teams, locations, ageGroups, registrations, guardians, onUpdatePlayer }) {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState("asc");

  const teamMap = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);
  const teamOptions = useMemo(() => teams.map((t) => ({ value: t.id, label: t.name })), [teams]);
  const locationOptions = useMemo(() => locations.map((l) => ({ value: l.name, label: l.name })), [locations]);
  const ageGroupOptions = useMemo(() => [...new Set(ageGroups.map((a) => a.age_group))].sort().map((a) => ({ value: a, label: a })), [ageGroups]);
  const positionOptions = useMemo(() => POSITION_OPTIONS.map((p) => ({ value: p.value, label: p.value })), []);
  const guardianOptions = useMemo(() => guardians.map((g) => ({ value: g.id, label: `${g.first_name} ${g.last_name}` })), [guardians]);
  const guardianMap = useMemo(() => new Map(guardians.map((g) => [g.id, g])), [guardians]);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sortPlayers = (list) => {
    if (!sortKey) return list;
    return [...list].sort((a, b) => {
      let aVal, bVal;
      switch (sortKey) {
        case "name": aVal = `${a.first_name} ${a.last_name}`.toLowerCase(); bVal = `${b.first_name} ${b.last_name}`.toLowerCase(); break;
        case "dob": aVal = a.date_of_birth || ""; bVal = b.date_of_birth || ""; break;
        case "gender": aVal = a.gender || ""; bVal = b.gender || ""; break;
        case "team": aVal = a.team_name || ""; bVal = b.team_name || ""; break;
        case "age": aVal = a.age_group || ""; bVal = b.age_group || ""; break;
        case "position": aVal = a.position || ""; bVal = b.position || ""; break;
        case "branch": aVal = a.location_name || ""; bVal = b.location_name || ""; break;
        case "guardian": aVal = a.guardian_name || ""; bVal = b.guardian_name || ""; break;
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
    for (const f of [...FORMAT_ORDER, "Unassigned"]) map.set(f, []);
    for (const p of players) {
      const team = p.team_id ? teamMap.get(p.team_id) : null;
      const fmt = team?.playing_format || "Unassigned";
      if (!map.has(fmt)) map.set(fmt, []);
      map.get(fmt).push(p);
    }
    // Sort each group
    for (const [k, v] of map) map.set(k, sortPlayers(v));
    return [...map.entries()];
  }, [players, teamMap, sortKey, sortDir]);

  const handleUpdate = (player, field, value) => onUpdatePlayer(player.id, { [field]: value });

  const handleTeamChange = (player, teamId) => {
    const team = teamMap.get(teamId);
    onUpdatePlayer(player.id, {
      team_id: teamId,
      team_name: team?.name || "",
      age_group: team?.age_group || player.age_group,
      league: team?.league || player.league,
      coach_id: team?.coach_id || "",
      coach_name: team?.coach_name || "",
    });
  };

  const handleGuardianChange = (player, ids) => {
    const primary = ids[0] || "";
    const g = guardianMap.get(primary);
    onUpdatePlayer(player.id, {
      guardian_ids: ids,
      guardian_id: primary,
      guardian_name: g ? `${g.first_name} ${g.last_name}` : "",
    });
  };

  const getRegBadges = (player) => {
    const reg = registrations.find((r) => r.player_id === player.id);
    if (!reg) return { missingPayment: false, missingDocs: false };
    return {
      missingPayment: reg.payment_status !== "paid" && reg.amount_due > 0,
      missingDocs: !reg.paperwork_complete,
    };
  };

  return (
    <div className="overflow-x-auto border border-border rounded-xl">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground uppercase">
            <th className="text-left py-2.5 px-3 font-semibold sticky left-0 bg-muted/30 z-10 min-w-40 cursor-pointer hover:bg-muted/50" onClick={() => handleSort("name")}>
              <div className="flex items-center gap-1">Player {sortKey === "name" ? (sortDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />}</div>
            </th>
            <SortHeader label="DOB" sortKey="dob" currentSort={sortKey} sortDir={sortDir} onSort={handleSort} />
            <SortHeader label="Gender" sortKey="gender" currentSort={sortKey} sortDir={sortDir} onSort={handleSort} />
            <SortHeader label="Team" sortKey="team" currentSort={sortKey} sortDir={sortDir} onSort={handleSort} className="min-w-40" />
            <SortHeader label="Age" sortKey="age" currentSort={sortKey} sortDir={sortDir} onSort={handleSort} />
            <SortHeader label="Position" sortKey="position" currentSort={sortKey} sortDir={sortDir} onSort={handleSort} className="min-w-36" />
            <SortHeader label="Branch" sortKey="branch" currentSort={sortKey} sortDir={sortDir} onSort={handleSort} className="min-w-28" />
            <SortHeader label="Guardian" sortKey="guardian" currentSort={sortKey} sortDir={sortDir} onSort={handleSort} className="min-w-32" />
            <th className="text-center py-2.5 px-2 font-semibold min-w-24">Pay/Docs</th>
          </tr>
        </thead>
        <tbody>
          {grouped.map(([format, formatPlayers]) => (
            <React.Fragment key={format}>
              <tr className="bg-primary/5 border-b border-border">
                <td colSpan={9} className="py-1.5 px-3 sticky left-0 z-10">
                  <span className="text-xs font-bold uppercase tracking-wide text-primary">{format}</span>
                  <span className="text-xs text-muted-foreground ml-2">({formatPlayers.length} players)</span>
                </td>
              </tr>
              {formatPlayers.length === 0 ? (
                <tr className="border-b border-border/40"><td colSpan={9} className="py-3 px-3 text-xs text-muted-foreground italic">No {format} players</td></tr>
              ) : formatPlayers.map((p) => {
                const g = getRegBadges(p);
                return (
                  <tr key={p.id} className="border-b border-border/40 hover:bg-muted/20">
                    <td className="py-1.5 px-3 sticky left-0 bg-card z-10">
                      <Link to={`${createPageUrl("PlayerDetail")}?id=${p.id}`} className="font-medium text-foreground hover:text-primary truncate block max-w-40">{p.first_name} {p.last_name}</Link>
                    </td>
                    <td className="py-0.5 px-1 text-center"><InlineDateInput value={p.date_of_birth} onChange={(v) => handleUpdate(p, "date_of_birth", v)} /></td>
                    <td className="py-0.5 px-1 text-center"><InlineSelect value={p.gender} options={GENDER_OPTIONS} onChange={(v) => handleUpdate(p, "gender", v)} /></td>
                    <td className="py-0.5 px-1"><InlineSearchSelect value={p.team_id} options={teamOptions} onChange={(v) => handleTeamChange(p, v)} placeholder="No team" /></td>
                    <td className="py-0.5 px-1 text-center"><InlineSelect value={p.age_group} options={ageGroupOptions} onChange={(v) => handleUpdate(p, "age_group", v)} /></td>
                    <td className="py-0.5 px-1"><InlineSelect value={p.position} options={positionOptions} onChange={(v) => handleUpdate(p, "position", v)} placeholder="—" /></td>
                    <td className="py-0.5 px-1"><InlineSelect value={p.location_name} options={locationOptions} onChange={(v) => handleUpdate(p, "location_name", v)} /></td>
                    <td className="py-0.5 px-1"><MultiAssignSelect selected={p.guardian_ids || (p.guardian_id ? [p.guardian_id] : [])} options={guardianOptions} onChange={(ids) => handleGuardianChange(p, ids)} placeholder="Assign" /></td>
                    <td className="py-1.5 px-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {g.missingPayment && <Badge variant="outline" className="text-[10px] bg-red-50 text-red-700 border-red-200"><DollarSign className="w-2.5 h-2.5" /></Badge>}
                        {g.missingDocs && <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200"><FileX className="w-2.5 h-2.5" /></Badge>}
                        {!g.missingPayment && !g.missingDocs && <span className="text-[10px] text-muted-foreground/40">—</span>}
                      </div>
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