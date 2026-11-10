import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, UserPlus, Lock } from "lucide-react";
import { toast } from "sonner";
import useCoachCompliance from "@/components/compliance/useCoachCompliance";
import CoachComplianceBadge from "@/components/compliance/CoachComplianceBadge";

/**
 * Role-based roster selection for a tryout plan's Main Club Tryout Date.
 * The eligible pool is every player who registered for that event (source of
 * truth = TryoutRegistration). Coaches only see teams they coach; selecting a
 * player sets their primary roster (Player.team_id) and hard-blocks them from
 * being added to a second primary roster.
 */
export default function RosterSelectionPanel({ plan, teams, mainTryout, currentUser }) {
  const queryClient = useQueryClient();

  const { data: registrations = [], isLoading: loadingRegs } = useQuery({
    queryKey: ["tryoutRegistrations", mainTryout?.id],
    queryFn: () => base44.entities.TryoutRegistration.filter({ tryout_event_id: mainTryout.id }, "-registered_date", 500),
    enabled: !!mainTryout,
  });

  const playerIds = registrations.map((r) => r.player_id).filter(Boolean);
  const { data: players = [], isLoading: loadingPlayers } = useQuery({
    queryKey: ["tryoutPoolPlayers", playerIds.join(",")],
    queryFn: () => Promise.all(playerIds.map((id) => base44.entities.Player.get(id).catch(() => null))).then((r) => r.filter(Boolean)),
    enabled: playerIds.length > 0,
  });

  const { data: coaches = [] } = useQuery({
    queryKey: ["rosterCoaches"],
    queryFn: () => base44.entities.Coach.list("-created_date", 500),
  });
  const { data: comp } = useCoachCompliance(currentUser?.club_id);
  const coachMap = Object.fromEntries(coaches.map((c) => [c.id, c]));
  const teamCoachEmails = (team) => [...(team.coach_ids || []), team.coach_id].filter(Boolean).map((id) => coachMap[id]).filter(Boolean);

  const isAdmin = ["admin", "club_director", "club_admin", "master_admin", "tryout_lead"].includes(currentUser?.custom_role) || currentUser?.role === "admin";
  const myCoachIds = coaches.filter((c) => (c.email || "").toLowerCase() === (currentUser?.email || "").toLowerCase()).map((c) => c.id);
  const myTeams = isAdmin ? teams : teams.filter((t) => t.coach_id && myCoachIds.includes(t.coach_id) || (t.coach_ids || []).some((id) => myCoachIds.includes(id)));

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["tryoutPoolPlayers"] });
    queryClient.invalidateQueries({ queryKey: ["tryoutPlanTeams"] });
  };

  const selectPlayer = async (player, team) => {
    if (player.team_id && player.team_id !== team.id) {
      const existingTeam = teams.find((t) => t.id === player.team_id);
      toast.error(`${player.first_name} ${player.last_name} is already on ${existingTeam?.name || "another team's"} primary roster.`);
      return;
    }
    try {
      await base44.entities.Player.update(player.id, {
        team_id: team.id,
        team_name: team.name,
        age_group: team.age_group,
        status: "active",
      });
      if (!(team.player_ids || []).includes(player.id)) {
        await base44.entities.Team.update(team.id, { player_ids: [...(team.player_ids || []), player.id] });
      }
      toast.success(`${player.first_name} ${player.last_name} added to ${team.name}`);
      invalidate();
    } catch (e) {
      toast.error("Failed to add player to roster.");
    }
  };

  const removePlayer = async (player, team) => {
    try {
      await base44.entities.Player.update(player.id, { team_id: "", team_name: "" });
      await base44.entities.Team.update(team.id, { player_ids: (team.player_ids || []).filter((id) => id !== player.id) });
      toast.success(`${player.first_name} ${player.last_name} removed from ${team.name}`);
      invalidate();
    } catch (e) {
      toast.error("Failed to remove player.");
    }
  };

  if (!mainTryout) return null;

  const pool = players.filter((p) => !p.team_id);

  if (loadingRegs || loadingPlayers) {
    return <p className="text-sm text-muted-foreground">Loading eligible pool…</p>;
  }

  if (myTeams.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-6 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
          <Lock className="w-5 h-5" />
          You don't coach any team in this plan, so no roster selection is available to you.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
      <Card>
        <CardContent className="p-4 space-y-3">
          <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <Users className="w-4 h-4 text-primary" /> Eligible Pool ({pool.length})
          </p>
          <p className="text-xs text-muted-foreground">
            Players who registered for the Main Club Tryout and haven't been added to a primary roster yet.
          </p>
          <div className="border border-border rounded-lg divide-y divide-border max-h-96 overflow-y-auto">
            {pool.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-2.5 gap-2">
                <div>
                  <p className="text-sm font-medium text-foreground">{p.first_name} {p.last_name}</p>
                  {p.position && <p className="text-xs text-muted-foreground">{p.position}</p>}
                </div>
                <div className="flex gap-1.5 flex-wrap justify-end">
                  {myTeams.map((t) => (
                    <Button key={t.id} size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => selectPlayer(p, t)}>
                      <UserPlus className="w-3 h-3" /> {t.name}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
            {pool.length === 0 && (
              <p className="p-4 text-xs text-muted-foreground text-center">No unrostered players remaining in the pool.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-3">
          <p className="text-sm font-semibold text-foreground">Your Rosters</p>
          <div className="space-y-3">
            {myTeams.map((team) => {
              const rostered = players.filter((p) => p.team_id === team.id);
              return (
                <div key={team.id} className="border border-border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2 gap-2">
                    <p className="text-sm font-semibold text-foreground">{team.name}</p>
                    <div className="flex items-center gap-1.5">
                      <CoachComplianceBadge coaches={teamCoachEmails(team)} byEmail={comp?.byEmail} compact />
                      <Badge variant="outline" className="text-xs">{rostered.length}/{team.max_roster_size || 18}</Badge>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {rostered.map((p) => (
                      <div key={p.id} className="flex items-center justify-between text-sm">
                        <span className="text-foreground">{p.first_name} {p.last_name}</span>
                        <button
                          onClick={() => removePlayer(p, team)}
                          className="text-xs text-destructive hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    {rostered.length === 0 && <p className="text-xs text-muted-foreground">No players selected yet.</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}