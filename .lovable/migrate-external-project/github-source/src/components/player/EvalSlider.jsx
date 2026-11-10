import React from "react";
import { Slider } from "@/components/ui/slider";
import { ratingLabel10 } from "@/lib/testScoring";

// 1-10 rating slider styled for the dark evaluation dialog.
// Matches the screenshot: thin track, white thumb, label + numeric badge on the right.
export default function EvalSlider({ label, value, onChange, accent = "#22c55e" }) {
  const v = value ?? 5;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-300">{label}</span>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-slate-400">{ratingLabel10(v)}</span>
          <span
            className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold text-white"
            style={{ background: accent }}
          >
            {v}
          </span>
        </div>
      </div>
      <Slider
        value={[v]}
        min={1}
        max={10}
        step={1}
        onValueChange={([nv]) => onChange(nv)}
        className="[&_[data-orientation=horizontal]]:h-1 [&_.bg-primary]:bg-slate-600 [&_.bg-primary]:opacity-100 [&_[data-orientation=horizontal]_[role=slider]]:bg-white [&_[data-orientation=horizontal]_[role=slider]]:border-white [&_[data-orientation=horizontal]_[role=slider]]:h-3.5 [&_[data-orientation=horizontal]_[role=slider]]:w-3.5"
      />
    </div>
  );
}