import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import RolloverTeamRow from "./RolloverTeamRow";
import { setDecision, audit, isLive } from "@/lib/seasonRollover";

/** Phase 1 step 3: every prior team gets a decision; changes persist as draft teams. */
export default function RolloverReview({ season, clubId }) {
  const qc = useQueryClient();
  const { data: teams = [], isLoading } = useQuery({
    queryKey: ["season-teams", season.name],
    queryFn: () => base44.entities.Team.filter({ season: season.name }),
  });
  const { data: platforms = [] } = useQuery({ queryKey: ["season-platforms"], queryFn: () => base44.entities.Platform.list() });
  const { data: sources = [] } = useQuery({
    queryKey: ["season-source-teams", season.previous_season_id],
    queryFn: async () => {
      const prev = await base44.entities.Season.get(season.previous_season_id).catch(() => null);
      return prev ? base44.entities.Team.filter({ season: prev.name }) : [];
    },
    enabled: !!season.previous_season_id,
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["season-teams", season.name] });
  const locked = !!season.matrix_confirmed;

  const patch = async (t, data) => { await base44.entities.Team.update(t.id, data); refresh(); };
  const decide = async (t, d) => {
    const others = teams.filter((x) => x.id !== t.id && isLive(x));
    const target = others.find((x) => x.age_group === t.age_group) || others[0];
    await setDecision(t, d, target?.id);
    if (d === "merge") toast.success(`${t.name} merged into ${target.name}`);
    refresh();
  };
  const remove = async (t) => {
    if (!window.confirm(`Delete proposed team "${t.name}"?`)) return;
    await base44.entities.Team.delete(t.id);
    await audit(clubId, `Deleted proposed team ${t.name}`, season.id);
    refresh();
  };
  const add = async () => {
    await base44.entities.Team.create({
      club_id: clubId, season: season.name, name: "New team", playing_format: "11v11",
      status: "draft", rollover_decision: "new", player_ids: [],
    });
    refresh();
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading proposed teams…</p>;
  const done = teams.filter((t) => t.rollover_decision).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">
          {done}/{teams.length} teams have a decision.{locked && " The matrix is confirmed, so the rollover is locked."}
        </p>
        <Button size="sm" variant="outline" disabled={locked} onClick={add} className="gap-1.5"><Plus className="w-4 h-4" /> Add team</Button>
      </div>
      {teams.length === 0 && <p className="text-sm text-muted-foreground border border-dashed rounded-xl p-6 text-center">No proposed teams. Add one to get started.</p>}
      {teams.map((t) => (
        <RolloverTeamRow key={t.id} team={t} locked={locked} platforms={platforms}
          source={sources.find((s) => s.id === t.rolled_from_team_id)}
          others={teams.filter((x) => x.id !== t.id && isLive(x))}
          onPatch={(d) => patch(t, d)} onDecide={(d) => decide(t, d)} onDelete={() => remove(t)} />
      ))}
    </div>
  );
}