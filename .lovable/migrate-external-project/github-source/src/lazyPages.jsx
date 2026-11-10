import React, { Suspense, lazy } from "react";
import PageLoader from "@/components/layout/PageLoader";

/**
 * Route-level code splitting.
 *
 * Every page is loaded through a dynamic import, so its code is fetched only
 * when that route is actually visited instead of shipping in the initial
 * bundle. Each page carries its own Suspense boundary (with PageLoader as the
 * fallback), so a slow chunk shows a small loader in the page area without
 * blanking the app shell around it.
 */
const split = (loader) => {
  const Page = lazy(loader);
  const SplitPage = (props) => (
    <Suspense fallback={<PageLoader />}>
      <Page {...props} />
    </Suspense>
  );
  return SplitPage;
};

/* ===== Auth & public pages ===== */
export const Login = split(() => import("./pages/Login"));
export const Register = split(() => import("./pages/Register"));
export const ForgotPassword = split(() => import("./pages/ForgotPassword"));
export const ResetPassword = split(() => import("./pages/ResetPassword"));
export const AcceptInvitation = split(() => import("./pages/AcceptInvitation"));
export const PrivacyPolicy = split(() => import("./pages/PrivacyPolicy"));
export const TermsOfService = split(() => import("./pages/TermsOfService"));
export const Showcase = split(() => import("./pages/Showcase"));
export const StatusPage = split(() => import("./pages/StatusPage"));
export const ScreenGallery = split(() => import("./pages/ScreenGallery"));
export const CreateYourClub = split(() => import("./pages/CreateYourClub"));
export const WhyClubRudder = split(() => import("./pages/WhyClubRudder"));
export const Migration = split(() => import("./pages/Migration"));
export const TeamSnapAlternative = split(() => import("./pages/compare/TeamSnapAlternative"));
export const SportsEngineAlternative = split(() => import("./pages/compare/SportsEngineAlternative"));
export const SprocketSportsAlternative = split(() => import("./pages/compare/SprocketSportsAlternative"));
export const Resources = split(() => import("./pages/Resources"));
export const ResourceArticle = split(() => import("./pages/ResourceArticle"));
export const TryoutManagementSoftware = split(() => import("./pages/landing/TryoutManagementSoftware"));
export const ClubRegistrationSoftware = split(() => import("./pages/landing/ClubRegistrationSoftware"));
export const MultiBranchClubSoftware = split(() => import("./pages/landing/MultiBranchClubSoftware"));
export const ClubPaymentsSoftware = split(() => import("./pages/landing/ClubPaymentsSoftware"));
export const FieldSchedulingSoftware = split(() => import("./pages/landing/FieldSchedulingSoftware"));
export const SocialFeed = split(() => import("./pages/SocialFeed"));
export const Pricing = split(() => import("./pages/Pricing"));
export const Features = split(() => import("./pages/Features"));
export const FAQ = split(() => import("./pages/FAQ"));
export const DemoAccess = split(() => import("./pages/DemoAccess"));
export const RequestAccess = split(() => import("./pages/RequestAccess"));
export const GuidedTour = split(() => import("./pages/GuidedTour"));

/* ===== Registration, tryouts & signup portals ===== */
export const TryoutSignup = split(() => import("./pages/TryoutSignup"));
export const Tryouts = split(() => import("./pages/Tryouts"));
export const TryoutRegister = split(() => import("./pages/TryoutRegister"));
export const TryoutStatus = split(() => import("./pages/TryoutStatus"));
export const FinalRegistration = split(() => import("./pages/FinalRegistration"));
export const EventSignup = split(() => import("./pages/EventSignup"));
export const TournamentRegistration = split(() => import("./pages/TournamentRegistration"));
export const TournamentSchedule = split(() => import("./pages/TournamentSchedule"));
export const TournamentStandings = split(() => import("./pages/TournamentStandings"));
export const Marketplace = split(() => import("./pages/Marketplace"));
export const MarketplaceCart = split(() => import("./pages/MarketplaceCart"));
export const PayDues = split(() => import("./pages/PayDues"));
export const BillingPortal = split(() => import("./pages/BillingPortal"));

/* ===== Club operations ===== */
export const ClubSignup = split(() => import("./pages/ClubSignup"));
export const PlanPicker = split(() => import("./pages/PlanPicker"));
export const ThankYou = split(() => import("./pages/ThankYou"));
export const ClubSetupWizard = split(() => import("./pages/ClubSetupWizard"));
export const SetupJourney = split(() => import("./pages/SetupJourney"));
export const ClientJourneyBoard = split(() => import("./pages/ClientJourneyBoard"));
export const JourneyChecklists = split(() => import("./pages/JourneyChecklists"));
export const MigrationWizard = split(() => import("./pages/MigrationWizard"));
export const MarketplaceManager = split(() => import("./pages/MarketplaceManager"));
export const StaffExpenses = split(() => import("./pages/StaffExpenses"));
export const ExpenseApprovals = split(() => import("./pages/ExpenseApprovals"));
export const PaymentSettings = split(() => import("./pages/PaymentSettings"));
export const PromoCodes = split(() => import("./pages/PromoCodes"));
export const EventManager = split(() => import("./pages/EventManager"));
export const Marketing = split(() => import("./pages/Marketing"));
export const Reports = split(() => import("./pages/Reports"));
export const Roadmap = split(() => import("./pages/Roadmap"));
export const Seasons = split(() => import("./pages/Seasons"));
export const Connections = split(() => import("./pages/Connections"));
export const PlatformSettings = split(() => import("./pages/PlatformSettings"));
export const PlatformDashboard = split(() => import("./pages/PlatformDashboard"));

