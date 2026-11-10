import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Clock, MapPin, Users, Bell, CheckCircle2, XCircle, HelpCircle, Mail, Phone, Pencil } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";

const TYPE_COLORS = {
  practice: "bg-emerald-100 text-emerald-700 border-emerald-200",
  game: "bg-blue-100 text-blue-700 border-blue-200",
  tournament: "bg-purple-100 text-purple-700 border-purple-200",
  meeting: "bg-amber-100 text-amber-700 border-amber-200",
  camp: "bg-cyan-100 text-cyan-700 border-cyan-200",
  clinic: "bg-pink-100 text-pink-700 border-pink-200",
  other: "bg-slate-100 text-slate-700 border-slate-200",
};

export default function EventDetailDialog({ open, onOpenChange, event, teams, players, guardians, canManage = false, onEdit }) {
  const [sending, setSending] = useState(false);
  if (!event) return null;

  const teamIds = event.team_ids || [];
  const eventTeams = teams.filter((t) => teamIds.includes(t.id));
  const playerIds = [...new Set(eventTeams.flatMap((t) => t.player_ids || []))];
  const eventPlayers = players.filter((p) => playerIds.includes(p.id));
  const rsvps = event.rsvps || {};

  const attending = eventPlayers.filter((p) => rsvps[p.id] === "attending");
  const notAttending = eventPlayers.filter((p) => rsvps[p.id] === "not_attending");
  const noResponse = eventPlayers.filter((p) => !rsvps[p.id]);

  const pct = eventPlayers.length > 0 ? (attending.length / eventPlayers.length) * 100 : 0;

  const handleReminder = async () => {
    setSending(true);
    try {
      const res = await base44.functions.invoke("sendRsvpReminder", { event_id: event.id });
      toast.success(`Reminder sent to ${res.data.sent} non-responder${res.data.sent !== 1 ? "s" : ""}`);
    } catch (e) {
      toast.error("Failed to send reminders");
    }
    setSending(false);
  };

  const renderPlayer = (p) => {
    const guardian = guardians?.find((g) => g.id === p.guardian_id);
    return (
      <div key={p.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/40 border border-border/40">
        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
          {p.first_name?.[0]}{p.last_name?.[0]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate">{p.first_name} {p.last_name}</p>
          {guardian && (
            <p className="text-[10px] text-muted-foreground truncate">
              {guardian.first_name} {guardian.last_name}
              {guardian.email && ` · ${guardian.email}`}
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-2 pr-6">
            <span className="flex items-center gap-2">
              <Badge className={`text-[10px] capitalize border ${TYPE_COLORS[event.event_type] || TYPE_COLORS.other}`}>{event.event_type}</Badge>
              {event.title}
            </span>
            {canManage && (
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onEdit?.(event)}>
                <Pencil className="w-3 h-3 mr-1" /> Edit
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Event details */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            {event.start_datetime && (
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{format(parseISO(event.start_datetime), "EEE, MMM d · h:mm a")}</span>
            )}
            {event.location_text && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{event.location_text}</span>}
            {event.team_names?.length > 0 && <span className="flex items-center gap-1"><Users className="w-3 h-3" />{event.team_names.join(", ")}</span>}
          </div>

          {/* Attendance summary */}
          {eventPlayers.length > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs"><span className="text-muted-foreground">Attendance</span><span className="font-medium">{attending.length} / {eventPlayers.length} attending</span></div>
              <Progress value={pct} className="h-2" />
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-center">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mx-auto mb-0.5" />
                  <p className="text-sm font-bold text-emerald-700">{attending.length}</p>
                  <p className="text-[9px] text-emerald-600">Attending</p>
                </div>
                <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-center">
                  <XCircle className="w-3.5 h-3.5 text-red-600 mx-auto mb-0.5" />
                  <p className="text-sm font-bold text-red-700">{notAttending.length}</p>
                  <p className="text-[9px] text-red-600">Not Attending</p>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-center">
                  <HelpCircle className="w-3.5 h-3.5 text-slate-500 mx-auto mb-0.5" />
                  <p className="text-sm font-bold text-slate-600">{noResponse.length}</p>
                  <p className="text-[9px] text-slate-500">No Response</p>
                </div>
              </div>
            </div>
          )}

          {/* Reminder button */}
          {noResponse.length > 0 && (
            <Button onClick={handleReminder} disabled={sending} size="sm" className="w-full bg-amber-600 hover:bg-amber-700 text-white">
              <Bell className="w-3.5 h-3.5 mr-1.5" /> {sending ? "Sending…" : `Send Reminder to ${noResponse.length} Non-Responder${noResponse.length !== 1 ? "s" : ""}`}
            </Button>
          )}

          {/* Player lists */}
          {attending.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-emerald-700 mb-1.5 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Attending ({attending.length})</p>
              <div className="space-y-1">{attending.map(renderPlayer)}</div>
            </div>
          )}
          {notAttending.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-red-600 mb-1.5 flex items-center gap-1"><XCircle className="w-3 h-3" /> Not Attending ({notAttending.length})</p>
              <div className="space-y-1">{notAttending.map(renderPlayer)}</div>
            </div>
          )}
          {noResponse.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1.5 flex items-center gap-1"><HelpCircle className="w-3 h-3" /> No Response ({noResponse.length})</p>
              <div className="space-y-1">{noResponse.map(renderPlayer)}</div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}