import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Star, Search, X, ArrowDownWideNarrow, Hand, Shield, Pencil, Plus, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { recommendationLabel, recommendationTone } from "@/lib/evaluationCriteria";
import useCoachCompliance from "@/components/compliance/useCoachCompliance";
import CoachComplianceBadge from "@/components/compliance/CoachComplianceBadge";
import { useTenant } from "@/lib/TenantContext";
import { teamPlanForTeam } from "@/lib/tryoutWorkflow";
import { canManagePlan } from "@/lib/tryoutAccess";
import TeamPlanWizard from "./TeamPlanWizard";
import { usePlayerRetention } from '@/hooks/usePlayerRetention';
import { RetentionWorkspace, RetentionBadges } from './PlayerRetentionReview';

const REC_ORDER = { offer: 0, needs_look: 1, waitlist: 2, not_selected: 3 };

/** Combines every coach's tryout scores for a player: average grade + the most common recommendation. */
function summarize(evals) {
  const byPlayer = {};
  for (const e of evals) {
    if (!e.player_id) continue;
    const s = (byPlayer[e.player_id] ||= { grades: [], recs: {} });
    if (Number(e.overall_grade) > 0) s.grades.push(Number(e.overall_grade));
    if (e.recommendation) s.recs[e.recommendation] = (s.recs[e.recommendation] || 0) + 1;
  }
  return Object.fromEntries(Object.entries(byPlayer).map(([id, s]) => {
    const rec = Object.entries(s.recs).sort((a, b) => b[1] - a[1])[0]?.[0] || "";
    const avg = s.grades.length ? s.grades.reduce((a, b) => a + b, 0) / s.grades.length : 0;
    return [id, { score: avg ? Math.round(avg * 10) / 10 : null, count: s.grades.length, rec }];
  }));
}

/** Pool → teams. Drag a player onto a team, or tap a player then tap a team (works on a phone).
 *  Coaches' combined scores and recommendations ride along so the decision is right there. */
