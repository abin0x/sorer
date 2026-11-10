import React, { useMemo } from "react";
import { format, isSameDay, parseISO } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin } from "lucide-react";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function FieldWeekGrid({ fields, events, weekStart }) {
  const grouped = useMemo(() => {
    const map = new Map();
    for (const f of fields) {
      const key = f.facility_name || "Unassigned";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(f);
    }
    return [...map.entries()];
  }, [fields]);

  const weekDays = useMemo(() => {
    const start = weekStart ? new Date(weekStart) : (() => {
      const d = new Date();
      d.setDate(d.getDate() - d.getDay() + 1);
      return d;
    })();
    return DAYS.map((label, i) => {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      return { label, date };
    });
  }, [weekStart]);

  const eventsForCell = (fieldId, dayDate) =>
    events.filter((e) => e.field_id === fieldId && isSameDay(parseISO(e.start_datetime), dayDate));

  if (fields.length === 0) {
    return (
      <Card className="border-border rounded-xl"><CardContent className="py-8 text-center">
        <MapPin className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No fields configured. Add fields in the Manage Fields tab.</p>
      </CardContent></Card>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr>
            <th className="text-left p-2 border-b border-border bg-muted/30 font-semibold text-muted-foreground uppercase sticky left-0 bg-background">Field</th>
            {weekDays.map((d) => (
              <th key={d.label} className={`text-left p-2 border-b border-border bg-muted/30 font-semibold uppercase min-w-[140px] ${isSameDay(d.date, new Date()) ? "text-emerald-600" : "text-muted-foreground"}`}>
                {d.label}
                <span className="block text-[10px] font-normal normal-case">{format(d.date, "M/d")}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grouped.map(([facilityName, facilityFields]) => (
            <React.Fragment key={facilityName}>
              <tr>
                <td colSpan={8} className="p-2 bg-primary/5 font-bold text-primary text-[11px] uppercase tracking-wide">{facilityName}</td>
              </tr>
              {facilityFields.map((field) => (
                <tr key={field.id} className="hover:bg-muted/20">
                  <td className="p-2 border-b border-border/40 font-medium text-foreground sticky left-0 bg-background">{field.name}</td>
                  {weekDays.map((d) => {
                    const cellEvents = eventsForCell(field.id, d.date);
                    return (
                      <td key={d.label} className="p-1.5 border-b border-border/40 align-top">
                        {cellEvents.length === 0 ? (
                          <span className="text-muted-foreground/20 text-[10px]">—</span>
                        ) : (
                          <div className="space-y-1">
                            {cellEvents.map((e) => (
                              <div key={e.id} className="text-[10px] p-1.5 rounded bg-emerald-50 border border-emerald-200">
                                <p className="font-semibold text-emerald-800">{format(parseISO(e.start_datetime), "h:mm a")}</p>
                                <p className="text-emerald-700 truncate">{e.team_names?.[0] || e.title}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}