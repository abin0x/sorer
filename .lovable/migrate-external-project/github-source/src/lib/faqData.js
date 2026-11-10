/**
 * FAQ content for the public pages.
 *
 * Kept as plain data so the page and its FAQPage structured data always show
 * the same questions and answers.
 */

/** Categories shown on /faq. */
export const FAQ_CATEGORIES = [
  { key: "getting_started", label: "Getting Started", color: "#9747FF", questions: [
    { q: "What is Club Rudder?", a: "Club Rudder is an all-in-one club management and player development platform. It brings together team management, registration, facility scheduling, communication, calendar, payments, and athlete performance tracking — so directors, coaches, parents, and players all work from one connected system." },
    { q: "How do I create an account?", a: "You'll receive an invite email from your club admin. Click the link in the email to set up your password and complete your profile. If you haven't received an invite, contact your club director." },
    { q: "I received an invite email — what do I do next?", a: "Click the 'Accept Invite' button in the email. You'll be taken to the platform to create your password. Once logged in, you'll see your dashboard based on your role (director, coach, parent, or player)." },
    { q: "Can I add multiple children to one parent account?", a: "Yes. Your parent account is linked to your household. Once logged in, you'll see all your children in the Family dashboard. Each child has their own player profile with their own development data." },
    { q: "Which devices does Club Rudder support?", a: "Club Rudder works in any modern web browser on desktop, tablet, and mobile. It's also available as a native iOS and Android app, so parents and coaches can access schedules, notifications, and player profiles on the go." },
  ]},
  { key: "club_management", label: "Club Management", color: "#1ABC9C", questions: [
    { q: "What does the CEO Dashboard show?", a: "The CEO Dashboard gives club directors a high-level overview of the entire club: total players, teams, branches, registration status, payment collections, and facility utilization — all in real time." },
    { q: "How do I manage branches and locations?", a: "Go to 'Branches' in the Core Platform section. Each branch (location) can have its own facilities, fields, teams, and staff. You can assign players and teams to specific branches and filter all views by branch." },
    { q: "How does the Kanban board work?", a: "The Kanban board visualizes your club's operational programs and tasks. Create programs, assign staff, set due dates, and drag tasks across columns. Each program can be linked to a specific module (registration, tryouts, evaluations, etc.) for automatic fulfillment tracking." },
    { q: "What is the Roadmap?", a: "The Roadmap is a strategic planning tool that lays out your club's season-long projects and tasks in a numbered hierarchy. Activate roadmap tasks to push them to the Kanban board for execution, with RACI assignments for accountability." },
    { q: "How do I manage user roles and permissions?", a: "Go to Admin > User Management to invite users and assign roles. Use Admin > RBAC / Permissions to configure what each role can view, create, edit, and delete across all modules." },
  ]},
  { key: "registration_teams", label: "Registration & Teams", color: "#E67E22", questions: [
    { q: "How do I register a new player?", a: "Go to the Registration page and use the Players tab. You can add players individually or import via CSV. Each player is assigned to a team, age group, position, and branch. The matrix view lets you edit any field inline — just click a cell to change it." },
    { q: "How do I create and manage teams?", a: "Go to the Registration page and use the Teams tab. Create teams with a name, age group, gender, playing format, and season. Assign coaches and team managers, and manage rosters by adding or removing players." },
    { q: "What playing formats are supported?", a: "Club Rudder supports 4v4, 7v7, 9v9, and 11v11 formats. Teams are grouped by format in the registration matrix, and fields can be tagged with the formats they support for scheduling." },
    { q: "How do I filter players and teams?", a: "Both the Players and Teams tabs support filtering by gender, branch, platform, coach, and playing format. Use the filter dropdowns at the top of the table to narrow your view. Click any column header to sort the table." },
    { q: "Can a player have multiple guardians?", a: "Yes. Each player can be linked to multiple guardians (e.g., both parents). Use the guardian multi-select in the player matrix to add or remove guardians. Each guardian gets their own login and can see that child's profile." },
    { q: "What positions are available?", a: "Club Rudder uses a standard 1–11 numbering system: 1-Goalkeeper, 2-Right Back, 3-Left Back, 4-Right Centerback, 5-Left Centerback, 6-Holding Midfielder, 7-Right Winger, 8-Center Midfielder, 9-Center Forward, 10-Attacking Midfielder, 11-Left Midfielder. Positions are tied to the Knowledge Bank's position guide for development content." },
  ]},
  { key: "player_development", label: "Player Development", color: "#3498DB", questions: [
    { q: "What is the Center of Excellence?", a: "The Center of Excellence (COE) is your club's performance hub. It aggregates skill test scores, physical assessments, and coach evaluations into a unified dashboard with E.P.I.C. composite scores, team comparisons, and coverage tracking." },
    { q: "What are Skill Tests?", a: "Skill Tests are standardized technical drills (4 basic, 4 advanced) with diagrams, setup instructions, and scoring rules. Coaches log player scores, and the system converts raw scores to 0–100 percentages using your club's configurable benchmarks." },
    { q: "What are Physical Assessments?", a: "Physical Assessments measure speed (20m sprint), power (vertical jump), agility (5-10-5 shuttle), and endurance (Yo-Yo test). Raw results are converted to 0–100 scores using gender-specific benchmarks set by the club admin." },
    { q: "What are the E.P.I.C. tenets?", a: "E.P.I.C. stands for Explosive, Precise, Insightful, and Combative — the four pillars of player development. Explosive maps to physical scores, Precise to skill scores, Insightful to tactical evaluation scores, and Combative to mental evaluation scores." },
    { q: "How do I configure test benchmarks?", a: "System admins can configure physical and skill test benchmarks per club from the System Console > Test Settings tab. Set percentile values (20%, 40%, 60%, 80%, 100%) for each test and gender, then use 'Push Results to Scores' in the Center of Excellence to recalculate all player scores." },
    { q: "What is the Knowledge Bank?", a: "The Knowledge Bank contains position-specific training sessions, curriculum documents, and the position guide. It serves as the AI context for generating player feedback and development content. Upload curriculum PDFs to keep AI-generated feedback aligned with your club's philosophy." },
  ]},
  { key: "facility_calendar", label: "Facility & Calendar", color: "#E0567A", questions: [
    { q: "How does facility management work?", a: "Create facilities (e.g., complexes) and fields within them. Each field has a surface type, lighting, supported formats, and availability. Book fields for practices, games, or events — the system checks for conflicts and propagates bookings to team calendars." },
    { q: "Can I import a training schedule?", a: "Yes. Go to Facilities > Schedule Import and upload a CSV or paste your weekly schedule. The system parses the schedule, creates recurring calendar events, and assigns them to the correct fields and teams." },
    { q: "How does the team calendar work?", a: "The Team Calendar shows all practices, games, tournaments, and meetings for your teams. Switch between month, week, and agenda views. Players and parents can RSVP to events, and coaches can track attendance." },
    { q: "Can I sync with Google Calendar?", a: "Yes. Coaches and team managers can sync their team's events to their personal Google Calendar. Parents can also sync their child's schedule. The sync runs automatically once connected." },
  ]},
  { key: "communication_payments", label: "Communication & Payments", color: "#F59E0B", questions: [
    { q: "How does the Communication Portal work?", a: "The Communication Portal centralizes all club messaging. Compose emails to filtered recipient groups (by team, age group, branch, or role), manage an inbox of replies, and track conversations — all from one place." },
    { q: "Can I send notifications to parents and players?", a: "Yes. Use the Compose tab to send emails to any group of recipients. You can also configure notification preferences for each user so they receive the right alerts (event reminders, evaluation updates, payment confirmations)." },
    { q: "How do payments work?", a: "Club Rudder supports multiple payment processors (Stripe, Square, Payment Depot, Stax). Configure your processor in Payment Settings, then record payments against registrations. The system tracks payment status, sends reminders, and can sync to QuickBooks." },
    { q: "Can I connect QuickBooks?", a: "Yes. Go to Connections to link your QuickBooks Online account. Once connected, payments and expenses can be synced to QuickBooks for accounting. Each club can connect its own QuickBooks instance." },
  ]},
  { key: "security_privacy", label: "Security & Privacy", color: "#2ECC71", questions: [
    { q: "Is my club's data private and secure?", a: "Yes. Each club's data is isolated — players, teams, and all records are scoped to your club. Role-based access control ensures parents only see their own children, coaches only see their teams, and admins manage access for their club." },
    { q: "Who can see medical notes?", a: "Medical notes are permission-controlled. Only authorized roles (directors, coaches) can view medical information. Parents can add medical notes to their child's profile, and access is logged." },
    { q: "Can I export my club's data?", a: "Yes. Go to any data management page (Players, Teams, Programs) and use the CSV export button. You can also export registration data, payment ledgers, and custom reports." },
  ]},
];

