import React, { useMemo, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import ScheduleCard from "@/components/fieldboard/ScheduleCard";
import ScheduleMatrix from "@/components/fieldboard/ScheduleMatrix";
import { DAYS } from "@/lib/gridEngine";

const VIEWS = {
  team: { get: (b) => b.team, none: "(no team)" },
  coach: { get: (b) => b.coach, none: "(no coach)" },
  platform: { get: (b) => b.platform, none: "Unassigned" },
  field: { get: (b) => b.field_name, none: "(no field)" },
};

export default function ScheduleViews({ view, sched, onOpen }) {
  const { get, none } = VIEWS[view];
  const [value, setValue] = useState(null);
  const [mode, setMode] = useState("cards");
  const values = useMemo(() => [...new Set(sched.bookings.map((b) => get(b) || ""))].sort((a, b) => (a === "" ? 1 : b === "" ? -1 : a.localeCompare(b))), [sched.bookings, get]);
  const current = values.includes(value) ? value : values[0];
  const list = sched.bookings.filter((b) => (get(b) || "") === current);
  const canMatrix = view === "platform" || view === "field";

  if (!values.length) return <p className="py-10 text-center text-muted-foreground">No bookings for this week yet.</p>;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={current || "__none"} onValueChange={(v) => setValue(v === "__none" ? "" : v)}>
          <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
          <SelectContent>{values.map((v) => <SelectItem key={v || "none"} value={v || "__none"}>{v || none}</SelectItem>)}</SelectContent>
        </Select>
        {canMatrix && (
          <div className="flex gap-1">
            <Button size="sm" variant={mode === "cards" ? "default" : "outline"} onClick={() => setMode("cards")}>Cards</Button>
            <Button size="sm" variant={mode === "matrix" ? "default" : "outline"} onClick={() => setMode("matrix")}>Day/time matrix</Button>
          </div>
        )}
        <span className="text-xs text-muted-foreground">{list.length} bookings</span>
      </div>
      {canMatrix && mode === "matrix" ? (
        <ScheduleMatrix bookings={list} sched={sched} onOpen={onOpen} />
      ) : (
        <div className="grid gap-3 md:grid-cols-5">
          {DAYS.map((d) => (
            <div key={d} className="space-y-2">
              <div className="text-sm font-bold">{d}</div>
              {list.filter((b) => b.day === d).sort((a, b) => a.start - b.start).map((b) => (
                <ScheduleCard key={b.id} b={b} sched={sched} onOpen={onOpen} />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}