import React, { useMemo } from "react";
import { DAYS, toLabel, compressLabels } from "@/lib/gridEngine";

/** Day/time matrix for the facility manager: rows are time slots, columns Mon-Fri. */
export default function ScheduleMatrix({ bookings, sched, onOpen }) {
  const rows = useMemo(() => {
    const m = new Map();
    bookings.forEach((b) => m.set(`${b.start}-${b.end}`, b));
    return [...m].sort((a, b) => a[1].start - b[1].start || a[1].end - b[1].end);
  }, [bookings]);
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[800px] text-xs">
        <thead className="bg-muted">
          <tr>
            <th className="p-2 text-left">Time</th>
            {DAYS.map((d) => <th key={d} className="p-2 text-left">{d}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map(([k, ref]) => (
            <tr key={k} className="border-t align-top">
              <td className="whitespace-nowrap p-2 font-semibold">{toLabel(ref.start)}-{toLabel(ref.end)}</td>
              {DAYS.map((d) => (
                <td key={d} className="p-1">
                  {bookings.filter((b) => b.day === d && `${b.start}-${b.end}` === k).map((b) => {
                    const bad = (sched.byBooking[b.id] || []).some((c) => c.severity === "error");
                    return (
                      <button key={b.id} type="button" onClick={() => onOpen(b)} className={`mb-1 block w-full rounded px-1.5 py-1 text-left hover:bg-muted ${bad ? "bg-red-50 text-red-700" : "bg-card"}`}>
                        {b.team || b.event_type} · {b.field_name}
                        <span className="ml-1 font-semibold">{compressLabels(sched.assignments[b.id] || [], sched.formatOf(b))}</span>
                      </button>
                    );
                  })}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}