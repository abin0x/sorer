import React from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PLATFORMS } from "@/lib/gridImport";

const TYPES = ["practice", "training", "goalkeeping", "small group", "match", "other"];

export default function StagedTable({ bookings, flaggedIds, highlight, onEdit }) {
  return (
    <div className="max-h-[480px] overflow-auto rounded-lg border">
      <table className="w-full min-w-[960px] text-xs">
        <thead className="sticky top-0 bg-muted">
          <tr>{["Source", "Field", "Day", "Time", "Team", "Coach", "Type", "Platform"].map((h) => <th key={h} className="p-2 text-left">{h}</th>)}</tr>
        </thead>
        <tbody>
          {bookings.map((b) => (
            <tr
              key={b.id}
              id={`row-${b.id}`}
              className={`border-t ${highlight === b.id ? "bg-yellow-100" : flaggedIds.has(b.id) ? "bg-amber-50" : ""}`}
            >
              <td className="p-1 font-mono">{b.source_ref}</td>
              <td className="p-1">{b.field_name}</td>
              <td className="p-1">{b.day}</td>
              <td className="whitespace-nowrap p-1">{b.start_time}-{b.end_time}</td>
              <td className="p-1"><Input className="h-7 text-xs" value={b.team} onChange={(e) => onEdit(b.id, { team: e.target.value })} /></td>
              <td className="p-1"><Input className="h-7 text-xs" value={b.coach} onChange={(e) => onEdit(b.id, { coach: e.target.value })} /></td>
              <td className="p-1">
                <Select value={b.event_type} onValueChange={(v) => onEdit(b.id, { event_type: v })}>
                  <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </td>
              <td className="p-1">
                {b.team && (
                  <Select value={b.platform || "__none"} onValueChange={(v) => onEdit(b.id, { platform: v === "__none" ? "" : v })}>
                    <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">Not set</SelectItem>
                      {PLATFORMS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}