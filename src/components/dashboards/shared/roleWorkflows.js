import {
  ArrowLeftRight, CalendarClock, Grid3x3, ClipboardCheck, Link2,
  Mail, Users, MailCheck, Shield, Wallet, Receipt, FileText,
  Send, RefreshCw, Download, DollarSign, AlertCircle, CheckCircle2,
  Calendar, Megaphone, UserPlus, Target, Star, Video, Zap,
  Trophy, MapPin, TrendingUp, FolderKanban, Plus, ListChecks,
  ClipboardList, HeartHandshake, BookOpen, Activity, Bell,
} from "lucide-react";

/**
 * Role-specific workflow definitions. Each role has:
 * - priorityActions: computed at runtime from dashboard data → top actions
 * - timelineSteps: the key workflow phases shown as a horizontal timeline
 * - checklistSteps: detailed checklist items (can be same as timeline or more granular)
 *
 * The priorityActions are functions that receive dashboard data and return
 * an array of action objects for the PriorityActions hero widget.
 * The timeline/checklist steps are also functions that receive data and
 * return step objects with status computed from the data.
 */

// ── Club Admin ──────────────────────────────────────────────
export const CLUB_ADMIN_WORKFLOW = {
  timelineSteps: (cycleSteps = []) => cycleSteps,
  checklistSteps: (cycleSteps = []) => cycleSteps,
  priorityActions: (data) => {
    const { cycleSteps = [], migrationActive, dash = {}, cycle = {} } = data;
    const actions = [];

    // Migration is always #1 priority if active
    if (migrationActive) {
      actions.push({
        id: "migration",
        title: "Complete Data Migration",
        detail: "Your migration is in progress. Review and submit mapped records to continue.",
        icon: ArrowLeftRight,
        to: "/MigrationWizard",
        priority: "urgent",
        ctaLabel: "Open Migration",
      });
    }

    // Next cycle step
    const firstPending = cycleSteps.find((s) => s.status !== "done");
    if (firstPending) {
      const stepActions = {
        rollover: { title: "Roll Over to New Season", detail: "No active season. Start the rollover to clone teams and begin the cycle.", icon: CalendarClock, to: "/Seasons", ctaLabel: "Roll Over" },
        matrix: { title: "Set Up Age Group Matrix", detail: "Configure birth-date ranges and playing formats for each age group.", icon: Grid3x3, to: "/Seasons", ctaLabel: "Configure" },
        team_plans: { title: "Assign Team Plans", detail: "Teams need active dues plans before tryouts can be published.", icon: Wallet, to: "/TryoutDashboard?tab=plans", ctaLabel: "Assign Plans" },
        tryout_plan: { title: "Create Tryout Plan", detail: "No tryout plans exist. Create one to kick off recruiting.", icon: ClipboardCheck, to: "/TryoutDashboard", ctaLabel: "Create Plan" },
        registration: { title: "Enable Event Registration", detail: "Tryout events exist but registration pages aren't live yet.", icon: Link2, to: "/TryoutDashboard", ctaLabel: "Review Events" },
        invitations: { title: "Invite Players to Tryouts", detail: "Invite current players and share the registration link.", icon: Mail, to: "/TryoutDashboard", ctaLabel: "Invite Players" },
        rosters: { title: "Complete Roster Selection", detail: "Coaches need to finalize their rosters for the new season.", icon: Users, to: "/Registration?tab=teams", ctaLabel: "View Teams" },
        promotion: { title: "Promote Tryouts", detail: "Send announcements and social posts for your tryout sessions.", icon: Mail, to: "/Marketing", ctaLabel: "Promote" },
        tryout_day: { title: "Finish Tryout Evaluations", detail: "Check in players and score every attendee.", icon: ClipboardCheck, to: "/TryoutDashboard", ctaLabel: "Open Sessions" },
        offers: { title: "Send Offers & Registration", detail: "Send offers with waiver and payment links and track who is stuck.", icon: MailCheck, to: "/TryoutDashboard", ctaLabel: "Send Offers" },
        switch: { title: "Review Season Switch", detail: "Run pre-flight checks, archive the old season and activate the new one.", icon: CalendarClock, to: "/Seasons", ctaLabel: "Review" },
        final_reg: { title: "Send Final Registration", detail: "Send final registration invites with waiver and payment links.", icon: MailCheck, to: "/TryoutDashboard", ctaLabel: "Send Invites" },
      };
      const sa = stepActions[firstPending.key];
      if (sa) actions.push({ id: firstPending.key, ...sa, priority: migrationActive ? "high" : "urgent" });
    }

    // Pending registrations
    const pendingRegs = (dash.registrations || []).filter((r) => r.status === "pending");
    if (pendingRegs.length > 0) {
      actions.push({
        id: "pending_regs",
        title: `Approve ${pendingRegs.length} Pending Registration${pendingRegs.length === 1 ? "" : "s"}`,
        detail: "New registrations are waiting for your review and approval.",
        icon: ClipboardCheck,
        to: "/Registration",
        priority: "high",
        ctaLabel: "Review",
        badge: `${pendingRegs.length}`,
      });
    }

    // Missing payments
    const missingPayments = (dash.registrations || []).filter((r) => r.payment_status !== "paid" && r.amount_due > 0);
    if (missingPayments.length > 0) {
      actions.push({
        id: "missing_payments",
        title: `Follow Up on ${missingPayments.length} Missing Payment${missingPayments.length === 1 ? "" : "s"}`,
        detail: "Registrations with outstanding balances need payment follow-up.",
        icon: Wallet,
        to: "/PaymentSettings",
        priority: "high",
        ctaLabel: "View Payments",
        badge: `${missingPayments.length}`,
      });
    }

    return actions;
  },
};

