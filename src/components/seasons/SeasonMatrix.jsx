import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { isLive, matrixIssues, confirmMatrix } from "@/lib/seasonRollover";

const ageOf = (t) => parseInt(/\d+/.exec(t.age_group || "")?.[0] || "0", 10);

/** Phase 2: age group/gender rows by platform columns, drag teams between platforms. */
export default function SeasonMatrix({ season, clubId, onConfirmed }) {
  const qc = useQueryClient();
  const [newName, setNewName] = useState("");
  const [newAges, setNewAges] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const { data: teams = [] } = useQuery({ queryKey: ["season-teams", season.name], queryFn: () => base44.entities.Team.filter({ season: season.name }) });
  const { data: platforms = [] } = useQuery({ queryKey: ["season-platforms"], queryFn: () => base44.entities.Platform.list() });
  const live = teams.filter(isLive);
  const issues = matrixIssues(teams, platforms);
  const locked = !!season.matrix_confirmed;
  const rows = [...new Set(live.map((t) => `${t.age_group || "?"}|${t.gender || ""}`))].sort((a, b) => ageOf({ age_group: a }) - ageOf({ age_group: b }));
  const cols = [{ id: "none", name: "Unassigned" }, ...platforms.filter((p) => p.is_active !== false)];
  const refresh = () => qc.invalidateQueries({ queryKey: ["season-teams", season.name] });

  // Tap-to-move: tap a team chip to select, then tap a platform column to move it.
  const tapTeam = (teamId) => {
    if (locked) return;
    setSelectedTeamId((prev) => (prev === teamId ? null : teamId));
  };
  const tapColumn = async (rowKey, colId) => {
    if (!selectedTeamId || locked) return;
    const team = live.find((t) => t.id === selectedTeamId);
    setSelectedTeamId(null);
    if (!team) return;
    if (`${team.age_group || "?"}|${team.gender || ""}` !== rowKey) return toast.error("Teams can only move between platforms within their own age group row.");
    const p = platforms.find((x) => x.id === colId);
    await base44.entities.Team.update(team.id, { platform_id: p?.id || null, platform_name: p?.name || null });
    refresh();
  };

  const onDragEnd = async ({ draggableId, destination }) => {
    if (!destination || locked) return;
    const [row, col] = destination.droppableId.split("::");
    const team = live.find((t) => t.id === draggableId);
    if (!team || `${team.age_group || "?"}|${team.gender || ""}` !== row) return toast.error("Teams can only move between platforms within their own age group row.");
    const p = platforms.find((x) => x.id === col);
    await base44.entities.Team.update(team.id, { platform_id: p?.id || null, platform_name: p?.name || null });
    refresh();
  };

  const addPlatform = async () => {
    await base44.entities.Platform.create({
      club_id: clubId, name: newName, season_name: season.name, is_active: true,
      eligible_age_groups: newAges.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean),
    });
    setNewName(""); setNewAges("");
    qc.invalidateQueries({ queryKey: ["season-platforms"] });
  };

  const confirm = async () => {
    if (!window.confirm("Confirm the matrix? Teams become Planned and team creation is locked for this season.")) return;
    await confirmMatrix(season, teams, clubId);
    toast.success("Matrix confirmed. Teams are now Planned.");
    onConfirmed?.();
  };

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <DragDropContext onDragEnd={onDragEnd}>
          <table className="w-full text-sm border-collapse">
            <thead><tr><th className="text-left p-2 w-28">Age / gender</th>{cols.map((c) => <th key={c.id} className="text-left p-2 min-w-[150px]">{c.name}</th>)}</tr></thead>
            {selectedTeamId && <tbody><tr><td colSpan={cols.length + 1} className="p-2 text-xs text-primary">Tap a platform column to move the selected team.</td></tr></tbody>}
            <tbody>
              {rows.map((row) => (
                <tr key={row} className="border-t border-border/60 align-top">
                  <td className="p-2 font-semibold">{row.replace("|", " · ")}</td>
                  {cols.map((c) => (
                    <Droppable key={c.id} droppableId={`${row}::${c.id}`}>
                      {(prov, snap) => (
                        <td ref={prov.innerRef} {...prov.droppableProps} onClick={() => tapColumn(row, c.id)} className={`p-1.5 cursor-pointer transition-colors ${snap.isDraggingOver ? "bg-primary/10" : ""} ${selectedTeamId ? "hover:bg-primary/5" : ""}`}>
                          {live.filter((t) => `${t.age_group || "?"}|${t.gender || ""}` === row && (t.platform_id || "none") === c.id).map((t, i) => (
                            <Draggable key={t.id} draggableId={t.id} index={i} isDragDisabled={locked}>
                              {(p) => (
                                <div ref={p.innerRef} {...p.draggableProps} {...p.dragHandleProps}
                                  onClick={(e) => { e.stopPropagation(); tapTeam(t.id); }}
                                  className={`mb-1 px-2 py-1 rounded-md border text-xs bg-card cursor-pointer transition-colors ${selectedTeamId === t.id ? "border-primary ring-2 ring-primary/30" : issues.some((x) => x.teamId === t.id) ? "border-amber-400" : "border-border"}`}>
                                  {t.name}
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {prov.placeholder}
                        </td>
                      )}
                    </Droppable>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </DragDropContext>
        {rows.length === 0 && <p className="text-sm text-muted-foreground p-6 text-center">No teams to place yet. Finish the rollover review first.</p>}
      </div>

      {!locked && (
        <div className="flex gap-2 flex-wrap items-center">
          <Input className="w-44" placeholder="New platform" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <Input className="w-56" placeholder="Eligible ages, e.g. U12, U13 (optional)" value={newAges} onChange={(e) => setNewAges(e.target.value)} />
          <Button size="sm" variant="outline" disabled={!newName} onClick={addPlatform}>Add platform</Button>
        </div>
      )}

      <div className="space-y-1">
        {issues.map((i, k) => <p key={k} className="text-xs text-amber-700 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" />{i.message}</p>)}
        {issues.length === 0 && live.length > 0 && <p className="text-xs text-emerald-700 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" />No rule violations.</p>}
      </div>

      {locked ? <Badge className="bg-emerald-100 text-emerald-700">Matrix confirmed</Badge> : (
        <Button onClick={confirm} disabled={issues.length > 0 || live.length === 0}>Confirm matrix</Button>
      )}
    </div>
  );
}