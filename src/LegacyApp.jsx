import React from "react";
import DevMockPanel from '@/components/DevMockPanel';
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from '@/pages.config'
import PageNotFound from '@/lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import PrivacyPolicy from '@/pages/PrivacyPolicy';
import TermsOfService from '@/pages/TermsOfService';
import TryoutSignup from '@/pages/TryoutSignup';
import FinalRegistration from '@/pages/FinalRegistration';
import PaymentSettings from '@/pages/PaymentSettings';
import Roadmap from '@/pages/Roadmap';
import TryoutPlanner from '@/pages/TryoutPlanner';
import Seasons from '@/pages/Seasons';
import TryoutPlanDetail from '@/pages/TryoutPlanDetail';
import FamilyAccount from '@/pages/FamilyAccount';
import PlayerRoster from '@/pages/PlayerRoster';
import CenterOfExcellence from '@/pages/CenterOfExcellence';
import KnowledgeBank from '@/pages/KnowledgeBank';
import VideoLibrary from '@/pages/VideoLibrary';
import SkillTests from '@/pages/SkillTests';
import TestDayManager from '@/pages/TestDayManager';
import EpicTenet from '@/pages/EpicTenet';
import TestSettings from '@/pages/TestSettings';
import TeamCalendar from '@/pages/TeamCalendar';
import Facilities from '@/pages/Facilities';
import FacilityManagerDashboard from '@/pages/FacilityManagerDashboard';
import ScheduleView from '@/pages/ScheduleView';
import PlatformSettings from '@/pages/PlatformSettings';
import ClubTerminology from '@/pages/ClubTerminology';
import PlatformDashboard from '@/pages/PlatformDashboard';
import CommunicationPortal from '@/pages/CommunicationPortal';
import SaaSAdmin from '@/pages/SaaSAdmin';
import ClubSignup from '@/pages/ClubSignup';
import ThankYou from '@/pages/ThankYou';
import PlanPicker from '@/pages/PlanPicker';
import Showcase from '@/pages/Showcase';
import TrialSignup from '@/pages/TrialSignup';
import OnboardParent from '@/pages/onboarding/OnboardParent';
import OnboardCoach from '@/pages/onboarding/OnboardCoach';
import OnboardBranchDirector from '@/pages/onboarding/OnboardBranchDirector';
import OnboardClubAdmin from '@/pages/onboarding/OnboardClubAdmin';
import OnboardClubDirector from '@/pages/onboarding/OnboardClubDirector';
import OnboardBookkeeper from '@/pages/onboarding/OnboardBookkeeper';
import OnboardPlatformDirector from '@/pages/onboarding/OnboardPlatformDirector';
import PluginGate from '@/components/plugins/PluginGate';
import { TenantProvider } from '@/lib/TenantContext';
import { TenantBrandingProvider } from '@/components/TenantBrandingProvider';
import { TabNavigationProvider } from '@/lib/TabNavigationContext';
import { PullToRefreshProvider } from '@/lib/PullToRefreshContext';
import SmartHome from '@/components/SmartHome';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { useLocation, Navigate, RouteParamsContext, OutletContext } from "@/lib/router-compat";
import HelpLayout from '@/components/help/HelpLayout';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const lc = (p) => p.toLowerCase().replace(/\/+$/, "") || "/";

const PUBLIC = {
  "/login": () => <Login />,
  "/register": () => <Register />,
  "/forgot-password": () => <ForgotPassword />,
  "/reset-password": () => <ResetPassword />,
  "/privacy-policy": () => <PrivacyPolicy />,
  "/terms-of-service": () => <TermsOfService />,
  "/": () => <Showcase />,
  "/tryoutsignup": () => <TryoutSignup />,
  "/finalregistration": () => <FinalRegistration />,
  "/trial-signup": () => <TrialSignup />,
};

