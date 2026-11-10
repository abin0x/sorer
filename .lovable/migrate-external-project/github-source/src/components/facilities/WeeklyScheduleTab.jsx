import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Upload, Download, Trash2, CalendarClock } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { exportToCsv } from "@/lib/csvUtils";
import WeeklyScheduleImportDialog from "./WeeklyScheduleImportDialog";

const EXPORT_FIELDS = [
  { key: "field_name", label: "Field" },
  { key: "day", label: "Day" },
  { key: "start_time", label: "Start Time" },
  { key: "end_time", label: "End Time" },
  { key: "team", label: "Team" },
  { key: "event_type", label: "Event Type" },
  { key: "status", label: "Status" },
];

export default function WeeklyScheduleTab() {
  const queryClient = useQueryClient();
  const [importOpen, setImportOpen] = useState(false);

  const { data: fields = [] } = useQuery({ queryKey: ["fields-manage"], queryFn: () => base44.entities.Field.list("name", 300) });
  const { data: teams = [] } = useQuery({ queryKey: ["teams-for-schedule"], queryFn: () => base44.entities.Team.list("name", 300) });
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["field-schedule-events"],
    queryFn: () => base44.entities.CalendarEvent.list("start_datetime", 1000),
  });

  const upcoming = useMemo(() => {
    const now = new Date();
    return events
      .filter((e) => e.field_id && new Date(e.start_datetime) >= now)
      .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));
  }, [events]);

  const exportRows = useMemo(() => upcoming.map((e) => ({
    field_name: e.field_name || "",
    day: format(new Date(e.start_datetime), "EEEE"),
    start_time: format(new Date(e.start_datetime), "h:mm a"),
    end_time: e.end_datetime ? format(new Date(e.end_datetime), "h:mm a") : "",
    team: e.team_names?.join(", ") || "",
    event_type: e.event_type,
    status: e.status,
  })), [upcoming]);

  const handleExport = () => {
    if (exportRows.length === 0) { toast.error("No scheduled sessions to export."); return; }
    exportToCsv(`field_schedule_${new Date().toISOString().split("T")[0]}.csv`, exportRows, EXPORT_FIELDS);
  };

  const handleDelete = async (id) => {
    try {
      await base44.entities.CalendarEvent.delete(id);
      queryClient.invalidateQueries({ queryKey: ["field-schedule-events"] });
      toast.success("Session removed.");
    } catch { toast.error("Could not remove session."); }
  };

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["field-schedule-events"] });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">Upload a weekly recurring schedule to auto-generate training sessions tied to fields — they flow directly into the Team Calendar.</p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}><Download className="w-4 h-4 mr-1.5" /> Export CSV</Button>
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setImportOpen(true)}><Upload className="w-4 h-4 mr-1.5" /> Upload Schedule</Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : upcoming.length === 0 ? (
        <Card className="border-border rounded-xl"><CardContent className="py-12 text-center">
          <CalendarClock className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No upcoming field-linked sessions yet. Upload a weekly schedule to get started.</p>
        </CardContent></Card>
      ) : (
        <div className="overflow-x-auto border border-border rounded-xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground uppercase">
                <th className="text-left py-2.5 px-3 font-semibold">Field</th>
                <th className="text-left py-2.5 px-3 font-semibold">Date</th>
                <th className="text-left py-2.5 px-3 font-semibold">Time</th>
                <th className="text-left py-2.5 px-3 font-semibold">Team</th>
                <th className="text-left py-2.5 px-3 font-semibold">Type</th>
                <th className="text-center py-2.5 px-3 font-semibold w-12"></th>
              </tr>
            </thead>
            <tbody>
              {upcoming.slice(0, 200).map((e) => (
                <tr key={e.id} className="border-b border-border/40 hover:bg-muted/20">
                  <td className="py-2 px-3 font-medium text-foreground">{e.field_name}</td>
                  <td className="py-2 px-3 text-muted-foreground">{format(new Date(e.start_datetime), "EEE, MMM d yyyy")}</td>
                  <td className="py-2 px-3 text-muted-foreground">{format(new Date(e.start_datetime), "h:mm a")}{e.end_datetime ? ` – ${format(new Date(e.end_datetime), "h:mm a")}` : ""}</td>
                  <td className="py-2 px-3 text-muted-foreground">{e.team_names?.join(", ") || "—"}</td>
                  <td className="py-2 px-3"><Badge variant="outline" className="text-[10px] capitalize">{e.event_type}</Badge></td>
                  <td className="py-2 px-3 text-center">
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:text-red-600" onClick={() => handleDelete(e.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {upcoming.length > 200 && <p className="text-xs text-muted-foreground text-center py-2">Showing next 200 of {upcoming.length} sessions. Export CSV for the full list.</p>}
        </div>
      )}

      <WeeklyScheduleImportDialog open={importOpen} onOpenChange={setImportOpen} fields={fields} teams={teams} onImported={refresh} />
    </div>
  );
}