import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Filter } from "lucide-react";

/**
 * Global filter bar — applies to all tabs. Options are pre-filtered by the page
 * to what the user's role can see.
 * props: { seasons, branches, teams, platforms, filters, onChange }
 */
export default function ReportsFilterBar({ seasons, branches, teams, platforms, filters, onChange }) {
  const update = (patch) => onChange({ ...filters, ...patch });

  return (
    <div className="flex flex-wrap items-end gap-3 p-4 rounded-xl border bg-card">
      <div className="flex items-center gap-2 mr-2 text-muted-foreground">
        <Filter className="w-4 h-4" />
        <span className="text-sm font-semibold hidden sm:inline">Filters</span>
      </div>

      {/* Season */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Season</label>
        <Select value={filters.seasonId || "all"} onValueChange={(v) => update({ seasonId: v === "all" ? null : v })}>
          <SelectTrigger className="w-[150px] h-9"><SelectValue placeholder="All seasons" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All seasons</SelectItem>
            {seasons.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Branch */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Branch</label>
        <Select value={filters.branchId || "all"} onValueChange={(v) => update({ branchId: v === "all" ? null : v })}>
          <SelectTrigger className="w-[150px] h-9"><SelectValue placeholder="All branches" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All branches</SelectItem>
            {branches.map((b) => (
              <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Team */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Team</label>
        <Select value={filters.teamId || "all"} onValueChange={(v) => update({ teamId: v === "all" ? null : v })}>
          <SelectTrigger className="w-[150px] h-9"><SelectValue placeholder="All teams" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All teams</SelectItem>
            {teams.map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Platform / League */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Platform / League</label>
        <Select value={filters.platformId || "all"} onValueChange={(v) => update({ platformId: v === "all" ? null : v })}>
          <SelectTrigger className="w-[150px] h-9"><SelectValue placeholder="All platforms" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All platforms</SelectItem>
            {platforms.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Date range */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">From</label>
        <Input type="date" className="w-[150px] h-9" value={filters.dateStart || ""} onChange={(e) => update({ dateStart: e.target.value || null })} />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">To</label>
        <Input type="date" className="w-[150px] h-9" value={filters.dateEnd || ""} onChange={(e) => update({ dateEnd: e.target.value || null })} />
      </div>
    </div>
  );
}