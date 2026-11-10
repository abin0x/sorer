export const ANCHOR_CHIPS = [
  { label: "Included in every plan", href: "#core" },
  { label: "Money", href: "#money" },
  { label: "Player development", href: "#development" },
  { label: "Fields", href: "#facilities" },
  { label: "Tournaments", href: "#events" },
  { label: "Website & marketing", href: "#growth" },
  { label: "Operations", href: "#ops" },
];

export const CORE_CARDS = [
  {
    title: "Registration & tryouts",
    job: "Open registration, run tryouts and place players without rebuilding lists in a spreadsheet.",
    bullets: [
      "Age eligibility rules, waitlists, capacity limits and digital waivers",
      "Tryout pipeline from registration to attendance, offer and acceptance",
      "Team placement with financial-aid and eligibility review",
      "One linked family profile across players, guardians and seasons",
    ],
    shot: "[Screenshot: tryout pipeline by branch and age group]",
  },
  {
    title: "Messaging, calendars & dues",
    job: "Reach the right people, keep every schedule in sync and collect club dues.",
    bullets: [
      "Message the whole club, a branch, a program or a single team",
      "Club, team, coach and family calendars from one canonical event",
      "Automatic schedule-change alerts and payment reminders",
      "Club dues payments to your own Stripe account",
    ],
    shot: "[Screenshot: family calendar and message composer]",
  },
];

export const MODULE_CARDS = [
  {
    id: "money",
    title: "Storefront & Bookkeeping",
    price: "$399/yr",
    job: "Stop re-entering transactions in two systems and chasing receipts months later.",
    bullets: [
      "Marketplace, events and spiritwear store",
      "Staff expense reports with receipts and approvals",
      "Two-way QuickBooks Online sync with categories and classes applied",
      "Invoicing and audit-ready books across branches",
    ],
    shot: "[Screenshot: expense approval with QuickBooks sync status]",
  },
  {
    id: "development",
    title: "Player Development & Support",
    price: "$399/yr",
    job: "Give families real feedback and give coaches a record that follows the player.",
    bullets: [
      "E.P.I.C. evaluations connected to measurable goals",
      "Video, training plans and attendance history on the player profile",
      "Skill tests, benchmarks and physical assessments",
      "Player support cases with restricted, role-based access",
    ],
    shot: "[Screenshot: player profile with evaluation history]",
  },
  {
    id: "facilities",
    title: "Facilities & Field Management",
    price: "$199/yr",
    job: "Never double-book a field, even when branches share one.",
    bullets: [
      "Every field, surface, format and status across all branches",
      "Calendar and field-grid views with drag-and-drop booking",
      "Conflict detection and recurring weekly slots across the season",
      "Utilization analytics and booking alerts",
    ],
    shot: "[Screenshot: field grid with a booking conflict]",
  },
  {
    id: "events",
    title: "Tournament Management",
    price: "$299/yr",
    job: "Run game day from registration to final standings.",
    bullets: [
      "Registration, brackets, divisions and standings",
      "Referee assignments, availability and payment requests",
      "Auto-created game-day tasks for referees, trainers and setup",
      "Field assignment with conflict-free scheduling",
    ],
    shot: "[Screenshot: tournament bracket and division standings]",
  },
  {
    id: "growth",
    title: "Website & Marketing",
    price: "$299/yr",
    job: "A professional public presence managed from the same platform.",
    bullets: [
      "Branded club website built in",
      "Automated social campaigns",
      "Email templates and lead-capture pages",
      "Marketing analytics in one dashboard",
    ],
    shot: "[Screenshot: marketing analytics dashboard]",
  },
  {
    id: "ops",
    title: "Kanban & Project Management",
    price: "$299/yr",
    job: "Know who owns what before the season starts.",
    bullets: [
      "Drag-and-drop boards with RACI staff assignments",
      "Dependencies, timelines and roadmaps across branches",
      "Recurring tasks linked to real platform records",
      "AI task breakdown and budget forecasting",
    ],
    shot: "[Screenshot: season setup board across branches]",
  },
];

export const SEATS = [
  { title: "Club Director", text: "Revenue, enrollment and roster health across every branch." },
  { title: "Club Admin", text: "Registration, rosters, staff and season setup." },
  { title: "Bookkeeper", text: "Expenses, invoices and QuickBooks sync in one ledger." },
  { title: "Facility Director", text: "Field availability, bookings and utilization." },
  { title: "Coach", text: "Rosters, sessions and player evaluations in seconds." },
  { title: "Parent & Player", text: "Calendar, messages, payments and development feedback." },
];