// ── Club Director ───────────────────────────────────────────
export const CLUB_DIRECTOR_WORKFLOW = {
  timelineSteps: (data) => {
    const { dash = {}, cycleSteps = [] } = data;
    const totalPlayers = (dash.players || []).length;
    const activePlayers = (dash.players || []).filter((p) => p.status === "active").length;
    const retentionRate = totalPlayers > 0 ? Math.round((activePlayers / totalPlayers) * 100) : 0;
    const totalOutstanding = (dash.registrations || []).reduce((s, r) => s + Math.max((r.amount_due || 0) - (r.amount_paid || 0), 0), 0);
    const coachless = (dash.teams || []).filter((t) => !t.coach_id && (!t.coach_ids || t.coach_ids.length === 0));
    const rosterIncomplete = (dash.teams || []).filter((t) => (t.player_ids?.length || 0) < (t.max_roster_size || 18) * 0.5);

    return [
      { key: "migration", label: "Migration", icon: ArrowLeftRight, status: data.migrationActive ? "in_progress" : "done", to: "/MigrationWizard", detail: data.migrationActive ? "In progress" : "Complete" },
      { key: "rollover", label: "Season Rollover", icon: CalendarClock, status: cycleSteps[0]?.status || "pending", to: "/Seasons", detail: cycleSteps[0]?.detail || "" },
      { key: "branch_health", label: "Branch Health", icon: TrendingUp, status: coachless.length === 0 && rosterIncomplete.length === 0 ? "done" : coachless.length > 0 ? "blocked" : "in_progress", to: "/Registration?tab=teams", detail: `${coachless.length} coachless, ${rosterIncomplete.length} under-50%` },
      { key: "retention", label: "Player Retention", icon: Users, status: retentionRate >= 80 ? "done" : retentionRate >= 50 ? "in_progress" : "blocked", to: "/Registration?tab=players", detail: `${retentionRate}% retention (${activePlayers}/${totalPlayers})` },
      { key: "financials", label: "Financial Health", icon: DollarSign, status: totalOutstanding === 0 ? "done" : "in_progress", to: "/PaymentSettings", detail: totalOutstanding > 0 ? `$${totalOutstanding.toLocaleString()} outstanding` : "All collected" },
      { key: "oversight", label: "Strategic Oversight", icon: Shield, status: "pending", to: "/PlatformDashboard", detail: "Monitor all branches" },
    ];
  },
  priorityActions: (data) => {
    const { dash = {}, migrationActive } = data;
    const actions = [];

    if (migrationActive) {
      actions.push({ id: "migration", title: "Monitor Data Migration", detail: "Migration in progress. Check status and support notes.", icon: ArrowLeftRight, to: "/MigrationWizard", priority: "urgent", ctaLabel: "View Migration" });
    }

    const coachless = (dash.teams || []).filter((t) => !t.coach_id && (!t.coach_ids || t.coach_ids.length === 0));
    if (coachless.length > 0) {
      actions.push({ id: "coachless", title: `${coachless.length} Teams Without Coaches`, detail: "Assign coaches to ensure teams can run tryouts and practices.", icon: Shield, to: "/Registration?tab=teams", priority: "high", ctaLabel: "Assign Coaches", badge: `${coachless.length}` });
    }

    const totalOutstanding = (dash.registrations || []).reduce((s, r) => s + Math.max((r.amount_due || 0) - (r.amount_paid || 0), 0), 0);
    if (totalOutstanding > 0) {
      actions.push({ id: "outstanding", title: `$${totalOutstanding.toLocaleString()} Outstanding`, detail: "Receivables need attention. Review payment status across branches.", icon: DollarSign, to: "/PaymentSettings", priority: "high", ctaLabel: "Review" });
    }

    return actions;
  },
};

