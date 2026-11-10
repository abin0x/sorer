import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar, TrendingUp } from "lucide-react";

const FORMAT_OPTIONS = [
  { value: "4v4", label: "4v4" },
  { value: "7v7", label: "7v7" },
  { value: "9v9", label: "9v9" },
  { value: "11v11", label: "11v11" },
];

export default function AgeGroupManager({ ageGroups, seasons, onUpdateAgeGroup }) {
  const [selectedSeason, setSelectedSeason] = useState(seasons[0] || "2026-2027");
  const [editingId, setEditingId] = useState(null);

  const seasonGroups = useMemo(() => ageGroups
    .filter((a) => a.season === selectedSeason)
    .sort((a, b) => (a.order || 0) - (b.order || 0) || a.age_group.localeCompare(b.age_group)), [ageGroups, selectedSeason]);

  const nextSeason = seasons.find((s) => s > selectedSeason);
  const nextSeasonGroups = nextSeason ? ageGroups.filter((a) => a.season === nextSeason) : [];

  const getProgression = (ageGroup) => {
    const num = parseInt(ageGroup.age_group.replace("U", ""));
    const next = `U${num + 1}`;
    const nextAG = nextSeasonGroups.find((a) => a.age_group === next);
    return nextAG ? { next, format: nextAG.playing_format, birthYearStart: nextAG.birth_year_start, birthYearEnd: nextAG.birth_year_end } : null;
  };

  const handleSave = (id, field, value) => {
    const parsed = field === "birth_year_start" || field === "birth_year_end" || field === "cutoff_month" || field === "cutoff_day" ? parseInt(value) : value;
    onUpdateAgeGroup(id, { [field]: parsed });
    setEditingId(null);
  };

  const formatRange = (ag) => {
    const startMonth = ag.cutoff_month || 1;
    const startDay = ag.cutoff_day || 1;
    const startMonthName = new Date(2000, startMonth - 1, 1).toLocaleString("en-US", { month: "short" });
    // End date is the day before the cutoff in the following month/year
    // For Aug 1 cutoff: start = Aug 1, end = Jul 1 of the end year
    const endDate = new Date(ag.birth_year_end, startMonth - 1, startDay);
    endDate.setDate(endDate.getDate() - 1);
    const endMonthName = endDate.toLocaleString("en-US", { month: "short" });
    const endDay = endDate.getDate();
    const endYear = endDate.getFullYear();
    if (ag.birth_year_start === ag.birth_year_end) {
      return `${startMonthName} ${startDay}, ${ag.birth_year_start} – ${endMonthName} ${endDay}, ${endYear}`;
    }
    return `${startMonthName} ${startDay}, ${ag.birth_year_start} – ${endMonthName} ${endDay}, ${endYear}`;
  };

  return (
    <Card className="border-border/60">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2"><Calendar className="w-4 h-4 text-primary" /> Age Group Configuration</CardTitle>
        {seasons.length > 0 && (
          <Select value={selectedSeason} onValueChange={setSelectedSeason}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              {seasons.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5" />
          Age groups progress each season — a U11 player in {selectedSeason} becomes U12 next season (same birth year). Cutoff: {seasonGroups[0]?.cutoff_month === 8 ? "August 1" : "January 1"}.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground uppercase">
                <th className="text-left py-2 px-3 font-semibold">Age Group</th>
                <th className="text-center py-2 px-3 font-semibold">Birth Year Start</th>
                <th className="text-center py-2 px-3 font-semibold">Birth Year End</th>
                <th className="text-center py-2 px-3 font-semibold">Cutoff</th>
                <th className="text-center py-2 px-3 font-semibold">Format</th>
                {nextSeason && <th className="text-left py-2 px-3 font-semibold">→ Next Season ({nextSeason})</th>}
              </tr>
            </thead>
            <tbody>
              {seasonGroups.length === 0 ? (
                <tr><td colSpan={6} className="py-4 text-center text-muted-foreground">No age groups configured for {selectedSeason}.</td></tr>
              ) : seasonGroups.map((ag) => {
                const prog = getProgression(ag);
                return (
                  <tr key={ag.id} className="border-b border-border/40 hover:bg-muted/20">
                    <td className="py-2 px-3 font-medium"><Badge variant="outline" className="text-xs">{ag.age_group}</Badge></td>
                    <td className="py-1 px-2 text-center">
                      {editingId === ag.id + "_bys" ? (
                        <Input type="number" defaultValue={ag.birth_year_start || ""} onBlur={(e) => handleSave(ag.id, "birth_year_start", e.target.value)} onKeyDown={(e) => e.key === "Enter" && e.target.blur()} className="h-7 w-20 text-xs text-center mx-auto" autoFocus />
                      ) : <span onClick={() => setEditingId(ag.id + "_bys")} className="text-xs cursor-pointer hover:bg-muted/50 px-2 py-1 rounded">{ag.birth_year_start || "—"}</span>}
                    </td>
                    <td className="py-1 px-2 text-center">
                      {editingId === ag.id + "_bye" ? (
                        <Input type="number" defaultValue={ag.birth_year_end || ""} onBlur={(e) => handleSave(ag.id, "birth_year_end", e.target.value)} onKeyDown={(e) => e.key === "Enter" && e.target.blur()} className="h-7 w-20 text-xs text-center mx-auto" autoFocus />
                      ) : <span onClick={() => setEditingId(ag.id + "_bye")} className="text-xs cursor-pointer hover:bg-muted/50 px-2 py-1 rounded">{ag.birth_year_end || "—"}</span>}
                    </td>
                    <td className="py-1 px-2 text-center text-xs text-muted-foreground">
                      {ag.cutoff_month === 8 ? "Aug 1" : ag.cutoff_month === 1 ? "Jan 1" : `Month ${ag.cutoff_month}`}
                    </td>
                    <td className="py-1 px-2 text-center">
                      <Select value={ag.playing_format} onValueChange={(v) => handleSave(ag.id, "playing_format", v)}>
                        <SelectTrigger className="h-7 text-xs border-0 bg-transparent hover:bg-muted/50 w-20 mx-auto"><SelectValue /></SelectTrigger>
                        <SelectContent>{FORMAT_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </td>
                    {nextSeason && (
                      <td className="py-2 px-3">
                        {prog ? (
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px]">{prog.next}</Badge>
                            <span className="text-xs text-muted-foreground">{prog.format} · {prog.birthYearStart}–{prog.birthYearEnd}</span>
                          </div>
                        ) : <span className="text-xs text-muted-foreground italic">Not configured</span>}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}