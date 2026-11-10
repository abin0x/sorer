import React from "react";
import { AlertTriangle } from "lucide-react";

/** Inline conflict warnings for the session builder. */
export default function ConflictWarnings({ conflicts }) {
  if (!conflicts || conflicts.length === 0) return null;
  return (
    <div className="space-y-1.5 rounded-lg border border-amber-200 bg-amber-50 p-3">
      {conflicts.map((c, i) => (
        <p key={i} className="text-xs text-amber-800 flex items-start gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          {c.message}
        </p>
      ))}
    </div>
  );
}