// ── Admin / Master Admin / Branch Admin ─────────────────────
export const ADMIN_WORKFLOW = {
  timelineSteps: (data) => {
    const { dash = {} } = data;
    const pendingRegs = (dash.registrations || []).filter((r) => r.status === "pending");
    const missingPayments = (dash.registrations || []).filter((r) => r.payment_status !== "paid" && r.amount_due > 0);
    const unassigned = (dash.players || []).filter((p) => !p.team_id);
    const coachless = (dash.teams || []).filter((t) => !t.coach_id);

    return [
      { key: "registrations", label: "Approve Registrations", icon: ClipboardCheck, status: pendingRegs.length === 0 ? "done" : "in_progress", to: "/Registration", detail: pendingRegs.length > 0 ? `${pendingRegs.length} pending` : "All approved" },
      { key: "rosters", label: "Build Rosters", icon: Users, status: unassigned.length === 0 ? "done" : "in_progress", to: "/Registration?tab=teams", detail: unassigned.length > 0 ? `${unassigned.length} unassigned` : "All rostered" },
      { key: "coaches", label: "Assign Coaches", icon: Shield, status: coachless.length === 0 ? "done" : "in_progress", to: "/Registration?tab=teams", detail: coachless.length > 0 ? `${coachless.length} coachless` : "All assigned" },
      { key: "payments", label: "Collect Payments", icon: Wallet, status: missingPayments.length === 0 ? "done" : "in_progress", to: "/PaymentSettings", detail: missingPayments.length > 0 ? `${missingPayments.length} outstanding` : "All paid" },
      { key: "schedule", label: "Schedule Events", icon: Calendar, status: "pending", to: "/TeamCalendar", detail: "Practices & games" },
      { key: "communicate", label: "Communicate", icon: Megaphone, status: "pending", to: "/CommunicationPortal", detail: "Club & branch" },
    ];
  },
  priorityActions: (data) => {
    const { dash = {}, migrationActive } = data;
    const actions = [];

    if (migrationActive) {
      actions.push({ id: "migration", title: "Complete Data Migration", detail: "Migration in progress. Review mapped records.", icon: ArrowLeftRight, to: "/MigrationWizard", priority: "urgent", ctaLabel: "Open Migration" });
    }

    const pendingRegs = (dash.registrations || []).filter((r) => r.status === "pending");
    if (pendingRegs.length > 0) {
      actions.push({ id: "pending_regs", title: `Approve ${pendingRegs.length} Registration${pendingRegs.length === 1 ? "" : "s"}`, detail: "New registrations waiting for approval.", icon: ClipboardCheck, to: "/Registration", priority: "urgent", ctaLabel: "Review", badge: `${pendingRegs.length}` });
    }

    const missingPayments = (dash.registrations || []).filter((r) => r.payment_status !== "paid" && r.amount_due > 0);
    if (missingPayments.length > 0) {
      actions.push({ id: "missing_payments", title: `Follow Up ${missingPayments.length} Payment${missingPayments.length === 1 ? "" : "s"}`, detail: "Outstanding balances need follow-up.", icon: Wallet, to: "/PaymentSettings", priority: "high", ctaLabel: "View Payments", badge: `${missingPayments.length}` });
    }

    const unassigned = (dash.players || []).filter((p) => !p.team_id);
    if (unassigned.length > 0) {
      actions.push({ id: "unassigned", title: `Place ${unassigned.length} Unassigned Player${unassigned.length === 1 ? "" : "s"}`, detail: "Players without a team assignment.", icon: Users, to: "/Registration?tab=teams", priority: "high", ctaLabel: "Assign", badge: `${unassigned.length}` });
    }

    return actions;
  },
};

