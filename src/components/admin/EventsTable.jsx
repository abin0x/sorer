import React, { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { ChevronUp, ChevronDown } from "lucide-react";

const EVENT_TYPE_COLORS = {
  practice: "bg-blue-50 text-blue-700 border-blue-200",
  game: "bg-emerald-50 text-emerald-700 border-emerald-200",
  tournament: "bg-purple-50 text-purple-700 border-purple-200",
  meeting: "bg-amber-50 text-amber-700 border-amber-200",
  camp: "bg-orange-50 text-orange-700 border-orange-200",
  clinic: "bg-cyan-50 text-cyan-700 border-cyan-200",
  other: "bg-slate-50 text-slate-700 border-slate-200",
};

const TYPE_OPTIONS = ["practice", "game", "tournament", "meeting", "camp", "clinic", "other"];

export default function EventsTable({ events, teams }) {
  const [sortField, setSortField] = useState("start_datetime");
  const [sortDir, setSortDir] = useState("asc");
  const [filterType, setFilterType] = useState([]);

  const sorted = useMemo(() => {
    let filtered = events.filter((e) => {
      if (filterType.length > 0 && !filterType.includes(e.event_type)) return false;
      return true;
    });
    filtered.sort((a, b) => {
      const av = a[sortField] || "";
      const bv = b[sortField] || "";
      const cmp = String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return filtered;
  }, [events, sortField, sortDir, filterType]);

  const toggleSort = (field) => {
    if (sortField === field) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  return (
    <div>
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Filter:</span>
        {TYPE_OPTIONS.map((t) => (
          <button
            key={t}
            onClick={() => setFilterType(filterType.includes(t) ? filterType.filter((x) => x !== t) : [...filterType, t])}
            className={`text-[10px] px-2 py-1 rounded-md border capitalize transition-colors ${filterType.includes(t) ? "bg-primary text-white border-primary" : "bg-white text-muted-foreground border-border hover:bg-muted/50"}`}
          >
            {t}
          </button>
        ))}
        {filterType.length > 0 && (
          <button onClick={() => setFilterType([])} className="text-[10px] text-muted-foreground hover:text-destructive px-2">Clear</button>
        )}
        <span className="text-xs text-muted-foreground ml-auto">{sorted.length} events</span>
      </div>

      <div className="overflow-x-auto border border-border rounded-xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground uppercase">
              <th className="text-left py-2.5 px-3 font-semibold cursor-pointer select-none" onClick={() => toggleSort("start_datetime")}>
                <span className="flex items-center gap-1">Date {sortField === "start_datetime" && (sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}</span>
              </th>
              <th className="text-left py-2.5 px-2 font-semibold">Time</th>
              <th className="text-left py-2.5 px-2 font-semibold cursor-pointer select-none" onClick={() => toggleSort("title")}>
                <span className="flex items-center gap-1">Event {sortField === "title" && (sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}</span>
              </th>
              <th className="text-center py-2.5 px-2 font-semibold">Type</th>
              <th className="text-left py-2.5 px-2 font-semibold">Teams</th>
              <th className="text-left py-2.5 px-2 font-semibold">Location</th>
              <th className="text-center py-2.5 px-2 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr><td colSpan={7} className="py-6 text-center text-muted-foreground">No events found.</td></tr>
            ) : sorted.slice(0, 100).map((e) => {
              const dt = new Date(e.start_datetime);
              const dateStr = dt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
              const timeStr = dt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
              return (
                <tr key={e.id} className="border-b border-border/40 hover:bg-muted/20">
                  <td className="py-2 px-3 text-xs whitespace-nowrap">{dateStr}</td>
                  <td className="py-2 px-2 text-xs text-muted-foreground whitespace-nowrap">{timeStr}</td>
                  <td className="py-2 px-2 text-xs font-medium truncate max-w-48">{e.title}</td>
                  <td className="py-2 px-2 text-center">
                    <Badge variant="outline" className={`text-[10px] capitalize ${EVENT_TYPE_COLORS[e.event_type] || EVENT_TYPE_COLORS.other}`}>{e.event_type}</Badge>
                  </td>
                  <td className="py-2 px-2 text-xs text-muted-foreground truncate max-w-40">{(e.team_names || []).join(", ") || "—"}</td>
                  <td className="py-2 px-2 text-xs text-muted-foreground truncate max-w-40">{e.location_text || "—"}</td>
                  <td className="py-2 px-2 text-center"><Badge variant="outline" className="text-[10px] capitalize">{e.status || "confirmed"}</Badge></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {sorted.length > 100 && <p className="text-xs text-muted-foreground mt-2 text-center">Showing first 100 of {sorted.length} events.</p>}
    </div>
  );
}