export default function RosterBoard({ plan, teams, mainTryout, currentUser }) {
  const qc = useQueryClient();
  const { effectiveClubId: clubId } = useTenant();
  const retention = usePlayerRetention(plan?.season || '');
  const [editingPlan, setEditingPlan] = useState(null);
  const canManage = canManagePlan(plan, currentUser);
  const teamPlansQuery = useQuery({
    queryKey: ["teamPlans", clubId],
    queryFn: () => base44.entities.TeamPlan.filter({ club_id: clubId }, "-created_date", 500),
    enabled: !!clubId && canManage,
  });
  const openTeamPlan = (team) => {
    const existing = teamPlanForTeam(teamPlansQuery.data || [], team.id, clubId);
    setEditingPlan(existing || { team_id: team.id, team_name: team.name, club_id: clubId, age_group: team.age_group || plan.age_group || "", gender: team.gender || plan.gender || "Boys and Girls", playing_format: team.playing_format || team.format || plan.format || "", season: plan.season || "", branch_id: team.branch_id || team.location_id || "", coach_id: team.coach_id || "" });
  };
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("score");
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [busy, setBusy] = useState(false);

  // Every registration for this tryout (any session) plus the current players of
  // the tryout's teams are in the pool automatically. Placement is a next-season
  // decision stored on the registration — the player's current team is untouched.
  const { data: regs = [] } = useQuery({
    queryKey: ["roster-regs", clubId, plan?.id],
    queryFn: () => base44.entities.TryoutRegistration.filter({ club_id: clubId, tryout_plan_id: plan.id }, "player_name", 1000),
    enabled: !!clubId && !!plan?.id,
  });
  const teamKey = (teams || []).map((t) => t.id).join(",");
  const { data: returning = [] } = useQuery({
    queryKey: ["roster-returning", clubId, teamKey],
    queryFn: () => base44.entities.Player.filter({ club_id: clubId, team_id: { $in: teams.map((t) => t.id) } }, null, 1000),
    enabled: !!clubId && teams.length > 0,
  });
  const activeRegs = useMemo(() => regs.filter((r) => r.status !== "cancelled" && r.player_id), [regs]);
  const regByPlayer = useMemo(() => Object.fromEntries(activeRegs.map((r) => [r.player_id, r])), [activeRegs]);
  const playerIds = useMemo(() => [...new Set([...activeRegs.map((r) => r.player_id), ...returning.map((p) => p.id)])], [activeRegs, returning]);
  const { data: regPlayers = [] } = useQuery({
    queryKey: ["roster-players", clubId, playerIds.join(",")],
    queryFn: () => base44.entities.Player.filter({ club_id: clubId, id: { $in: playerIds } }, null, 1000),
    enabled: !!clubId && playerIds.length > 0,
  });
  const players = useMemo(() => {
    const byId = Object.fromEntries([...returning, ...regPlayers].map((p) => [p.id, p]));
    return playerIds.map((id) => byId[id]).filter(Boolean);
  }, [returning, regPlayers, playerIds]);
  const { data: scores = {} } = useQuery({
    queryKey: ["roster-evals", clubId, plan?.id],
    queryFn: async () => summarize(await base44.entities.TryoutEvaluation.filter({ club_id: clubId, tryout_plan_id: plan.id }, null, 5000).catch(() => [])),
    enabled: !!clubId && !!plan?.id,
  });
  const { data: coaches = [] } = useQuery({ queryKey: ["roster-coaches", clubId], queryFn: () => base44.entities.Coach.filter({ club_id: clubId }, "-created_date", 500), enabled: !!clubId });
  const { data: comp } = useCoachCompliance(clubId);
  const coachMap = useMemo(() => Object.fromEntries(coaches.map((c) => [c.id, c])), [coaches]);
  const teamCoaches = (team) => [...(team.coach_ids || []), team.coach_id].filter(Boolean).map((id) => coachMap[id]).filter(Boolean);

  const playerMap = useMemo(() => Object.fromEntries(players.map((p) => [p.id, p])), [players]);
  const placedTeam = (p) => regByPlayer[p.id]?.placed_team_id || null;
  const pool = players
    .filter((p) => !placedTeam(p))
    .filter((p) => !search || `${p.first_name} ${p.last_name}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sort === "name") return `${a.last_name}`.localeCompare(`${b.last_name}`);
      if (sort === "rec") return (REC_ORDER[scores[a.id]?.rec] ?? 9) - (REC_ORDER[scores[b.id]?.rec] ?? 9) || (scores[b.id]?.score || 0) - (scores[a.id]?.score || 0);
      return (scores[b.id]?.score || 0) - (scores[a.id]?.score || 0);
    });
  const rosterOf = (team) => players.filter((p) => placedTeam(p) === team.id);
  const selected = selectedPlayerId ? playerMap[selectedPlayerId] : null;

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["roster-players"] });
    qc.invalidateQueries({ queryKey: ["roster-regs"] });
  };

  const place = async (player, team) => {
    const reg = regByPlayer[player.id];
    const patch = { placed_team_id: team?.id || null, placed_team_name: team?.name || null };
    if (reg) return base44.entities.TryoutRegistration.update(reg.id, patch);
    return base44.entities.TryoutRegistration.create({
      club_id: clubId, player_id: player.id, player_name: `${player.first_name} ${player.last_name}`,
      tryout_plan_id: plan.id, tryout_event_id: mainTryout?.id || null, season_name: plan.season || null,
      status: "registered", guardian_name: player.guardian_name || null, registered_date: new Date().toISOString().slice(0, 10),
      notes: "Returning player added to the tryout pool automatically.", ...patch,
    });
  };

  const assign = async (player, team) => {
    if (busy || !canManage) return;
    const max = team.max_roster_size || 18;
    if (rosterOf(team).length >= max) { toast.error(`${team.name} is full (${max}).`); return; }
    setBusy(true);
    try {
      await place(player, team);
      toast.success(`${player.first_name} → ${team.name}`);
      refresh();
    } catch (e) {
      toast.error(`Couldn't move ${player.first_name}: ${e.message}`);
    }
    setBusy(false);
  };

  const removeFromTeam = async (player) => {
    setBusy(true);
    try {
      await place(player, null);
      refresh();
    } catch (e) {
      toast.error(`Couldn't remove ${player.first_name}: ${e.message}`);
    }
    setBusy(false);
  };

  const onDragEnd = async ({ destination, draggableId }) => {
    if (!destination || destination.droppableId === "pool") return;
    const player = playerMap[draggableId];
    const team = teams.find((t) => t.id === destination.droppableId);
    if (player && team && placedTeam(player) !== team.id) await assign(player, team);
  };

  const tapTeam = async (team) => {
    if (!selected) return;
    setSelectedPlayerId(null);
    if (placedTeam(selected) !== team.id) await assign(selected, team);
  };

  if (!plan) return <p className="text-sm text-muted-foreground">Pick a tryout first.</p>;
  if (!teams.length) return <p className="text-sm text-muted-foreground text-center py-12 border border-dashed border-border rounded-2xl">Add teams to this tryout to start building rosters.</p>;

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="mb-5"><RetentionWorkspace retention={retention} players={players} canManage={canManage} /></div>
      {teamPlansQuery.isError && <p role="alert" className="text-destructive mb-3">Team dues could not be loaded. <Button variant="link" onClick={() => teamPlansQuery.refetch()}>Try again</Button></p>}
      {selected && (
        <div className="sticky top-0 z-30 mb-3 flex items-center gap-3 rounded-2xl bg-primary text-primary-foreground px-4 py-3 shadow-lg">
          <Hand className="w-5 h-5 shrink-0" />
          <p className="flex-1 text-sm min-w-0 truncate">Moving <strong>{selected.first_name} {selected.last_name}</strong> — tap a team</p>
          <Button size="sm" variant="secondary" onClick={() => setSelectedPlayerId(null)}>Cancel</Button>
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        {/* Pool */}
        <section className="rounded-2xl border border-border bg-card h-fit lg:sticky lg:top-4" aria-label="Player pool">
          <div className="p-4 border-b border-border space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-semibold flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> Player pool</p>
              <span className="text-sm font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary">{pool.length}</span>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input className="pl-9 h-10 rounded-xl" placeholder="Search players" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <ArrowDownWideNarrow className="w-3.5 h-3.5 text-muted-foreground" />
              {[["score", "Score"], ["rec", "Recommendation"], ["name", "Name"]].map(([k, l]) => (
                <Button key={k} type="button" variant={sort === k ? "secondary" : "ghost"} size="sm" onClick={() => setSort(k)} aria-pressed={sort === k}
                  className="px-2 h-7 text-xs">
                  {l}
                </Button>
              ))}
            </div>
          </div>
          <Droppable droppableId="pool">
            {(prov) => (
              <div ref={prov.innerRef} {...prov.droppableProps} className="p-2 space-y-1.5 min-h-[200px] max-h-[70vh] overflow-y-auto">
                {pool.map((p, i) => (
                  <Draggable key={p.id} draggableId={p.id} index={i} isDragDisabled={busy || !canManage}>
                    {(dp, snap) => (
                      <PlayerChip
                        innerRef={dp.innerRef} dragProps={{ ...dp.draggableProps, ...dp.dragHandleProps }}
                        player={p} score={scores[p.id]} dragging={snap.isDragging}
                        retention={retention}
                        selected={selectedPlayerId === p.id}
                        onClick={() => setSelectedPlayerId((prev) => (prev === p.id ? null : p.id))}
                      />
                    )}
                  </Draggable>
                ))}
                {pool.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Everyone has been placed.</p>}
                {prov.placeholder}
              </div>
            )}
          </Droppable>
        </section>

        {/* Teams */}
        <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3 content-start">
          {teams.map((team) => {
            const rostered = rosterOf(team);
            const max = team.max_roster_size || 18;
            const full = rostered.length >= max;
            const pct = Math.min(100, Math.round((rostered.length / max) * 100));
            const duesPlan = teamPlanForTeam(teamPlansQuery.data || [], team.id, clubId);
            return (
              <section key={team.id} aria-label={team.name}
                onClick={() => tapTeam(team)}
                className={cn("rounded-2xl border bg-card transition-all",
                  selected && !full ? "ring-2 ring-primary cursor-pointer hover:shadow-lg" : "border-border",
                  selected && full && "opacity-50")}>
                <div className="p-4 pb-3 space-y-2">
                  <div className="min-w-0">
                    <p className="font-semibold flex items-start gap-1.5 break-words"><Shield className="w-4 h-4 text-primary shrink-0 mt-0.5" /> {team.name}</p>
                    <div className="flex items-center justify-between gap-2 mt-1">
                      <p className="text-xs text-muted-foreground">{team.age_group || ""}{team.gender ? ` · ${team.gender}` : ""}</p>
                      <CoachComplianceBadge coaches={teamCoaches(team)} byEmail={comp?.byEmail} compact />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div className={cn("h-full rounded-full transition-all", full ? "bg-status-success" : "bg-action")} style={{ width: `${pct}%` }} />
                    </div>
                    <span className={cn("text-xs font-bold tabular-nums", full ? "text-status-success-700" : "text-muted-foreground")}>{rostered.length}/{max}</span>
                  </div>
                  {canManage && <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2" onClick={(event) => event.stopPropagation()}>
                    <span className={cn("text-xs flex items-center gap-1", duesPlan?.status === "active" ? "text-status-success-700" : "text-status-warning-700")}>
                      {duesPlan?.status === "active" && <CheckCircle2 className="h-3.5 w-3.5" />}
                      {teamPlansQuery.isLoading ? "Loading dues…" : teamPlansQuery.isError ? "Dues unavailable" : duesPlan ? `Dues plan: ${duesPlan.status || "draft"}` : "Team dues not set"}
                    </span>
                    <Button size="sm" variant="outline" className="h-8 text-xs gap-1" disabled={teamPlansQuery.isLoading || teamPlansQuery.isError} onClick={() => openTeamPlan(team)}>
                      {duesPlan ? <Pencil className="h-3 w-3" /> : <Plus className="h-3 w-3" />}{duesPlan ? "Edit dues" : "Set team dues"}
                    </Button>
                  </div>}
                </div>
                <Droppable droppableId={team.id}>
                  {(prov, snap) => (
                    <div ref={prov.innerRef} {...prov.droppableProps}
                      className={cn("mx-2 mb-2 p-1.5 space-y-1.5 min-h-[120px] rounded-xl transition-colors", snap.isDraggingOver ? "bg-primary/10" : "bg-muted/40")}>
                      {rostered.map((p, i) => (
                        <Draggable key={p.id} draggableId={p.id} index={i} isDragDisabled={busy || !canManage}>
                          {(dp, s) => (
                            <PlayerChip
                              innerRef={dp.innerRef} dragProps={{ ...dp.draggableProps, ...dp.dragHandleProps }}
                              player={p} score={scores[p.id]} dragging={s.isDragging} compact
                              retention={retention}
                              onRemove={busy || !canManage ? undefined : () => removeFromTeam(p, team)}
                            />
                          )}
                        </Draggable>
                      ))}
                      {rostered.length === 0 && <p className="text-xs text-muted-foreground text-center py-8">Drop players here</p>}
                      {prov.placeholder}
                    </div>
                  )}
                </Droppable>
              </section>
            );
          })}
        </div>
      </div>
      <TeamPlanWizard open={!!editingPlan} prefill={editingPlan} onOpenChange={(open) => { if (!open) setEditingPlan(null); }} onCreated={() => { qc.invalidateQueries({ queryKey: ["teamPlans", clubId] }); qc.invalidateQueries({ queryKey: ["tryoutPlanTeams", clubId] }); }} />
    </DragDropContext>
  );
}

