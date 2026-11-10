import React, { useState, useEffect, useRef } from "react";
import PitchDiagram from "@/components/fieldboard/PitchDiagram";
import SlotTeamList from "@/components/fieldboard/SlotTeamList";
import { kindOf, overlaps, splitSlot, resetSlot, dropOnGrid, dropOnColumn, unassignGrid, columnLabels, autoFillSlot } from "@/lib/gridEngine";

export default function FieldPitchCard({ field, slotBks, dayBks, sched, onBookingUpdated }) {
  const [selectedId, setSelectedId] = useState(null);
  const [showGrid, setShowGrid] = useState(false);
  const ref = slotBks[0];
  const format = sched.formatOf(ref || { field_id: field.id, field_name: field.name });
  const { assignments, byBooking, update, bookings } = sched;

  // Auto-fill grids when a new session is added to this slot (preserves manual assignments).
  const trainCount = slotBks.filter((b) => kindOf(b) === "training").length;
  const prevTrainCount = useRef(trainCount);
  useEffect(() => {
    if (trainCount > prevTrainCount.current && trainCount > 0) {
      const next = autoFillSlot(slotBks, bookings, assignments, format);
      const changed = slotBks.some((b) => kindOf(b) === "training" && (assignments[b.id] || []).join() !== (next[b.id] || []).join());
      if (changed) update(next);
    }
    prevTrainCount.current = trainCount;
  }, [trainCount]); // eslint-disable-line react-hooks/exhaustive-deps

  const stripes = {};
  if (ref) {
    dayBks.filter((b) => !slotBks.includes(b) && kindOf(b) === "training" && overlaps(b, ref)).forEach((b) =>
      (assignments[b.id] || []).forEach((l) => (stripes[l] = b))
    );
  }

  const onGrid = (p, label) => { if (p.id) update(dropOnGrid(slotBks, assignments, format, p.id, label, p.from)); setSelectedId(null); };
  const onColumn = (p, col) => { if (p.id) update(dropOnColumn(slotBks, assignments, format, p.id, col, p.from)); setSelectedId(null); };

  const tapGrid = (label) => {
    const h = slotBks.find((b) => (assignments[b.id] || []).includes(label));
    if (selectedId) {
      const sel = slotBks.find((b) => b.id === selectedId);
      if (sel && kindOf(sel) === "training") {
        if ((assignments[sel.id] || []).includes(label)) update(unassignGrid(assignments, sel.id, label));
        else update(dropOnGrid(slotBks, assignments, format, selectedId, label, null));
      } else setSelectedId(null);
    } else if (h) setSelectedId(h.id);
  };
  const tapColumn = (col) => {
    if (!selectedId) return;
    const sel = slotBks.find((b) => b.id === selectedId);
    if (!sel || kindOf(sel) !== "training") return;
    const labels = columnLabels(format, col);
    const hasAll = labels.every((l) => (assignments[sel.id] || []).includes(l));
    let next = assignments;
    if (hasAll) labels.forEach((l) => { next = unassignGrid(next, sel.id, l); });
    else labels.forEach((l) => { next = dropOnGrid(slotBks, next, format, selectedId, l, null); });
    update(next);
    setSelectedId(null);
  };

  const onRemoveLabel = (id, label) => update(unassignGrid(assignments, id, label));

  return (
    <div className="space-y-2 rounded-lg border p-3">
      <div className="flex items-center justify-between">
        <div className="font-semibold">{field.name}</div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{format}</span>
          <button
            type="button"
            onClick={() => setShowGrid((v) => !v)}
            className="rounded-md border px-2 py-0.5 text-xs font-medium text-muted-foreground hover:bg-muted"
          >
            {showGrid ? "Section view" : "Grid view"}
          </button>
        </div>
      </div>
      <PitchDiagram
        format={format} slotBks={slotBks} assignments={assignments} stripes={stripes}
        selectedId={selectedId} onGrid={onGrid} onColumn={onColumn} onSelect={setSelectedId}
        onTapGrid={tapGrid} onTapColumn={tapColumn}
        showGrid={showGrid} byBooking={byBooking}
      />
      <SlotTeamList
        slotBks={slotBks} assignments={assignments} format={format} byBooking={byBooking} selectedId={selectedId}
        onSelect={setSelectedId}
        onUnassignDrop={(p) => p.from && update(unassignGrid(assignments, p.id, p.from))}
        onClearBooking={(id) => update({ ...assignments, [id]: [] })}
        onSplit={() => update(splitSlot(slotBks, bookings, assignments, format))}
        onReset={() => update(resetSlot(slotBks, assignments))}
        onRemoveLabel={onRemoveLabel}
        onBookingUpdated={onBookingUpdated}
      />
    </div>
  );
}