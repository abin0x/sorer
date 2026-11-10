import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Users } from "lucide-react";
import { JOURNEY_STAGES, stageIndex } from "@/lib/journeyStages";
import JourneyDetailDialog from "@/components/journey/JourneyDetailDialog";

const stageColor = (idx) => {
  if (idx <= 1) return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  if (idx <= 3) return "bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300";
  if (idx <= 5) return "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300";
  if (idx <= 7) return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300";
  return "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300";
};

export default function ClientJourneyBoard() {
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);

  const { data: rows = [], isLoading, refetch } = useQuery({
    queryKey: ["clientJourneys"],
    queryFn: () => base44.entities.ClientJourney.list("-updated_date"),
  });

  const filtered = filter === "all" ? rows : rows.filter((r) => r.stage === filter);

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
          <Users className="w-6 h-6 text-primary" /> Client Journey
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Every lead, demo, and trial — status sheet from first visit to renewal.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => setFilter("all")} className={`px-3 py-1.5 rounded-full text-xs font-semibold ${filter === "all" ? "bg-primary text-primary-foreground" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"}`}>
          All ({rows.length})
        </button>
        {JOURNEY_STAGES.map((s) => {
          const count = rows.filter((r) => r.stage === s.key).length;
          return (
            <button key={s.key} onClick={() => setFilter(s.key)} className={`px-3 py-1.5 rounded-full text-xs font-semibold ${filter === s.key ? "bg-primary text-primary-foreground" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"}`}>
              {s.label} ({count})
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-500 dark:text-slate-400">No records in this stage yet.</div>
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contact</TableHead>
                <TableHead>Club</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Last Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50" onClick={() => setSelected(r)}>
                  <TableCell>
                    <div className="font-medium text-slate-900 dark:text-white">{r.contact_name || "—"}</div>
                    <div className="text-xs text-slate-500">{r.contact_email}</div>
                  </TableCell>
                  <TableCell>{r.club_name || "—"}</TableCell>
                  <TableCell className="capitalize">{r.source}</TableCell>
                  <TableCell>
                    <Badge className={stageColor(stageIndex(r.stage))}>
                      {JOURNEY_STAGES.find((s) => s.key === r.stage)?.label || r.stage}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">{r.updated_date ? new Date(r.updated_date).toLocaleDateString() : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {selected && (
        <JourneyDetailDialog
          record={selected}
          open={!!selected}
          onOpenChange={(open) => !open && setSelected(null)}
          onSaved={() => { refetch(); setSelected(null); }}
        />
      )}
    </div>
  );
}