// ── Branch Director ────────────────────────────────────────
export const BRANCH_DIRECTOR_WORKFLOW = {
  timelineSteps: (data) => {
    const { branchPlayers = [], branchTeams = [], branchRegs = [], branchFacilities = [] } = data;
    const unassigned = branchPlayers.filter((p) => !p.team_id);
    const coachless = branchTeams.filter((t) => !t.coach_id);
    const rosterIncomplete = branchTeams.filter((t) => (t.player_ids?.length || 0) < (t.max_roster_size || 18));
    const outstanding = branchRegs.reduce((s, r) => s + Math.max((r.amount_due || 0) - (r.amount_paid || 0), 0), 0);

    return [
      { key: "rosters", label: "Complete Rosters", icon: Users, status: unassigned.length === 0 && rosterIncomplete.length === 0 ? "done" : "in_progress", to: "/Registration?tab=teams", detail: unassigned.length > 0 ? `${unassigned.length} unassigned` : `${rosterIncomplete.length} incomplete` },
      { key: "coaches", label: "Assign Coaches", icon: Shield, status: coachless.length === 0 ? "done" : "in_progress", to: "/ClubStaff", detail: coachless.length > 0 ? `${coachless.length} unassigned` : "All assigned" },
      { key: "fields", label: "Manage Fields", icon: MapPin, status: branchFacilities.length > 0 ? "done" : "pending", to: "/Facilities", detail: `${branchFacilities.length} facilities` },
      { key: "payments", label: "Collect Payments", icon: Wallet, status: outstanding === 0 ? "done" : "in_progress", to: "/PaymentSettings", detail: outstanding > 0 ? `$${outstanding.toLocaleString()} outstanding` : "All paid" },
      { key: "schedule", label: "Schedule & Conflicts", icon: Calendar, status: "pending", to: "/TeamCalendar", detail: "Practices & games" },
      { key: "communicate", label: "Branch Comms", icon: Megaphone, status: "pending", to: "/CommunicationPortal", detail: "Announcements" },
    ];
  },
  priorityActions: (data) => {
    const { branchPlayers = [], branchTeams = [], branchRegs = [] } = data;
    const actions = [];

    const unassigned = branchPlayers.filter((p) => !p.team_id);
    if (unassigned.length > 0) {
      actions.push({ id: "unassigned", title: `Place ${unassigned.length} Unassigned Player${unassigned.length === 1 ? "" : "s"}`, detail: "Players need team assignments in your branch.", icon: UserPlus, to: "/Registration?tab=players", priority: "urgent", ctaLabel: "Assign", badge: `${unassigned.length}` });
    }

    const coachless = branchTeams.filter((t) => !t.coach_id);
    if (coachless.length > 0) {
      actions.push({ id: "coachless", title: `${coachless.length} Teams Need Coaches`, detail: "Assign coaches to your branch teams.", icon: Shield, to: "/ClubStaff", priority: "high", ctaLabel: "Assign", badge: `${coachless.length}` });
    }

    const outstanding = branchRegs.reduce((s, r) => s + Math.max((r.amount_due || 0) - (r.amount_paid || 0), 0), 0);
    if (outstanding > 0) {
      actions.push({ id: "outstanding", title: `$${outstanding.toLocaleString()} Outstanding`, detail: "Branch receivables need attention.", icon: Wallet, to: "/PaymentSettings", priority: "high", ctaLabel: "Review" });
    }

    return actions;
  },
};

