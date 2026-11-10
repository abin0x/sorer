import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Pencil, Trash2, CalendarClock } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import FieldBookingDialog from "./FieldBookingDialog";

export default function BookingsTab() {
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState({ open: false, booking: null });

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["field-bookings"],
    queryFn: () => base44.entities.CalendarEvent.list("start_datetime", 1000),
  });

  const fieldBookings = useMemo(() => {
    const now = new Date();
    return events
      .filter((e) => e.field_id)
      .filter((e) => parseISO(e.start_datetime) >= now || isSameDay(parseISO(e.start_datetime), now))
      .sort((a, b) => parseISO(a.start_datetime) - parseISO(b.start_datetime));
  }, [events]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["field-bookings"] });

  const handleDelete = async (id) => {
    try {
      await base44.entities.CalendarEvent.delete(id);
      refresh();
      toast.success("Booking deleted.");
    } catch { toast.error("Could not delete booking."); }
  };

  function isSameDay(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Create, edit, and delete individual field bookings. These appear on the Team Calendar.</p>
        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setDialog({ open: true, booking: null })}>
          <Plus className="w-4 h-4 mr-1.5" /> New Booking
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : fieldBookings.length === 0 ? (
        <Card className="border-border rounded-xl"><CardContent className="py-12 text-center">
          <CalendarClock className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No upcoming field bookings. Create one or import a weekly schedule.</p>
        </CardContent></Card>
      ) : (
        <div className="overflow-x-auto border border-border rounded-xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground uppercase">
                <th className="text-left py-2.5 px-3 font-semibold">Date</th>
                <th className="text-left py-2.5 px-3 font-semibold">Time</th>
                <th className="text-left py-2.5 px-3 font-semibold">Field</th>
                <th className="text-left py-2.5 px-3 font-semibold">Team</th>
                <th className="text-left py-2.5 px-3 font-semibold">Type</th>
                <th className="text-left py-2.5 px-3 font-semibold">Status</th>
                <th className="text-center py-2.5 px-3 font-semibold w-20">Actions</th>
              </tr>
            </thead>
            <tbody>
              {fieldBookings.slice(0, 100).map((e) => (
                <tr key={e.id} className="border-b border-border/40 hover:bg-muted/20">
                  <td className="py-2 px-3 text-muted-foreground">{format(parseISO(e.start_datetime), "EEE, MMM d")}</td>
                  <td className="py-2 px-3 text-muted-foreground">{format(parseISO(e.start_datetime), "h:mm a")}{e.end_datetime ? ` – ${format(parseISO(e.end_datetime), "h:mm a")}` : ""}</td>
                  <td className="py-2 px-3 font-medium text-foreground">{e.field_name}</td>
                  <td className="py-2 px-3 text-muted-foreground">{e.team_names?.join(", ") || "—"}</td>
                  <td className="py-2 px-3"><Badge variant="outline" className="text-[10px] capitalize">{e.event_type}</Badge></td>
                  <td className="py-2 px-3"><Badge variant="outline" className={`text-[10px] capitalize ${e.status === "confirmed" ? "text-emerald-600" : "text-amber-600"}`}>{e.status}</Badge></td>
                  <td className="py-2 px-3 text-center">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setDialog({ open: true, booking: e })}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:text-red-600" onClick={() => handleDelete(e.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {fieldBookings.length > 100 && <p className="text-xs text-muted-foreground text-center py-2">Showing next 100 of {fieldBookings.length} bookings.</p>}
        </div>
      )}

      <FieldBookingDialog open={dialog.open} onOpenChange={(v) => setDialog({ open: v, booking: null })} booking={dialog.booking} onSaved={refresh} />
    </div>
  );
}