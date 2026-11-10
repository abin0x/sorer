import React from "react";
import { toLabel } from "@/lib/gridEngine";

export default function TimeSlotSlider({ slots, value, onChange }) {
  if (!slots.length) return null;
  const idx = Math.max(0, slots.findIndex(([k]) => k === value));
  const max = Math.max(0, slots.length - 1);

  return (
    <div className="flex items-center gap-3 flex-1 min-w-0">
      <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">{idx + 1}/{slots.length}</span>
      <input
        type="range" min={0} max={max} value={idx}
        onChange={(e) => onChange(slots[+e.target.value]?.[0])}
        className="flex-1 h-2 cursor-pointer appearance-none rounded-full bg-muted accent-primary"
        aria-label="Time slot"
      />
      <div className="flex-shrink-0 rounded-md bg-primary/10 px-3 py-1 text-sm font-semibold tabular-nums text-primary whitespace-nowrap">
        {slots[idx] ? `${toLabel(slots[idx][1].start)} – ${toLabel(slots[idx][1].end)}` : ""}
      </div>
    </div>
  );
}