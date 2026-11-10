import { searchTryoutPlayers } from '@/lib/tryoutPlayerSearch';
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserPlus, Search } from "lucide-react";
import { toast } from "sonner";
import { addInsidePlayer } from "@/lib/tryoutDay";

/** Add existing club players to a tryout event without the public signup form. */
export default function InsideRegistrationDialog({ event, clubId, onClose }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(null);

  const { data: players = [] } = useQuery({
    queryKey: ["club-players-for-tryout", clubId, search],
    queryFn: () => searchTryoutPlayers(base44.entities.Player, clubId, search),
    enabled: !!clubId && search.length > 1,
  });

  const { data: regs = [] } = useQuery({
    queryKey: ["event-regs-inside", event?.id],
    queryFn: () => base44.entities.TryoutRegistration.filter({ tryout_event_id: event.id, source: "inside" }, null, 500),
    enabled: !!event?.id,
  });
  const alreadyAdded = new Set(regs.map((r) => r.player_id));

  const add = async (player) => {
    setAdding(player.id);
    try {
      const { registration, merged } = await addInsidePlayer({ clubId, eventId: event.id, player });
      if (merged) toast.info(`${player.first_name} ${player.last_name} was already registered.`);
      else toast.success(`${player.first_name} ${player.last_name} added`);
      qc.invalidateQueries({ queryKey: ["event-regs-inside"] });
      qc.invalidateQueries({ queryKey: ["checkin-regs"] });
    } catch (e) { toast.error("Could not add player"); }
    setAdding(null);
  };

  if (!event) return null;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><UserPlus className="w-4 h-4" /> Add Club Player to {event.type.replace("_", " ")}</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search club players by name…" value={search} onChange={(e) => setSearch(e.target.value)} autoFocus />
          </div>
          <div className="border border-border rounded-lg divide-y divide-border max-h-72 overflow-y-auto">
            {search.length <= 1 && <p className="p-3 text-xs text-muted-foreground text-center">Type at least 2 characters to search.</p>}
            {players.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-2.5 gap-2">
                <div><p className="text-sm font-medium">{p.first_name} {p.last_name}</p><p className="text-xs text-muted-foreground">{p.age_group || "No age group"}{p.team_name ? ` · ${p.team_name}` : ""}</p></div>
                {alreadyAdded.has(p.id) ? <span className="text-xs text-emerald-600">Added</span> : <Button size="sm" variant="outline" disabled={adding === p.id} onClick={() => add(p)}>Add</Button>}
              </div>
            ))}
            {players.length === 0 && search.length > 1 && <p className="p-3 text-xs text-muted-foreground text-center">No players found.</p>}
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Done</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}