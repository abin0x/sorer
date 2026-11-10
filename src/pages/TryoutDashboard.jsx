import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import SubPageLayout from "@/components/layout/SubPageLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardCheck, ClipboardList, Columns3, LayoutGrid, Shield, Star, UserCheck, Users } from "lucide-react";
import { useTenant } from "@/lib/TenantContext";
import { canManageTryouts, filterPlansForUser, tryoutBranchScope } from "@/lib/tryoutAccess";
import { eventsForUser } from "@/lib/evaluationCriteria";
import { Button } from "@/components/ui/button";
import TryoutCommandTab from "@/components/tryout/dashboard/TryoutCommandTab";
import TryoutPlayersTab from "@/components/tryout/dashboard/TryoutPlayersTab";
import SessionBoardTab from "@/components/tryout/dashboard/SessionBoardTab";
import TryoutCheckInTab from "@/components/tryout/dashboard/TryoutCheckInTab";
import TryoutSetupMatrixTab from "@/components/tryout/dashboard/TryoutSetupMatrixTab";
import EvaluationTab from "@/components/tryout/evaluation/EvaluationTab";
import TryoutRostersTab from "@/components/tryout/dashboard/TryoutRostersTab";
import TeamPlansTab from "@/components/tryout/TeamPlansTab";
import TeamPlanApproval from "@/components/tryout/TeamPlanApproval";
import TryoutWorkflowNav from "@/components/tryout/dashboard/TryoutWorkflowNav";
import { useSearchParams } from "@/lib/router-compat";

const TABS = ["overview", "players", "sessions", "evaluation", "checkin", "rosters", "offers", "matrix", "plans", "approvals"];

/** One screen for the whole tryout workflow: coverage and setup, the player
 *  pool, registrations, sessions, coach evaluation, check-in and team plans.
 *  Admins get every tab; an assigned coach lands straight on their own
 *  evaluation list for the sessions they run. */
