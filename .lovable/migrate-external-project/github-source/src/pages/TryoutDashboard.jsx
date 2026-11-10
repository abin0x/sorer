import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import SubPageLayout from "@/components/layout/SubPageLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardCheck, ClipboardList, Columns3, LayoutGrid, Star, UserCheck, Users } from "lucide-react";
import { useTenant } from "@/lib/TenantContext";
import { canManageTryouts, filterPlansForUser, tryoutBranchScope } from "@/lib/tryoutAccess";
import { eventsForUser } from "@/lib/evaluationCriteria";
import TryoutCommandTab from "@/components/tryout/dashboard/TryoutCommandTab";
import TryoutPlayersTab from "@/components/tryout/dashboard/TryoutPlayersTab";
import SessionBoardTab from "@/components/tryout/dashboard/SessionBoardTab";
import TryoutCheckInTab from "@/components/tryout/dashboard/TryoutCheckInTab";
import TryoutSetupMatrixTab from "@/components/tryout/dashboard/TryoutSetupMatrixTab";
import EvaluationTab from "@/components/tryout/evaluation/EvaluationTab";
import TeamPlansTab from "@/components/tryout/TeamPlansTab";
import TeamPlanApproval from "@/components/tryout/TeamPlanApproval";

const TABS = ["overview", "players", "sessions", "evaluation", "checkin", "matrix", "plans", "approvals"];

/** One screen for the whole tryout workflow: coverage and setup, the player
 *  pool, registrations, sessions, coach evaluation, check-in and team plans.
 *  Admins get every tab; an assigned coach lands straight on their own
 *  evaluation list for the sessions they run. */
export default function TryoutDashboard() {
  const qc = useQueryClient();
  const { effectiveClubId: clubId } = useTenant();
  const urlTab = new URLSearchParams(window.location.search).get("tab");
  const [tab, setTab] = useState(TABS.includes(urlTab) ? urlTab : "overview");
  const [user, setUser] = useState(null);

  React.useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);

  const { data: plans = [], isLoading: loadingPlans } = useQuery({
    queryKey: ["tryoutDashPlans", clubId],
    queryFn: () => base44.entities.TryoutPlan.filter({ club_id: clubId }, "-start_date", 200),
    enabled: !!clubId,
  });
  const visiblePlans = useMemo(() => filterPlansForUser(plans, user), [plans, user]);
  const planIds = visiblePlans.map((p) => p.id);

  const { data: events = [], isLoading: loadingEvents } = useQuery({
    queryKey: ["tryoutDashEvents", planIds.join(",")],
    queryFn: () => base44.entities.TryoutEvent.filter({ tryout_plan_id: { $in: planIds } }, "date", 500),
    enabled: planIds.length > 0,
  });

  const canManage = user ? canManageTryouts(user) : false;

  // The pool is admin work — a coach's phone never loads it.
  const { data: allRegs = [], isLoading: loadingRegs } = useQuery({
    queryKey: ["tryoutDashRegs", clubId],
    queryFn: () => base44.entities.TryoutRegistration.filter({ club_id: clubId }, "-created_date", 2000),
    enabled: !!clubId && canManage,
  });

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

  const loading = loadingPlans || loadingEvents || loadingRegs;
  const plansById = useMemo(() => Object.fromEntries(visiblePlans.map((p) => [p.id, p])), [visiblePlans]);
  const myEvents = useMemo(() => eventsForUser(events, plansById, user, false), [events, plansById, user]);

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
      <p className="text-sm text-muted-foreground">
        Every tryout in one place — the player pool, registrations, paperwork, fees, sessions, coach evaluation,
        check-in and team plans.
      </p>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="overview" className="gap-1.5"><ClipboardList className="w-4 h-4" /> Overview</TabsTrigger>
          <TabsTrigger value="players" className="gap-1.5"><Users className="w-4 h-4" /> Players</TabsTrigger>
          <TabsTrigger value="sessions" className="gap-1.5"><Columns3 className="w-4 h-4" /> Sessions</TabsTrigger>
          <TabsTrigger value="evaluation" className="gap-1.5"><Star className="w-4 h-4" /> Evaluation</TabsTrigger>
          <TabsTrigger value="checkin" className="gap-1.5"><UserCheck className="w-4 h-4" /> Check-in</TabsTrigger>
          <TabsTrigger value="matrix" className="gap-1.5"><LayoutGrid className="w-4 h-4" /> Tryout Matrix</TabsTrigger>
          <TabsTrigger value="plans" className="gap-1.5"><ClipboardList className="w-4 h-4" /> Team Plans</TabsTrigger>
          <TabsTrigger value="approvals" className="gap-1.5"><ClipboardCheck className="w-4 h-4" /> Plan Approvals</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="pt-4">
          <TryoutCommandTab plans={visiblePlans} events={events} registrations={registrations} onGoToTab={setTab} />
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