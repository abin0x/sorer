import React from "react";
import { format, parseISO } from "date-fns";
import { X } from "lucide-react";
export default function SelectedDateChips({ dates, onRemove, sessionCount = 1 }) {
  return <div className="space-y-2" aria-live="polite">
    <p className="text-sm font-medium">Selected dates</p>
    {dates.length ? <div className="flex flex-wrap gap-2 max-h-40 overflow-auto">{dates.map((date) => <button type="button" key={date} aria-label={`Remove ${format(parseISO(date), "MMMM d, yyyy")}`} onClick={() => onRemove(date)} className="min-h-11 inline-flex items-center gap-2 border border-primary/30 rounded-full bg-primary/10 text-foreground px-3 text-sm hover:bg-primary/20">{format(parseISO(date), "MMM d, yyyy")}<X className="h-3.5 w-3.5" /></button>)}</div> : <p className="text-sm text-muted-foreground">Tap a date to get started.</p>}
    <p className="text-sm font-semibold">{dates.length} {dates.length === 1 ? "date" : "dates"} selected · {dates.length * sessionCount} {dates.length * sessionCount === 1 ? "session" : "sessions"}</p>
  </div>;
}