// ── Coach ──────────────────────────────────────────────────
export const COACH_WORKFLOW = {
  timelineSteps: (data) => {
    const { myTeams = [], nextEvent, evalsPending = 0, totalRoster = 0 } = data;
    return [
      { key: "next_event", label: "Next Event", icon: Calendar, status: nextEvent ? "in_progress" : "pending", to: "/TeamCalendar", detail: nextEvent ? nextEvent.title : "Nothing scheduled" },
      { key: "roster", label: "Review Roster", icon: Users, status: totalRoster > 0 ? "done" : "pending", to: "/Registration?tab=teams", detail: `${totalRoster} players` },
      { key: "evaluations", label: "Log Evaluations", icon: Star, status: evalsPending === 0 ? "done" : "in_progress", to: "/CenterOfExcellence", detail: evalsPending > 0 ? `${evalsPending} pending` : "All done" },
      { key: "skill_tests", label: "Skill Tests", icon: Target, status: "pending", to: "/SkillTests", detail: "Log test scores" },
      { key: "communicate", label: "Message Team", icon: Megaphone, status: "pending", to: "/CommunicationPortal", detail: "Team & parents" },
      { key: "expenses", label: "Submit Expenses", icon: Receipt, status: "pending", to: "/StaffExpenses", detail: "Travel & costs" },
    ];
  },
  priorityActions: (data) => {
    const { nextEvent, evalsPending = 0 } = data;
    const actions = [];

    if (nextEvent) {
      actions.push({ id: "next_event", title: "Prepare for Next Event", detail: nextEvent.title, icon: Calendar, to: "/TeamCalendar", priority: "urgent", ctaLabel: "View Schedule" });
    }

    if (evalsPending > 0) {
      actions.push({ id: "evals", title: `${evalsPending} Evaluation${evalsPending === 1 ? "" : "s"} Pending`, detail: "Log player evaluations to track development.", icon: Star, to: "/CenterOfExcellence", priority: "high", ctaLabel: "Log Now", badge: `${evalsPending}` });
    }

    actions.push({ id: "message", title: "Message Your Team", detail: "Send updates to players and parents.", icon: Megaphone, to: "/CommunicationPortal", priority: "medium", ctaLabel: "Compose" });

    return actions;
  },
};

