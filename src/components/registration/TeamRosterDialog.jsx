import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserMinus, UserPlus, CheckCircle2, XCircle, ExternalLink } from "lucide-react";
import { Link } from '@/lib/router-compat';
import { toast } from "sonner";
import { createPageUrl } from "@/utils";
import SearchableSelect from "@/components/tryout/SearchableSelect";

export default function TeamRosterDialog({ open, onOpenChange, team }) {
  const queryClient = useQueryClient();
  const [addingPlayerId, setAddingPlayerId] = useState("");

  const { data: players = [], isLoading } = useQuery({
    queryKey: ["players-for-roster", team?.id],
    queryFn: () => base44.entities.Player.list("-created_date", 300),
    enabled: !!team?.id && open,
  });

  const { data: registrations = [] } = useQuery({
    queryKey: ["registrations-for-roster", team?.id],
    queryFn: () => base44.entities.Registration.filter({ team_id: team?.id }, "-created_date", 200),
    enabled: !!team?.id && open,
  });

  if (!team) return null;

  const rosterIds = Array.isArray(team.player_ids) ? team.player_ids : [];
  const rosterPlayers = players.filter((p) => rosterIds.includes(p.id));
  const availablePlayers = players.filter((p) => !rosterIds.includes(p.id) && p.status !== "inactive");

  const removeFromRoster = async (playerId) => {
    const newIds = rosterIds.filter((id) => id !== playerId);
    await base44.entities.Team.update(team.id, { player_ids: newIds });
    await base44.entities.Player.update(playerId, { team_id: "", team_name: "", status: "inactive" }).catch(() => {});
    queryClient.invalidateQueries({ queryKey: ["teams-list"] });
    queryClient.invalidateQueries({ queryKey: ["players-for-roster", team.id] });
    toast.success("Removed from roster");
  };

  const addToRoster = async (playerId) => {
    const newIds = [...rosterIds, playerId];
    await base44.entities.Team.update(team.id, { player_ids: newIds });
    const player = players.find((p) => p.id === playerId);
    await base44.entities.Player.update(playerId, { team_id: team.id, team_name: team.name, status: "active" }).catch(() => {});
    queryClient.invalidateQueries({ queryKey: ["teams-list"] });
    queryClient.invalidateQueries({ queryKey: ["players-for-roster", team.id] });
    setAddingPlayerId("");
    toast.success("Added to roster");
  };

  const regStatus = (playerId) => {
    const reg = registrations.find((r) => r.player_id === playerId);
    return reg;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle>Roster — {team.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{rosterPlayers.length} / {team.max_roster_size || 18} players</p>
            <Badge variant="secondary" className="text-xs">{team.age_group || "—"} · {team.season || "—"}</Badge>
          </div>

          <div className="space-y-2">
            {isLoading ? (
              <p className="text-sm text-muted-foreground text-center py-4">Loading…</p>
            ) : rosterPlayers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No players on roster yet.</p>
            ) : (
              rosterPlayers.map((p) => {
                const reg = regStatus(p.id);
                return (
                  <div key={p.id} className="flex items-center justify-between border border-border/60 rounded-xl p-2.5">
                    <div className="space-y-0.5 flex-1 min-w-0">
                      <Link to={`${createPageUrl("PlayerDetail")}?id=${p.id}`} className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                        {p.first_name} {p.last_name}
                        <ExternalLink className="w-3 h-3 opacity-50" />
                      </Link>
                      <div className="flex items-center gap-2 text-xs">
                        {reg ? (
                          <>
                            <span className={`flex items-center gap-1 ${reg.payment_status === "paid" ? "text-emerald-600" : "text-amber-600"}`}>
                              {reg.payment_status === "paid" ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                              {reg.payment_status}
                            </span>
                            <span className={reg.paperwork_complete ? "text-emerald-600" : "text-amber-600"}>
                              {reg.paperwork_complete ? "paperwork ✓" : "paperwork pending"}
                            </span>
                          </>
                        ) : (
                          <span className="text-muted-foreground">no registration</span>
                        )}
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" className="text-rose-600 hover:bg-rose-50 rounded-lg" onClick={() => removeFromRoster(p.id)}>
                      <UserMinus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                );
              })
            )}
          </div>

          <div className="border-t border-border/60 pt-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Add Player</p>
            <div className="flex gap-2">
              <div className="flex-1">
                <SearchableSelect
                  value={addingPlayerId}
                  onChange={setAddingPlayerId}
                  options={availablePlayers.map((p) => ({ value: p.id, label: `${p.first_name} ${p.last_name}` }))}
                  placeholder={availablePlayers.length === 0 ? "No available players" : "Search player..."}
                />
              </div>
              <Button
                className="rounded-xl bg-primary hover:bg-primary/90"
                disabled={!addingPlayerId}
                onClick={() => addingPlayerId && addingPlayerId !== "_none" && addToRoster(addingPlayerId)}
              >
                <UserPlus className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Tip: Players are auto-added to the roster when an offer is converted. Only add manually if paperwork and payment are complete.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}