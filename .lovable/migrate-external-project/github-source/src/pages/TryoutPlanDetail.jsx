import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ClipboardList, Plus, Pencil, Trash2, Star, Users, Wallet, Mail, CalendarDays, CalendarPlus, ClipboardCheck, Trophy, Megaphone } from "lucide-react";
import SubPageLayout from "@/components/layout/SubPageLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useTenant } from "@/lib/TenantContext";
import TryoutKanbanBoard from "@/components/tryout/TryoutKanbanBoard";
import EventDialog from "@/components/tryout/EventDialog";
import EventDetailDialog from "@/components/tryout/EventDetailDialog";
import EditPlanDialog from "@/components/tryout/EditPlanDialog";
import TryoutSessionsTab from "@/components/tryout/TryoutSessionsTab";
import PlanRegistrationsTab from "@/components/tryout/PlanRegistrationsTab";
import { canManagePlan } from "@/lib/tryoutAccess";
import { planStatusLabel } from "@/lib/tryoutDefaults";
import CheckInPanel from "@/components/tryout/CheckInPanel";
import QuickEvaluation from "@/components/tryout/QuickEvaluation";
import RosterBoard from "@/components/tryout/RosterBoard";
import OfferPanel from "@/components/tryout/OfferPanel";
import InsideRegistrationDialog from "@/components/tryout/InsideRegistrationDialog";
import PromotePanel from "@/components/tryout/PromotePanel";