export default function TryoutDashboard() {
  const qc = useQueryClient();
  const { effectiveClubId: clubId } = useTenant();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get("tab");
  const tab = TABS.includes(urlTab) ? urlTab : "overview";
  const setTab = (next) => setSearchParams((current) => { current.set("tab", next); return current; });
  const [user, setUser] = useState(null);

  React.useEffect(() => { let active = true; setUser(null); base44.auth.me().then((value) => { if (active) setUser(value); }).catch(() => {}); return () => { active = false; }; }, [clubId]);

  const plansQuery = useQuery({
    queryKey: ["tryoutDashPlans", clubId],
    queryFn: () => base44.entities.TryoutPlan.filter({ club_id: clubId }, "-start_date", 200),
    enabled: !!clubId,
    retry: 1,
  });
  const { data: plans = [], isLoading: loadingPlans } = plansQuery;
  const visiblePlans = useMemo(() => filterPlansForUser(plans, user), [plans, user]);
  const planIds = visiblePlans.map((p) => p.id);

  const eventsQuery = useQuery({
    queryKey: ["tryoutDashEvents", clubId, planIds.join(",")],
    queryFn: () => base44.entities.TryoutEvent.filter({ club_id: clubId, tryout_plan_id: { $in: planIds } }, "date", 500),
    enabled: planIds.length > 0,
    retry: 1,
  });
  const { data: events = [], isLoading: loadingEvents } = eventsQuery;

  const canManage = user ? canManageTryouts(user) : false;
  const teamPlansQuery = useQuery({
    queryKey: ["teamPlans", clubId],
    queryFn: () => base44.entities.TeamPlan.filter({ club_id: clubId }, "-created_date", 500),
    enabled: !!clubId && canManage,
    retry: 1,
  });

  // The pool is admin work — a coach's phone never loads it.
  const registrationsQuery = useQuery({
    queryKey: ["tryoutDashRegs", clubId],
    queryFn: () => base44.entities.TryoutRegistration.filter({ club_id: clubId }, "-created_date", 2000),
    enabled: !!clubId && canManage,
    retry: 1,
  });
  const { data: allRegs = [], isLoading: loadingRegs } = registrationsQuery;

  // A branch admin only works their own branch's tryouts; the pool has no plan
  // yet, so it always stays visible to them.
  const registrations = useMemo(() => {
    const branch = tryoutBranchScope(user);
    if (!user || !branch) return allRegs;
    const mine = new Set(planIds);
    return allRegs.filter((r) => !r.tryout_plan_id || mine.has(r.tryout_plan_id));
  }, [allRegs, planIds, user]);

  const onChanged = () => {
    qc.invalidateQueries({ queryKey: ["tryoutDashRegs", clubId] });
    qc.invalidateQueries({ queryKey: ["tryoutDashEvents"] });
  };

  const onPlansChanged = () => {
    qc.invalidateQueries({ queryKey: ["tryoutDashPlans", clubId] });
    qc.invalidateQueries({ queryKey: ["tryoutDashEvents"] });
  };

  const loading = !user || loadingPlans || loadingEvents || loadingRegs || (canManage && teamPlansQuery.isLoading);
  const plansById = useMemo(() => Object.fromEntries(visiblePlans.map((p) => [p.id, p])), [visiblePlans]);
  const myEvents = useMemo(() => eventsForUser(events, plansById, user, false), [events, plansById, user]);

  const failedQuery = [plansQuery, eventsQuery, registrationsQuery, teamPlansQuery].find((query) => query.isError);
  if (failedQuery) {
    return <SubPageLayout title="Tryout Dashboard" backTo="/home">
      <div role="alert" className="space-y-3 py-8">
        <p className="text-destructive">Could not load tryout records. {failedQuery.error?.message}</p>
        <Button variant="outline" onClick={() => { plansQuery.refetch(); if (planIds.length) eventsQuery.refetch(); if (clubId && canManage) { registrationsQuery.refetch(); teamPlansQuery.refetch(); } }}>Try again</Button>
      </div>
    </SubPageLayout>;
  }

  if (loading) {
    return <div className="flex items-center justify-center py-24"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" /></div>;
  }

  // Coaches only ever score, so they get the list straight away.
  if (user && !canManage) {
    return (
      <SubPageLayout title="Tryout Evaluation" backTo="/home" contentClassName="max-w-3xl mx-auto space-y-4">
        <p className="text-sm text-muted-foreground">
          Score the players in your sessions: bib, name, age and photo, with a rating on each criterion and your
          recommendation. Everything saves as you go.
        </p>
        <EvaluationTab
          plans={visiblePlans}
          events={myEvents}
          user={user}
          canManage={false}
          onChanged={onChanged}
        />
      </SubPageLayout>
    );
  }

  return (
    <SubPageLayout title="Tryout Dashboard" backTo="/home" contentClassName="max-w-7xl mx-auto space-y-4">
      <TryoutWorkflowNav tab={tab} onGoToTab={setTab} />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full h-auto grid-cols-1 gap-2 bg-transparent p-0 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { stage: "1 · Plan & setup", items: [["overview", ClipboardList, "Overview"], ["matrix", LayoutGrid, "Tryout setup"], ["plans", ClipboardList, "Team dues"], ["approvals", ClipboardCheck, "Approvals"]] },
            { stage: "2 · Intake & check-in", items: [["players", Users, "Player pool"], ["sessions", Columns3, "Sessions"], ["checkin", UserCheck, "Check-in"]] },
            { stage: "3 · Evaluate", items: [["evaluation", Star, "Scoring & retention"]] },
            { stage: "4 · Rosters & offers", items: [["rosters", Shield, "Roster board"], ["offers", ClipboardCheck, "Offers"]] },
          ].map((group) => (
            <div key={group.stage} className="rounded-xl border border-border bg-card p-2 text-left">
              <p className="px-1 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{group.stage}</p>
              <div className="flex flex-wrap gap-1">
                {group.items.map(([value, Icon, label]) => (
                  <TabsTrigger key={value} value={value} className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Icon className="w-4 h-4" /> {label}</TabsTrigger>
                ))}
              </div>
            </div>
          ))}
        </TabsList>

        <TabsContent value="overview" className="pt-4">
          <TryoutCommandTab plans={visiblePlans} events={events} registrations={registrations} teamPlans={teamPlansQuery.data || []} clubId={clubId} onGoToTab={setTab} />
        </TabsContent>

        <TabsContent value="players" className="pt-4">
          <TryoutPlayersTab clubId={clubId} plans={visiblePlans} events={events} registrations={registrations} onChanged={onChanged} />
        </TabsContent>

        <TabsContent value="sessions" className="pt-4">
          <SessionBoardTab plans={visiblePlans} events={events} registrations={registrations} onChanged={onChanged} />
        </TabsContent>

        <TabsContent value="evaluation" className="pt-4">
          <EvaluationTab
            plans={visiblePlans}
            events={events}
            user={user}
            canManage={canManage}
            onChanged={onChanged}
          />
        </TabsContent>

        <TabsContent value="checkin" className="pt-4">
          <TryoutCheckInTab plans={visiblePlans} events={events} registrations={registrations} onChanged={onChanged} />
        </TabsContent>

        <TabsContent value="rosters" className="pt-4">
          <TryoutRostersTab plans={visiblePlans} events={events} user={user} onGoToTab={setTab} />
        </TabsContent>
        <TabsContent value="offers" className="pt-4">
          <TryoutRostersTab plans={visiblePlans} events={events} user={user} view="offers" onGoToTab={setTab} />
        </TabsContent>

        <TabsContent value="matrix" className="pt-4">
          <TryoutSetupMatrixTab user={user} plans={visiblePlans} onPlansChanged={onPlansChanged} />
        </TabsContent>

        <TabsContent value="plans" className="pt-4">
          <TeamPlansTab />
        </TabsContent>

        <TabsContent value="approvals" className="pt-4">
          <TeamPlanApproval clubId={clubId} />
        </TabsContent>
      </Tabs>
    </SubPageLayout>
  );
}