/** The director FAQ on /why-clubrudder. */
export const WHY_FAQ = [
  {
    q: "What if we want to leave?",
    a: "Your data stays yours. You can export your players, families, teams, registrations and payment records as CSV at any time, with no request and no fee. Because families pay into your own Stripe account, your payment history and payouts also stay with you. If you cancel, you leave with your records and nothing is held back.",
  },
  {
    q: "We're a single-branch club. Is this overkill?",
    a: "No. A single branch is simply a club with one branch. You get registration, tryouts, payments, messaging and calendars from day one, and you only pay for the modules you turn on. If you open a second location later, you add a branch in a few clicks instead of switching systems.",
  },
  {
    q: "We already use TeamSnap, SportsEngine or Sprocket. Why switch?",
    a: "Those tools work well for single teams. Club Rudder is built for clubs with several branches that need one roster, one payment system and one view for the board. We migrate your data for you and a specialist checks every record before you go live.",
  },
  {
    q: "How long does setup take?",
    a: "Your data imports in a day, and most founding clubs are fully live in about 3 days. A specialist handles the migration, branch setup and branding with you.",
  },
  {
    q: "What about our brand and our families' experience?",
    a: "Your logo, your colors, your club name, applied across every screen. Parents see your club, not ours.",
  },
  {
    q: "What does it cost?",
    a: "Transparent per-player tiers matched to your club size, add-on modules priced individually, and discounts when you bundle.",
  },
];