import React from "react";
import { AlertTriangle, XCircle } from "lucide-react";

export default function WarningsPanel({ flags, conflicts, onJump }) {
  const errors = conflicts.filter((c) => c.severity === "error");
  if (!flags.length && !errors.length) return <p className="rounded-lg border p-3 text-sm text-green-700">No warnings or blocking conflicts.</p>;
  return (
    <div className="max-h-56 space-y-1 overflow-auto rounded-lg border p-3 text-sm">
      {errors.map((c) => (
        <div key={c.key} className="flex items-start gap-2 text-red-600">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <button type="button" className="text-left hover:underline" onClick={() => onJump(c.booking_id)}>{c.message}</button>
        </div>
      ))}
      {flags.map((f, i) => (
        <div key={i} className="flex items-start gap-2 text-amber-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <button type="button" className="text-left hover:underline" onClick={() => f.bookingId && onJump(f.bookingId)}>
            {f.message}
            {f.src && <span className="ml-1 rounded bg-muted px-1 font-mono text-xs text-foreground">{f.src}</span>}
          </button>
        </div>
      ))}
    </div>
  );
}