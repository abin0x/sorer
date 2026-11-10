import React, { useState } from "react";
import { toLabel } from "@/lib/gridEngine";

const STRIPE =
  "border-dashed border-white/70 bg-[repeating-linear-gradient(45deg,rgba(255,255,255,0.22),rgba(255,255,255,0.22)_6px,transparent_6px,transparent_12px)]";

export default function GridCell({ label, holder, stripe, selected, onDropPayload, onTap }) {
  const [over, setOver] = useState(false);
  const drop = (e) => {
    e.preventDefault();
    setOver(false);
    try {
      onDropPayload(JSON.parse(e.dataTransfer.getData("text/plain")));
    } catch {
      /* not one of ours */
    }
  };
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={drop}
      onClick={onTap}
      className={`relative flex min-h-[72px] cursor-pointer items-center justify-center rounded-lg border-2 p-2 text-white transition ${
        over ? "border-white bg-white/30" : stripe && !holder ? STRIPE : "border-white/40 bg-white/10"
      } ${selected ? "ring-2 ring-yellow-300" : ""}`}
    >
      <span className="absolute left-1.5 top-1 text-[10px] font-bold opacity-80">{label}</span>
      {holder && (
        <div
          draggable
          onDragStart={(e) => e.dataTransfer.setData("text/plain", JSON.stringify({ id: holder.id, from: label }))}
          className="max-w-full cursor-grab truncate rounded bg-white px-2 py-1 text-xs font-semibold text-slate-900"
        >
          {holder.team || holder.event_type}
        </div>
      )}
      {!holder && stripe && (
        <div className="text-center text-[10px] leading-tight">
          {stripe.team || stripe.event_type}
          <br />
          {toLabel(stripe.start)}-{toLabel(stripe.end)}
        </div>
      )}
    </div>
  );
}