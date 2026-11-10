import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { UserCheck, Star, ClipboardCheck, ChevronRight } from "lucide-react";
import { canManageTryouts, filterPlansForUser } from "@/lib/tryoutAccess";
import { eventsForUser } from "@/lib/evaluationCriteria";
import TryoutCheckInTab from "@/components/tryout/dashboard/TryoutCheckInTab";
import EvaluationTab from "@/components/tryout/evaluation/EvaluationTab";
import FamilyOffers from "@/components/tryout/status/FamilyOffers";

const STAFF_ROLES = ["coach", "team_manager", "evaluator"];
export const isTryoutStaff = (user) => canManageTryouts(user) || STAFF_ROLES.includes(user?.custom_role || user?.role);

/** Staff field tools (check-in, scoring, offers) or the family offer card, inside Beacon. */
export default function BeaconTryouts({ user, clubId }) {
  if (!isTryoutStaff(user)) {
    return (
      <>
        <h1 className="text-2xl font-bold mt-2">Tryouts</h1>
        <p className="text-sm text-muted-foreground mb-3">Team offers for your players. Accept a spot and pay dues right here.</p>
        <FamilyOffers clubId={clubId} email={user?.email} />
      </>
    );
  }
  return <StaffTryouts user={user} clubId={clubId} />;
}

function StaffTryouts({ user, clubId }) {
  const qc = useQueryClient();
  const canManage = canManageTryouts(user);
  const [mode, setMode] = useState(canManage ? "checkin" : "evaluate");
  const { data: plans = [], isLoading: lp } = useQuery({ queryKey: ["tryoutDashPlans", clubId], queryFn: () => base44.entities.TryoutPlan.filter({ club_id: clubId }, "-start_date", 200), enabled: !!clubId });
  const visible = useMemo(() => filterPlansForUser(plans, user), [plans, user]);
  const ids = visible.map((p) => p.id);
  const { data: events = [], isLoading: le } = useQuery({ queryKey: ["tryoutDashEvents", clubId, ids.join(",")], queryFn: () => base44.entities.TryoutEvent.filter({ club_id: clubId, tryout_plan_id: { $in: ids } }, "date", 500), enabled: ids.length > 0 });
  const { data: regs = [] } = useQuery({ queryKey: ["tryoutDashRegs", clubId], queryFn: () => base44.entities.TryoutRegistration.filter({ club_id: clubId }, "-created_date", 2000), enabled: !!clubId && canManage });
  const byId = useMemo(() => Object.fromEntries(visible.map((p) => [p.id, p])), [visible]);
  const myEvents = useMemo(() => canManage ? events : eventsForUser(events, byId, user, false), [events, byId, user, canManage]);
  const onChanged = () => { qc.invalidateQueries({ queryKey: ["tryoutDashRegs", clubId] }); qc.invalidateQueries({ queryKey: ["tryoutDashEvents"] }); };

  const modes = [
    ...(canManage ? [["checkin", "Check-in", UserCheck]] : []),
    ["evaluate", "Evaluate", Star],
    ...(canManage ? [["offers", "Offers", ClipboardCheck]] : []),
  ];
  return (
    <>
      <h1 className="text-2xl font-bold mt-2">Tryouts</h1>
      <div className="sticky top-14 z-20 -mx-4 px-4 py-2 bg-background/95 backdrop-blur flex gap-2">
        {modes.map(([k, l, I]) => (
          <button key={k} onClick={() => setMode(k)} className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-3 text-sm font-bold ${mode === k ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}><I className="w-4 h-4" />{l}</button>
        ))}
      </div>
      {(lp || le) ? <p className="mt-6 text-sm text-muted-foreground">Loading tryouts…</p> : !visible.length ? (
        <p className="mt-6 text-sm text-muted-foreground">No tryouts assigned to you yet.</p>
      ) : (
        <div className="mt-3">
          {mode === "checkin" && <TryoutCheckInTab plans={visible} events={events} registrations={regs} onChanged={onChanged} />}
          {mode === "evaluate" && <EvaluationTab plans={visible} events={myEvents} user={user} canManage={canManage} onChanged={onChanged} />}
          {mode === "offers" && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Build rosters and send offers from the full roster board. Families accept and pay in Beacon.</p>
              {[["Roster board", "rosters"], ["Sent offers", "offers"]].map(([l, t]) => (
                <button key={t} onClick={() => window.location.assign(`/tryoutdashboard?tab=${t}`)} className="w-full flex items-center justify-between rounded-2xl border border-border bg-card p-4 font-semibold">{l}<ChevronRight className="w-4 h-4 text-muted-foreground" /></button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
