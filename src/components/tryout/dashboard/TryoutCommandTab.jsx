import React from "react";
import { useNavigate } from '@/lib/router-compat';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowRight, CheckCircle2, Circle, Flag } from "lucide-react";
import { money } from "@/lib/tryoutRegisterApi";
import { planStatusLabel } from "@/lib/tryoutDefaults";
import { issuesFor, playerAge } from "@/lib/tryoutDashboard";
import { tryoutSetupChecklist } from "@/lib/tryoutWorkflow";

const Tile = ({ label, value, tone = "" }) => (
  <Card><CardContent className="p-3">
    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className={`text-xl font-bold ${tone}`}>{value}</p>
  </CardContent></Card>
);

/** The whole tryout programme at a glance: what is in the pool, what is
 *  registered, and where families still owe paperwork or money. */
export default function TryoutCommandTab({ plans, events, registrations, teamPlans = [], clubId, onGoToTab }) {
  const navigate = useNavigate();
  const active = registrations.filter((r) => r.status !== "cancelled");
  const pooled = registrations.filter((r) => r.status === "pooled" || !r.tryout_event_id);
  const registered = active.filter((r) => r.status !== "pooled" && r.tryout_event_id);
  const checkedIn = active.filter((r) => r.checked_in);
  const owing = active.filter((r) => issuesFor(r).includes("payment"));
  const paperwork = active.filter((r) => issuesFor(r).includes("paperwork"));
  const collected = active.reduce((s, r) => s + Number(r.amount_paid || 0), 0);
  const upcoming = events.filter((e) => e.date >= new Date().toISOString().slice(0, 10)).sort((a, b) => a.date.localeCompare(b.date));
  const checklist = tryoutSetupChecklist({ plans, events, teamPlans, clubId });
  const nextStep = checklist.find((item) => !item.done);
  const complete = checklist.filter((item) => item.done).length;

  return (
    <div className="space-y-4">
      <section aria-label="Tryout setup checklist" className="py-4 border-b border-border">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div><h2 className="text-lg font-semibold flex items-center gap-2"><Flag className="h-5 w-5 text-primary" /> Season readiness</h2><p className="text-sm text-muted-foreground">{complete} of {checklist.length} setup steps complete</p></div>
          <Button className="gap-2" onClick={() => onGoToTab(nextStep?.tab || "checkin")}>{nextStep ? "Continue setup" : "Open check-in"}<ArrowRight className="h-4 w-4" /></Button>
        </div>
        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-1">
          {checklist.map((item) => <Button key={item.key} variant="ghost" className="h-auto min-h-16 w-full justify-start gap-3 px-2 text-left whitespace-normal" onClick={() => onGoToTab(item.tab)}>
            {item.done ? <CheckCircle2 className="h-5 w-5 shrink-0 text-status-success-700" /> : <Circle className="h-5 w-5 shrink-0 text-muted-foreground" />}
            <span className="min-w-0 flex-1"><span className="block font-medium">{item.label}</span><span className="block text-xs text-muted-foreground font-normal">{item.detail}</span></span><ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </Button>)}
        </div>
      </section>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Tile label="In the pool" value={pooled.length} />
        <Tile label="Registered" value={registered.length} />
        <Tile label="Checked in" value={checkedIn.length} tone="text-status-success-700" />
        <Tile label="Fees due" value={owing.length} tone="text-destructive" />
        <Tile label="Paperwork out" value={paperwork.length} tone="text-status-warning-700" />
        <Tile label="Collected" value={money(collected)} />
      </div>

      {(pooled.length > 0 || owing.length > 0 || paperwork.length > 0) && (
        <div className="flex flex-wrap items-center gap-2 border border-border bg-status-warning-50 rounded-lg px-4 py-3 text-sm text-status-warning-700">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            {pooled.length} in the pool{owing.length ? ` · ${owing.length} with a fee due` : ""}{paperwork.length ? ` · ${paperwork.length} with paperwork outstanding` : ""}.
          </span>
          <Button size="sm" variant="outline" className="ml-auto gap-1.5" onClick={() => onGoToTab("players")}>
            Work the list <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        {plans.length === 0 && (
          <div className="text-sm text-muted-foreground border border-dashed border-border rounded-xl p-6 text-center lg:col-span-2">
            No tryouts yet. Build one in the Tryout Planner and it will show up here.
          </div>
        )}
        {plans.map((plan) => {
          const rows = registrations.filter((r) => r.tryout_plan_id === plan.id);
          const live = rows.filter((r) => r.status !== "cancelled" && r.status !== "pooled");
          const planEvents = events.filter((e) => e.tryout_plan_id === plan.id);
          const next = planEvents.filter((e) => e.date >= new Date().toISOString().slice(0, 10)).sort((a, b) => a.date.localeCompare(b.date))[0];
          const due = live.filter((r) => issuesFor(r).includes("payment")).length;
          const unsigned = live.filter((r) => issuesFor(r).includes("paperwork")).length;
          const paid = live.filter((r) => r.payment_status === "paid" || r.payment_status === "waived").length;
          const ages = [...new Set(live.map((r) => playerAge(r)).filter((a) => a !== null))].sort((a, b) => a - b);
          return (
            <Card key={plan.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{plan.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {plan.age_group} {plan.gender} {plan.format}{plan.season ? ` · ${plan.season}` : ""}
                      {ages.length ? ` · ages ${ages[0]}–${ages[ages.length - 1]}` : ""}
                    </p>
                  </div>
                  <Badge variant="outline">{planStatusLabel(plan.status)}</Badge>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>{planEvents.length} session{planEvents.length === 1 ? "" : "s"}</span>
                  <span>{live.length} registered</span>
                  <span>{paid} paid</span>
                  {due > 0 && <span className="text-destructive">{due} fee{due === 1 ? "" : "s"} due</span>}
                  {unsigned > 0 && <span className="text-status-warning-700">{unsigned} paperwork out</span>}
                  {next && <span>Next: {next.date}{next.start_time ? ` ${next.start_time}` : ""}</span>}
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={() => navigate(`/TryoutPlanDetail?id=${plan.id}`)}>
                    Open plan
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => onGoToTab("sessions")}>Sessions board</Button>
                  <Button size="sm" variant="ghost" onClick={() => onGoToTab("rosters")}>Team dues & rosters</Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {upcoming.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-semibold mb-2">Next sessions</p>
            <div className="divide-y divide-border">
              {upcoming.slice(0, 6).map((e) => {
                const plan = plans.find((p) => p.id === e.tryout_plan_id);
                const taken = registrations.filter((r) => r.tryout_event_id === e.id && r.status !== "cancelled" && r.status !== "waitlist").length;
                return (
                  <div key={e.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <div>
                      <p className="font-medium">{e.date}{e.start_time ? ` · ${e.start_time}` : ""}</p>
                      <p className="text-xs text-muted-foreground">{plan?.title || "Tryout"}{e.field_name ? ` · ${e.field_name}` : ""}</p>
                    </div>
                    <p className="text-xs text-muted-foreground text-right">
                      {taken}{e.capacity ? ` / ${e.capacity}` : ""} booked
                      {e.checked_in_count ? ` · ${e.checked_in_count} in` : ""}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}