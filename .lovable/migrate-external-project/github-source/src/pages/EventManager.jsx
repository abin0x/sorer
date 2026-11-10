import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Loader2, Users, ArrowUpCircle, X, CalendarDays, Search } from "lucide-react";
import EventCard from "@/components/events/EventCard";
import PublicEventsLink from "@/components/events/PublicEventsLink";
import ScheduledEventCard from "@/components/events/ScheduledEventCard";
import EventFormDialog from "@/components/events/EventFormDialog";
import EventWizard from "@/components/eventscheduling/EventWizard";
import EventDetailView from "@/components/eventscheduling/EventDetailView";
import { useTenant } from "@/lib/TenantContext";
import MarketingDialogs from "@/components/marketing/MarketingDialogs";
import { fromClubEvent } from "@/lib/marketing/events";

export default function EventManager() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { effectiveClubId: clubId, user } = useTenant();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [scheduleEvent, setScheduleEvent] = useState(null);
  const [editing, setEditing] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [rosterEvent, setRosterEvent] = useState(null);
  const [search, setSearch] = useState("");
  const [composer, setComposer] = useState(null);
  const [campaign, setCampaign] = useState(null);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["club-events"],
    queryFn: () => base44.entities.ClubEvent.list("start_date", 200),
  });

  const { data: schedules = [], isLoading: schedulesLoading } = useQuery({ queryKey: ["schedulingEvents", clubId], enabled: !!clubId, queryFn: () => base44.entities.Event.filter({ club_id: clubId }, "-created_date", 200) });
  const standaloneSchedules = schedules.filter((s) => !events.some((e) => e.scheduling_event_id === s.id));
  const filteredSchedules = standaloneSchedules.filter((s) => !search || s.title?.toLowerCase().includes(search.toLowerCase()));

  const { data: regs = [] } = useQuery({
    queryKey: ["event-registrations", rosterEvent?.id],
    queryFn: () => base44.entities.EventRegistration.filter({ event_id: rosterEvent.id }, "registered_date", 500),
    enabled: !!rosterEvent,
  });

  const startCreate = () => { setWizardOpen(true); };
  const startEdit = (ev) => { setEditing(ev); setFormOpen(true); };
  const openSchedule = async (ev) => {
    setScheduleEvent(await base44.entities.Event.get(ev.scheduling_event_id));
  };

  const save = async (form) => {
    if (!form.name || !form.start_date) { toast({ title: "Name and start date are required", variant: "destructive" }); return; }
    try {
      const payload = { ...form, capacity: Number(form.capacity) || 0, price: Number(form.price) || 0 };
      if (editing?.id) {
        await base44.entities.ClubEvent.update(editing.id, payload);
        if (editing.scheduling_event_id) await base44.entities.Event.update(editing.scheduling_event_id, { title: payload.name, description: payload.description, status: payload.status === "draft" ? "draft" : payload.status === "cancelled" ? "cancelled" : "published" });
        toast({ title: "Event updated" });
      } else {
        const created = await base44.entities.ClubEvent.create(payload);
        toast({ title: "Event created" });
        const mkt = created?.id && created.status !== "draft" ? fromClubEvent(created) : null;
        if (mkt && ["tournament", "registration"].includes(mkt.marketing_type)) setCampaign(mkt);
      }
      setFormOpen(false);
      qc.invalidateQueries({ queryKey: ["club-events"] });
    } catch (e) {
      toast({ title: "Save failed", description: e?.message, variant: "destructive" });
    }
  };

  const remove = async (ev) => {
    if (!window.confirm(`Delete "${ev.name}"? This cannot be undone.`)) return;
    try {
      await base44.entities.ClubEvent.delete(ev.id);
      qc.invalidateQueries({ queryKey: ["club-events"] });
      toast({ title: "Event deleted" });
    } catch (e) {
      toast({ title: "Delete failed", description: e?.message, variant: "destructive" });
    }
  };

  const promoteFromWaitlist = async (r) => {
    const ev = events.find((e) => e.id === r.event_id);
    const isFull = ev.capacity > 0 && (ev.registered_count || 0) >= ev.capacity;
    if (isFull) { toast({ title: "Event is full", variant: "destructive" }); return; }
    try {
      await base44.entities.EventRegistration.update(r.id, { status: "registered" });
      await base44.entities.ClubEvent.update(ev.id, {
        registered_count: (ev.registered_count || 0) + 1,
        waitlist_count: Math.max(0, (ev.waitlist_count || 0) - 1),
        status: ev.capacity > 0 && (ev.registered_count || 0) + 1 >= ev.capacity ? "full" : "open",
      });
      qc.invalidateQueries({ queryKey: ["event-registrations", ev.id] });
      qc.invalidateQueries({ queryKey: ["club-events"] });
      toast({ title: "Promoted from waitlist" });
    } catch (e) {
      toast({ title: "Failed", description: e?.message, variant: "destructive" });
    }
  };

  const cancelReg = async (r) => {
    if (!window.confirm(`Cancel ${r.player_name}'s registration?`)) return;
    const ev = events.find((e) => e.id === r.event_id);
    try {
      await base44.entities.EventRegistration.update(r.id, { status: "cancelled" });
      if (r.status === "registered") {
        await base44.entities.ClubEvent.update(ev.id, { registered_count: Math.max(0, (ev.registered_count || 0) - 1), status: "open" });
      } else {
        await base44.entities.ClubEvent.update(ev.id, { waitlist_count: Math.max(0, (ev.waitlist_count || 0) - 1) });
      }
      qc.invalidateQueries({ queryKey: ["event-registrations", ev.id] });
      qc.invalidateQueries({ queryKey: ["club-events"] });
    } catch (e) {
      toast({ title: "Failed", description: e?.message, variant: "destructive" });
    }
  };

  const filtered = events.filter((ev) =>
    !search || ev.name?.toLowerCase().includes(search.toLowerCase()) || ev.type?.includes(search.toLowerCase())
  );

  const openCount = events.filter((e) => e.status === "open").length;
  const totalRegs = events.reduce((sum, e) => sum + (e.registered_count || 0), 0);

  if (scheduleEvent) return <EventDetailView event={scheduleEvent} onBack={() => { setScheduleEvent(null); qc.invalidateQueries({ queryKey: ["club-events"] }); }} onPublished={async () => { const linked = events.find((e) => e.scheduling_event_id === scheduleEvent.id); if (linked) await base44.entities.ClubEvent.update(linked.id, { status: "open" }); }} />;

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-primary" /> Events
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Create single-day, multi-day, or recurring events with multiple groups and sessions.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <PublicEventsLink clubId={clubId} />
          <Button onClick={startCreate} disabled={!clubId} className="bg-primary hover:bg-primary/90 btn-modern min-h-11"><Plus className="w-4 h-4 mr-1.5" /> New Event</Button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="adisal-card"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Total Events</p>
          <p className="text-2xl font-bold mt-1">{events.length + standaloneSchedules.length}</p>
        </CardContent></Card>
        <Card className="adisal-card"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Open</p>
          <p className="text-2xl font-bold mt-1 text-emerald-600">{openCount}</p>
        </CardContent></Card>
        <Card className="adisal-card"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Registrations</p>
          <p className="text-2xl font-bold mt-1">{totalRegs}</p>
        </CardContent></Card>
      </div>

      {/* Search */}
      {(events.length > 0 || standaloneSchedules.length > 0) && (
        <div className="relative max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search events…" className="pl-9" />
        </div>
      )}

      {/* Grid */}
      {isLoading || schedulesLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 && filteredSchedules.length === 0 ? (
        <Card className="adisal-card"><CardContent className="py-16 text-center">
          <CalendarDays className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
          {events.length === 0 && standaloneSchedules.length === 0 ? (
            <p className="text-muted-foreground">No events yet. Click <b>New Event</b> to create your first camp or class.</p>
          ) : (
            <p className="text-muted-foreground">No events match "{search}".</p>
          )}
        </CardContent></Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((ev) => (
            <EventCard key={ev.id} event={ev} onEdit={startEdit} onDelete={remove} onRoster={setRosterEvent} onSchedule={openSchedule} onPromote={(e) => setComposer({ event: fromClubEvent(e), post: null })} />
          ))}
          {filteredSchedules.map((ev) => <ScheduledEventCard key={ev.id} event={ev} onOpen={setScheduleEvent} />)}
        </div>
      )}

      {/* New Event uses the complete schedule + groups flow here, not a separate page. */}
      {wizardOpen && <EventWizard clubId={clubId} user={user} includeRegistration onClose={() => setWizardOpen(false)} onCreated={() => { setWizardOpen(false); qc.invalidateQueries({ queryKey: ["club-events"] }); qc.invalidateQueries({ queryKey: ["schedulingEvents"] }); }} />}
      <EventFormDialog open={formOpen} onOpenChange={setFormOpen} editing={editing} onSave={save} />
      <MarketingDialogs clubId={clubId} user={user} composer={composer} campaign={campaign} onCloseComposer={() => setComposer(null)} onCloseCampaign={() => setCampaign(null)} />

      {/* Roster dialog */}
      <Dialog open={!!rosterEvent} onOpenChange={(o) => !o && setRosterEvent(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Users className="w-5 h-5 text-primary" /> {rosterEvent?.name} — Roster</DialogTitle></DialogHeader>
          <div className="space-y-2">
            {regs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No registrations yet.</p>
            ) : regs.map((r) => (
              <div key={r.id} className="flex items-center gap-3 p-3 surface-tile rounded-xl">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{r.player_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{r.guardian_email} · {r.payment_status}</p>
                </div>
                <Badge variant="outline" className={r.status === "registered" ? "bg-emerald-50 text-emerald-700" : r.status === "waitlist" ? "bg-amber-50 text-amber-700" : "bg-slate-50 text-slate-500"}>
                  {r.status}
                </Badge>
                {r.status === "waitlist" && (
                  <Button size="sm" variant="outline" onClick={() => promoteFromWaitlist(r)}>
                    <ArrowUpCircle className="w-3.5 h-3.5 mr-1" /> Promote
                  </Button>
                )}
                {r.status !== "cancelled" && (
                  <Button size="sm" variant="ghost" className="text-rose-600 h-8 w-8 p-0" onClick={() => cancelReg(r)}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}