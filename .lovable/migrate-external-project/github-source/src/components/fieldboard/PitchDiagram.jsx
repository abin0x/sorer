import React, { useState } from "react";
import GridCell from "@/components/fieldboard/GridCell";
import { layoutFor, layoutRows, kindOf, compressLabels } from "@/lib/gridEngine";

const SECTION_COLORS = [
  { bg: "bg-blue-600/85", chip: "bg-blue-100 text-blue-900" },
  { bg: "bg-emerald-600/85", chip: "bg-emerald-100 text-emerald-900" },
  { bg: "bg-amber-600/85", chip: "bg-amber-100 text-amber-900" },
  { bg: "bg-purple-600/85", chip: "bg-purple-100 text-purple-900" },
  { bg: "bg-rose-600/85", chip: "bg-rose-100 text-rose-900" },
  { bg: "bg-cyan-600/85", chip: "bg-cyan-100 text-cyan-900" },
  { bg: "bg-orange-600/85", chip: "bg-orange-100 text-orange-900" },
  { bg: "bg-indigo-600/85", chip: "bg-indigo-100 text-indigo-900" },
];

export default function PitchDiagram({ format, slotBks, assignments, stripes, selectedId, onGrid, onColumn, onSelect, onTapGrid, onTapColumn, showGrid, byBooking }) {
  const [overCol, setOverCol] = useState(null);
  const L = layoutFor(format);
  const train = slotBks.filter((b) => kindOf(b) === "training");
  const game = slotBks.find((b) => kindOf(b) === "game");

  // --- Game: whole field overlay ---
  if (game) {
    return (
      <div className="relative flex min-h-[110px] items-center justify-center rounded-xl bg-green-700 p-4 shadow-inner">
        <div className="text-lg font-bold tracking-wide text-white drop-shadow">{game.team || "MATCH"}: whole field</div>
      </div>
    );
  }

  // --- Grid view (manual fine-grained assignment) ---
  if (showGrid) {
    const holderOf = (label) => slotBks.find((b) => (assignments[b.id] || []).includes(label));
    const tapGrid = (label) => {
      if (onTapGrid) return onTapGrid(label);
      const h = holderOf(label);
      if (selectedId) onGrid({ id: selectedId, from: null }, label);
      else if (h) onSelect(h.id);
    };
    const clickCol = (col) => {
      if (onTapColumn) return onTapColumn(col);
      if (selectedId) onColumn({ id: selectedId, from: null }, col);
    };
    const dropCol = (e, col) => {
      e.preventDefault();
      setOverCol(null);
      try { onColumn(JSON.parse(e.dataTransfer.getData("text/plain")), col); } catch { /* ignore */ }
    };
    return (
      <div className="relative rounded-xl bg-green-700 p-3 shadow-inner">
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${L.cols.length}, minmax(0, 1fr))` }}>
          {L.cols.map((c) => (
            <button key={c} type="button"
              onDragOver={(e) => { e.preventDefault(); setOverCol(c); }}
              onDragLeave={() => setOverCol(null)}
              onDrop={(e) => dropCol(e, c)}
              onClick={() => clickCol(c)}
              className={`rounded-md py-1 text-xs font-bold text-white ${overCol === c ? "bg-white/40" : "bg-black/20 hover:bg-black/30"}`}>
              {c}
            </button>
          ))}
          {layoutRows(format).flat().map((label) => (
            <GridCell key={label} label={label} holder={holderOf(label)} stripe={stripes[label]}
              selected={!!holderOf(label) && holderOf(label).id === selectedId}
              onDropPayload={(p) => onGrid(p, label)} onTap={() => tapGrid(label)} />
          ))}
        </div>
      </div>
    );
  }

  // --- Section view (default): one block per session ---
  if (!train.length) {
    return (
      <div className="flex min-h-[110px] items-center justify-center rounded-xl bg-green-700/40 p-4 shadow-inner">
        <span className="text-sm text-white/60">No sessions in this slot</span>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-green-700 p-3 shadow-inner">
      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${train.length}, minmax(0, 1fr))` }}>
        {train.map((b, idx) => {
          const labels = assignments[b.id] || [];
          const hasGrid = labels.length > 0;
          const isSelected = selectedId === b.id;
          const issues = (byBooking || {})[b.id] || [];
          const hasError = issues.some((c) => c.severity === "error");
          const color = SECTION_COLORS[idx % SECTION_COLORS.length];
          return (
            <div key={b.id}
              draggable
              onDragStart={(e) => e.dataTransfer.setData("text/plain", JSON.stringify({ id: b.id, from: null }))}
              onDragOver={(e) => { e.preventDefault(); setOverCol(idx); }}
              onDragLeave={() => setOverCol(null)}
              onDrop={(e) => { e.preventDefault(); setOverCol(null); /* section view: no-op drop, use grid view for manual */ }}
              onClick={() => onSelect(selectedId === b.id ? null : b.id)}
              className={`relative flex min-h-[90px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 p-2 text-center transition ${color.bg} ${overCol === idx ? "border-white ring-2 ring-white/60" : "border-white/30"} ${isSelected ? "ring-2 ring-yellow-300" : ""} ${hasError ? "!border-red-400" : ""}`}>
              <span className="text-sm font-bold leading-tight text-white drop-shadow-md">{b.team || b.event_type}</span>
              {hasGrid ? (
                <span className={`mt-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${color.chip}`}>{compressLabels(labels, format)}</span>
              ) : (
                <span className="mt-1.5 rounded-full bg-red-500 px-2.5 py-0.5 text-xs font-bold text-white">No grid</span>
              )}
              {b.coach && <span className="mt-1 text-[10px] font-medium text-white/80">{b.coach}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}