const GATED = {
  "/mycompliance": () => pageFor("CoachCompliance")(),
  "/compliance": () => pageFor("AdminCompliance")(),
  "/home": () => <SmartHome />,
  "/paymentsettings": () => <PaymentSettings />,
  "/roadmap": () => <Roadmap />,
  "/tryoutplanner": () => <TryoutPlanner />,
  "/seasons": () => <Seasons />,
  "/tryoutplandetail": () => <TryoutPlanDetail />,
  "/familyaccount": () => <FamilyAccount />,
  "/teamcalendar": () => <TeamCalendar />,
  "/facilities": () => <PluginGate pluginKey="facility_management"><Facilities /></PluginGate>,
  "/facilitymanagerdashboard": () => <PluginGate pluginKey="facility_management"><FacilityManagerDashboard /></PluginGate>,
  "/scheduleview": () => <PluginGate pluginKey="facility_management"><ScheduleView /></PluginGate>,
  "/platformsettings": () => <PlatformSettings />,
  "/clubterminology": () => <ClubTerminology />,
  "/platformdashboard": () => <PlatformDashboard />,
  "/communicationportal": () => <CommunicationPortal />,
  "/saasadmin": () => <SaaSAdmin />,
  "/playerroster": () => <PluginGate pluginKey="player_development"><PlayerRoster /></PluginGate>,
  "/centerofexcellence": () => <PluginGate pluginKey="player_development"><CenterOfExcellence /></PluginGate>,
  "/knowledgebank": () => <PluginGate pluginKey="player_development"><KnowledgeBank /></PluginGate>,
  "/videolibrary": () => <PluginGate pluginKey="player_development"><VideoLibrary /></PluginGate>,
  "/skilltests": () => <PluginGate pluginKey="player_development"><SkillTests /></PluginGate>,
  "/testdaymanager": () => <PluginGate pluginKey="player_development"><TestDayManager /></PluginGate>,
  "/epictenet": () => <PluginGate pluginKey="player_development"><EpicTenet /></PluginGate>,
  "/testsettings": () => <PluginGate pluginKey="player_development"><TestSettings /></PluginGate>,
  "/showcase": () => <Showcase />,
  "/clubsignup": () => <ClubSignup />,
  "/planpicker": () => <PlanPicker />,
  "/thankyou": () => <ThankYou />,
  "/onboard/parent": () => <OnboardParent />,
  "/onboard/coach": () => <OnboardCoach />,
  "/onboard/branch-director": () => <OnboardBranchDirector />,
  "/onboard/club-admin": () => <OnboardClubAdmin />,
  "/onboard/club-director": () => <OnboardClubDirector />,
  "/onboard/bookkeeper": () => <OnboardBookkeeper />,
  "/onboard/platform-director": () => <OnboardPlatformDirector />,
  "*": () => <PageNotFound />,
};
for (const [name, Page] of Object.entries(Pages)) {
  const key = "/" + name.toLowerCase();
  if (!GATED[key]) GATED[key] = () => <Page />;
  const dashed = "/" + name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
  if (!GATED[dashed]) GATED[dashed] = GATED[key];
}
// Auto-register every remaining page file (lazy, so one broken page can't break the app).
const PUBLIC_PAGES = new Set(["acceptinvitation","createyourclub","demoaccess","eventsignup","requestaccess","statuspage","tournamentregistration","tournamentschedule","tournamentstandings","tryoutregister","tryoutstatus","whyclubrudder","marketplace","marketplacecart","resources","resourcearticle","helphome","helparticle","helpcategory","helpsearch","screengallery"]);
const pageModules = import.meta.glob("./pages/*.jsx");
const allPageModules = import.meta.glob("./pages/**/*.jsx");
const lazyCache = {};
function pageFor(name) {
  if (!lazyCache[name]) {
    const loader = allPageModules[`./pages/${name}.jsx`];
    if (!loader) throw new Error(`Missing page ${name}`);
    const Lazy = React.lazy(loader);
    lazyCache[name] = () => <React.Suspense fallback={<Spinner />}><Lazy /></React.Suspense>;
  }
  return lazyCache[name];
}
const help = (name) => () => <OutletContext.Provider value={pageFor(name)()}><HelpLayout /></OutletContext.Provider>;
// Public addresses from the original app's route table (signed-out visitors can open these).
const PUBLIC_ALIASES = {
  "/accept-invite": "AcceptInvitation", "/beacon/support": "BeaconSupport", "/status": "StatusPage", "/myinvoices": "BillingPortal",
  "/gallery": "ScreenGallery", "/create-club": "CreateYourClub", "/why-clubrudder": "WhyClubRudder",
  "/migration": "Migration", "/compare/teamsnap-alternative": "compare/TeamSnapAlternative",
  "/compare/sportsengine-alternative": "compare/SportsEngineAlternative",
  "/compare/sprocket-sports-alternative": "compare/SprocketSportsAlternative",
  "/resources": "Resources", "/soccer-tryout-management-software": "landing/TryoutManagementSoftware",
  "/youth-club-registration-software": "landing/ClubRegistrationSoftware",
  "/multi-branch-club-management-software": "landing/MultiBranchClubSoftware",
  "/club-payments-stripe-quickbooks": "landing/ClubPaymentsSoftware",
  "/field-scheduling-software": "landing/FieldSchedulingSoftware", "/feed": "SocialFeed",
  "/tryouts": "Tryouts", "/paydues": "PayDues", "/echelon-pay": "EchelonPay", "/demo": "GuidedTour", "/demo-access": "DemoAccess",
  "/request-access": "RequestAccess", "/features": "Features", "/payments": "Payments", "/pricing": "Pricing", "/faq": "Resources",
  "/walkthrough": "Walkthroughs", "/walkthrough/admin": "AdminWalkthrough", "/walkthrough/parent": "ParentWalkthrough",
  "/walkthrough/tryouts-admin": "TryoutAdminWalkthrough", "/walkthrough/tryouts-coach": "TryoutCoachWalkthrough",
  "/walkthrough/tryouts-player": "TryoutPlayerWalkthrough",
  "/walkthrough/facilities": "FacilitiesWalkthrough", "/walkthrough/development": "DevelopmentWalkthrough", "/walkthrough/beacon": "BeaconWalkthrough",
  "/walkthrough/payments": "PaymentsWalkthrough", "/walkthrough/tournaments": "TournamentsWalkthrough", "/walkthrough/projects": "ProjectsWalkthrough", "/walkthrough/marketing": "MarketingWalkthrough", "/walkthrough/coach": "CoachWalkthrough",
};
for (const [path, name] of Object.entries(PUBLIC_ALIASES)) PUBLIC[path] = pageFor(name);
PUBLIC["/help"] = help("HelpHome");
PUBLIC["/help/search"] = help("HelpSearch");
PUBLIC["/help/admin"] = help("HelpAdmin");
// Addresses with a name in them, e.g. /help/article/how-to-pay.
const PARAM_ROUTES = [
  { re: /^\/help\/category\/([^/]+)$/, render: help("HelpCategory") },
  { re: /^\/help\/article\/([^/]+)$/, render: help("HelpArticle") },
  { re: /^\/resources\/([^/]+)$/, render: pageFor("ResourceArticle") },
];
const REDIRECTS = { "/tryoutplanner": "/TryoutDashboard", "/eventscheduling": "/EventManager", "/connections": "/settings/integrations" };
for (const [path, loader] of Object.entries(pageModules)) {
  const name = path.slice(8, -4);
  const key = "/" + name.toLowerCase();
  if (GATED[key] || PUBLIC[key]) continue;
  const Lazy = React.lazy(loader);
  const render = () => <React.Suspense fallback={<Spinner />}><Lazy /></React.Suspense>;
  if (PUBLIC_PAGES.has(name.toLowerCase())) PUBLIC[key] = render; else GATED[key] = render;
  const dashed = "/" + name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
  if (!GATED[dashed] && !PUBLIC[dashed]) (PUBLIC_PAGES.has(name.toLowerCase()) ? PUBLIC : GATED)[dashed] = render;
}