function PlayerChip({ innerRef, dragProps, player, score, selected, dragging, compact, onClick, onRemove, retention }) {
  return (
    <div ref={innerRef} {...dragProps}
      onClick={(e) => { if (onClick) { e.stopPropagation(); onClick(); } }}
      className={cn(
        "flex items-center gap-2 rounded-xl border bg-card cursor-grab select-none transition-all",
        compact ? "p-2" : "p-2.5",
        selected ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/40",
        dragging && "shadow-xl rotate-1",
      )}>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{player.first_name} {player.last_name}</p>
        <RetentionBadges review={retention?.reviewFor(player.id)} coaches={retention?.coaches.filter((c)=>c.player_id===player.id)} />
        {!compact && score?.rec && (
          <span className={cn("inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded border", recommendationTone(score.rec))}>
            {recommendationLabel(score.rec)}
          </span>
        )}
      </div>
      {score?.score ? (
        <span className="inline-flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-full bg-status-warning-50 text-status-warning-700 shrink-0" title={`Average of ${score.count} coach score${score.count > 1 ? "s" : ""}`}>
          <Star className="w-3 h-3 fill-current" />{score.score}
        </span>
      ) : null}
      {onRemove && (
        <Button variant="ghost" size="icon" type="button" onClick={(e) => { e.stopPropagation(); onRemove(); }} aria-label={`Move ${player.first_name} back to the pool`}
          className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
          <X className="w-3.5 h-3.5" />
        </Button>
      )}
    </div>
  );
}
