import React, { useState } from "react";
import { Link, useSearchParams } from '@/lib/router-compat';
import { useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Download, Upload, Wand2, RefreshCw, CalendarClock, Plus } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import NewBookingDialog from "@/components/fieldboard/NewBookingDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useTenant } from "@/lib/TenantContext";
import useWeekSchedule from "@/components/fieldboard/useWeekSchedule";
import FieldBoardTab from "@/components/fieldboard/FieldBoardTab";
import ScheduleViews from "@/components/fieldboard/ScheduleViews";
import IssuesPanel from "@/components/fieldboard/IssuesPanel";
import { addDays, snapToMonday, kindOf } from "@/lib/gridEngine";
import { bookingsToCsv, downloadText } from "@/lib/gridExport";

export default function FieldBoard() {
  const tenant = useTenant();
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [issuesOpen, setIssuesOpen] = useState(false);
  const [autoAssigning, setAutoAssigning] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [calSyncing, setCalSyncing] = useState(false);
  const [newBookingOpen, setNewBookingOpen] = useState(false);
  const week = params.get("week") || snapToMonday(new Date().toLocaleDateString("en-CA"));
  const tab = params.get("tab") || "board";
  const sched = useWeekSchedule(tenant.effectiveClubId, week);

  const refresh = () => qc.invalidateQueries({ queryKey: ["gridWeek", tenant.effectiveClubId, week] });
  const setP = (patch) => {
    const n = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? n.set(k, v) : n.delete(k)));
    setParams(n);
  };
  const open = (b) => setP({ tab: "board", facility: b.facility_name, day: b.day, slot: `${b.start}-${b.end}` });
  const openBooking = (id) => {
    const b = sched.bookings.find((x) => x.id === id);
    if (b) setP({ tab: "board", facility: b.facility_name, day: b.day, slot: `${b.start}-${b.end}` });
    setIssuesOpen(false);
  };
  const exportCsv = (withGrid) => downloadText(`weekly_schedule_${week}${withGrid ? "_with_grid" : ""}.csv`, bookingsToCsv(sched.bookings, sched.assignments, sched.formatOf, withGrid));
  const handleAutoAssign = async () => {
    setAutoAssigning(true);
    try {
      const res = await sched.autoAssign();
      toast.success(res.changed ? `Auto-assigned grids to ${res.changed} sessions` : "All sessions already have grids");
    } catch (e) { toast.error(`Auto-assign failed: ${e.message}`); }
    setAutoAssigning(false);
  };
  const handleSyncFromEvents = async () => {
    setSyncing(true);
    try {
      const res = await base44.functions.invoke("sync-field-allocations", { club_id: tenant.effectiveClubId, week_start: week });
      const d = res.data;
      toast.success(`Synced ${d.total} bookings from events, tryouts & tournaments (${d.created} new, ${d.updated} updated)`);
    } catch (e) { toast.error(`Sync failed: ${e.message}`); }
    setSyncing(false);
  };
  const handleSyncToCalendar = async () => {
    setCalSyncing(true);
    try {
      const res = await base44.functions.invoke("sync-bookings-to-calendar", { club_id: tenant.effectiveClubId, week_start: week });
      const d = res.data;
      const msg = d.googleError
        ? `In-app calendar: ${d.calCreated} new, ${d.calUpdated} updated. Google Calendar skipped (${d.googleError})`
        : `Calendar: ${d.calCreated} new, ${d.calUpdated} updated in-app. Google: ${d.googleSynced} synced`;
      toast.success(msg);
    } catch (e) { toast.error(`Calendar sync failed: ${e.message}`); }
    setCalSyncing(false);
  };

  const errors = sched.conflicts.filter((c) => c.severity === "error").length;
  const warns = sched.conflicts.length - errors;
  const missing = sched.bookings.filter((b) => kindOf(b) === "training" && !(sched.assignments[b.id] || []).length).length;

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Field Board</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="icon" variant="outline" onClick={() => setP({ week: addDays(week, -7) })}><ChevronLeft className="h-4 w-4" /></Button>
          <Input type="date" className="w-40" value={week} onChange={(e) => e.target.value && setP({ week: snapToMonday(e.target.value) })} />
          <Button size="icon" variant="outline" onClick={() => setP({ week: addDays(week, 7) })}><ChevronRight className="h-4 w-4" /></Button>
          <Button variant="outline" onClick={handleAutoAssign} disabled={autoAssigning || sched.loading}><Wand2 className="mr-2 h-4 w-4" />Auto-assign grids</Button>
          <Button variant="outline" onClick={handleSyncFromEvents} disabled={syncing || sched.loading}><RefreshCw className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`} />Sync from events</Button>
          <Button variant="outline" onClick={handleSyncToCalendar} disabled={calSyncing || sched.loading}><CalendarClock className={`mr-2 h-4 w-4 ${calSyncing ? "animate-spin" : ""}`} />Sync to calendar</Button>
          <Button variant="outline" onClick={() => exportCsv(true)}><Download className="mr-2 h-4 w-4" />CSV with Grid</Button>
          <Button asChild><Link to={`/GridImport?week=${week}`}><Upload className="mr-2 h-4 w-4" />Grid Import</Link></Button>
          <Button onClick={() => setNewBookingOpen(true)}><Plus className="mr-2 h-4 w-4" />New Booking</Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setIssuesOpen(true)} disabled={!sched.conflicts.length}><Badge variant={errors ? "destructive" : "secondary"}>{errors} errors</Badge></button>
        <button type="button" onClick={() => setIssuesOpen(true)} disabled={!warns}><Badge variant="outline">{warns} warnings</Badge></button>
        <button type="button" onClick={() => setIssuesOpen(true)} disabled={missing <= 0}><Badge variant={missing ? "destructive" : "secondary"}>{missing} missing grids</Badge></button>
        <Badge variant="outline">{sched.bookings.length} bookings</Badge>
      </div>
      {sched.loading ? (
        <div className="py-10 text-center text-muted-foreground">Loading schedule…</div>
      ) : (
        <Tabs value={tab} onValueChange={(v) => setP({ tab: v })}>
          <TabsList>
            <TabsTrigger value="board">Field board</TabsTrigger>
            <TabsTrigger value="team">By team</TabsTrigger>
            <TabsTrigger value="coach">By coach</TabsTrigger>
            <TabsTrigger value="platform">By platform</TabsTrigger>
            <TabsTrigger value="field">By field</TabsTrigger>
          </TabsList>
          <TabsContent value="board">
            <FieldBoardTab sched={sched} sel={{ facility: params.get("facility"), day: params.get("day"), slot: params.get("slot") }} onSel={setP} onBookingUpdated={refresh} />
          </TabsContent>
          {["team", "coach", "platform", "field"].map((v) => (
            <TabsContent key={v} value={v}><ScheduleViews view={v} sched={sched} onOpen={open} /></TabsContent>
          ))}
        </Tabs>
      )}
      <Sheet open={issuesOpen} onOpenChange={setIssuesOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader><SheetTitle>Issues to resolve ({sched.conflicts.length})</SheetTitle></SheetHeader>
          <IssuesPanel conflicts={sched.conflicts} bookings={sched.bookings} onOpen={openBooking} onAutoAssign={handleAutoAssign} autoAssigning={autoAssigning} />
        </SheetContent>
      </Sheet>
      <NewBookingDialog open={newBookingOpen} onClose={() => setNewBookingOpen(false)} week={week} defaultFacility={params.get("facility")} onCreated={refresh} />
    </div>
  );
}