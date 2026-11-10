import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "sonner"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { MotionConfig } from 'framer-motion'
import VisualEditAgent from '@/lib/VisualEditAgent'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, Navigate, Outlet } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider } from '@/lib/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import {
  Login, Register, ForgotPassword, ResetPassword, PrivacyPolicy, TermsOfService,
  TryoutSignup, Tryouts, TryoutRegister, TryoutStatus, FinalRegistration, EventSignup, Marketplace, MarketplaceCart,
  PayDues, MarketplaceManager, StaffExpenses, ExpenseApprovals, EventManager, PromoCodes,
  PaymentSettings, Roadmap, TryoutDashboard, Seasons, TryoutPlanDetail, FamilyAccount,
  PlayerRoster, CenterOfExcellence, KnowledgeBank, VideoLibrary, SkillTests, TestDayManager,
  EpicTenet, TeamCalendar, Facilities, FacilityManagerDashboard, ScheduleView,
  PlatformSettings, PlatformDashboard, CommunicationPortal, SaaSAdmin, Connections,
  MigrationWizard, ClubSignup, ThankYou, PlanPicker, Showcase, GuidedTour, DemoAccess,
  RequestAccess, Migration, ClubSetupWizard, ClientJourneyBoard, JourneyChecklists, Pricing,
  Features, FAQ, OnboardParent, OnboardCoach, OnboardBranchDirector, OnboardClubAdmin,
  OnboardClubDirector, OnboardBookkeeper, OnboardPlatformDirector,
} from '@/lazyPages';
import PluginGate from '@/components/plugins/PluginGate';
import HelpLayout from '@/components/help/HelpLayout';
import { TenantProvider } from '@/lib/TenantContext';
import { TenantBrandingProvider } from '@/components/TenantBrandingProvider';
import { TabNavigationProvider } from '@/lib/TabNavigationContext';
import { PullToRefreshProvider } from '@/lib/PullToRefreshContext';
import SmartHome from '@/components/SmartHome';
import MembershipGate from '@/components/branding/MembershipGate';
import {
  AcceptInvitation, TrainingGridToSchedule, FieldBoard, FacilityBilling, BillingPortal,
  GridImport, TrainingScheduler, TournamentManager, TournamentRegistration,
  TournamentSchedule, TournamentStandings, Marketing, Reports, MyTickets, SupportConsole,
  HelpHome, HelpSearch, HelpCategory, HelpArticle, HelpAdmin, SystemHealth, StatusPage,
  ScreenGallery, SocialFeed, SetupJourney, CreateYourClub, WhyClubRudder,
  CoachCompliance, AdminCompliance,
  TeamSnapAlternative, SportsEngineAlternative, SprocketSportsAlternative, Resources, ResourceArticle,
  TryoutManagementSoftware, ClubRegistrationSoftware, MultiBranchClubSoftware, ClubPaymentsSoftware,
  FieldSchedulingSoftware,
} from '@/lazyPages';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];

