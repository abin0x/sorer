import React from "react";
import { format, parseISO } from "date-fns";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import DateSelectionCalendar from "@/components/events/DateSelectionCalendar";
import { recurringDatePreview, WEEKDAYS } from "@/components/events/recurringDatePreview";
export default function RecurringScheduleEditor({ start, setStart, end, setEnd, frequency, setFrequency, weekdays, setWeekdays, excluded, setExcluded, added, setAdded, sessionCount }) {
  const base = recurringDatePreview(start, end, frequency, weekdays);
  const dates = [...new Set([...base, ...added])].filter((d) => !excluded.includes(d)).sort();
  const change = (next) => { setExcluded(base.filter((d) => !next.includes(d))); setAdded(next.filter((d) => !base.includes(d))); };
  const reset = () => { setExcluded([]); setAdded([]); };
  return <div className="space-y-3">
    <div className="grid grid-cols-2 gap-3">
      <div><Label>First date</Label><Input type="date" min={format(new Date(), "yyyy-MM-dd")} value={start} onChange={(e) => { setStart(e.target.value); reset(); }} /></div>
      <div><Label>Last date (optional)</Label><Input type="date" min={start} value={end} onChange={(e) => { setEnd(e.target.value); reset(); }} /></div>
    </div>
    <div><Label>Repeat</Label><div className="flex gap-2 mt-1">{[["DAILY", "Daily"], ["WEEKLY", "Weekly"], ["MONTHLY", "Monthly"]].map(([value, label]) => <button type="button" key={value} aria-pressed={frequency === value} onClick={() => { setFrequency(value); reset(); }} className={`min-h-11 flex-1 border rounded-lg text-sm ${frequency === value ? "bg-primary text-primary-foreground border-primary" : "bg-background border-input hover:bg-muted"}`}>{label}</button>)}</div></div>
    {frequency === "WEEKLY" && <div className="flex flex-wrap gap-1">{WEEKDAYS.map(([value, label]) => <button type="button" key={value} aria-label={`Repeat on ${label}`} aria-pressed={weekdays.includes(value)} onClick={() => { setWeekdays(weekdays.includes(value) ? weekdays.filter((d) => d !== value) : [...weekdays, value]); reset(); }} className={`h-11 w-11 border rounded-lg text-xs ${weekdays.includes(value) ? "bg-primary text-primary-foreground border-primary" : "bg-background border-input hover:bg-muted"}`}>{label}</button>)}</div>}
    {!end && <p className="text-xs text-muted-foreground">Previewing the first 90 days. This series keeps repeating until you set a last date.</p>}
    <DateSelectionCalendar dates={dates} onChange={change} sessionCount={sessionCount} showModes={false} onShortcut={(values) => { setFrequency("WEEKLY"); setStart(values[0]); setEnd(values[values.length - 1]); setWeekdays([WEEKDAYS[(parseISO(values[0]).getDay() + 6) % 7][0]]); reset(); }} />
  </div>;
}