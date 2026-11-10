import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { InlineSelect } from "./InlineSelect";
import { MultiAssignSelect } from "./MultiAssignSelect";
import { isPlayingUp } from "./ageGroupUtils";
import { Mail, Phone, CheckCircle2, XCircle, AlertCircle, TrendingUp } from "lucide-react";
import { createPageUrl } from "@/utils";

const POSITIONS = ["GK", "CB", "LB", "RB", "CDM", "CM", "CAM", "LW", "RW", "ST"];

const STATUS_STYLES = {
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  waitlisted: "bg-blue-50 text-blue-700 border-blue-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
  none: "bg-slate-50 text-slate-500 border-slate-200",
};

const PAY_STYLES = {
  paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  partial: "bg-amber-50 text-amber-700 border-amber-200",
  unpaid: "bg-red-50 text-red-700 border-red-200",
  refunded: "bg-slate-50 text-slate-500 border-slate-200",
  none: "bg-slate-50 text-slate-500 border-slate-200",
};

export default function PlayerManagementTable({ players, teams, guardians, registrations, locations, ageGroups, season, onUpdatePlayer }) {
  const [editingJersey, setEditingJersey] = useState(null);

  const guardianMap = useMemo(() => new Map(guardians.map((g) => [g.id, g])), [guardians]);
  const teamMap = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);
  const teamOptions = useMemo(() => teams.map((t) => ({ value: t.id, label: t.name })), [teams]);
  const positionOptions = useMemo(() => POSITIONS.map((p) => ({ value: p, label: p })), []);
  const guardianOptions = useMemo(() => guardians.map((g) => ({ value: g.id, label: `${g.first_name} ${g.last_name}` })), [guardians]);

  const getGuardians = (player) => {
    const ids = player.guardian_ids?.length > 0 ? player.guardian_ids : (player.guardian_id ? [player.guardian_id] : []);
    return ids.map((id) => guardianMap.get(id)).filter(Boolean);
  };

  const getRegInfo = (player) => {
    const reg = registrations.find((r) => r.player_id === player.id);
    return { regStatus: reg?.status || "none", paymentStatus: reg?.payment_status || "none", docsComplete: reg?.paperwork_complete || false, hasReg: !!reg };
  };

  const handleJerseyBlur = (player, value) => {
    if (value !== (player.jersey_number || "")) onUpdatePlayer(player.id, { jersey_number: value });
    setEditingJersey(null);
  };

  const handleGuardiansChange = (player, ids) => {
    const primary = ids[0] || "";
    const primaryGuardian = guardianMap.get(primary);
    onUpdatePlayer(player.id, {
      guardian_ids: ids,
      guardian_id: primary,
      guardian_name: primaryGuardian ? `${primaryGuardian.first_name} ${primaryGuardian.last_name}` : "",
    });
  };

  return (
    <div className="overflow-x-auto border border-border rounded-xl">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground uppercase">
            <th className="text-left py-2.5 px-3 font-semibold sticky left-0 bg-muted/30 z-10 min-w-44">Player</th>
            <th className="text-left py-2.5 px-2 font-semibold min-w-36">Team</th>
            <th className="text-center py-2.5 px-2 font-semibold min-w-24">Position</th>
            <th className="text-center py-2.5 px-2 font-semibold min-w-16">#</th>
            <th className="text-center py-2.5 px-2 font-semibold min-w-16">Age</th>
            <th className="text-center py-2.5 px-2 font-semibold min-w-20">Gender</th>
            <th className="text-center py-2.5 px-2 font-semibold min-w-20">Playing Up</th>
            <th className="text-left py-2.5 px-2 font-semibold min-w-52">Guardian(s)</th>
            <th className="text-center py-2.5 px-2 font-semibold min-w-24">Reg Status</th>
            <th className="text-center py-2.5 px-2 font-semibold min-w-24">Payment</th>
            <th className="text-center py-2.5 px-2 font-semibold min-w-20">Docs</th>
          </tr>
        </thead>
        <tbody>
          {players.length === 0 ? (
            <tr><td colSpan={11} className="py-6 text-center text-muted-foreground">No players found.</td></tr>
          ) : players.map((p) => {
            const pguardians = getGuardians(p);
            const reg = getRegInfo(p);
            const team = p.team_id ? teamMap.get(p.team_id) : null;
            const playingUp = team ? isPlayingUp(p, team, ageGroups, season) : false;
            return (
              <tr key={p.id} className="border-b border-border/40 hover:bg-muted/20">
                <td className="py-1.5 px-3 sticky left-0 bg-card z-10">
                  <Link to={`${createPageUrl("PlayerDetail")}?id=${p.id}`} className="flex items-center gap-2 hover:text-primary">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">{p.first_name?.[0]}{p.last_name?.[0]}</div>
                    <span className="font-medium truncate max-w-32">{p.first_name} {p.last_name}</span>
                  </Link>
                </td>
                <td className="py-0.5 px-1"><InlineSelect value={p.team_id} options={teamOptions} onChange={(v) => onUpdatePlayer(p.id, { team_id: v, team_name: teams.find((t) => t.id === v)?.name || "" })} placeholder="Unassigned" /></td>
                <td className="py-0.5 px-1 text-center"><InlineSelect value={p.position} options={positionOptions} onChange={(v) => onUpdatePlayer(p.id, { position: v })} /></td>
                <td className="py-0.5 px-1 text-center">
                  {editingJersey === p.id ? (
                    <Input defaultValue={p.jersey_number || ""} onBlur={(e) => handleJerseyBlur(p, e.target.value)} onKeyDown={(e) => e.key === "Enter" && e.target.blur()} className="h-7 w-12 text-xs text-center" autoFocus />
                  ) : (
                    <span onClick={() => setEditingJersey(p.id)} className="text-xs font-medium cursor-pointer hover:bg-muted/50 px-2 py-1 rounded">{p.jersey_number || "—"}</span>
                  )}
                </td>
                <td className="py-1.5 px-2 text-center text-xs text-muted-foreground">{p.age_group || "—"}</td>
                <td className="py-1.5 px-2 text-center text-xs text-muted-foreground">{p.gender || "—"}</td>
                <td className="py-1.5 px-2 text-center">
                  {playingUp ? <Badge variant="outline" className="text-[10px] bg-violet-50 text-violet-700 border-violet-200"><TrendingUp className="w-2.5 h-2.5 mr-0.5" />Playing Up</Badge> : <span className="text-[10px] text-muted-foreground/40">—</span>}
                </td>
                <td className="py-0.5 px-1">
                  <MultiAssignSelect
                    selected={p.guardian_ids?.length > 0 ? p.guardian_ids : (p.guardian_id ? [p.guardian_id] : [])}
                    options={guardianOptions}
                    onChange={(ids) => handleGuardiansChange(p, ids)}
                    placeholder="Assign"
                  />
                  {pguardians.length > 0 && (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {pguardians.map((g) => (
                        <div key={g.id} className="flex items-center gap-1">
                          {g.email && <a href={`mailto:${g.email}`} className="text-primary hover:opacity-70" onClick={(e) => e.stopPropagation()}><Mail className="w-2.5 h-2.5" /></a>}
                          {g.phone && <a href={`tel:${g.phone}`} className="text-primary hover:opacity-70" onClick={(e) => e.stopPropagation()}><Phone className="w-2.5 h-2.5" /></a>}
                        </div>
                      ))}
                    </div>
                  )}
                </td>
                <td className="py-1.5 px-2 text-center"><Badge variant="outline" className={`text-[10px] capitalize ${STATUS_STYLES[reg.regStatus]}`}>{reg.regStatus}</Badge></td>
                <td className="py-1.5 px-2 text-center"><Badge variant="outline" className={`text-[10px] capitalize ${PAY_STYLES[reg.paymentStatus]}`}>{reg.paymentStatus}</Badge></td>
                <td className="py-1.5 px-2 text-center">
                  {reg.hasReg ? (reg.docsComplete ? <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto" /> : <AlertCircle className="w-4 h-4 text-amber-500 mx-auto" />) : <XCircle className="w-4 h-4 text-slate-400 mx-auto" />}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}