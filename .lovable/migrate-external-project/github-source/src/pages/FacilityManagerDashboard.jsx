import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, MapPin, Grid3x3, CalendarClock, CalendarPlus, Upload, Pencil, Trash2, Building2, Activity } from "lucide-react";
import { format, parseISO, isSameDay, isWithinInterval, startOfWeek, endOfWeek } from "date-fns";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import DashboardHeader from "@/components/dashboards/shared/DashboardHeader";
import DashboardSection from "@/components/dashboards/shared/DashboardSection";
import FieldWeekGrid from "@/components/facilities/FieldWeekGrid";
import FieldBookingDialog from "@/components/facilities/FieldBookingDialog";
import WeeklyScheduleImportDialog from "@/components/facilities/WeeklyScheduleImportDialog";

export default function FacilityManagerDashboard() {
  const [user, setUser] = useState(null);
  const [bookingDialog, setBookingDialog] = useState({ open: false, booking: null });
  const [importOpen, setImportOpen] = useState(false);

  useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);

  const { data: facilities = [] } = useQuery({ queryKey: ["facilities-dash"], queryFn: () => base44.entities.Facility.list("name", 200) });
  const { data: fields = [] } = useQuery({ queryKey: ["fields-dash"], queryFn: () => base44.entities.Field.list("name", 300) });
  const { data: events = [], isLoading } = useQuery({ queryKey: ["events-dash"], queryFn: () => base44.entities.CalendarEvent.list("start_datetime", 1000) });

  const fieldEvents = useMemo(() => events.filter((e) => e.field_id), [events]);

  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

  const todayBookings = useMemo(() =>
    fieldEvents.filter((e) => isSameDay(parseISO(e.start_datetime), today)).sort((a, b) => parseISO(a.start_datetime) - parseISO(b.start_datetime)),
    [fieldEvents, today]);

  const weekBookings = useMemo(() =>
    fieldEvents.filter((e) => { const d = parseISO(e.start_datetime); return d >= weekStart && d <= weekEnd; }),
    [fieldEvents, weekStart, weekEnd]);

  const upcomingBookings = useMemo(() =>
    fieldEvents.filter((e) => parseISO(e.start_datetime) >= today).sort((a, b) => parseISO(a.start_datetime) - parseISO(b.start_datetime)).slice(0, 15),
    [fieldEvents, today]);

  const stats = [
    { label: "Facilities", value: facilities.length, icon: Building2, color: "text-blue-600" },
    { label: "Fields", value: fields.length, icon: Grid3x3, color: "text-emerald-600" },
    { label: "Bookings Today", value: todayBookings.length, icon: CalendarClock, color: "text-amber-600" },
    { label: "Bookings This Week", value: weekBookings.length, icon: Activity, color: "text-purple-600" },
  ];

  const handleDelete = async (id) => {
    try {
      await base44.entities.CalendarEvent.delete(id);
      queryClient.invalidateQueries({ queryKey: ["events-dash"] });
      toast.success("Booking deleted.");
    } catch { toast.error("Could not delete booking."); }
  };

  const queryClient = useQueryClient();

  if (!user) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6">
      <DashboardHeader
        roleLabel="Facility Manager"
        userName={user?.full_name}
        subtitle="Manage facilities, fields, and field bookings across all branches"
        primaryQuestion="What fields are booked today and are there any scheduling conflicts?"
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => (
          <Card key={s.label} className="border-border/60 rounded-xl">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg bg-muted/40 flex items-center justify-center shrink-0`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setBookingDialog({ open: true, booking: null })}>
          <CalendarPlus className="w-4 h-4 mr-2" /> New Booking
        </Button>
        <Button variant="outline" onClick={() => setImportOpen(true)}>
          <Upload className="w-4 h-4 mr-2" /> Import Schedule
        </Button>
        <Button variant="outline" asChild>
          <Link to="/Facilities?tab=fields"><Grid3x3 className="w-4 h-4 mr-2" /> Manage Fields</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/Facilities?tab=manage"><Building2 className="w-4 h-4 mr-2" /> Manage Facilities</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Today's Schedule */}
        <DashboardSection title="Today's Schedule" icon={CalendarClock} className="lg:col-span-1" viewAllLink="/Facilities?tab=bookings">
          {isLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : todayBookings.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No bookings today.</p>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {todayBookings.map((e) => (
                <div key={e.id} className="flex items-center gap-2 p-2 rounded-lg border border-border/40 hover:bg-muted/20">
                  <div className="text-xs font-bold text-emerald-600 w-16 shrink-0">{format(parseISO(e.start_datetime), "h:mm a")}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{e.team_names?.[0] || e.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{e.field_name}</p>
                  </div>
                  <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => setBookingDialog({ open: true, booking: e })}><Pencil className="w-3 h-3" /></Button>
                </div>
              ))}
            </div>
          )}
        </DashboardSection>

        {/* Facility Overview */}
        <DashboardSection title="Facilities Overview" icon={Building2} className="lg:col-span-2" viewAllLink="/Facilities?tab=availability">
          {facilities.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No facilities configured.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {facilities.map((f) => {
                const fieldCount = fields.filter((fld) => fld.facility_id === f.id).length;
                const todayCount = todayBookings.filter((e) => e.facility_id === f.id).length;
                return (
                  <div key={f.id} className="p-3 rounded-lg border border-border/40">
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <p className="text-sm font-medium text-foreground truncate">{f.name}</p>
                    </div>
                    <div className="flex gap-2 text-xs text-muted-foreground">
                      <span>{fieldCount} {fieldCount === 1 ? "field" : "fields"}</span>
                      <span>·</span>
                      <span>{todayCount} today</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DashboardSection>
      </div>

      {/* Week Grid */}
      <DashboardSection title="This Week's Field Grid" icon={Grid3x3} description="Field utilization across all facilities for the current week">
        {isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <FieldWeekGrid fields={fields} events={fieldEvents} weekStart={weekStart} />
        )}
      </DashboardSection>

      {/* Upcoming Bookings */}
      <DashboardSection title="Upcoming Bookings" icon={CalendarClock} viewAllLink="/Facilities?tab=bookings">
        {upcomingBookings.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No upcoming bookings.</p>
        ) : (
          <div className="space-y-1.5">
            {upcomingBookings.map((e) => (
              <div key={e.id} className="flex items-center gap-3 p-2 rounded-lg border border-border/40 hover:bg-muted/20">
                <div className="text-xs text-muted-foreground w-24 shrink-0">{format(parseISO(e.start_datetime), "EEE, MMM d")}</div>
                <div className="text-xs font-medium text-foreground w-20 shrink-0">{format(parseISO(e.start_datetime), "h:mm a")}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{e.team_names?.[0] || e.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{e.field_name}</p>
                </div>
                <Badge variant="outline" className="text-[10px] capitalize shrink-0">{e.event_type}</Badge>
                <div className="flex gap-1 shrink-0">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setBookingDialog({ open: true, booking: e })}><Pencil className="w-3 h-3" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:text-red-600" onClick={() => handleDelete(e.id)}><Trash2 className="w-3 h-3" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </DashboardSection>

      <FieldBookingDialog
        open={bookingDialog.open}
        onOpenChange={(v) => setBookingDialog({ open: v, booking: null })}
        booking={bookingDialog.booking}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ["events-dash"] })}
      />
      <WeeklyScheduleImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        fields={fields}
        teams={[]}
        onImported={() => queryClient.invalidateQueries({ queryKey: ["events-dash"] })}
      />
    </div>
  );
}