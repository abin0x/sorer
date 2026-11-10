import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, CheckCircle2, Loader2, RefreshCw, ArrowRight } from "lucide-react";

const CONFLICT_LABELS = {
  field_double: { label: "Field Conflict", color: "bg-red-100 text-red-700" },
  team_double: { label: "Team Conflict", color: "bg-red-100 text-red-700" },
  coach_double: { label: "Coach Conflict", color: "bg-red-100 text-red-700" },
  referee_double: { label: "Referee Conflict", color: "bg-orange-100 text-orange-700" },
  insufficient_rest: { label: "Rest Warning", color: "bg-amber-100 text-amber-700" },
};

function minToTime(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  const period = h >= 12 ? "PM" : "AM";
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${displayH}:${m.toString().padStart(2, "0")} ${period}`;
}

function timeToMin(time) {
  const match = time.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return 0;
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  if (period === "PM" && h !== 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
  return h * 60 + m;
}

export default function ConflictResolutionPanel({ tournament, fields, onConflictsResolved }) {
  const [conflicts, setConflicts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingGame, setEditingGame] = useState(null);
  const [games, setGames] = useState([]);

  const loadConflicts = useCallback(async () => {
    if (!tournament) return;
    setLoading(true);
    try {
      const [conflictRes, gamesRes] = await Promise.all([
        base44.functions.invoke("detect-schedule-conflicts", { tournament_id: tournament.id }),
        base44.entities.Game.filter({ tournament_id: tournament.id }, { sort: "scheduled_date" }),
      ]);
      setConflicts(conflictRes.data?.conflicts || []);
      setGames(gamesRes.items || []);
    } catch (err) {
      console.error("Conflict detection failed:", err);
    } finally {
      setLoading(false);
    }
  }, [tournament]);

  useEffect(() => {
    loadConflicts();
  }, [loadConflicts]);

  const handleSaveGame = async (updatedGame) => {
    const startMin = timeToMin(updatedGame.start_time);
    const duration = (updatedGame.end_min || 80) - (updatedGame.start_min || 0);
    const endMin = startMin + (duration > 0 ? duration : 80);
    await base44.entities.Game.update(updatedGame.id, {
      field_id: updatedGame.field_id,
      field_name: fields.find((f) => f.id === updatedGame.field_id)?.name || "",
      scheduled_date: updatedGame.scheduled_date,
      start_min: startMin,
      end_min: endMin,
      start_time: minToTime(startMin),
      end_time: minToTime(endMin),
    });
    setEditingGame(null);
    await loadConflicts();
    if (onConflictsResolved) onConflictsResolved();
  };

  const errorCount = conflicts.filter((c) => c.severity === "error").length;
  const warningCount = conflicts.filter((c) => c.severity === "warning").length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> Conflict Detection
            {errorCount > 0 && <Badge className="bg-red-100 text-red-700">{errorCount} errors</Badge>}
            {warningCount > 0 && <Badge className="bg-amber-100 text-amber-700">{warningCount} warnings</Badge>}
            {errorCount === 0 && warningCount === 0 && !loading && (
              <Badge className="bg-emerald-100 text-emerald-700"><CheckCircle2 className="w-3 h-3 mr-1" />No conflicts</Badge>
            )}
          </CardTitle>
          <Button size="sm" variant="ghost" onClick={loadConflicts} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Re-check
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {loading && games.length === 0 ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          </div>
        ) : conflicts.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-sm">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            No scheduling conflicts detected. All games are clear.
          </div>
        ) : (
          <div className="space-y-2">
            {conflicts.map((c, idx) => {
              const meta = CONFLICT_LABELS[c.type] || CONFLICT_LABELS.team_double;
              return (
                <div key={idx} className="border rounded-lg p-3 bg-slate-50">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={meta.color}>{meta.label}</Badge>
                    <span className="text-sm text-slate-600 flex-1">{c.message}</span>
                  </div>
                  {c.games && c.games.length >= 2 && (
                    <div className="flex items-center gap-2 text-xs">
                      <GameChip game={c.games[0]} fields={fields} onMove={() => setEditingGame(findGame(games, c.games[0].id))} />
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                      <GameChip game={c.games[1]} fields={fields} onMove={() => setEditingGame(findGame(games, c.games[1].id))} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {editingGame && (
        <MoveGameDialog
          game={editingGame}
          fields={fields}
          onClose={() => setEditingGame(null)}
          onSave={handleSaveGame}
        />
      )}
    </Card>
  );
}

function findGame(games, id) {
  return games.find((g) => g.id === id);
}

function GameChip({ game, fields, onMove }) {
  return (
    <div className="flex items-center gap-1 bg-white border rounded px-2 py-1">
      <span className="text-slate-600">
        {game.home_team_name} vs {game.away_team_name}
      </span>
      <span className="text-slate-400">·</span>
      <span className="text-slate-500">{game.field_name || "No field"}</span>
      <span className="text-slate-400">·</span>
      <span className="text-slate-500">{game.scheduled_date} {minToTime(game.start_min)}</span>
      <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={onMove}>
        Move
      </Button>
    </div>
  );
}

function MoveGameDialog({ game, fields, onClose, onSave }) {
  const [fieldId, setFieldId] = useState(game.field_id || "");
  const [date, setDate] = useState(game.scheduled_date || "");
  const [startTime, setStartTime] = useState(game.start_time || minToTime(game.start_min || 480));

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Move Game</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="p-3 bg-slate-50 rounded-lg text-sm">
            <p className="font-medium">{game.home_team_name} vs {game.away_team_name}</p>
            <p className="text-slate-500 text-xs mt-1">{game.round} · Game #{game.game_number}</p>
          </div>
          <div>
            <Label>Field</Label>
            <Select value={fieldId} onValueChange={setFieldId}>
              <SelectTrigger><SelectValue placeholder="Select field" /></SelectTrigger>
              <SelectContent>
                {fields.map((f) => (
                  <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <Label>Start Time</Label>
            <Input value={startTime} onChange={(e) => setStartTime(e.target.value)} placeholder="9:00 AM" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => onSave({ id: game.id, field_id: fieldId, scheduled_date: date, start_time: startTime, start_min: game.start_min, end_min: game.end_min })}
            disabled={!fieldId || !date || !startTime}
          >
            Save & Re-check
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}