import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Users, Star, Search, X } from "lucide-react";
import { toast } from "sonner";
import useCoachCompliance from "@/components/compliance/useCoachCompliance";
import CoachComplianceBadge from "@/components/compliance/CoachComplianceBadge";

/** Enhanced roster board: drag evaluated players onto teams, shows evaluation scores. */
export default function RosterBoard({ plan, teams, mainTryout, currentUser }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);

  const { data: regs = [] } = useQuery({
    queryKey: ["roster-regs", mainTryout?.id],
    queryFn: () => base44.entities.TryoutRegistration.filter({ tryout_event_id: mainTryout.id }, "player_name", 500),
    enabled: !!mainTryout,
  });
  const playerIds = regs.map((r) => r.player_id).filter(Boolean);
  const { data: players = [] } = useQuery({
    queryKey: ["roster-players", playerIds.join(",")],
    queryFn: () => Promise.all(playerIds.map((id) => base44.entities.Player.get(id).catch(() => null))).then((r) => r.filter(Boolean)),
    enabled: playerIds.length > 0,
  });
  const { data: evals = {} } = useQuery({
    queryKey: ["roster-evals", playerIds.join(",")],
    queryFn: async () => {
      const all = await base44.entities.PlayerEvaluation.filter({ player_id: { $in: playerIds } }, "-evaluation_date", 500).catch(() => []);
      const byPlayer = {};
      all.forEach((e) => { if (!byPlayer[e.player_id] || new Date(e.evaluation_date) > new Date(byPlayer[e.player_id].evaluation_date)) byPlayer[e.player_id] = e; });
      return byPlayer;
    },
    enabled: playerIds.length > 0,
  });
  const { data: coaches = [] } = useQuery({ queryKey: ["roster-coaches"], queryFn: () => base44.entities.Coach.list("-created_date", 500) });
  const { data: comp } = useCoachCompliance(currentUser?.club_id);
  const coachMap = useMemo(() => Object.fromEntries(coaches.map((c) => [c.id, c])), [coaches]);
  const teamCoachEmails = (team) => [...(team.coach_ids || []), team.coach_id].filter(Boolean).map((id) => coachMap[id]).filter(Boolean);

  const playerMap = useMemo(() => Object.fromEntries(players.map((p) => [p.id, p])), [players]);
  const unassigned = regs.filter((r) => r.player_id && playerMap[r.player_id] && !playerMap[r.player_id].team_id);
  const filtered = unassigned.filter((r) => !search || r.player_name.toLowerCase().includes(search.toLowerCase()));

  const onDragEnd = async ({ source, destination, draggableId }) => {
    if (!destination) return;
    const player = playerMap[draggableId];
    if (!player) return;
    const fromPool = source.droppableId === "pool";
    const toPool = destination.droppableId === "pool";
    if (fromPool && toPool) return;
    const team = teams.find((t) => t.id === destination.droppableId);
    if (!team) return;
    const rostered = (team.player_ids || []).length;
    if (rostered >= (team.max_roster_size || 18)) { toast.error(`${team.name} is full.`); return; }
    await base44.entities.Player.update(player.id, { team_id: team.id, team_name: team.name, age_group: team.age_group, status: "active" });
    await base44.entities.Team.update(team.id, { player_ids: [...(team.player_ids || []), player.id] });
    qc.invalidateQueries({ queryKey: ["roster-players"] });
    qc.invalidateQueries({ queryKey: ["roster-regs"] });
  };

  const removeFromTeam = async (player, team) => {
    await base44.entities.Player.update(player.id, { team_id: "", team_name: "" });
    await base44.entities.Team.update(team.id, { player_ids: (team.player_ids || []).filter((id) => id !== player.id) });
    qc.invalidateQueries({ queryKey: ["roster-players"] });
  };

  // Tap-to-move: tap a pool player to select, then tap a team card to assign.
  const tapPlayer = (playerId) => {
    setSelectedPlayerId((prev) => (prev === playerId ? null : playerId));
  };
  const tapTeam = async (team) => {
    if (!selectedPlayerId) return;
    const player = playerMap[selectedPlayerId];
    setSelectedPlayerId(null);
    if (!player) return;
    const rostered = (team.player_ids || []).length;
    if (rostered >= (team.max_roster_size || 18)) { toast.error(`${team.name} is full.`); return; }
    await base44.entities.Player.update(player.id, { team_id: team.id, team_name: team.name, age_group: team.age_group, status: "active" });
    await base44.entities.Team.update(team.id, { player_ids: [...(team.player_ids || []), player.id] });
    qc.invalidateQueries({ queryKey: ["roster-players"] });
    qc.invalidateQueries({ queryKey: ["roster-regs"] });
  };

  if (!mainTryout) return <p className="text-sm text-muted-foreground">Create the Main Tryout first.</p>;

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <Card className="h-fit">
          <CardContent className="p-3 space-y-2">
            <p className="text-sm font-semibold flex items-center gap-1.5"><Users className="w-4 h-4 text-primary" /> Pool ({filtered.length})</p>
            <p className="text-[11px] text-muted-foreground">Tap a player, then tap a team to assign.</p>
            <div className="relative"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" /><Input className="pl-8 h-8 text-sm" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
            <Droppable droppableId="pool">
              {(prov) => (
                <div ref={prov.innerRef} {...prov.droppableProps} className="space-y-1 min-h-[200px]">
                  {filtered.map((r, i) => {
                    const p = playerMap[r.player_id]; if (!p) return null;
                    const score = evals[p.id]?.overall_score;
                    return (
                      <Draggable key={p.id} draggableId={p.id} index={i}>
                        {(dp) => (
                          <div ref={dp.innerRef} {...dp.draggableProps} {...dp.dragHandleProps}
                            onClick={() => tapPlayer(p.id)}
                            className={`flex items-center gap-2 p-2 rounded-lg border bg-card cursor-grab hover:border-primary/40 text-sm transition-colors ${selectedPlayerId === p.id ? "border-primary ring-2 ring-primary/30" : "border-border"}`}>
                            <span className="flex-1 truncate">{p.first_name} {p.last_name}</span>
                            {score && <Badge variant="outline" className="text-xs gap-0.5"><Star className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />{score}</Badge>}
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {filtered.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No unassigned players.</p>}
                  {prov.placeholder}
                </div>
              )}
            </Droppable>
          </CardContent>
        </Card>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {teams.map((team) => {
            const rostered = players.filter((p) => p.team_id === team.id);
            return (
              <Card key={team.id} className={selectedPlayerId ? "ring-2 ring-primary/40 cursor-pointer" : ""} onClick={() => tapTeam(team)}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold truncate">{team.name}</p>
                    <div className="flex items-center gap-1.5">
                      <CoachComplianceBadge coaches={teamCoachEmails(team)} byEmail={comp?.byEmail} compact />
                      <Badge variant="outline" className="text-xs">{rostered.length}/{team.max_roster_size || 18}</Badge>
                    </div>
                  </div>
                  <Droppable droppableId={team.id}>
                    {(prov, snap) => (
                      <div ref={prov.innerRef} {...prov.droppableProps} className={`space-y-1 min-h-[120px] rounded-lg p-1.5 transition-colors ${snap.isDraggingOver ? "bg-primary/10" : ""}`}>
                        {rostered.map((p, i) => {
                          const score = evals[p.id]?.overall_score;
                          return (
                            <Draggable key={p.id} draggableId={p.id} index={i}>
                              {(dp) => (
                                <div ref={dp.innerRef} {...dp.draggableProps} {...dp.dragHandleProps}
                                  className="flex items-center gap-2 p-2 rounded-lg border border-border bg-card cursor-grab text-sm">
                                  <span className="flex-1 truncate">{p.first_name} {p.last_name}</span>
                                  {score && <Badge variant="outline" className="text-xs gap-0.5"><Star className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />{score}</Badge>}
                                  <button onClick={() => removeFromTeam(p, team)} className="text-muted-foreground hover:text-destructive"><X className="w-3.5 h-3.5" /></button>
                                </div>
                              )}
                            </Draggable>
                          );
                        })}
                        {rostered.length === 0 && <p className="text-xs text-muted-foreground text-center py-3">Drag players here</p>}
                        {prov.placeholder}
                      </div>
                    )}
                  </Droppable>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </DragDropContext>
  );
}