export default function TryoutPlanDetail() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { effectiveClubId: clubId } = useTenant();
  const planId = new URLSearchParams(window.location.search).get("id");
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [eventDialogForceType, setEventDialogForceType] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [tab, setTab] = useState("events");
  const [dayEventId, setDayEventId] = useState("");
  const [showInsideReg, setShowInsideReg] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  React.useEffect(() => { base44.auth.me().then(setCurrentUser).catch(() => {}); }, []);

  const { data: plan, isLoading: loadingPlan } = useQuery({
    queryKey: ["tryoutPlan", planId], queryFn: () => base44.entities.TryoutPlan.get(planId), enabled: !!planId,
  });
  const { data: events = [], isLoading: loadingEvents } = useQuery({
    queryKey: ["tryoutEvents", planId], queryFn: () => base44.entities.TryoutEvent.filter({ tryout_plan_id: planId }, "date"), enabled: !!planId,
  });
  const { data: tasks = [] } = useQuery({
    queryKey: ["tryoutTasksForPlan", planId, events.map((e) => e.id).join(",")],
    queryFn: async () => { const all = await Promise.all(events.map((e) => base44.entities.TryoutTask.filter({ tryout_event_id: e.id }))); return all.flat(); },
    enabled: events.length > 0,
  });
  const { data: teams = [] } = useQuery({
    queryKey: ["tryoutPlanTeams", plan?.team_ids?.join(",")],
    queryFn: () => Promise.all(plan.team_ids.map((id) => base44.entities.Team.get(id).catch(() => null))).then((r) => r.filter(Boolean)),
    enabled: !!plan?.team_ids?.length,
  });
  const { data: userRoles = [] } = useQuery({ queryKey: ["tryoutStaff"], queryFn: () => base44.entities.UserRoles.filter({ status: "active" }) });
  const { data: coaches = [] } = useQuery({ queryKey: ["tryoutCoaches"], queryFn: () => base44.entities.Coach.list("-created_date", 500) });
  const staff = React.useMemo(() => {
    const roleEmails = new Set(userRoles.map((r) => (r.user_email || "").toLowerCase()).filter(Boolean));
    const coachEntries = coaches.filter((c) => !roleEmails.has((c.email || "").toLowerCase())).map((c) => ({ role: "coach", user_id: c.id, user_name: `${c.first_name || ""} ${c.last_name || ""}`.trim(), user_email: c.email }));
    return [...userRoles, ...coachEntries];
  }, [userRoles, coaches]);

  // Only admins set a tryout up, and branch admins only their own branch.
  const canManage = !!currentUser && canManagePlan(plan, currentUser);

  const tasksByEventId = {}; tasks.forEach((t) => { tasksByEventId[t.tryout_event_id] = t; });
  const eventTeams = selectedEvent ? { ...selectedEvent, team_ids: plan?.team_ids || [] } : null;
  const mainTryout = events.find((e) => e.type === "main_tryout");
  const dayEvent = events.find((e) => e.id === dayEventId) || mainTryout || events[0];

  const refreshEvents = () => { setShowEventDialog(false); setEventDialogForceType(null); queryClient.invalidateQueries({ queryKey: ["tryoutEvents", planId] }); };
  const closeEventDialog = () => { setShowEventDialog(false); setEventDialogForceType(null); };
  const openEventDialog = (forceType) => { setEventDialogForceType(forceType || null); setShowEventDialog(true); };
  const closeEventDetail = () => { setSelectedEvent(null); queryClient.invalidateQueries({ queryKey: ["tryoutEvents", planId] }); };
  const refreshPlan = () => { setShowEditDialog(false); queryClient.invalidateQueries({ queryKey: ["tryoutPlan", planId] }); queryClient.invalidateQueries({ queryKey: ["tryoutPlans"] }); };

  const handleDelete = async () => {
    if (!window.confirm(`Delete plan "${plan.title}"? This will also delete all events, tasks, and subtasks.`)) return;
    setDeleting(true);
    try {
      for (const event of events) {
        const eventTasks = await base44.entities.TryoutTask.filter({ tryout_event_id: event.id });
        for (const task of eventTasks) { await base44.entities.TryoutSubtask.deleteMany({ tryout_task_id: task.id }).catch(() => {}); await base44.entities.TryoutTask.delete(task.id).catch(() => {}); }
        await base44.entities.TryoutEvent.delete(event.id).catch(() => {});
      }
      await base44.entities.TryoutPlan.delete(planId);
      toast.success("Plan deleted"); queryClient.invalidateQueries({ queryKey: ["tryoutPlans"] }); navigate("/TryoutDashboard");
    } catch (e) { toast.error("Failed to delete plan"); }
    setDeleting(false);
  };

  if (loadingPlan || loadingEvents) return <div className="flex items-center justify-center py-24"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" /></div>;
  if (!plan) return <div className="p-8 text-center text-muted-foreground">Tryout plan not found.</div>;

  return (
    <SubPageLayout title={plan.title} backTo="/TryoutDashboard" contentClassName="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0"><ClipboardList className="w-5 h-5 text-primary" /></div>
          <div>
            <Badge variant="outline">{planStatusLabel(plan.status)}</Badge>
            <p className="text-sm text-muted-foreground mt-0.5">{plan.age_group} {plan.gender} {plan.format} · {plan.team_ids?.length || 0} teams{plan.location_names?.length ? ` · ${plan.location_names.join(", ")}` : ""}{plan.lead_name ? ` · Lead: ${plan.lead_name}` : ""}{plan.start_date ? ` · ${plan.start_date}${plan.end_date ? ` – ${plan.end_date}` : ""}` : ""}</p>
          </div>
        </div>
        {canManage && (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setShowEditDialog(true)} className="gap-1.5"><Pencil className="w-4 h-4" /> Edit</Button>
            <Button variant="outline" onClick={handleDelete} disabled={deleting} className="gap-1.5 text-destructive hover:text-destructive"><Trash2 className="w-4 h-4" /> {deleting ? "Deleting…" : "Delete"}</Button>
            {!mainTryout ? (
              <Button onClick={() => openEventDialog("main_tryout")} className="gap-1.5 bg-amber-500 hover:bg-amber-600 text-amber-950"><Star className="w-4 h-4 fill-current" /> Create Main Tryout</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => openEventDialog("open_training")} className="gap-1.5"><Plus className="w-4 h-4" /> Open Training</Button>
                <Button variant="outline" onClick={() => openEventDialog("supplemental_tryout")} className="gap-1.5"><Plus className="w-4 h-4" /> Supplemental</Button>
              </>
            )}
          </div>
        )}
      </div>

      {!mainTryout && (
        <div className="flex items-center gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <Star className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
          Every plan needs exactly one ★ Main Club Tryout Date before other events can be added.
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="sessions" className="gap-1.5"><CalendarPlus className="w-4 h-4" /> Sessions</TabsTrigger>
          <TabsTrigger value="registrations" className="gap-1.5"><Wallet className="w-4 h-4" /> Registrations</TabsTrigger>
          <TabsTrigger value="events" className="gap-1.5"><CalendarDays className="w-4 h-4" /> Events</TabsTrigger>
          <TabsTrigger value="promote" className="gap-1.5"><Megaphone className="w-4 h-4" /> Promote</TabsTrigger>
          <TabsTrigger value="day" className="gap-1.5"><ClipboardCheck className="w-4 h-4" /> Tryout Day</TabsTrigger>
          <TabsTrigger value="rosters" className="gap-1.5"><Users className="w-4 h-4" /> Rosters</TabsTrigger>
          <TabsTrigger value="offers" className="gap-1.5"><Mail className="w-4 h-4" /> Offers</TabsTrigger>
        </TabsList>

        <TabsContent value="sessions" className="pt-4">
          <TryoutSessionsTab
            plan={plan}
            events={events}
            staff={staff}
            canManage={canManage}
            onChanged={() => {
              queryClient.invalidateQueries({ queryKey: ["tryoutEvents", planId] });
              queryClient.invalidateQueries({ queryKey: ["tryoutPlan", planId] });
            }}
          />
        </TabsContent>

        <TabsContent value="registrations" className="pt-4">
          <PlanRegistrationsTab plan={plan} events={events} clubId={clubId} canManage={canManage} />
        </TabsContent>

        <TabsContent value="events" className="pt-4">
          {events.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground text-sm border border-dashed border-border rounded-xl">No events yet. Create the Main Club Tryout Date to get started.</div>
          ) : (
            <TryoutKanbanBoard events={events} tasksByEventId={tasksByEventId} onSelectEvent={setSelectedEvent} />
          )}
        </TabsContent>

        <TabsContent value="promote" className="pt-4">
          <PromotePanel plan={plan} events={events} clubId={clubId} />
        </TabsContent>

        <TabsContent value="day" className="pt-4 space-y-4">
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">Create events first.</p>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Event:</span>
                <Select value={dayEvent?.id || ""} onValueChange={setDayEventId}>
                  <SelectTrigger className="w-80"><SelectValue placeholder="Select event" /></SelectTrigger>
                  <SelectContent>{events.map((e) => <SelectItem key={e.id} value={e.id}>{e.type.replace("_", " ")} — {e.date}{e.start_time ? ` ${e.start_time}` : ""}</SelectItem>)}</SelectContent>
                </Select>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowInsideReg(true)}><Users className="w-3.5 h-3.5" /> Add Club Player</Button>
              </div>
              <div className="grid gap-4 xl:grid-cols-2">
                <div className="space-y-2"><h3 className="text-sm font-semibold">Check-in</h3><CheckInPanel event={dayEvent} clubId={clubId} /></div>
                <div className="space-y-2"><h3 className="text-sm font-semibold">Quick Evaluation</h3><QuickEvaluation event={dayEvent} clubId={clubId} currentUser={currentUser} /></div>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="rosters" className="pt-4">
          <RosterBoard plan={plan} teams={teams} mainTryout={mainTryout} currentUser={currentUser} />
        </TabsContent>

        <TabsContent value="offers" className="pt-4">
          <OfferPanel plan={plan} teams={teams} clubId={clubId} />
        </TabsContent>
      </Tabs>

      <EventDialog open={showEventDialog} plan={plan} staff={staff} events={events} forceType={eventDialogForceType} onClose={closeEventDialog} onCreated={refreshEvents} />
      <EventDetailDialog event={eventTeams} teams={teams} staff={staff} onClose={() => setSelectedEvent(null)} onDeleted={closeEventDetail} />
      <EditPlanDialog plan={showEditDialog ? plan : null} staff={staff} onClose={() => setShowEditDialog(false)} onSaved={refreshPlan} />
      {showInsideReg && <InsideRegistrationDialog event={dayEvent} clubId={clubId} onClose={() => setShowInsideReg(false)} />}
    </SubPageLayout>
  );
}