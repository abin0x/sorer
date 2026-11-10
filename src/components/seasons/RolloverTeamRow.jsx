import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2 } from "lucide-react";

const DECISIONS = [["roll", "Roll forward"], ["skip", "Skip"], ["merge", "Merge into…"], ["split", "Split in two"]];

export default function RolloverTeamRow({ team, source, others, platforms, locked, onPatch, onDecide, onDelete }) {
  const [name, setName] = useState(team.name);
  const [age, setAge] = useState(team.age_group || "");
  const skipped = team.status === "skipped" || team.status === "merged";
  return (
    <div className={`grid grid-cols-12 gap-2 items-center p-2 rounded-lg border border-border/60 ${skipped ? "opacity-60" : ""}`}>
      <div className="col-span-12 md:col-span-3">
        <Input value={name} disabled={locked} onChange={(e) => setName(e.target.value)} onBlur={() => name !== team.name && onPatch({ name })} />
        <p className="text-[10px] text-muted-foreground mt-0.5">{source ? `from ${source.name}` : "new team"} {team.notes?.startsWith("Retire") && <Badge variant="outline" className="ml-1 text-[10px]">Retire</Badge>}</p>
      </div>
      <Input className="col-span-3 md:col-span-1" value={age} disabled={locked} onChange={(e) => setAge(e.target.value)} onBlur={() => age !== team.age_group && onPatch({ age_group: age })} />
      <div className="col-span-9 md:col-span-3">
        <Select disabled={locked} value={team.platform_id || "none"} onValueChange={(v) => { const p = platforms.find((x) => x.id === v); onPatch({ platform_id: p?.id || null, platform_name: p?.name || null }); }}>
          <SelectTrigger><SelectValue placeholder="Platform" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No platform</SelectItem>
            {platforms.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <p className="col-span-6 md:col-span-2 text-xs text-muted-foreground truncate">{team.next_season_coach_name ? `Proposed: ${team.next_season_coach_name}` : "No coach"}</p>
      <div className="col-span-5 md:col-span-2">
        <Select disabled={locked} value={team.rollover_decision === "new" ? "roll" : (team.rollover_decision || "roll")} onValueChange={(v) => onDecide(v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{DECISIONS.map(([v, l]) => <SelectItem key={v} value={v} disabled={v === "merge" && others.length === 0}>{l}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <Button size="icon" variant="ghost" disabled={locked} className="col-span-1" onClick={onDelete}><Trash2 className="w-4 h-4 text-destructive" /></Button>
    </div>
  );
}