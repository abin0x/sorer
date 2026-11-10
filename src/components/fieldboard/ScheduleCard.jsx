import React from "react";
import { compressLabels, toLabel, kindOf } from "@/lib/gridEngine";

export default function ScheduleCard({ b, sched, onOpen }) {
  const issues = sched.byBooking[b.id] || [];
  const hasError = issues.some((c) => c.severity === "error");
  const grid = compressLabels(sched.assignments[b.id] || [], sched.formatOf(b));
  return (
    <button
      type="button"
      onClick={() => onOpen(b)}
      className={`w-full rounded-lg border bg-card p-2 text-left text-xs shadow-sm hover:shadow-md ${hasError ? "border-red-400" : ""}`}
    >
      <div className="font-bold">{toLabel(b.start)}-{toLabel(b.end)}</div>
      <div className="font-semibold">{b.team || (b.event_type === "match" ? "MATCH" : b.event_type)}</div>
      <div className="text-muted-foreground">{b.field_name}{kindOf(b) === "training" ? ` · ${grid || "no grid"}` : ""}</div>
      {b.coach && <div className="text-muted-foreground">{b.coach}</div>}
      {issues.slice(0, 2).map((c) => (
        <div key={c.key} className={c.severity === "error" ? "text-red-600" : "text-amber-600"}>{c.message}</div>
      ))}
    </button>
  );
}