// ── Bookkeeper ─────────────────────────────────────────────
export const BOOKKEEPER_WORKFLOW = {
  timelineSteps: (data) => {
    const { outstandingTotal = 0, overdueInvoices = [], unpaidExpenses = [], pendingApprovalExpenses = [], collectionRate = 0 } = data;
    return [
      { key: "collect", label: "Collect Payments", icon: DollarSign, status: outstandingTotal === 0 ? "done" : "in_progress", to: "/PaymentSettings?tab=overdue", detail: outstandingTotal > 0 ? `$${outstandingTotal.toLocaleString()} outstanding` : "All collected" },
      { key: "approve", label: "Approve Expenses", icon: Receipt, status: pendingApprovalExpenses.length === 0 ? "done" : "in_progress", to: "/ExpenseApprovals?view=approvals", detail: pendingApprovalExpenses.length > 0 ? `${pendingApprovalExpenses.length} pending` : "All approved" },
      { key: "pay_staff", label: "Pay Staff", icon: Wallet, status: unpaidExpenses.length === 0 ? "done" : "in_progress", to: "/ExpenseApprovals?view=payables", detail: unpaidExpenses.length > 0 ? `${unpaidExpenses.length} to pay` : "All paid" },
      { key: "invoice", label: "Generate Invoices", icon: FileText, status: overdueInvoices.length === 0 ? "done" : "in_progress", to: "/PaymentSettings?tab=invoices", detail: overdueInvoices.length > 0 ? `${overdueInvoices.length} overdue` : "Up to date" },
      { key: "sync", label: "QuickBooks Sync", icon: RefreshCw, status: "pending", to: "/settings/integrations", detail: "Accounting sync" },
      { key: "report", label: "Export Reports", icon: Download, status: "pending", to: "/PaymentSettings?tab=summary", detail: "Financial statements" },
    ];
  },
  priorityActions: (data) => {
    const { outstandingTotal = 0, overdueInvoices = [], pendingApprovalExpenses = [], overdue = [] } = data;
    const actions = [];

    if (overdue.length > 0) {
      actions.push({ id: "overdue_pay", title: `${overdue.length} Overdue Bill${overdue.length === 1 ? "" : "s"}`, detail: "Approved bills are past their due date. Process immediately.", icon: AlertCircle, to: "/ExpenseApprovals?view=payables", priority: "urgent", ctaLabel: "Process", badge: `${overdue.length}` });
    }

    if (outstandingTotal > 0) {
      actions.push({ id: "collect", title: `$${outstandingTotal.toLocaleString()} Outstanding`, detail: "Send payment reminders to families with outstanding balances.", icon: Send, to: "/PaymentSettings?tab=overdue", priority: "high", ctaLabel: "Send Reminders" });
    }

    if (pendingApprovalExpenses.length > 0) {
      actions.push({ id: "approve", title: `Approve ${pendingApprovalExpenses.length} Expense${pendingApprovalExpenses.length === 1 ? "" : "s"}`, detail: "Expenses awaiting your approval.", icon: Receipt, to: "/ExpenseApprovals?view=approvals", priority: "high", ctaLabel: "Review", badge: `${pendingApprovalExpenses.length}` });
    }

    return actions;
  },
};

// ── Player ─────────────────────────────────────────────────
export const PLAYER_WORKFLOW = {
  timelineSteps: (data) => {
    const { nextEvent, myAttendanceRate, evalsCompleted = 0, activeGoals = 0 } = data;
    return [
      { key: "rsvp", label: "RSVP to Events", icon: CheckCircle2, status: nextEvent ? "in_progress" : "pending", to: "/TeamCalendar", detail: nextEvent ? nextEvent.title : "Nothing scheduled" },
      { key: "attend", label: "Attend Events", icon: Calendar, status: myAttendanceRate !== null ? "done" : "pending", to: "/TeamCalendar", detail: myAttendanceRate !== null ? `${myAttendanceRate}% attendance` : "No history" },
      { key: "develop", label: "View Development", icon: Star, status: evalsCompleted > 0 ? "done" : "pending", to: "/PlayerDetail", detail: `${evalsCompleted} evaluations` },
      { key: "goals", label: "Track Goals", icon: Target, status: activeGoals > 0 ? "done" : "pending", to: "/PlayerDetail", detail: `${activeGoals} active goals` },
      { key: "learn", label: "Watch Videos", icon: Video, status: "pending", to: "/VideoLibrary", detail: "Training library" },
      { key: "epic", label: "E.P.I.C. Tenets", icon: Zap, status: "pending", to: "/EpicTenet", detail: "Development framework" },
    ];
  },
  priorityActions: (data) => {
    const { nextEvent, myAttendanceRate, evalsCompleted = 0 } = data;
    const actions = [];

    if (nextEvent) {
      const rsvp = nextEvent.rsvps;
      const needsRsvp = !rsvp || Object.keys(rsvp).length === 0;
      actions.push({ id: "rsvp", title: "RSVP to Next Event", detail: nextEvent.title, icon: CheckCircle2, to: "/TeamCalendar", priority: "urgent", ctaLabel: "RSVP Now" });
    }

    if (evalsCompleted === 0) {
      actions.push({ id: "develop", title: "Check Your Development", detail: "View coach feedback and evaluation scores.", icon: Star, to: "/PlayerDetail", priority: "medium", ctaLabel: "View Profile" });
    }

    actions.push({ id: "message", title: "Message Your Coach", detail: "Ask questions or get support.", icon: Mail, to: "/CommunicationPortal", priority: "medium", ctaLabel: "Compose" });

    return actions;
  },
};

