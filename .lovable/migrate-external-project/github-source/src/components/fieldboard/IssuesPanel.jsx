import React from "react";
import { Button } from "@/components/ui/button";
import { Wand2, ExternalLink } from "lucide-react";

const LABELS = {
  no_grid: "Missing grid",
  grid_shared: "Grid shared by two sessions",
  game_needs_whole_field: "Game needs the whole field",
  overlaps_game: "Overlaps a game",
  game_team_limit: "Too many teams in a game slot",
  team_double: "Team double-booked",
  coach_double: "Coach double-booked",
};
const ORDER = ["no_grid", "grid_shared", "game_needs_whole_field", "overlaps_game", "game_team_limit", "team_double", "coach_double"];

export default function IssuesPanel({ conflicts, bookings, onOpen, onAutoAssign, autoAssigning }) {
  const byId = Object.fromEntries(bookings.map((b) => [b.id, b]));
  const grouped = {};
  conflicts.forEach((c) => { (grouped[c.type] ||= []).push(c); });
  const missing = (grouped.no_grid || []).length;
  const types = ORDER.filter((t) => grouped[t]);

  return (
    <div className="space-y-4 p-4">
      {missing > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm">
          <p className="font-semibold text-amber-800">{missing} sessions have no grid assigned.</p>
          <Button size="sm" className="mt-2" onClick={onAutoAssign} disabled={autoAssigning}><Wand2 className="mr-2 h-4 w-4" />Auto-assign missing grids</Button>
        </div>
      )}
      {types.length === 0 && !missing && <p className="text-sm text-green-700">No issues. Everything looks good.</p>}
      {types.map((t) => (
        <div key={t}>
          <div className={`text-sm font-bold ${grouped[t][0].severity === "error" ? "text-red-600" : "text-amber-600"}`}>{LABELS[t]} ({grouped[t].length})</div>
          <div className="mt-1 space-y-1">
            {grouped[t].map((c) => {
              const b = byId[c.booking_id];
              if (!b) return null;
              return (
                <div key={c.key} className="flex items-center justify-between gap-2 rounded border bg-card p-2 text-xs">
                  <div>
                    <div className="font-semibold">{b.team || b.event_type} · {b.field_name}</div>
                    <div className="text-muted-foreground">{b.day} {b.start_time}-{b.end_time}{b.coach ? ` · ${b.coach}` : ""}</div>
                    <div className={c.severity === "error" ? "text-red-600" : "text-amber-600"}>{c.message}</div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => onOpen(c.booking_id)}><ExternalLink className="h-3 w-3" /></Button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}