function Spinner() {
  return (
    <div className="fixed inset-0 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-muted border-t-foreground rounded-full animate-spin" />
    </div>
  );
}

function Gated({ render, bare }) {
  const { isAuthenticated, isLoadingAuth } = useAuth();
  if (isLoadingAuth) return <Spinner />;
  if (!isAuthenticated) return <Navigate to={`/login?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`} replace />;
  if (bare) return <TenantProvider>{render()}</TenantProvider>;
  return (
    <TenantProvider>
      <TabNavigationProvider>
        <PullToRefreshProvider>
          <Layout currentPageName={mainPageKey}>{render()}</Layout>
        </PullToRefreshProvider>
      </TabNavigationProvider>
    </TenantProvider>
  );
}

function Screen() {
  const { pathname } = useLocation();
  const key = lc(pathname);
  if (REDIRECTS[key]) return <Navigate to={REDIRECTS[key]} replace />;
  if (PUBLIC[key]) return PUBLIC[key]();
  for (const r of PARAM_ROUTES) {
    const m = key.match(r.re);
    if (m) return <RouteParamsContext.Provider value={{ slug: decodeURIComponent(pathname.split("/").pop()) }}>{r.render()}</RouteParamsContext.Provider>;
  }
  if (key === "/beacon" || key === "/app") return <Gated bare render={pageFor("BeaconApp")} />;
  const g = GATED[key];
  return <Gated render={g || (() => <PageNotFound />)} />;
}

export default function LegacyApp() {
  return (
    <AuthProvider>
      <TenantBrandingProvider>
        <Screen />
      </TenantBrandingProvider>
      <Toaster />
      <SonnerToaster />
      <DevMockPanel />
    </AuthProvider>
  );
}
