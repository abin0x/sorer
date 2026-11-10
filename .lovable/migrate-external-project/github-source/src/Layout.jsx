import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { createPageUrl } from "@/utils";
import { LayoutDashboard, Users, LogOut, UserCircle, Settings, Calendar as CalendarIcon, BarChart3, CalendarClock, ListChecks, Mail, MessageSquare, ChevronRight, ChevronLeft, Shield, TrendingUp, ClipboardCheck, Building2, Home, UserPlus, GitBranch, FolderKanban, UsersRound, HeartHandshake, Trophy, Wallet, FileBarChart, ShieldCheck, Map, BookOpen, Video, Target, Zap, GraduationCap, Activity, MapPin, Link2, ArrowLeftRight, Tag, Repeat, ShoppingBag, Receipt, Megaphone, LifeBuoy, Headphones, Wand2, ShieldAlert } from "lucide-react";
// Activity is already imported above; system health nav uses it.
import { base44 } from "@/api/base44Client";
import NotificationBell from "@/components/notifications/NotificationBell";
import GetHelpButton from "@/components/support/GetHelpButton";
import IncidentBanner from "@/components/systemhealth/IncidentBanner";
import MigrationPromptBanner from "@/components/migration/MigrationPromptBanner";
import { initErrorCapture } from "@/components/support/clientErrorCapture";
import NotificationBadge from "@/components/notifications/NotificationBadge";
import ThemeToggle from "@/components/theme/ThemeToggle";
import OnboardingFlow from "@/components/onboarding/OnboardingFlow";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import SystemClubSelector from "@/components/layout/SystemClubSelector";
import RoleSwitcher from "@/components/layout/RoleSwitcher";
import ClubLogo from "@/components/branding/ClubLogo";
import ClubLoadingScreen from "@/components/branding/ClubLoadingScreen";
import AppHeader from "@/components/layout/AppHeader";
import { usePullToRefreshRef } from "@/lib/PullToRefreshContext";
import { RefreshCw } from "lucide-react";
import { ROLE_ONBOARD_PATH } from "@/lib/onboardingRoles";
import { getInviteToken, processInviteToken } from "@/lib/inviteProcessing";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton } from
"@/components/ui/sidebar";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ROLES, ROLE_LABELS, ROLE_COLORS, hasPermission, isSystemUser, isSystemOwner } from "@/lib/rbac";
import { useTenant } from "@/lib/TenantContext";
import { useClubDataExists } from "@/lib/useClubDataExists";
import { useModuleAccess } from "@/lib/useModuleAccess";
import { moduleForRoute } from '@/lib/moduleRoutes';
import { getSaasAdminNavGroups } from '@/lib/saasAdminNav';
import TenantRouteGate from '@/components/modules/TenantRouteGate';
import RouteTransition from '@/components/layout/RouteTransition';

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [adminOpen, setAdminOpen] = React.useState(false);
  const [showOnboarding, setShowOnboarding] = React.useState(false);

  // Custom pull-to-refresh on the main scroll container (replaces native
  // overscroll bounce). Only fires when a page has registered a refresh
  // handler via usePullToRefresh — otherwise the gesture is a no-op and
  // normal vertical scrolling is unaffected.
  const scrollRef = React.useRef(null);
  const refreshRef = usePullToRefreshRef();
  const [pullDistance, setPullDistance] = React.useState(0);
  const [refreshing, setRefreshing] = React.useState(false);
  const touchStartY = React.useRef(null);
  const pulling = React.useRef(false);
  const pullDistanceRef = React.useRef(0);
  const refreshingRef = React.useRef(false);

  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onTouchStart = (e) => {
      if (el.scrollTop <= 0 && !refreshingRef.current) {
        touchStartY.current = e.touches[0].clientY;
        pulling.current = true;
      } else {
        touchStartY.current = null;
        pulling.current = false;
      }
    };

    const onTouchMove = (e) => {
      if (!pulling.current || touchStartY.current === null || refreshingRef.current) return;
      const delta = e.touches[0].clientY - touchStartY.current;
      if (delta > 0 && el.scrollTop <= 0) {
        const distance = Math.min(delta * 0.5, 72);
        pullDistanceRef.current = distance;
        setPullDistance(distance);
        if (delta > 8) e.preventDefault();
      } else if (delta <= 0) {
        pullDistanceRef.current = 0;
        setPullDistance(0);
      }
    };

    const onTouchEnd = () => {
      if (!pulling.current) return;
      pulling.current = false;
      if (pullDistanceRef.current > 56 && refreshRef.current) {
        refreshingRef.current = true;
        setRefreshing(true);
        setPullDistance(64);
        Promise.resolve(refreshRef.current()).
        catch(() => {}).
        finally(() => {
          refreshingRef.current = false;
          setRefreshing(false);
          setPullDistance(0);
        });
      } else {
        setPullDistance(0);
      }
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [refreshRef]);

  // Tenant-aware branding: system domain → Club Rudder, club subdomain → that club
  const tenant = useTenant();
  const clubName = tenant.brand.club_name;
  const clubTagline = tenant.brand.club_tagline;
  const logoUrl = tenant.brand.logo_url;

  // Update document title and favicon dynamically from club identity
  React.useEffect(() => {
    if (clubName) document.title = `${clubName} — ${clubTagline || "Club Management"}`;
    if (logoUrl) {
      let link = document.querySelector("link[rel='icon']");
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = logoUrl;
    }
  }, [clubName, clubTagline, logoUrl]);



  // Club Setup Wizard gating: a live club's director/admin must finish the
  // 4-step wizard before reaching the normal dashboard.
  const { data: setupProgress } = useQuery({
    queryKey: ["clubSetupProgress", user?.club_id],
    queryFn: () => base44.entities.ClubSetupProgress.filter({ club_id: user.club_id }).catch(() => []),
    enabled: !!user?.club_id
  });

  // Whether this club already has teams or players — once it does, the setup
  // wizard is no longer required and migration is gated behind approval.
  const { hasData: clubHasData } = useClubDataExists(user?.club_id);

  // Clubs created through the one-invite flow carry a tenant_status and are guided by the Setup Journey.
  const { data: clubRecord, isFetched: clubFetched } = useQuery({
    queryKey: ["clubTenantStatus", user?.club_id],
    queryFn: () => base44.entities.Club.filter({ id: user.club_id }).then((r) => (Array.isArray(r) ? r : r.items || [])[0] || null).catch(() => null),
    enabled: !!user?.club_id
  });
  const journeyClub = ["invited", "onboarding"].includes(clubRecord?.tenant_status);

  // Landing on Home right after accepting an invite opens the Setup Journey (once per session).
  React.useEffect(() => {
    if (!journeyClub || !["club_admin", "club_director"].includes(user?.custom_role) || location.pathname !== "/home") return;
    if (sessionStorage.getItem("journeyLanded")) return;
    sessionStorage.setItem("journeyLanded", "1");
    navigate("/SetupJourney", { replace: true });
  }, [journeyClub, user, location.pathname]);

  React.useEffect(() => {
    if (!clubFetched || clubRecord?.tenant_status) return; // journey clubs skip the legacy wizard
    if (!user?.club_id || !setupProgress || tenant.isSystemUser && location.pathname.toLowerCase() === '/saasadmin') return;
    const isLiveClubLeader = ["club_director", "club_admin"].includes(user.custom_role);
    if (!isLiveClubLeader) return;
    const prog = setupProgress[0];
    // Club already has teams/players → wizard no longer required; auto-complete it.
    if (clubHasData === true && prog && !prog.wizard_completed_at) {
      base44.entities.ClubSetupProgress.update(prog.id, { wizard_completed_at: new Date().toISOString() }).catch(() => {});
      return;
    }
    // Only redirect to the wizard once we've confirmed the club has no data yet.
    if (clubHasData === false) {
      const wizardIncomplete = !prog || !prog.wizard_completed_at;
      if (wizardIncomplete && !location.pathname.startsWith("/ClubSetupWizard") && !location.pathname.startsWith("/MigrationWizard") && !location.pathname.startsWith("/onboard")) {
        navigate("/ClubSetupWizard");
      }
    }
  }, [user, setupProgress, location.pathname, clubHasData]);

  // Migration nav link: hidden once the club's migration is completed —
  // reappears if a new migration is started, kept in Settings > Data Management.
  const { data: latestMigrationJob } = useQuery({
    queryKey: ["latestMigrationJob", user?.club_id],
    queryFn: () => base44.entities.MigrationJob.filter({ club_id: user.club_id }, "-created_date", 1).catch(() => []),
    enabled: !!user?.club_id
  });
  const migrationCompleted = latestMigrationJob?.[0]?.status === "completed";

  // Pending role onboarding: if the user just accepted an invite for a role that needs
  // extra setup (parent, coach, branch director, admin, director, bookkeeper), route them
  // there right after login instead of dropping them on the home dashboard.
  const { data: pendingRoles = [] } = useQuery({
    queryKey: ["pendingUserRoles", user?.id, user?.club_id],
    queryFn: () => base44.entities.UserRoles.filter({ user_id: user.id, club_id: user.club_id, status: "pending" }).catch(() => []),
    enabled: !!user?.id
  });

  // Invitation acceptance runs before this layout mounts, in MembershipGate.

  React.useEffect(() => {
    if (!user || pendingRoles.length === 0 || tenant.isSystemUser && location.pathname.toLowerCase() === '/saasadmin') return;
    // Club admins of an onboarding club go straight to the Setup Journey, with no extra setup screen.
    if (!clubFetched || journeyClub && ["club_admin", "club_director"].includes(user.custom_role)) return;
    // Don't redirect if already on an onboarding page
    if (location.pathname.startsWith("/onboard")) return;
    const path = ROLE_ONBOARD_PATH[pendingRoles[0].role];
    if (path && location.pathname !== path) navigate(path);
  }, [user, pendingRoles, location.pathname, clubFetched, journeyClub]);
  const { hasModule } = useModuleAccess();
  const playerDevActive = hasModule("development");
  const facilityMgmtActive = hasModule("facilities");
  const tournamentsActive = hasModule("tournaments");

  React.useEffect(() => {
    initErrorCapture();
    base44.auth.me().
    then((userData) => {
      setUser(userData);
      if (userData && !userData.onboarding_completed) {
        setShowOnboarding(true);
      }
    }).
    catch(() => {}).
    finally(() => setLoading(false));
  }, []);

  if (loading) {
    // Branded placeholder — continues the HTML splash instead of flashing blank.
    return <ClubLoadingScreen />;
  }

  const role = user?.custom_role;
  const superAdmin = user?.is_super_admin === true || user?.role === "admin" || isSystemUser(user);
  const systemOwner = isSystemOwner(user);
  const can = (perm) => hasPermission(user, perm);

  // Menu structured by hierarchy: CLUB > BRANCH > PROGRAM > TEAM > FAMILY > PLAYER
  const navigationGroups = [
  {
    label: "Platform",
    systemOwnerOnly: true,
    items: [
    { title: "SaaS Admin", url: createPageUrl("SaaSAdmin"), icon: ShieldCheck, showFor: "all" },
    { title: "System Health", url: createPageUrl("SystemHealth"), icon: Activity, showFor: "all" },
    { title: "Knowledge Base", url: "/help/admin", icon: BookOpen, showFor: "all" },
    { title: "Support Console", url: createPageUrl("SupportConsole"), icon: Headphones, showFor: "all" }]

  },
  {
    label: "Home",
    items: [
    { title: "My Dashboard", url: createPageUrl("RoleDashboard"), icon: Home, showFor: "all" },
    { title: "Setup Journey", url: "/SetupJourney", icon: ListChecks, showFor: [ROLES.MASTER_ADMIN, ROLES.ADMIN, ROLES.CLUB_DIRECTOR, ROLES.CLUB_ADMIN, ROLES.BRANCH_DIRECTOR, ROLES.BOOKKEEPER] }]

  },
  {
    label: "Registration & Teams",
    items: [
    { title: "Branches", url: createPageUrl("Locations"), icon: GitBranch, perm: "branch:view", showFor: "all" },
    { title: "Teams", url: `${createPageUrl("Registration")}?tab=teams`, icon: Shield, showFor: [ROLES.MASTER_ADMIN, ROLES.ADMIN, ROLES.CLUB_DIRECTOR, ROLES.CLUB_ADMIN, ROLES.BRANCH_DIRECTOR, ROLES.BRANCH_ADMIN, ROLES.BOOKKEEPER, ROLES.PROJECT_MANAGER, ROLES.COACH, ROLES.TEAM_MANAGER] },
    { title: "Players", url: `${createPageUrl("Registration")}?tab=players`, icon: Users, showFor: [ROLES.MASTER_ADMIN, ROLES.ADMIN, ROLES.CLUB_DIRECTOR, ROLES.CLUB_ADMIN, ROLES.BRANCH_DIRECTOR, ROLES.BRANCH_ADMIN, ROLES.BOOKKEEPER, ROLES.PROJECT_MANAGER, ROLES.COACH, ROLES.TEAM_MANAGER] },
    { title: "Club Staff", url: createPageUrl("ClubStaff"), icon: UsersRound, perm: "users:view", showFor: [ROLES.MASTER_ADMIN, ROLES.ADMIN, ROLES.CLUB_DIRECTOR, ROLES.CLUB_ADMIN, ROLES.BRANCH_DIRECTOR] },
    { title: "Platform Dashboard", url: createPageUrl("PlatformDashboard"), icon: Trophy, showFor: "all" },
    { title: "Tryout Dashboard", url: createPageUrl("TryoutDashboard"), icon: UsersRound, showFor: [ROLES.ADMIN, ROLES.CLUB_DIRECTOR, ROLES.CLUB_ADMIN, ROLES.BRANCH_DIRECTOR, ROLES.PLATFORM_DIRECTOR, ROLES.PROJECT_MANAGER, ROLES.COACH, ROLES.TRYOUT_LEAD] },
    { title: "Seasons", url: createPageUrl("Seasons"), icon: CalendarClock, showFor: [ROLES.MASTER_ADMIN, ROLES.ADMIN, ROLES.CLUB_DIRECTOR, ROLES.CLUB_ADMIN] },
    { title: "Compliance", url: "/Compliance", icon: ShieldAlert, showFor: [ROLES.MASTER_ADMIN, ROLES.ADMIN, ROLES.CLUB_DIRECTOR, ROLES.CLUB_ADMIN, ROLES.BRANCH_DIRECTOR] },
    ...(migrationCompleted || clubHasData === true ? [] : [{ title: "Migration", url: createPageUrl("MigrationWizard"), icon: ArrowLeftRight, showFor: [ROLES.MASTER_ADMIN, ROLES.ADMIN, ROLES.CLUB_DIRECTOR, ROLES.CLUB_ADMIN] }])]

  },
  {
    label: "Payments & Finance",
    items: [
    { title: "Payments Ledger", url: createPageUrl("PaymentSettings"), icon: Wallet, perm: "finance:view", showFor: [ROLES.ADMIN, ROLES.CLUB_DIRECTOR, ROLES.CLUB_ADMIN, ROLES.BRANCH_DIRECTOR, ROLES.BRANCH_ADMIN, ROLES.BOOKKEEPER] },
    { title: "Marketplace", url: createPageUrl("MarketplaceManager"), icon: ShoppingBag, showFor: [ROLES.MASTER_ADMIN, ROLES.ADMIN, ROLES.CLUB_DIRECTOR, ROLES.CLUB_ADMIN, ROLES.BRANCH_DIRECTOR] },
    { title: "My Expenses", url: createPageUrl("StaffExpenses"), icon: Receipt, showFor: [ROLES.MASTER_ADMIN, ROLES.ADMIN, ROLES.CLUB_DIRECTOR, ROLES.CLUB_ADMIN, ROLES.BRANCH_DIRECTOR, ROLES.BRANCH_ADMIN, ROLES.BOOKKEEPER, ROLES.COACH, ROLES.TEAM_MANAGER] },
    { title: "Expense Approvals", url: createPageUrl("ExpenseApprovals"), icon: ClipboardCheck, showFor: [ROLES.MASTER_ADMIN, ROLES.ADMIN, ROLES.CLUB_DIRECTOR, ROLES.CLUB_ADMIN, ROLES.BOOKKEEPER] }]

  },
  {
    label: "Insights",
    items: [
    { title: "Reports & Analytics", url: createPageUrl("Reports"), icon: BarChart3, perm: "reports:view", showFor: [ROLES.MASTER_ADMIN, ROLES.ADMIN, ROLES.CLUB_DIRECTOR, ROLES.CLUB_ADMIN, ROLES.BRANCH_DIRECTOR, ROLES.BRANCH_ADMIN, ROLES.BOOKKEEPER, ROLES.COACH] }]

  },
  {
    label: "Events & Promotions",
    items: [
    { title: "Events", url: createPageUrl("EventManager"), icon: CalendarClock, showFor: [ROLES.MASTER_ADMIN, ROLES.ADMIN, ROLES.CLUB_DIRECTOR, ROLES.CLUB_ADMIN, ROLES.BRANCH_DIRECTOR, ROLES.BRANCH_ADMIN] },
    { title: "Marketing", url: createPageUrl("Marketing"), icon: Megaphone, showFor: [ROLES.MASTER_ADMIN, ROLES.ADMIN, ROLES.CLUB_DIRECTOR, ROLES.CLUB_ADMIN, ROLES.BRANCH_DIRECTOR, ROLES.MARKETING_DIRECTOR] },
    { title: "Promo Codes", url: createPageUrl("PromoCodes"), icon: Tag, showFor: [ROLES.MASTER_ADMIN, ROLES.ADMIN, ROLES.CLUB_DIRECTOR, ROLES.CLUB_ADMIN] },
    { title: "Connections", url: createPageUrl("Connections"), icon: Link2, showFor: [ROLES.MASTER_ADMIN, ROLES.ADMIN, ROLES.CLUB_DIRECTOR, ROLES.CLUB_ADMIN] }]

  },
  {
    label: "Tournaments",
    items: [
    { title: "Tournament Manager", url: createPageUrl("TournamentManager"), icon: Trophy, showFor: [ROLES.MASTER_ADMIN, ROLES.ADMIN, ROLES.CLUB_DIRECTOR, ROLES.CLUB_ADMIN, ROLES.BRANCH_DIRECTOR] }]

  },
  {
    label: "Engagement",
    items: [
    { title: "Beacon", url: createPageUrl("CommunicationPortal"), icon: MessageSquare, showFor: "all", badge: "mention" },
    { title: "Calendar", url: createPageUrl("TeamCalendar"), icon: CalendarIcon, showFor: "all" }]

  },
  {
    label: "Facility Management",
    items: [
    { title: "Facility Dashboard", url: createPageUrl("FacilityManagerDashboard"), icon: LayoutDashboard, showFor: [ROLES.FACILITY_MANAGER, ROLES.MASTER_ADMIN, ROLES.ADMIN, ROLES.CLUB_DIRECTOR, ROLES.CLUB_ADMIN] },
    { title: "Facilities & Fields", url: createPageUrl("Facilities"), icon: MapPin, showFor: [ROLES.FACILITY_MANAGER, ROLES.MASTER_ADMIN, ROLES.ADMIN, ROLES.CLUB_DIRECTOR, ROLES.CLUB_ADMIN, ROLES.BRANCH_DIRECTOR, ROLES.BRANCH_ADMIN] },
    { title: "Facility Billing", url: createPageUrl("FacilityBilling"), icon: Receipt, showFor: [ROLES.FACILITY_MANAGER, ROLES.MASTER_ADMIN, ROLES.ADMIN, ROLES.CLUB_DIRECTOR, ROLES.CLUB_ADMIN, ROLES.BOOKKEEPER] },
    { title: "Field Board", url: createPageUrl("FieldBoard"), icon: Map, showFor: [ROLES.FACILITY_MANAGER, ROLES.MASTER_ADMIN, ROLES.ADMIN, ROLES.CLUB_DIRECTOR, ROLES.CLUB_ADMIN, ROLES.BRANCH_DIRECTOR, ROLES.BRANCH_ADMIN, ROLES.COACH, ROLES.TEAM_MANAGER] },
    { title: "Training Scheduler", url: createPageUrl("TrainingScheduler"), icon: Wand2, showFor: [ROLES.FACILITY_MANAGER, ROLES.MASTER_ADMIN, ROLES.ADMIN, ROLES.CLUB_DIRECTOR, ROLES.CLUB_ADMIN, ROLES.BRANCH_DIRECTOR] },
    { title: "Schedule View", url: createPageUrl("ScheduleView"), icon: CalendarClock, showFor: [ROLES.FACILITY_MANAGER, ROLES.MASTER_ADMIN, ROLES.ADMIN, ROLES.CLUB_DIRECTOR, ROLES.CLUB_ADMIN, ROLES.BRANCH_DIRECTOR, ROLES.BRANCH_ADMIN, ROLES.COACH, ROLES.TEAM_MANAGER] },
    { title: "Training Grid CSV", url: createPageUrl("TrainingGridToSchedule"), icon: FileBarChart, showFor: [ROLES.FACILITY_MANAGER, ROLES.MASTER_ADMIN, ROLES.ADMIN, ROLES.CLUB_DIRECTOR, ROLES.CLUB_ADMIN, ROLES.BRANCH_DIRECTOR] }]

  },
  {
    label: "Project Management",
    items: [
    { title: "Kanban Board", url: createPageUrl("Kanban"), icon: LayoutDashboard, perm: "program:view", showFor: [ROLES.MASTER_ADMIN, ROLES.ADMIN, ROLES.CLUB_DIRECTOR, ROLES.CLUB_ADMIN, ROLES.BRANCH_DIRECTOR, ROLES.PROJECT_MANAGER] },
    { title: "Staff Cards", url: createPageUrl("KanbanStaff"), icon: UsersRound, perm: "program:view", showFor: [ROLES.MASTER_ADMIN, ROLES.ADMIN, ROLES.CLUB_DIRECTOR, ROLES.CLUB_ADMIN, ROLES.BRANCH_DIRECTOR, ROLES.PROJECT_MANAGER] },
    { title: "Programs & Tasks", url: createPageUrl("ProgramsList"), icon: ListChecks, perm: "program:view", showFor: [ROLES.MASTER_ADMIN, ROLES.ADMIN, ROLES.CLUB_DIRECTOR, ROLES.CLUB_ADMIN, ROLES.BRANCH_DIRECTOR, ROLES.BRANCH_ADMIN, ROLES.PROJECT_MANAGER] },
    { title: "Roadmap", url: createPageUrl("Roadmap"), icon: Map, showFor: [ROLES.MASTER_ADMIN, ROLES.ADMIN, ROLES.CLUB_DIRECTOR, ROLES.CLUB_ADMIN, ROLES.BRANCH_DIRECTOR, ROLES.PROJECT_MANAGER] },
    { title: "Timeline", url: createPageUrl("Timeline"), icon: CalendarClock, perm: "program:view", showFor: [ROLES.MASTER_ADMIN, ROLES.ADMIN, ROLES.CLUB_DIRECTOR, ROLES.CLUB_ADMIN, ROLES.BRANCH_DIRECTOR] }]

  },
  {
    label: "Player Development",
    items: [
    { title: "Player Roster", url: createPageUrl("PlayerRoster"), icon: Users, showFor: [ROLES.MASTER_ADMIN, ROLES.ADMIN, ROLES.CLUB_DIRECTOR, ROLES.CLUB_ADMIN, ROLES.BRANCH_DIRECTOR, ROLES.BRANCH_ADMIN, ROLES.COACH, ROLES.TEAM_MANAGER] },
    { title: "Center of Excellence", url: createPageUrl("CenterOfExcellence"), icon: Activity, showFor: [ROLES.MASTER_ADMIN, ROLES.ADMIN, ROLES.CLUB_DIRECTOR, ROLES.CLUB_ADMIN, ROLES.BRANCH_DIRECTOR, ROLES.COACH] },
    { title: "Skill Tests", url: createPageUrl("SkillTests"), icon: Target, showFor: [ROLES.MASTER_ADMIN, ROLES.ADMIN, ROLES.CLUB_DIRECTOR, ROLES.CLUB_ADMIN, ROLES.BRANCH_DIRECTOR, ROLES.COACH] },
    { title: "Test Day Manager", url: createPageUrl("TestDayManager"), icon: ClipboardCheck, showFor: [ROLES.MASTER_ADMIN, ROLES.ADMIN, ROLES.CLUB_DIRECTOR, ROLES.CLUB_ADMIN, ROLES.BRANCH_DIRECTOR, ROLES.COACH] },
    { title: "E.P.I.C. Tenets", url: createPageUrl("EpicTenet"), icon: Zap, showFor: "all" },
    { title: "Knowledge Bank", url: createPageUrl("KnowledgeBank"), icon: BookOpen, showFor: "all" },
    { title: "Video Library", url: createPageUrl("VideoLibrary"), icon: Video, showFor: "all" }]

  },
  {
    label: "Family",
    items: [
    { title: "Family Account", url: createPageUrl("FamilyAccount"), icon: Wallet, showFor: [ROLES.PARENT_GUARDIAN] }]

  },
  {
    label: "Personal",
    items: [
    { title: "My Profile", url: createPageUrl("UserProfileView"), icon: UserCircle, showFor: "all" },
    { title: "My Tickets", url: createPageUrl("MyTickets"), icon: LifeBuoy, showFor: "all" },
    { title: "Features", url: createPageUrl("Features"), icon: LayoutDashboard, showFor: "all" },
    { title: "FAQ", url: createPageUrl("FAQ"), icon: Settings, showFor: "all" },
    { title: "Help Center", url: "/help", icon: BookOpen, showFor: "all" }]

  }];


  const adminMenuGroups = [
  {
    label: "People & Access",
    items: [
    { title: "User Management", url: createPageUrl("UserPanel"), icon: Users },
    { title: "RBAC / Permissions", url: createPageUrl("RBAC"), icon: ShieldCheck }]

  },
  {
    label: "Configuration",
    items: [
    { title: "Settings", url: createPageUrl("Settings"), icon: Settings },
    { title: "Platform Configuration", url: createPageUrl("PlatformSettings"), icon: Settings }]

  },
  {
    label: "Communications",
    items: [
    { title: "Email Templates", url: createPageUrl("EmailTemplates"), icon: Mail },
    { title: "Email Logs", url: createPageUrl("EmailLogs"), icon: Mail }]

  },
  {
    label: "Reports",
    items: [
    { title: "Scheduled Reports", url: createPageUrl("ScheduledReports"), icon: CalendarIcon }]

  }];


  const moduleVisible = (item) => {
    const key = moduleForRoute(item.url);
    return !key || !tenant.effectiveClubId || hasModule(key);
  };
  const isVisible = (item) => {
    if (!moduleVisible(item)) return false;
    if (superAdmin) return true;
    if (item.showFor === "all") return true;
    if (Array.isArray(item.showFor)) {
      return item.showFor.includes(role);
    }
    return item.showFor === role;
  };

  const getRoleBadge = (r) => {
    return { label: ROLE_LABELS[r] || "User", color: ROLE_COLORS[r] || "bg-slate-100 text-slate-700" };
  };

  const roleBadge = getRoleBadge(role);

  // System users on the system domain get a dedicated minimal menu (not the full club menu)
  const showSystemMenu = tenant.isSystemDomain && superAdmin && !tenant.viewingTenant;
  const systemNavGroups = [
  {
    label: "Platform",
    items: [
    { title: "System Console", url: createPageUrl("SaaSAdmin"), icon: ShieldCheck, showFor: "all" },
    { title: "Support Console", url: createPageUrl("SupportConsole"), icon: Headphones, showFor: "all" },
    { title: "Knowledge Base", url: "/help/admin", icon: BookOpen, showFor: "all" },
    { title: "Client Journey", url: createPageUrl("ClientJourneyBoard"), icon: UserPlus, showFor: "all" }]

  }];

  const isSaasAdminPage = location.pathname === '/SaaSAdmin';
  const saasUrlParams = new URLSearchParams(location.search);
  const saasCurrentTab = saasUrlParams.get('tab') || 'overview';
  const groupsToRender = isSaasAdminPage ? getSaasAdminNavGroups(systemOwner) : showSystemMenu ? systemNavGroups : navigationGroups;

  return (
    <SidebarProvider>
      {showOnboarding && user && (!user.club_id || clubFetched) && !journeyClub && !(tenant.isSystemUser && location.pathname.toLowerCase() === '/saasadmin') &&
      <OnboardingFlow
        user={user}
        onComplete={() => {
          setShowOnboarding(false);
          base44.auth.me().then(setUser);
        }} />

      }
      <div className="h-[100dvh] flex w-full gradient-bg">
        <Sidebar className="border-r border-slate-200 dark:bg-slate-900 dark:border-slate-800 shadow-xl">
          <SidebarHeader className="safe-top border-b border-border-subtle p-4 lg:p-6 bg-surface-card">
            <div className="flex items-center gap-2 lg:gap-3 mb-3">
              <ClubLogo
                primaryColor={tenant.brand.primary_color}
                size={44}
                className="shadow-lg" />
              
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-slate-900 dark:text-white text-base lg:text-lg truncate">{clubName}</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 hidden lg:block truncate">{clubTagline}</p>
              </div>
            </div>
            {superAdmin && tenant.isSystemDomain &&
            <div className="mt-3">
                <SystemClubSelector />
              </div>
            }
            {!user &&
            <Button
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-sm"
              onClick={() => base44.auth.redirectToLogin()}>
              
                Login / Register
              </Button>
            }
          </SidebarHeader>

          <SidebarContent className="p-2 lg:p-3 overflow-y-auto">
            {groupsToRender.map((group) => {
              const visibleItems = group.items.filter(isVisible);
              if (visibleItems.length === 0) return null;
              if (group.superOnly && !superAdmin) return null;
              if (group.systemOwnerOnly && !systemOwner) return null;
              if (group.label === "Player Development" && !playerDevActive) return null;
              if (group.label === "Facility Management" && !facilityMgmtActive) return null;
              if (group.label === "Tournaments" && !tournamentsActive) return null;
              return (
                <SidebarGroup key={group.label}>
                  <SidebarGroupLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 py-2 hidden lg:block">
                    {group.label}
                  </SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {visibleItems.map((item) => {
                        const isActive = item.saasTab ?
                        saasCurrentTab === item.saasTab :
                        location.pathname === item.url || location.pathname === item.url.split('?')[0];
                        return (
                          <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton
                              asChild
                              className={`transition-all duration-200 rounded-xl mb-1 border ${
                              isActive
                                ? 'bg-primary/10 border-primary/30 text-primary font-semibold shadow-sm'
                                : 'border-transparent text-slate-600 dark:text-slate-300 font-normal hover:bg-slate-100 dark:hover:bg-slate-800/60'}`
                              }>

                              <Link to={item.url} className="select-none flex items-center gap-2 lg:gap-3 px-2 lg:px-3 py-2 lg:py-3 relative" style={{ WebkitUserSelect: "none" }}>
                                <div className="relative">
                                  <item.icon className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-slate-500 dark:text-slate-400'}`} />
                                  {item.badge && <NotificationBadge user={user} type={item.badge} />}
                                </div>
                                <span className="text-sm lg:text-base">{item.title}</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>);

                      })}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>);

            })}

            {!showSystemMenu && !isSaasAdminPage && (role === ROLES.MASTER_ADMIN || role === ROLES.ADMIN || role === ROLES.CLUB_DIRECTOR || role === ROLES.CLUB_ADMIN) &&
            <Collapsible open={adminOpen} onOpenChange={setAdminOpen}>
                <SidebarGroup>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton className="hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all duration-200 rounded-xl mb-1 text-text-secondary">
                          <Shield className="w-4 h-4" />
                          <span className="font-medium text-sm lg:text-base">Admin</span>
                          <ChevronRight className={`ml-auto w-4 h-4 transition-transform ${adminOpen ? 'rotate-90' : ''}`} />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {adminMenuGroups.map((group, gi) => {
                          const visible = group.items.filter(moduleVisible);
                          if (visible.length === 0) return null;
                          return (
                            <div key={group.label} className={gi > 0 ? 'mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60' : ''}>
                              <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{group.label}</p>
                              {visible.map((item) => {
                              const isActive = location.pathname === item.url;
                              return (
                                <SidebarMenuSubItem key={item.title}>
                                  <SidebarMenuSubButton
                                  asChild
                                  className={`transition-all duration-200 rounded-lg border ${
                                  isActive
                                    ? 'bg-primary/10 border-primary/30 text-primary font-semibold'
                                    : 'border-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'}`
                                  }>

                                    <Link to={item.url} className="select-none flex items-center gap-2 py-1.5" style={{ WebkitUserSelect: "none" }}>
                                      <item.icon className={`w-3.5 h-3.5 ${isActive ? 'text-primary' : 'text-slate-500 dark:text-slate-400'}`} />
                                      <span className="text-sm">{item.title}</span>
                                    </Link>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>);
                              })}
                            </div>);
                          })}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroup>
              </Collapsible>
            }
          </SidebarContent>

          <SidebarFooter className="border-t border-slate-200 dark:border-slate-800 p-3 lg:p-4 bg-slate-50 dark:bg-slate-900/50">
            {user &&
            <div className="space-y-2 lg:space-y-3">
                <div className="flex items-center gap-2 lg:gap-3 p-2 rounded-xl bg-white dark:bg-slate-800 shadow-sm">
                  <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-primary to-primary rounded-full flex items-center justify-center shadow-md">
                    <span className="text-white font-semibold text-xs lg:text-sm">
                      {user.full_name?.[0]?.toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 dark:text-white text-xs lg:text-sm truncate">{user.full_name}</p>
                    <Badge className={`text-xs ${roleBadge.color} mt-1`}>
                      {roleBadge.label}
                    </Badge>
                  </div>
                </div>
                <RoleSwitcher user={user} />
                <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start select-none text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs lg:text-sm min-h-[44px]"
                onClick={() => base44.auth.logout()}>
                
                  <LogOut className="w-3 h-3 lg:w-4 lg:h-4 mr-2" />
                  Logout
                </Button>
              </div>
            }
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col overflow-hidden">
          <IncidentBanner />
          <MigrationPromptBanner clubHasData={clubHasData} migrationJob={latestMigrationJob?.[0]} user={user} pathname={location.pathname} />
          <AppHeader clubName={clubName} user={user} tenant={tenant} />

          <div className="flex-1 overflow-auto content-safe-bottom relative" style={{ overscrollBehaviorY: "none" }} ref={scrollRef}>
            {/* Custom pull-to-refresh indicator */}
            {(pullDistance > 0 || refreshing) &&
            <div
              className="absolute top-0 left-0 right-0 flex items-center justify-center pointer-events-none z-30"
              style={{ height: `${pullDistance}px`, transition: refreshing ? "none" : "height 0.2s ease" }}>
              
                <RefreshCw
                className={`w-5 h-5 text-primary ${refreshing ? "animate-spin" : ""}`}
                style={{ opacity: Math.min(pullDistance / 56, 1) }} />
              
              </div>
            }
            {/* CSS-only page transition: opacity + transform, no JS animation */}
            <TenantRouteGate>
              <RouteTransition>{children}</RouteTransition>
            </TenantRouteGate>
          </div>
        </main>
        <GetHelpButton />
        <MobileBottomNav />
      </div>
    </SidebarProvider>);

}