/** Layout route: wraps all gated pages in TenantProvider + Layout */
function AppLayout() {
  return (
    <MembershipGate><TenantProvider>
      <TabNavigationProvider>
        <PullToRefreshProvider>
          {Layout ? <Layout currentPageName={mainPageKey}><Outlet /></Layout> : <Outlet />}
        </PullToRefreshProvider>
      </TabNavigationProvider>
    </TenantProvider></MembershipGate>
  );
}

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        {/* WebView performance: framer-motion transform/layout animations are
            downgraded to simple opacity fades app-wide, so no JS transform
            animation loops run on the mobile WebView. */}
        <MotionConfig reducedMotion="always">
        <Router>
          <NavigationTracker />
          <TenantBrandingProvider>
          <Routes>
            {/* Public auth routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/accept-invite" element={<AcceptInvitation />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />

            {/* Knowledge Base: public plus signed-in */}
            <Route element={<HelpLayout />}>
              <Route path="/help" element={<HelpHome />} />
              <Route path="/help/search" element={<HelpSearch />} />
              <Route path="/help/category/:slug" element={<HelpCategory />} />
              <Route path="/help/article/:slug" element={<HelpArticle />} />
              <Route path="/help/admin" element={<HelpAdmin />} />
            </Route>

            {/* Public landing page */}
            <Route path="/" element={<Showcase />} />

            {/* Public status page */}
            <Route path="/status" element={<StatusPage />} />

            {/* Invoice portal for outside billing organizations */}
            <Route path="/MyInvoices" element={<BillingPortal />} />

            {/* Public screen gallery — reachable at both paths */}
            <Route path="/gallery" element={<ScreenGallery />} />
            <Route path="/ScreenGallery" element={<ScreenGallery />} />

            {/* Public "Create your club" self-serve invite */}
            <Route path="/create-club" element={<CreateYourClub />} />

            {/* Public "Why ClubRudder" page */}
            <Route path="/why-clubrudder" element={<WhyClubRudder />} />

            {/* Public data-migration landing page */}
            <Route path="/migration" element={<Migration />} />

            {/* Public comparison pages — built, unlisted and noindex until the [VERIFY] facts are confirmed */}
            <Route path="/compare/teamsnap-alternative" element={<TeamSnapAlternative />} />
            <Route path="/compare/sportsengine-alternative" element={<SportsEngineAlternative />} />
            <Route path="/compare/sprocket-sports-alternative" element={<SprocketSportsAlternative />} />

            {/* Public resources / blog */}
            <Route path="/resources" element={<Resources />} />
            <Route path="/resources/:slug" element={<ResourceArticle />} />

            {/* Public single-job landing pages */}
            <Route path="/soccer-tryout-management-software" element={<TryoutManagementSoftware />} />
            <Route path="/youth-club-registration-software" element={<ClubRegistrationSoftware />} />
            <Route path="/multi-branch-club-management-software" element={<MultiBranchClubSoftware />} />
            <Route path="/club-payments-stripe-quickbooks" element={<ClubPaymentsSoftware />} />
            <Route path="/field-scheduling-software" element={<FieldSchedulingSoftware />} />

            {/* Public social feed */}
            <Route path="/feed" element={<SocialFeed />} />

            {/* Public tryout registration & final registration portals */}
            <Route path="/TryoutSignup" element={<TryoutSignup />} />
            <Route path="/Tryouts" element={<Tryouts />} />
            <Route path="/TryoutRegister" element={<TryoutRegister />} />
            <Route path="/TryoutStatus" element={<TryoutStatus />} />
            <Route path="/FinalRegistration" element={<FinalRegistration />} />
            <Route path="/EventSignup" element={<EventSignup />} />
            <Route path="/Marketplace" element={<Marketplace />} />
            <Route path="/MarketplaceCart" element={<MarketplaceCart />} />
            <Route path="/PayDues" element={<PayDues />} />
            <Route path="/TournamentRegistration" element={<TournamentRegistration />} />
            <Route path="/TournamentSchedule" element={<TournamentSchedule />} />
            <Route path="/TournamentStandings" element={<TournamentStandings />} />

            {/* Public demo access & pricing */}
            <Route path="/demo" element={<GuidedTour />} />
            <Route path="/demo-access" element={<DemoAccess />} />
            <Route path="/request-access" element={<RequestAccess />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/features" element={<Features />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/Features" element={<Navigate to="/features" replace />} />
            <Route path="/FAQ" element={<Navigate to="/faq" replace />} />

            {/* All app routes gated — unauthenticated users redirect to /login */}
            <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
              <Route element={<AppLayout />}>
                <Route path="/home" element={<SmartHome />} />
                <Route path="/SetupJourney" element={<SetupJourney />} />
                <Route path="/MyCompliance" element={<CoachCompliance />} />
                <Route path="/Compliance" element={<AdminCompliance />} />
                <Route path="/PaymentSettings" element={<PaymentSettings />} />
                <Route path="/EventManager" element={<EventManager />} />
                <Route path="/EventScheduling" element={<Navigate to="/EventManager" replace />} />
                <Route path="/PromoCodes" element={<PromoCodes />} />

                <Route path="/Roadmap" element={<Roadmap />} />
                <Route path="/TryoutPlanner" element={<Navigate to="/TryoutDashboard" replace />} />
                <Route path="/TryoutDashboard" element={<TryoutDashboard />} />
                <Route path="/Seasons" element={<Seasons />} />
                <Route path="/TryoutPlanDetail" element={<TryoutPlanDetail />} />
                <Route path="/FamilyAccount" element={<FamilyAccount />} />
                <Route path="/TeamCalendar" element={<TeamCalendar />} />
                <Route path="/Facilities" element={<PluginGate pluginKey="facility_management"><Facilities /></PluginGate>} />
                <Route path="/FacilityManagerDashboard" element={<PluginGate pluginKey="facility_management"><FacilityManagerDashboard /></PluginGate>} />
                <Route path="/ScheduleView" element={<PluginGate pluginKey="facility_management"><ScheduleView /></PluginGate>} />
                <Route path="/FieldBoard" element={<PluginGate pluginKey="facility_management"><FieldBoard /></PluginGate>} />
                <Route path="/TrainingScheduler" element={<PluginGate pluginKey="facility_management"><TrainingScheduler /></PluginGate>} />
                <Route path="/FacilityBilling" element={<PluginGate pluginKey="facility_management"><FacilityBilling /></PluginGate>} />
                <Route path="/GridImport" element={<PluginGate pluginKey="facility_management"><GridImport /></PluginGate>} />
                <Route path="/PlatformSettings" element={<PlatformSettings />} />
                <Route path="/PlatformDashboard" element={<PlatformDashboard />} />
                <Route path="/CommunicationPortal" element={<CommunicationPortal />} />
                <Route path="/SaaSAdmin" element={<SaaSAdmin />} />
                <Route path="/Connections" element={<Connections />} />
                <Route path="/Marketing" element={<PluginGate pluginKey="branding"><Marketing /></PluginGate>} />
                <Route path="/MarketplaceManager" element={<MarketplaceManager />} />
                <Route path="/StaffExpenses" element={<StaffExpenses />} />
                <Route path="/ExpenseApprovals" element={<ExpenseApprovals />} />
                <Route path="/MigrationWizard" element={<MigrationWizard />} />
                <Route path="/TrainingGridToSchedule" element={<TrainingGridToSchedule />} />
                <Route path="/TournamentManager" element={<TournamentManager />} />
                <Route path="/Reports" element={<Reports />} />
                <Route path="/MyTickets" element={<MyTickets />} />
                <Route path="/SupportConsole" element={<SupportConsole />} />
                <Route path="/SystemHealth" element={<SystemHealth />} />
                <Route path="/ClubSetupWizard" element={<ClubSetupWizard />} />
                <Route path="/ClientJourneyBoard" element={<ClientJourneyBoard />} />
                <Route path="/JourneyChecklists" element={<JourneyChecklists />} />
                <Route path="/PlayerRoster" element={<PluginGate pluginKey="player_development"><PlayerRoster /></PluginGate>} />
                <Route path="/CenterOfExcellence" element={<PluginGate pluginKey="player_development"><CenterOfExcellence /></PluginGate>} />
                <Route path="/KnowledgeBank" element={<PluginGate pluginKey="player_development"><KnowledgeBank /></PluginGate>} />
                <Route path="/VideoLibrary" element={<PluginGate pluginKey="player_development"><VideoLibrary /></PluginGate>} />
                <Route path="/SkillTests" element={<PluginGate pluginKey="player_development"><SkillTests /></PluginGate>} />
                <Route path="/TestDayManager" element={<PluginGate pluginKey="player_development"><TestDayManager /></PluginGate>} />
                <Route path="/EpicTenet" element={<PluginGate pluginKey="player_development"><EpicTenet /></PluginGate>} />

                <Route path="/ClubSignup" element={<ClubSignup />} />
                <Route path="/PlanPicker" element={<PlanPicker />} />
                <Route path="/ThankYou" element={<ThankYou />} />
                <Route path="/onboard/parent" element={<OnboardParent />} />
                <Route path="/onboard/coach" element={<OnboardCoach />} />
                <Route path="/onboard/branch-director" element={<OnboardBranchDirector />} />
                <Route path="/onboard/club-admin" element={<OnboardClubAdmin />} />
                <Route path="/onboard/club-director" element={<OnboardClubDirector />} />
                <Route path="/onboard/bookkeeper" element={<OnboardBookkeeper />} />
                <Route path="/onboard/platform-director" element={<OnboardPlatformDirector />} />
                {Object.entries(Pages).filter(([path]) => !["Features", "FAQ"].includes(path)).map(([path, Page]) => (
                  <Route key={path} path={`/${path}`} element={<Page />} />
                ))}
                <Route path="*" element={<PageNotFound />} />
              </Route>
            </Route>
          </Routes>
          </TenantBrandingProvider>
          <Toaster />
          {/* Sonner is the toast used by the app's screens (drag-and-drop,
              optimistic saves, alerts) — without this mount those messages
              would never appear. */}
          <SonnerToaster position="top-right" richColors closeButton />
          <VisualEditAgent />
        </Router>
        </MotionConfig>
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App