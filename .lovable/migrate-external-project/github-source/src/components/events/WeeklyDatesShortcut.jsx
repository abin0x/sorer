import React, { useState } from "react";
import { addWeeks, format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
export default function WeeklyDatesShortcut({ dates, onAdd }) {
  const [weeks, setWeeks] = useState(8);
  const anchor = dates[0] ? parseISO(dates[0]) : new Date();
  return <div className="border-t pt-3 flex flex-wrap items-center gap-2 text-sm">
    <span>Repeat {format(anchor, "EEEE")} weekly for</span>
    <Input aria-label="Number of weeks" type="number" min="1" max="52" value={weeks} onChange={(e) => setWeeks(e.target.value)} className="w-16 h-11" />
    <span>weeks</span>
    <Button type="button" variant="outline" className="min-h-11" disabled={!Number(weeks) || weeks < 1 || weeks > 52} onClick={() => onAdd(Array.from({ length: Number(weeks) }, (_, i) => format(addWeeks(anchor, i), "yyyy-MM-dd")))}>Repeat weekly</Button>
  </div>;
}