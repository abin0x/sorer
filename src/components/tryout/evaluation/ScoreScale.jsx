import React from "react";
import { cn } from "@/lib/utils";
import { useTerminology } from "@/hooks/useTerminology";

/** The 1-5 tap scale a coach uses on a phone at the field. Big, thumb-sized
 *  targets; the chosen score fills in and everything below it tints. */
export default function ScoreScale({ value, onChange, disabled, label }) {
  const SCALE_LABELS = useTerminology().scale;
  return (
    <div className="grid grid-cols-5 gap-1.5 w-full sm:w-auto" role="radiogroup" aria-label={label}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} – ${SCALE_LABELS[n] || ""}`}
          disabled={disabled}
          onClick={() => onChange(value === n ? 0 : n)}
          className={cn(
            "h-12 sm:w-12 rounded-xl text-base font-bold transition-all active:scale-95 border",
            value === n
              ? "bg-action text-action-text border-transparent shadow-md scale-[1.04]"
              : value > n
                ? "bg-action/20 text-primary border-transparent"
                : "bg-card text-muted-foreground border-border hover:border-primary/40",
            disabled && "opacity-60"
          )}
        >
          {n}
        </button>
      ))}
    </div>
  );
}