/* ===== Tryouts, teams & players ===== */
export const TryoutDashboard = split(() => import("./pages/TryoutDashboard"));
export const TryoutPlanDetail = split(() => import("./pages/TryoutPlanDetail"));
export const FamilyAccount = split(() => import("./pages/FamilyAccount"));
export const PlayerRoster = split(() => import("./pages/PlayerRoster"));
export const CenterOfExcellence = split(() => import("./pages/CenterOfExcellence"));
export const KnowledgeBank = split(() => import("./pages/KnowledgeBank"));
export const VideoLibrary = split(() => import("./pages/VideoLibrary"));
export const SkillTests = split(() => import("./pages/SkillTests"));
export const TestDayManager = split(() => import("./pages/TestDayManager"));
export const EpicTenet = split(() => import("./pages/EpicTenet"));
export const TeamCalendar = split(() => import("./pages/TeamCalendar"));
export const CoachCompliance = split(() => import("./pages/CoachCompliance"));
export const AdminCompliance = split(() => import("./pages/AdminCompliance"));

/* ===== Facilities, scheduling & tournaments ===== */
export const Facilities = split(() => import("./pages/Facilities"));
export const FacilityManagerDashboard = split(() => import("./pages/FacilityManagerDashboard"));
export const FacilityBilling = split(() => import("./pages/FacilityBilling"));
export const ScheduleView = split(() => import("./pages/ScheduleView"));
export const FieldBoard = split(() => import("./pages/FieldBoard"));
export const TrainingScheduler = split(() => import("./pages/TrainingScheduler"));
export const TrainingGridToSchedule = split(() => import("./pages/TrainingGridToSchedule"));
export const GridImport = split(() => import("./pages/GridImport"));
export const TournamentManager = split(() => import("./pages/TournamentManager"));

/* ===== Communication, support & platform console ===== */
export const CommunicationPortal = split(() => import("./pages/CommunicationPortal"));
export const MyTickets = split(() => import("./pages/MyTickets"));
export const SupportConsole = split(() => import("./pages/SupportConsole"));
export const SystemHealth = split(() => import("./pages/SystemHealth"));
export const SaaSAdmin = split(() => import("./pages/SaaSAdmin"));

/* ===== Knowledge Base ===== */
export const HelpHome = split(() => import("./pages/HelpHome"));
export const HelpSearch = split(() => import("./pages/HelpSearch"));
export const HelpCategory = split(() => import("./pages/HelpCategory"));
export const HelpArticle = split(() => import("./pages/HelpArticle"));
export const HelpAdmin = split(() => import("./pages/HelpAdmin"));

/* ===== Role onboarding ===== */
export const OnboardParent = split(() => import("./pages/onboarding/OnboardParent"));
export const OnboardCoach = split(() => import("./pages/onboarding/OnboardCoach"));
export const OnboardBranchDirector = split(() => import("./pages/onboarding/OnboardBranchDirector"));
export const OnboardClubAdmin = split(() => import("./pages/onboarding/OnboardClubAdmin"));
export const OnboardClubDirector = split(() => import("./pages/onboarding/OnboardClubDirector"));
export const OnboardBookkeeper = split(() => import("./pages/onboarding/OnboardBookkeeper"));
export const OnboardPlatformDirector = split(() => import("./pages/onboarding/OnboardPlatformDirector"));

/* ===== Dashboard & admin pages (registered through pages.config) ===== */
export const RoleDashboard = split(() => import("./pages/RoleDashboard"));
export const Registration = split(() => import("./pages/Registration"));
export const TeamDetail = split(() => import("./pages/TeamDetail"));
export const PlayerDetail = split(() => import("./pages/PlayerDetail"));
export const ProgramsList = split(() => import("./pages/ProgramsList"));
export const Kanban = split(() => import("./pages/Kanban"));
export const KanbanStaff = split(() => import("./pages/KanbanStaff"));
export const Timeline = split(() => import("./pages/Timeline"));
export const ClubStaff = split(() => import("./pages/ClubStaff"));
export const Locations = split(() => import("./pages/Locations"));
export const Settings = split(() => import("./pages/Settings"));
export const UserPanel = split(() => import("./pages/UserPanel"));
export const UserProfileView = split(() => import("./pages/UserProfileView"));
export const RBAC = split(() => import("./pages/RBAC"));
export const Analytics = split(() => import("./pages/Analytics"));
export const ScheduledReports = split(() => import("./pages/ScheduledReports"));
export const EmailTemplates = split(() => import("./pages/EmailTemplates"));
export const EmailLogs = split(() => import("./pages/EmailLogs"));