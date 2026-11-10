import React from "react";
import { cn } from "@/lib/utils";

/** The 1-5 tap scale a coach uses on a phone at the field. */
export default function ScoreScale({ value, onChange, disabled }) {
  return (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          onClick={() => onChange(value === n ? 0 : n)}
          className={cn(
            "h-10 w-10 rounded-lg text-sm font-semibold transition-colors active:scale-95",
            value === n
              ? "bg-action text-action-text"
              : value > n
                ? "bg-action/20 text-primary"
                : "bg-muted text-muted-foreground hover:bg-action/10",
            disabled && "opacity-60"
          )}
        >
          {n}
        </button>
      ))}
    </div>
  );
}