import React from "react";
import { Link, useLocation, useNavigate } from '@/lib/router-compat';
import { useQuery } from "@tanstack/react-query";
import { createPageUrl } from "@/utils";
import { LayoutDashboard, Users, LogOut, UserCircle, Settings, Calendar as CalendarIcon, BarChart3, CalendarClock, ListChecks, Mail, MessageSquare,   ChevronRight, ChevronLeft, Shield, TrendingUp, ClipboardCheck, Building2, Home, UserPlus, GitBranch, FolderKanban, UsersRound, HeartHandshake, Trophy, Wallet, FileBarChart, ShieldCheck, Map, BookOpen, Video, Target, Zap, GraduationCap, Activity, MapPin, Link2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import NotificationBell from "@/components/notifications/NotificationBell";
import NotificationBadge from "@/components/notifications/NotificationBadge";
import ThemeToggle from "@/components/theme/ThemeToggle";
import OnboardingFlow from "@/components/onboarding/OnboardingFlow";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import RoleSwitcher from "@/components/layout/RoleSwitcher";
import AppHeader from "@/components/layout/AppHeader";
import { usePullToRefreshRef } from "@/lib/PullToRefreshContext";
import { RefreshCw } from "lucide-react";
const ALL_PAGE_NAMES = Object.keys(import.meta.glob("./pages/*.jsx")).map((k) => k.replace("./pages/", "").replace(".jsx", "")).sort();
import { ROLE_ONBOARD_PATH } from "@/lib/onboardingRoles";
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
  SidebarMenuSubButton,
} from "@/components/ui/sidebar";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ROLES, ROLE_LABELS, ROLE_COLORS, hasPermission, isSystemUser, isSystemOwner } from "@/lib/rbac";
import { useTenant } from "@/lib/TenantContext";
import { useTerminology } from "@/hooks/useTerminology";
import { term } from "@/lib/terminology";
import { getSaasAdminNavGroups } from "@/lib/saasAdminNav";
import { canShowNavigationGroup, consoleNavigationUrl, isNavigationItemActive, tryoutDashboardNavItem, resolveNavSection, isNavSectionActive, findActiveNavSection } from "@/lib/layoutNavigation";
import { useModuleAccess } from '@/lib/useModuleAccess';
import { moduleForRoute } from '@/lib/moduleRoutes';
import TenantRouteGate from '@/components/modules/TenantRouteGate';
import ViewingAsBanner from '@/components/layout/ViewingAsBanner';

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [adminOpen, setAdminOpen] = React.useState(false);
  const [allPagesOpen, setAllPagesOpen] = React.useState(false);
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
        Promise.resolve(refreshRef.current())
          .catch(() => {})
          .finally(() => {
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

  // Tenant-aware branding: system domain → ClubRudder, club subdomain → that club
  const tenant = useTenant();
  const vocab = useTerminology();
  const { hasModule } = useModuleAccess();
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

  // Pending role onboarding: if the user just accepted an invite for a role that needs
  // extra setup (parent, coach, branch director, admin, director, bookkeeper), route them
  // there right after login instead of dropping them on the home dashboard.
  const { data: pendingRoles = [] } = useQuery({
    queryKey: ["pendingUserRoles", user?.id],
    queryFn: () => base44.entities.UserRoles.filter({ user_id: user.id, status: "pending" }).catch(() => []),
    enabled: !!user?.id,
  });

  React.useEffect(() => {
    if (!user || pendingRoles.length === 0) return;
    if (location.pathname !== "/") return;
    const path = ROLE_ONBOARD_PATH[pendingRoles[0].role];
    if (path) navigate(path);
  }, [user, pendingRoles, location.pathname]);

  React.useEffect(() => {
    base44.auth.me()
      .then(userData => {
        setUser(userData);
        if (userData && !userData.onboarding_completed) {
          setShowOnboarding(true);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600" />
      </div>
    );
  }

  const role = user?.custom_role;
  const superAdmin = user?.is_super_admin === true || user?.role === "admin" || isSystemUser(user);
  const systemOwner = isSystemOwner(user);
  const can = (perm) => hasPermission(user, perm);

  const R = ROLES;
  const LEADERS = [R.ADMIN, R.CLUB_DIRECTOR, R.CLUB_ADMIN];
  const STAFF = [R.MASTER_ADMIN, R.ADMIN, R.CLUB_DIRECTOR, R.CLUB_ADMIN, R.BRANCH_DIRECTOR, R.BRANCH_ADMIN, R.BOOKKEEPER, R.PROJECT_MANAGER, R.COACH, R.TEAM_MANAGER];
  const FACILITY_ADMINS = [R.FACILITY_MANAGER, R.MASTER_ADMIN, R.ADMIN, R.CLUB_DIRECTOR, R.CLUB_ADMIN];
  const PROJECT_LEADS = [R.MASTER_ADMIN, R.ADMIN, R.CLUB_DIRECTOR, R.CLUB_ADMIN, R.BRANCH_DIRECTOR, R.PROJECT_MANAGER];
  const DEV_STAFF = [R.MASTER_ADMIN, R.ADMIN, R.CLUB_DIRECTOR, R.CLUB_ADMIN, R.BRANCH_DIRECTOR, R.COACH];

  // Four core buckets. Secondary pages live in `children` and appear as a tab bar on the parent page.
  const navigationGroups = [
    {
      label: "System Console",
      superOnly: true,
      items: [
        { title: "Back to System Console", url: createPageUrl("SaaSAdmin"), icon: ShieldCheck, showFor: "all" },
      ],
    },
    {
      label: "Home",
      items: [
        { title: "My Dashboard", url: createPageUrl("RoleDashboard"), icon: Home, showFor: "all" },
        { title: "My Family", url: createPageUrl("FamilyAccount"), icon: HeartHandshake, showFor: [R.PARENT_GUARDIAN] },
        { title: "Reports & Insights", url: createPageUrl("Reports"), icon: BarChart3, perm: "reports:view", showFor: [...LEADERS, R.BOOKKEEPER, R.PROJECT_MANAGER] },
        { title: "Communication", url: createPageUrl("CommunicationPortal"), icon: MessageSquare, showFor: "all", badge: "mention" },
        { title: "Calendar", url: createPageUrl("TeamCalendar"), icon: CalendarIcon, showFor: "all" },
      ],
    },
    {
      label: "Operations",
      items: [
        { title: term(vocab, "branch", true), url: createPageUrl("Locations"), icon: GitBranch, perm: "branch:view", showFor: "all" },
        { title: term(vocab, "team", true), sectionTitle: `${term(vocab, "team", true)} & ${term(vocab, "player", true)}`, url: `${createPageUrl("Registration")}?tab=teams`, icon: Shield, showFor: STAFF, children: [
          { title: term(vocab, "player", true), url: `${createPageUrl("Registration")}?tab=players`, icon: Users, showFor: STAFF },
        ] },
        { title: "Club Staff", url: createPageUrl("ClubStaff"), icon: UsersRound, perm: "users:view", showFor: [R.MASTER_ADMIN, ...LEADERS, R.BRANCH_DIRECTOR] },
        { title: "Facility Dashboard", sectionTitle: "Facilities", url: createPageUrl("FacilityManagerDashboard"), icon: MapPin, showFor: FACILITY_ADMINS, children: [
          { title: "Facilities & Fields", url: createPageUrl("Facilities"), icon: MapPin, showFor: [...FACILITY_ADMINS, R.BRANCH_DIRECTOR, R.BRANCH_ADMIN] },
          { title: "Schedule View", url: createPageUrl("ScheduleView"), icon: CalendarClock, showFor: [...FACILITY_ADMINS, R.BRANCH_DIRECTOR, R.BRANCH_ADMIN, R.COACH, R.TEAM_MANAGER] },
          { title: "Field Bookings", url: `${createPageUrl("Facilities")}?tab=bookings`, icon: CalendarClock, showFor: FACILITY_ADMINS },
          { title: "Schedule Import", url: `${createPageUrl("Facilities")}?tab=schedule`, icon: CalendarClock, showFor: FACILITY_ADMINS },
        ] },
        { title: "Kanban Board", sectionTitle: "Projects", url: createPageUrl("Kanban"), icon: LayoutDashboard, perm: "program:view", showFor: PROJECT_LEADS, children: [
          { title: "Staff Cards", url: createPageUrl("KanbanStaff"), icon: UsersRound, perm: "program:view", showFor: PROJECT_LEADS },
          { title: "Programs & Tasks", url: createPageUrl("ProgramsList"), icon: ListChecks, perm: "program:view", showFor: [...PROJECT_LEADS, R.BRANCH_ADMIN] },
          { title: "Roadmap", url: createPageUrl("Roadmap"), icon: Map, showFor: PROJECT_LEADS },
          { title: "Timeline", url: createPageUrl("Timeline"), icon: CalendarClock, perm: "program:view", showFor: [R.MASTER_ADMIN, ...LEADERS, R.BRANCH_DIRECTOR] },
        ] },
        { title: "Tournament Manager", sectionTitle: "Tournaments", url: createPageUrl("TournamentManager"), icon: Trophy, showFor: [R.CLUB_DIRECTOR, R.CLUB_ADMIN] },
      ],
    },
    {
      label: "Growth & Tryouts",
      items: [
        { ...tryoutDashboardNavItem, sectionTitle: "Tryouts", children: [
          { title: "Tryout Planner", url: createPageUrl("TryoutPlanner"), icon: ClipboardCheck, showFor: [...LEADERS, R.BRANCH_DIRECTOR, R.PLATFORM_DIRECTOR, R.PROJECT_MANAGER, R.COACH, R.TRYOUT_LEAD] },
        ] },
        { title: `${term(vocab, "platform")} Dashboard`, url: createPageUrl("PlatformDashboard"), icon: Trophy, showFor: "all" },
        { title: "Player Roster", sectionTitle: "Player Development", url: createPageUrl("PlayerRoster"), icon: Activity, showFor: [...DEV_STAFF, R.BRANCH_ADMIN, R.TEAM_MANAGER], children: [
          { title: "Center of Excellence", url: createPageUrl("CenterOfExcellence"), icon: Activity, showFor: DEV_STAFF },
          { title: "Skill Tests", url: createPageUrl("SkillTests"), icon: Target, showFor: DEV_STAFF },
          { title: "Test Day Manager", url: createPageUrl("TestDayManager"), icon: ClipboardCheck, showFor: DEV_STAFF },
        ] },
        { title: "Knowledge Bank", sectionTitle: "Learning", url: createPageUrl("KnowledgeBank"), icon: BookOpen, showFor: "all", children: [
          { title: "E.P.I.C. Tenets", url: createPageUrl("EpicTenet"), icon: Zap, showFor: "all" },
          { title: "Video Library", url: createPageUrl("VideoLibrary"), icon: Video, showFor: "all" },
        ] },
        { title: "Marketing", sectionTitle: "Website & Marketing", url: createPageUrl("Marketing"), icon: TrendingUp, showFor: [R.CLUB_DIRECTOR, R.CLUB_ADMIN] },
      ],
    },
    {
      label: "Money",
      items: [
        { title: "Payments Ledger", url: createPageUrl("PaymentSettings"), icon: Wallet, perm: "finance:view", showFor: [...LEADERS, R.BRANCH_DIRECTOR, R.BRANCH_ADMIN, R.BOOKKEEPER] },
        { title: "Staff Expenses", sectionTitle: "Expenses", url: createPageUrl("StaffExpenses"), icon: Wallet, showFor: [R.CLUB_DIRECTOR, R.CLUB_ADMIN, R.BOOKKEEPER, R.COACH], children: [
          { title: "Expense Approvals", url: createPageUrl("ExpenseApprovals"), icon: ClipboardCheck, showFor: [R.CLUB_DIRECTOR, R.CLUB_ADMIN, R.BOOKKEEPER] },
        ] },
        { title: "Marketplace Manager", sectionTitle: "Storefront", url: createPageUrl("MarketplaceManager"), icon: Wallet, showFor: [R.CLUB_DIRECTOR, R.CLUB_ADMIN, R.BOOKKEEPER], children: [
          { title: "Events", url: createPageUrl("EventManager"), icon: CalendarIcon, showFor: [R.CLUB_DIRECTOR, R.CLUB_ADMIN] },
        ] },
      ],
    },
    {
      label: "All Pages",
      ownerOnly: true,
      items: ALL_PAGE_NAMES.map((name) => ({ title: name.replace(/([a-z])([A-Z])/g, "$1 $2"), url: createPageUrl(name), icon: FileBarChart, showFor: "all" })),
    },
    {
      label: "You",
      items: [
        { title: "My Profile", sectionTitle: "Profile & Help", url: createPageUrl("UserProfileView"), icon: UserCircle, showFor: "all", children: [
          { title: "Features", url: createPageUrl("Features"), icon: LayoutDashboard, showFor: "all" },
          { title: "FAQ", url: createPageUrl("FAQ"), icon: Settings, showFor: "all" },
        ] },
      ],
    },
  ];

  // Club Settings: everything here is scoped to the active club (tenant).
  const adminMenuItems = [
    { title: "General Settings", url: createPageUrl("Settings"), icon: Settings },
    { title: "Terminology", url: "/clubterminology", icon: BookOpen },
    { title: `${term(vocab, "platform", true)} & Structure`, url: createPageUrl("PlatformSettings"), icon: GitBranch },
    { title: term(vocab, "season", true), url: createPageUrl("Seasons"), icon: CalendarClock },
    { title: "Users", url: createPageUrl("UserPanel"), icon: Users },
    { title: "Roles & Permissions", url: createPageUrl("RBAC"), icon: ShieldCheck },
    { title: "Connections & Integrations", url: "/settings/integrations", icon: Link2 },
    { title: "Email Templates", url: createPageUrl("EmailTemplates"), icon: Mail },
    { title: "Email Logs", url: createPageUrl("EmailLogs"), icon: Mail },
    { title: "Scheduled Reports", url: createPageUrl("ScheduledReports"), icon: CalendarIcon },
  ];

  const isVisible = (item) => {
    const moduleKey = moduleForRoute(item.url);
    if (!(tenant.isSystemUser && !tenant.effectiveClubId) && moduleKey && !hasModule(moduleKey)) return false;
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

  // Always expose console sections inside the console, even after viewing a club.
  const onSystemConsole = location.pathname.toLowerCase().replace(/\/+$/, "") === "/saasadmin";
  const showSystemMenu = superAdmin && (onSystemConsole || (tenant.isSystemDomain && !tenant.viewingTenant));
  const systemNavGroups = [
    ...getSaasAdminNavGroups(systemOwner).map((group) => ({
      ...group,
      items: group.items.map((item) => ({ ...item, url: consoleNavigationUrl(item.saasTab, onSystemConsole ? location.search : "") })),
    })),
  ];
  const activeSection = showSystemMenu ? null : findActiveNavSection(navigationGroups, isVisible, location.pathname, location.search);
  const groupsToRender = showSystemMenu ? [...systemNavGroups, navigationGroups.find((group) => group.label === "All Pages")].filter(Boolean) : navigationGroups;

  return (
    <SidebarProvider>
      {showOnboarding && user && (
        <OnboardingFlow
          user={user}
          onComplete={() => {
            setShowOnboarding(false);
            base44.auth.me().then(setUser);
          }}
        />
      )}
      <div className="h-[100dvh] flex w-full gradient-bg">
        <Sidebar className="border-r border-slate-200 dark:bg-slate-900 dark:border-slate-800 shadow-xl">
          <SidebarHeader className="border-b border-slate-200 dark:border-slate-800 p-4 lg:p-6 bg-gradient-to-br from-emerald-700/10 to-transparent">
            <div className="flex items-center gap-2 lg:gap-3 mb-3">
              <div className="w-8 h-8 lg:w-11 lg:h-11 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl flex items-center justify-center shadow-lg overflow-hidden shrink-0">
                <img
                  src={logoUrl || "/favicon.png"}
                  onError={(e) => { if (!e.currentTarget.src.endsWith("/favicon.png")) e.currentTarget.src = "/favicon.png"; }}
                  alt={clubName}
                  className="w-full h-full object-contain p-0.5"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-slate-900 dark:text-white text-base lg:text-lg truncate">{clubName}</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 hidden lg:block truncate">{clubTagline}</p>
              </div>
            </div>
            {!user && (
              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm"
                onClick={() => base44.auth.redirectToLogin()}
              >
                Login / Register
              </Button>
            )}
          </SidebarHeader>

          <SidebarContent className="p-2 lg:p-3 overflow-y-auto">
            {groupsToRender.map((group) => {
              const visibleItems = group.items.map((item) => resolveNavSection(item, isVisible)).filter(Boolean);
              if (visibleItems.length === 0) return null;
              if (!canShowNavigationGroup(group, user, superAdmin)) return null;
              return (
                <SidebarGroup key={group.label}>
                  {group.ownerOnly ? (
                    <button type="button" onClick={() => setAllPagesOpen((v) => !v)} aria-expanded={allPagesOpen} className="w-full flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 py-2 hover:text-foreground">
                      <span>{group.label} ({visibleItems.length})</span>
                      <span aria-hidden>{allPagesOpen ? "−" : "+"}</span>
                    </button>
                  ) : (
                  <SidebarGroupLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 py-2 hidden lg:block">
                    {group.label}
                  </SidebarGroupLabel>
                  )}
                  {(!group.ownerOnly || allPagesOpen) && (
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {visibleItems.map((item) => {
                        const isActive = isNavSectionActive(item, location.pathname, location.search);
                        return (
                          <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton
                              asChild
                              isActive={isActive}
                              className={`hover:bg-emerald-50 dark:hover:bg-slate-800 transition-all duration-200 rounded-xl mb-1 ${
                                isActive ? 'bg-gradient-to-r from-emerald-50 to-emerald-100 dark:from-slate-800 dark:to-slate-700 text-emerald-700 dark:text-emerald-400 shadow-sm' : 'text-slate-600 dark:text-slate-300'
                              }`}
                            >
                              <Link to={item.url} className="select-none flex items-center gap-2 lg:gap-3 px-2 lg:px-3 py-2 lg:py-3 relative" style={{ WebkitUserSelect: "none" }}>
                                <div className="relative">
                                  <item.icon className={`w-4 h-4 ${isActive ? 'text-emerald-700 dark:text-emerald-400' : ''}`} />
                                  {item.badge && <NotificationBadge user={user} type={item.badge} />}
                                </div>
                                <span className="font-medium text-sm lg:text-base">{item.title}</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        );
                      })}
                    </SidebarMenu>
                  </SidebarGroupContent>
                  )}
                </SidebarGroup>
              );
            })}

            {!showSystemMenu && ((superAdmin && tenant.effectiveClubId) || role === ROLES.MASTER_ADMIN || role === ROLES.ADMIN || role === ROLES.CLUB_DIRECTOR || role === ROLES.CLUB_ADMIN) && (
              <Collapsible open={adminOpen} onOpenChange={setAdminOpen}>
                <SidebarGroup>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton className="hover:bg-emerald-50 dark:hover:bg-slate-800 transition-all duration-200 rounded-xl mb-1 text-slate-600 dark:text-slate-300">
                          <Shield className="w-4 h-4" />
                          <span className="font-medium text-sm lg:text-base truncate">Club Settings</span>
                          <ChevronRight className={`ml-auto w-4 h-4 transition-transform ${adminOpen ? 'rotate-90' : ''}`} />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {adminMenuItems.filter(isVisible).map((item) => {
                            const isActive = isNavigationItemActive(item, location.pathname, location.search);
                            return (
                              <SidebarMenuSubItem key={item.title}>
                                <SidebarMenuSubButton
                                  asChild
                                  className={`hover:bg-emerald-50 dark:hover:bg-slate-800 transition-all duration-200 rounded-lg ${
                                    isActive ? 'bg-emerald-50 dark:bg-slate-800 text-emerald-900 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400'
                                  }`}
                                >
                                  <Link to={item.url} className="select-none flex items-center gap-2 py-1.5" style={{ WebkitUserSelect: "none" }}>
                                    <item.icon className="w-3.5 h-3.5" />
                                    <span className="text-sm">{item.title}</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            );
                          })}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroup>
              </Collapsible>
            )}
          </SidebarContent>

          <SidebarFooter className="border-t border-slate-200 dark:border-slate-800 p-3 lg:p-4 bg-slate-50 dark:bg-slate-900/50">
            {user && (
              <div className="space-y-2 lg:space-y-3">
                <div className="flex items-center gap-2 lg:gap-3 p-2 rounded-xl bg-white dark:bg-slate-800 shadow-sm">
                  <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-full flex items-center justify-center shadow-md">
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
                  onClick={() => base44.auth.logout()}
                >
                  <LogOut className="w-3 h-3 lg:w-4 lg:h-4 mr-2" />
                  Logout
                </Button>
              </div>
            )}
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
          <AppHeader clubName={clubName} user={user} tenant={tenant} />
          {superAdmin && <ViewingAsBanner />}

          <div className="flex-1 min-h-0 min-w-0 overflow-auto pb-16 sm:pb-0 relative" style={{ overscrollBehaviorY: "none" }} ref={scrollRef}>
            {/* Custom pull-to-refresh indicator */}
            {(pullDistance > 0 || refreshing) && (
              <div
                className="absolute top-0 left-0 right-0 flex items-center justify-center pointer-events-none z-30"
                style={{ height: `${pullDistance}px`, transition: refreshing ? "none" : "height 0.2s ease" }}
              >
                <RefreshCw
                  className={`w-5 h-5 text-primary ${refreshing ? "animate-spin" : ""}`}
                  style={{ opacity: Math.min(pullDistance / 56, 1) }}
                />
              </div>
            )}
            {activeSection && (
              <nav aria-label={`${activeSection.title} pages`} className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur px-3 sm:px-6">
                <div className="flex gap-1 overflow-x-auto py-2 -mx-1 px-1">
                  {activeSection.entries.map((entry) => {
                    const on = isNavigationItemActive(entry, location.pathname, location.search);
                    return (
                      <Link key={entry.url} to={entry.url} aria-current={on ? "page" : undefined}
                        className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${on ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                        <entry.icon className="w-3.5 h-3.5" />
                        {entry.title}
                      </Link>
                    );
                  })}
                </div>
              </nav>
            )}
            <TenantRouteGate>{children}</TenantRouteGate>
          </div>
        </main>
        <MobileBottomNav />
      </div>
    </SidebarProvider>
  );
}