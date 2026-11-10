import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

/**
 * Clones a season's Teams (reset to empty roster) and Age Group Matrix into a
 * brand-new Season record. Player registrations, tryout registrations, and
 * payments are intentionally left behind — they belong to the old season only.
 */
export default function RollOverSeasonDialog({ sourceSeason, onClose, onDone }) {
  const [newName, setNewName] = useState("");
  const [rolling, setRolling] = useState(false);

  if (!sourceSeason) return null;

  const handleRollOver = async () => {
    if (!newName) return;
    setRolling(true);
    try {
      const newSeason = await base44.entities.Season.create({
        name: newName,
        status: "active",
        is_current: true,
        rolled_over_from_season_id: sourceSeason.id,
      });

      // Unset "current" on the old season
      await base44.entities.Season.update(sourceSeason.id, { is_current: false });

      // Clone teams — same roster structure, empty player list
      const teams = await base44.entities.Team.filter({ season: sourceSeason.name });
      if (teams.length > 0) {
        await base44.entities.Team.bulkCreate(
          teams.map((t) => ({
            name: t.name,
            age_group: t.age_group,
            gender: t.gender,
            playing_format: t.playing_format,
            season: newName,
            league: t.league,
            platform_id: t.platform_id,
            platform_name: t.platform_name,
            team_plans: t.team_plans,
            cost: t.cost,
            location_id: t.location_id,
            location_name: t.location_name,
            coach_id: t.next_season_coach_id || t.coach_id,
            coach_name: t.next_season_coach_name || t.coach_name,
            coach_ids: t.next_season_coach_id ? [t.next_season_coach_id] : t.coach_ids,
            coach_names: t.next_season_coach_name ? [t.next_season_coach_name] : t.coach_names,
            team_manager_id: t.team_manager_id,
            team_manager_name: t.team_manager_name,
            team_manager_ids: t.team_manager_ids,
            team_manager_names: t.team_manager_names,
            program_id: t.program_id,
            program_title: t.program_title,
            max_roster_size: t.max_roster_size,
            player_ids: [],
          }))
        );
      }

      // Clone the age group matrix
      const ageGroups = await base44.entities.AgeGroup.filter({ season_id: sourceSeason.id });
      if (ageGroups.length > 0) {
        await base44.entities.AgeGroup.bulkCreate(
          ageGroups.map((ag) => ({
            season_id: newSeason.id,
            season_name: newName,
            age_group: ag.age_group,
            birth_date_start: ag.birth_date_start,
            birth_date_end: ag.birth_date_end,
            playing_format: ag.playing_format,
            order: ag.order,
          }))
        );
      }

      toast.success(`Rolled over to ${newName} — ${teams.length} team(s) and ${ageGroups.length} age group(s) cloned.`);
      setRolling(false);
      setNewName("");
      onDone();
    } catch (e) {
      setRolling(false);
      toast.error("Roll over failed. Please try again.");
    }
  };

  return (
    <Dialog open={!!sourceSeason} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Roll Over "{sourceSeason.name}"</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2 text-sm">
          <p className="text-muted-foreground">
            Clones teams and the age group matrix into a new season. Player rosters, event
            registrations, and payments start fresh.
          </p>
          <div className="space-y-1.5">
            <Label>New season name</Label>
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. 2027-2028" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleRollOver} disabled={rolling || !newName}>
            {rolling ? "Rolling over…" : "Roll Over Season"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}