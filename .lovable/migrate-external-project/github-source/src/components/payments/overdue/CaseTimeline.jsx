import React from "react";
import { TIMELINE_LABELS, formatStamp } from "./caseStyles";

/** The audit trail of everything done on one collection case. */
export default function CaseTimeline({ entries = [] }) {
  const ordered = [...entries].reverse();
  if (ordered.length === 0) {
    return <p className="text-xs text-muted-foreground">Nothing logged on this case yet.</p>;
  }

  return (
    <ol className="space-y-2.5">
      {ordered.map((entry, i) => (
        <li key={`${entry.at}-${i}`} className="flex gap-2.5">
          <div className="flex flex-col items-center pt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
            {i < ordered.length - 1 && <span className="w-px flex-1 bg-border-subtle" />}
          </div>
          <div className="min-w-0 pb-1">
            <p className="text-xs font-semibold text-text-primary">
              {TIMELINE_LABELS[entry.action] || entry.action}
            </p>
            <p className="text-xs text-muted-foreground break-words">{entry.note}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {formatStamp(entry.at)}{entry.by ? ` · ${entry.by}` : ""}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}