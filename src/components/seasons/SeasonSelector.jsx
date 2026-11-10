import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarClock } from "lucide-react";

/** Dropdown of all seasons (current, preparing, archived). Archived ones stay reachable here. */
export default function SeasonSelector({ seasons, value, onChange }) {
  if (!seasons.length) return null;
  return (
    <Select value={value || ""} onValueChange={onChange}>
      <SelectTrigger className="w-56 h-9">
        <CalendarClock className="w-4 h-4 mr-2 text-muted-foreground" />
        <SelectValue placeholder="Select season" />
      </SelectTrigger>
      <SelectContent>
        {seasons.map((s) => (
          <SelectItem key={s.id} value={s.id}>
            {s.name}{s.is_current ? " (Current)" : s.status === "preparing" ? " (Preparing)" : s.status === "archived" ? " (Archived)" : ""}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}