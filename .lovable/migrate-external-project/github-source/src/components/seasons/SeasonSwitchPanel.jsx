import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { runPreflight, switchSeason, undoSwitch, isLive } from "@/lib/seasonRollover";

/** Phase 10: reviewed pre-flight, archive + activate, undo window. */
export default function SeasonSwitchPanel({ season, current, clubId, onChanged }) {
  const qc = useQueryClient();
  const [acks, setAcks] = useState({});
  const [busy, setBusy] = useState(false);
  const { data: teams = [] } = useQuery({ queryKey: ["season-teams", season.name], queryFn: () => base44.entities.Team.filter({ season: season.name }) });
  const { data: checks = [] } = useQuery({
    queryKey: ["season-preflight", season.id, teams.length, season.matrix_confirmed],
    queryFn: () => runPreflight(season, teams),
  });
  const { data: archives = [] } = useQuery({
    queryKey: ["season-archives", clubId],
    queryFn: () => base44.entities.SeasonArchive.filter({ club_id: clubId, reopened: false }, "-archived_at", 5),
    enabled: !!clubId,
  });
  const undoable = archives.find((a) => new Date(a.undo_until) > new Date());
  const passed = checks.length > 0 && checks.every((c) => c.ok || (!c.blocking && acks[c.key]));

  const doSwitch = async () => {
    if (!window.confirm(`Archive ${current?.name || "the old season"} and make ${season.name} the Active season?`)) return;
    setBusy(true);
    await switchSeason({ next: season, current, teams: teams.filter(isLive), clubId });
    toast.success(`${season.name} is now Active.`);
    qc.invalidateQueries(); setBusy(false); onChanged?.();
  };
  const undo = async () => {
    setBusy(true);
    try { await undoSwitch(undoable, clubId); toast.success("Previous season reopened."); qc.invalidateQueries(); onChanged?.(); }
    catch (e) { toast.error(e.message); }
    setBusy(false);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {checks.map((c) => (
          <div key={c.key} className="flex items-start gap-2 p-2.5 rounded-lg border border-border/60 text-sm">
            {c.ok ? <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5" /> : c.blocking ? <XCircle className="w-4 h-4 text-red-500 mt-0.5" /> : <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5" />}
            <div className="flex-1">
              <p className="font-medium">{c.label}</p>
              {!c.ok && c.detail && <p className="text-xs text-muted-foreground">{c.detail}</p>}
            </div>
            {!c.ok && !c.blocking && (
              <label className="text-xs flex items-center gap-1.5 cursor-pointer"><Checkbox checked={!!acks[c.key]} onCheckedChange={(v) => setAcks({ ...acks, [c.key]: !!v })} />Reviewed / carry over</label>
            )}
          </div>
        ))}
      </div>
      <Button onClick={doSwitch} disabled={!passed || busy}>Archive {current?.name || "old season"} and activate {season.name}</Button>
      {!passed && <p className="text-xs text-muted-foreground">The switch stays blocked until every blocking check passes and each warning is acknowledged.</p>}
      {undoable && (
        <div className="border border-amber-200 bg-amber-50 rounded-lg p-3 text-sm flex items-center justify-between gap-3 flex-wrap">
          <span>{undoable.season_name} was archived. You can reopen it until {new Date(undoable.undo_until).toLocaleString()}.</span>
          <Button size="sm" variant="outline" onClick={undo} disabled={busy}>Undo switch</Button>
        </div>
      )}
    </div>
  );
}