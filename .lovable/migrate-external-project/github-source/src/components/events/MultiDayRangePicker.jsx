import React, { useState } from "react";
import { eachDayOfInterval, format, parseISO } from "date-fns";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function MultiDayRangePicker({ onAdd }) {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  return (
    <div className="space-y-2 border rounded-lg p-3 mb-3">
      <Label>Add consecutive days</Label>
      <div className="grid grid-cols-2 gap-2">
        <div><Label className="text-xs">First day</Label><Input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></div>
        <div><Label className="text-xs">Last day</Label><Input type="date" min={start} value={end} onChange={(e) => setEnd(e.target.value)} /></div>
      </div>
      <Button type="button" variant="outline" size="sm" disabled={!start || !end || end < start} onClick={() => onAdd(eachDayOfInterval({ start: parseISO(start), end: parseISO(end) }).map((d) => format(d, "yyyy-MM-dd")))}>Add all days in range</Button>
    </div>
  );
}