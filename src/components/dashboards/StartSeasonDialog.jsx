import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Sparkles, ArrowRight, Trophy } from "lucide-react";
import { toast } from "sonner";
import { Link } from '@/lib/router-compat';
import { createPageUrl } from "@/utils";

function incrementAgeGroup(ag) {
  if (!ag) return ag;
  const match = ag.match(/U(\d+)/i);
  if (match) {
    const num = parseInt(match[1], 10) + 1;
    return ag.replace(/U(\d+)/i, `U${num}`);
  }
  return ag;
}

export default function StartSeasonDialog({ open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [newSeason, setNewSeason] = useState("");
  const [selectedTeams, setSelectedTeams] = useState({});
  const [rolling, setRolling] = useState(false);
  const [createdTeams, setCreatedTeams] = useState([]);

  const { data: allTeams = [], isLoading } = useQuery({
    queryKey: ["teams-for-season-roll"],
    queryFn: () => base44.entities.Team.list("-created_date", 300),
    enabled: open,
  });

  // Find the most recent season
  const seasons = [...new Set(allTeams.map((t) => t.season).filter(Boolean))].sort().reverse();
  const lastSeason = seasons[0] || "";
  const lastSeasonTeams = allTeams.filter((t) => t.season === lastSeason);

  const handleToggle = (teamId) => {
    setSelectedTeams((s) => ({ ...s, [teamId]: !s[teamId] }));
  };

  const handleSelectAll = () => {
    const allSelected = lastSeasonTeams.every((t) => selectedTeams[t.id]);
    const newSel = {};
    lastSeasonTeams.forEach((t) => { newSel[t.id] = !allSelected; });
    setSelectedTeams(newSel);
  };

  const handleRollOver = async () => {
    if (!newSeason) {
      toast.error("Enter a season name (e.g., 2027-2028)");
      return;
    }
    const teamsToRoll = lastSeasonTeams.filter((t) => selectedTeams[t.id]);
    if (teamsToRoll.length === 0) {
      toast.error("Select at least one team to roll over");
      return;
    }
    setRolling(true);
    try {
      const newTeams = teamsToRoll.map((t) => ({
        name: t.name.replace(lastSeason, newSeason),
        age_group: incrementAgeGroup(t.age_group),
        gender: t.gender,
        season: newSeason,
        league: t.league || "",
        team_plans: "",
        cost: t.cost || undefined,
        location_id: t.location_id,
        location_name: t.location_name,
        coach_id: t.coach_id || "",
        coach_name: t.coach_name || "",
        program_id: t.program_id || "",
        program_title: t.program_title || "",
        max_roster_size: t.max_roster_size || 18,
        player_ids: [],
        notes: `Rolled over from ${t.name} (${lastSeason})`,
      }));
      const created = await base44.entities.Team.bulkCreate(newTeams);
      setCreatedTeams(created);
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      queryClient.invalidateQueries({ queryKey: ["dash-teams"] });
      setStep(3);
      toast.success(`${created.length} teams created for ${newSeason}`);
    } catch (e) {
      toast.error("Failed to create teams: " + e.message);
    } finally {
      setRolling(false);
    }
  };

  const reset = () => {
    setStep(1);
    setNewSeason("");
    setSelectedTeams({});
    setCreatedTeams([]);
  };

  const allSelected = lastSeasonTeams.length > 0 && lastSeasonTeams.every((t) => selectedTeams[t.id]);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-600" /> Start New Season
          </DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-4">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`flex-1 h-1.5 rounded-full ${step >= s ? "bg-emerald-500" : "bg-slate-200"}`} />
          ))}
        </div>

        {isLoading ? (
          <div className="py-12 text-center"><Loader2 className="w-6 h-6 animate-spin text-emerald-600 mx-auto" /></div>
        ) : step === 1 ? (
          <div className="space-y-4">
            <div>
              <Label className="text-base font-semibold">New Season Name</Label>
              <p className="text-sm text-slate-500 mb-2">Enter the season for the new teams (e.g., 2027-2028)</p>
              <Input
                value={newSeason}
                onChange={(e) => setNewSeason(e.target.value)}
                className="rounded-xl text-lg"
                placeholder="2027-2028"
              />
            </div>
            {lastSeason && (
              <Card className="bg-slate-50 border-slate-200">
                <CardContent className="p-4">
                  <p className="text-sm text-slate-600">
                    <Trophy className="w-4 h-4 inline mr-1 text-amber-500" />
                    Last season: <strong>{lastSeason}</strong> ({lastSeasonTeams.length} teams)
                  </p>
                </CardContent>
              </Card>
            )}
            {lastSeasonTeams.length > 0 ? (
              <Button onClick={() => setStep(2)} disabled={!newSeason} className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700">
                Roll Over Teams from {lastSeason} <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-slate-500">No existing teams found to roll over. You can create teams from scratch.</p>
                <Button asChild className="w-full rounded-xl bg-blue-600 hover:bg-blue-700">
                  <Link to={createPageUrl("Registration")} onClick={() => onOpenChange(false)}>
                    Go to Teams Page to Create Manually <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </div>
            )}
          </div>
        ) : step === 2 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-800">Select Teams to Roll Over</p>
                <p className="text-xs text-slate-500">Age groups will increase by 1 year. Rosters start empty.</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleSelectAll} className="rounded-lg">
                {allSelected ? "Deselect All" : "Select All"}
              </Button>
            </div>
            <div className="space-y-2 max-h-[40vh] overflow-y-auto">
              {lastSeasonTeams.map((t) => (
                <div key={t.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${selectedTeams[t.id] ? "border-emerald-300 bg-emerald-50" : "border-slate-200"}`}>
                  <Checkbox checked={!!selectedTeams[t.id]} onCheckedChange={() => handleToggle(t.id)} />
                  <div className="flex-1">
                    <p className="font-medium text-sm text-slate-800">{t.name}</p>
                    <p className="text-xs text-slate-500">{t.age_group} · {t.coach_name || "No coach"} · {t.location_name || "—"}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="text-xs bg-slate-50">{t.age_group} → <strong className="text-emerald-700">{incrementAgeGroup(t.age_group)}</strong></Badge>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)} className="rounded-xl">Back</Button>
              <Button onClick={handleRollOver} disabled={rolling} className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700">
                {rolling ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating Teams…</> : `Roll Over ${lastSeasonTeams.filter((t) => selectedTeams[t.id]).length} Teams`}
              </Button>
            </div>
          </div>
        ) : step === 3 ? (
          <div className="space-y-4">
            <div className="text-center py-4">
              <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Trophy className="w-7 h-7 text-emerald-600" />
              </div>
              <h3 className="font-bold text-lg text-slate-800">{createdTeams.length} Teams Created for {newSeason}!</h3>
              <p className="text-sm text-slate-500 mt-1">Now add coaches, league, plans, cost, and schedule tryouts for each team.</p>
            </div>
            <div className="space-y-2 max-h-[30vh] overflow-y-auto">
              {createdTeams.map((t) => (
                <Link key={t.id} to={`${createPageUrl("TeamDetail")}?id=${t.id}`} onClick={() => onOpenChange(false)}>
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 transition-colors group">
                    <div className="flex-1">
                      <p className="font-medium text-sm text-slate-800">{t.name}</p>
                      <p className="text-xs text-slate-500">{t.age_group} · {t.coach_name || "No coach yet"}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600" />
                  </div>
                </Link>
              ))}
            </div>
            <Button onClick={() => { reset(); onOpenChange(false); }} className="w-full rounded-xl">Done</Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}