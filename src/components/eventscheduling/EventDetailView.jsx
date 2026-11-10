import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Loader2, CalendarDays, Users, Clock, MapPin, Plus, X, Check } from "lucide-react";
import { format, parseISO } from "date-fns";

const STATUS_COLOR = { scheduled: "bg-emerald-100 text-emerald-700", cancelled: "bg-rose-100 text-rose-700", postponed: "bg-amber-100 text-amber-700" };

export default function EventDetailView({ event, onBack, onPublished }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [addDateOpen, setAddDateOpen] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [selectedOcc, setSelectedOcc] = useState(null);

  const { data: occurrences = [], isLoading: occLoading } = useQuery({
    queryKey: ["occurrences", event.id],
    queryFn: () => base44.entities.EventOccurrence.filter({ event_id: event.id }, "occurrence_date", 200),
  });
  const { data: groups = [] } = useQuery({ queryKey: ["groups", event.id], queryFn: () => base44.entities.Group.filter({ event_id: event.id }) });
  const { data: sessions = [] } = useQuery({ queryKey: ["sessions", event.id], enabled: !!selectedOcc, queryFn: () => base44.entities.Session.filter({ occurrence_id: selectedOcc.id }) });
  const { data: assignments = [] } = useQuery({ queryKey: ["eventGroupSessions", event.id, groups.map((g) => g.id)], enabled: groups.length > 0, queryFn: () => base44.entities.GroupSession.filter({ club_id: event.club_id, group_id: { $in: groups.map((g) => g.id) } }, "created_date", 2000) });
  const { data: locations = [] } = useQuery({ queryKey: ["evtLocations", event.club_id], queryFn: () => base44.entities.EventLocation.filter({ club_id: event.club_id }) });
  const { data: fields = [] } = useQuery({ queryKey: ["evtFields", event.club_id], queryFn: () => base44.entities.EventField.filter({ club_id: event.club_id }) });

  const publish = async () => {
    try {
      await base44.entities.Event.update(event.id, { status: "published" });
      if (onPublished) await onPublished();
      toast({ title: "Event published" });
      onBack();
    } catch (e) { toast({ title: "Failed", description: e.message, variant: "destructive" }); }
  };

  const addOverrideDate = async () => {
    if (!newDate) return;
    try {
      await base44.entities.EventOccurrence.create({ club_id: event.club_id, event_id: event.id, occurrence_date: newDate, timezone: event.timezone, status: "scheduled", is_override: true });
      // Also generate sessions from templates for this override
      const templates = Array.isArray(event.session_templates) ? event.session_templates : [];
      if (templates.length > 0) {
        const occs = await base44.entities.EventOccurrence.filter({ event_id: event.id, occurrence_date: newDate });
        if (occs.length > 0) {
          await base44.entities.Session.bulkCreate(templates.map((t) => ({ club_id: event.club_id, occurrence_id: occs[0].id, name: t.name, start_time: t.start_time, end_time: t.end_time, location_id: t.location_id || "", field_id: t.field_id || "", capacity: t.capacity || 0, status: "scheduled" })));
        }
      }
      setNewDate(""); setAddDateOpen(false); qc.invalidateQueries(["occurrences", event.id]);
      toast({ title: "Date added" });
    } catch (e) { toast({ title: "Failed", description: e.message, variant: "destructive" }); }
  };

  const cancelOccurrence = async (occ) => {
    try { await base44.entities.EventOccurrence.update(occ.id, { status: "cancelled" }); qc.invalidateQueries(["occurrences", event.id]); toast({ title: "Occurrence cancelled" }); }
    catch (e) { toast({ title: "Failed", description: e.message, variant: "destructive" }); }
  };

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="w-4 h-4" /></Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{event.title}</h1>
          <p className="text-sm text-muted-foreground">{event.description}</p>
        </div>
        <Badge className={STATUS_COLOR[event.status] ? `bg-slate-100 text-slate-600` : "bg-slate-100"}>{event.status}</Badge>
        {event.status === "draft" && <Button onClick={publish} size="sm"><Check className="w-4 h-4" /> Publish</Button>}
      </div>

      {/* Groups summary */}
      <div className="flex flex-wrap items-center gap-2">
        <Users className="w-4 h-4 text-muted-foreground" />
        {groups.map((g) => <Badge key={g.id} variant="secondary" style={{ color: g.color }}>{g.name}</Badge>)}
        {groups.length === 0 && <span className="text-xs text-muted-foreground">No groups</span>}
      </div>

      <div className="flex items-center justify-between">
        <h2 className="font-semibold flex items-center gap-2"><CalendarDays className="w-5 h-5 text-primary" /> Occurrences ({occurrences.length})</h2>
        <Button size="sm" variant="outline" onClick={() => setAddDateOpen(true)}><Plus className="w-3 h-3" /> Add Date</Button>
      </div>

      {occLoading ? <div className="flex justify-center h-24"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div> : (
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          {occurrences.map((occ) => (
            <Card key={occ.id} className={`cursor-pointer hover:border-primary/40 transition-colors ${occ.status === "cancelled" ? "opacity-50" : ""}`} onClick={() => setSelectedOcc(occ)}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{format(parseISO(occ.occurrence_date), "EEE, MMM d, yyyy")}</span>
                  <Badge className={STATUS_COLOR[occ.status] || "bg-slate-100"}>{occ.status}</Badge>
                </div>
                {occ.is_override && <Badge variant="outline" className="mt-1 text-xs">override</Badge>}
                {occ.status === "scheduled" && <Button size="sm" variant="ghost" className="text-xs text-rose-500 mt-1 p-0 h-auto" onClick={(e) => { e.stopPropagation(); cancelOccurrence(occ); }}>Cancel</Button>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Session drawer for selected occurrence */}
      {selectedOcc && (
        <Dialog open onOpenChange={() => setSelectedOcc(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Sessions — {format(parseISO(selectedOcc.occurrence_date), "MMM d, yyyy")}</DialogTitle></DialogHeader>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {sessions.length === 0 && <p className="text-sm text-muted-foreground">No sessions for this occurrence.</p>}
              {sessions.map((s) => {
                const loc = locations.find((l) => l.id === s.location_id);
                const fld = fields.find((f) => f.id === s.field_id);
                return (
                  <div key={s.id} className="border rounded-lg p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{s.name}</span>
                      <Badge variant="outline" className="text-xs">{s.status}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> {s.start_time} – {s.end_time}</div>
                    <div className="flex flex-wrap gap-1">{groups.filter((g) => assignments.some((a) => a.session_id === s.id && a.group_id === g.id)).map((g) => <Badge key={g.id} variant="secondary">{g.name}</Badge>)}</div>
                    {(loc || fld) && <div className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" /> {loc?.name}{fld ? ` / ${fld.name}` : ""}</div>}
                    {s.capacity > 0 && <div className="text-xs text-muted-foreground">Capacity: {s.capacity}</div>}
                  </div>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Add override date dialog */}
      <Dialog open={addDateOpen} onOpenChange={setAddDateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add a Date</DialogTitle></DialogHeader>
          <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
          <DialogFooter><Button onClick={addOverrideDate} disabled={!newDate}>Add</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}