// ── Family / Team Manager ──────────────────────────────────
export const FAMILY_WORKFLOW = {
  timelineSteps: (data) => {
    const { isTeamManager, nextEvent, totalDue = 0, totalPaid = 0, missingDocsCount = 0, pendingActionCount = 0 } = data;
    const outstanding = totalDue - totalPaid;
    return [
      { key: "rsvp", label: "RSVP to Events", icon: CheckCircle2, status: nextEvent ? "in_progress" : "pending", to: "/TeamCalendar", detail: nextEvent ? nextEvent.title : "Nothing scheduled" },
      { key: "pay", label: "Complete Payments", icon: Wallet, status: outstanding <= 0 ? "done" : "in_progress", to: "/FamilyAccount", detail: outstanding > 0 ? `$${outstanding.toLocaleString()} due` : "All paid" },
      { key: "forms", label: "Submit Forms", icon: FileText, status: missingDocsCount === 0 ? "done" : "in_progress", to: "/FamilyAccount", detail: missingDocsCount > 0 ? `${missingDocsCount} needed` : "All submitted" },
      { key: "develop", label: "Track Development", icon: Target, status: "pending", to: "/CenterOfExcellence", detail: "Coach feedback" },
      { key: "communicate", label: "Message Coach", icon: Megaphone, status: "pending", to: "/CommunicationPortal", detail: "Team & coach" },
      { key: "support", label: "Get Support", icon: HeartHandshake, status: "pending", to: "/CommunicationPortal", detail: "Help & questions" },
    ];
  },
  priorityActions: (data) => {
    const { isTeamManager, nextEvent, totalDue = 0, totalPaid = 0, missingDocsCount = 0, missingPaymentCount = 0 } = data;
    const outstanding = totalDue - totalPaid;
    const actions = [];

    if (nextEvent) {
      actions.push({ id: "rsvp", title: "RSVP to Next Event", detail: nextEvent.title, icon: CheckCircle2, to: "/TeamCalendar", priority: "urgent", ctaLabel: "RSVP Now" });
    }

    if (!isTeamManager && outstanding > 0) {
      actions.push({ id: "pay", title: `$${outstanding.toLocaleString()} Payment Due`, detail: "Complete your registration payment to secure your spot.", icon: Wallet, to: "/FamilyAccount", priority: "high", ctaLabel: "Pay Now" });
    }

    if (missingDocsCount > 0) {
      actions.push({ id: "forms", title: `${missingDocsCount} Form${missingDocsCount === 1 ? "" : "s"} Needed`, detail: "Outstanding documents and waivers to submit.", icon: FileText, to: "/FamilyAccount", priority: "high", ctaLabel: "Submit", badge: `${missingDocsCount}` });
    }

    if (isTeamManager) {
      actions.push({ id: "message", title: "Message Your Team", detail: "Send updates to players and parents.", icon: Megaphone, to: "/CommunicationPortal", priority: "medium", ctaLabel: "Compose" });
    }

    return actions;
  },
};

