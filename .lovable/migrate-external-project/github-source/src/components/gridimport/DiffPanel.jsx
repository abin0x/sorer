import React from "react";
import { Badge } from "@/components/ui/badge";

const line = (b) => `${b.field_name} · ${b.day} ${b.start_time}-${b.end_time} · ${b.team || b.event_type}${b.coach ? ` (${b.coach})` : ""}`;

export default function DiffPanel({ diff, hasPrev }) {
  if (!hasPrev) return <p className="text-sm text-muted-foreground">No bookings found for the previous week, so there is nothing to compare against.</p>;
  const Section = ({ title, tone, items, render }) => (
    <div>
      <Badge variant={tone}>{title}: {items.length}</Badge>
      <ul className="mt-1 max-h-40 space-y-0.5 overflow-auto text-xs">{items.map((x, i) => <li key={i}>{render(x)}</li>)}</ul>
    </div>
  );
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Section title="Added" tone="secondary" items={diff.added} render={line} />
      <Section title="Removed" tone="destructive" items={diff.removed} render={line} />
      <Section title="Changed" tone="outline" items={diff.changed} render={(c) => `${line(c.before)} → ${c.after.start_time}-${c.after.end_time}${c.after.coach ? ` (${c.after.coach})` : ""}`} />
    </div>
  );
}