// ── Project Manager ────────────────────────────────────────
export const PROJECT_MANAGER_WORKFLOW = {
  timelineSteps: (data) => {
    const { myPrograms = [], overdue = [], openTasks = [] } = data;
    return [
      { key: "overdue", label: "Fix Overdue", icon: AlertCircle, status: overdue.length === 0 ? "done" : "blocked", to: "/ProgramsList", detail: overdue.length > 0 ? `${overdue.length} overdue` : "None overdue" },
      { key: "tasks", label: "Complete Tasks", icon: ListChecks, status: openTasks.length === 0 ? "done" : "in_progress", to: "/Kanban", detail: `${openTasks.length} open` },
      { key: "programs", label: "Manage Programs", icon: FolderKanban, status: myPrograms.length > 0 ? "in_progress" : "pending", to: "/ProgramsList", detail: `${myPrograms.length} programs` },
      { key: "timeline", label: "Review Timeline", icon: CalendarClock, status: "pending", to: "/Timeline", detail: "Milestones" },
      { key: "report", label: "Export Reports", icon: Download, status: "pending", to: "/Analytics", detail: "Project data" },
    ];
  },
  priorityActions: (data) => {
    const { overdue = [], openTasks = [], myPrograms = [] } = data;
    const actions = [];

    if (overdue.length > 0) {
      actions.push({ id: "overdue", title: `${overdue.length} Overdue Program${overdue.length === 1 ? "" : "s"}`, detail: "Programs past their due date need immediate attention.", icon: AlertCircle, to: "/ProgramsList", priority: "urgent", ctaLabel: "Fix Now", badge: `${overdue.length}` });
    }

    if (openTasks.length > 0) {
      actions.push({ id: "tasks", title: `${openTasks.length} Open Task${openTasks.length === 1 ? "" : "s"}`, detail: "Tasks across your programs need completion.", icon: ListChecks, to: "/Kanban", priority: "high", ctaLabel: "Open Kanban", badge: `${openTasks.length}` });
    }

    if (myPrograms.length === 0) {
      actions.push({ id: "create", title: "Create Your First Program", detail: "Start a new project or task to get organized.", icon: Plus, to: "/ProgramsList", priority: "medium", ctaLabel: "Create" });
    }

    return actions;
  },
};

// ── Platform Director ──────────────────────────────────────
export const PLATFORM_DIRECTOR_WORKFLOW = {
  timelineSteps: (data) => {
    const { rosterCompleteness = 0, attendanceRate = null, evalCompletion = 0, retentionRate = 0, upcomingEvents = [] } = data;
    return [
      { key: "rosters", label: "Complete Rosters", icon: Users, status: rosterCompleteness >= 80 ? "done" : rosterCompleteness >= 50 ? "in_progress" : "blocked", to: "/PlatformDashboard", detail: `${rosterCompleteness}% complete` },
      { key: "coaches", label: "Assign Coaches", icon: Shield, status: "in_progress", to: "/ClubStaff", detail: "Platform teams" },
      { key: "attendance", label: "Track Attendance", icon: Activity, status: attendanceRate !== null && attendanceRate >= 80 ? "done" : "in_progress", to: "/TeamCalendar", detail: attendanceRate !== null ? `${attendanceRate}%` : "No data" },
      { key: "evaluations", label: "Submit Evaluations", icon: CheckCircle2, status: evalCompletion >= 80 ? "done" : "in_progress", to: "/CenterOfExcellence", detail: `${evalCompletion}% done` },
      { key: "retention", label: "Monitor Retention", icon: HeartHandshake, status: retentionRate >= 80 ? "done" : "in_progress", to: "/Registration?tab=players", detail: `${retentionRate}% retained` },
      { key: "develop", label: "Set Development Goals", icon: Target, status: "pending", to: "/CenterOfExcellence", detail: "Player goals" },
    ];
  },
  priorityActions: (data) => {
    const { rosterCompleteness = 0, evalCompletion = 0, retentionRate = 0, unassignedPlayers = [] } = data;
    const actions = [];

    if (unassignedPlayers.length > 0) {
      actions.push({ id: "unassigned", title: `${unassignedPlayers.length} Unassigned Player${unassignedPlayers.length === 1 ? "" : "s"}`, detail: "Players in your platform without a team.", icon: UserPlus, to: "/Registration?tab=players", priority: "high", ctaLabel: "Assign", badge: `${unassignedPlayers.length}` });
    }

    if (rosterCompleteness < 80) {
      actions.push({ id: "rosters", title: "Roster Completion Needed", detail: `${rosterCompleteness}% of teams have full rosters. Work with coaches to fill gaps.`, icon: Users, to: "/PlatformDashboard", priority: "high", ctaLabel: "Review Teams" });
    }

    if (evalCompletion < 80) {
      actions.push({ id: "evals", title: "Evaluation Submission Lagging", detail: `${evalCompletion}% of players evaluated. Remind coaches to submit.`, icon: CheckCircle2, to: "/CenterOfExcellence", priority: "medium", ctaLabel: "Review" });
    }

    return actions;
  },
};