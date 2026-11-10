import {
  TrendingUp, Shield, Trophy, Wallet, MapPin,
  Users, UserCircle, Target, Bell, FileCheck, LayoutDashboard,
  ClipboardList, MessageSquare, DollarSign, Map, Activity, HeartHandshake,
  Building2, BarChart3, Calendar, Video, Zap,
} from "lucide-react";

// Each role tour describes what a prospective client sees from that persona's seat.
// Trimmed to the six roles buyers identify with most.
export const ROLE_TOURS = [
  {
    key: "club_director",
    label: "Club Director",
    tagline: "The whole club at a glance",
    icon: TrendingUp,
    color: "#4f47e6",
    summary:
      "Owns club-wide strategy across every branch, team, and program. The CEO Dashboard surfaces revenue, roster health, and operational risk in one place.",
    modules: ["club_nexus", "payments", "kanban", "development", "facilities", "tournaments"],
    capabilities: [
      { icon: BarChart3, title: "CEO Dashboard", desc: "Revenue, enrollment, and roster health across all branches and platforms." },
      { icon: Building2, title: "Multi-Branch Oversight", desc: "Compare branch performance and drill into any program or team." },
      { icon: Wallet, title: "Budget & Revenue Tracking", desc: "Program budgets, expense approvals, and revenue by season." },
      { icon: Activity, title: "Player Development Health", desc: "E.P.I.C. evaluation coverage and development trends club-wide." },
    ],
  },
  {
    key: "club_admin",
    label: "Club Admin",
    tagline: "Runs the day-to-day machine",
    icon: Shield,
    color: "#2563EB",
    summary:
      "Keeps the platform humming — users, permissions, email templates, and scheduled reports. The operational backbone of the club.",
    modules: ["club_nexus", "communication", "payments", "branding"],
    capabilities: [
      { icon: Users, title: "User & Role Management", desc: "Invite staff, assign RBAC roles, and review access requests." },
      { icon: FileCheck, title: "RBAC Permissions", desc: "Granular module-level permissions per role, with a visual matrix." },
      { icon: MessageSquare, title: "Email Templates", desc: "Branded templates for registrations, reminders, and announcements." },
      { icon: Calendar, title: "Scheduled Reports", desc: "Automated weekly or monthly reports delivered to the right people." },
    ],
  },
  {
    key: "bookkeeper",
    label: "Bookkeeper",
    tagline: "Every dollar, tracked",
    icon: Wallet,
    color: "#059669",
    summary:
      "Manages the payments ledger, processor connections, and QuickBooks sync. Approves expenses and reconciles registration revenue.",
    modules: ["payments", "kanban"],
    capabilities: [
      { icon: DollarSign, title: "Payments Ledger", desc: "Every registration payment, expense, and staff pay in one ledger." },
      { icon: Wallet, title: "Processor Management", desc: "Connect Stripe, Square, or QuickBooks and test transactions." },
      { icon: FileCheck, title: "Expense Approvals", desc: "Approve or reject program expenses with full audit trail." },
      { icon: BarChart3, title: "Revenue Reporting", desc: "Revenue by program, branch, and season — exportable to QuickBooks." },
    ],
  },
  {
    key: "facility_director",
    label: "Facility Director",
    tagline: "Maximizes every field hour",
    icon: MapPin,
    color: "#0891B2",
    summary:
      "Manages facilities, fields, and the master schedule. Books recurring training slots, resolves conflicts, and tracks utilization.",
    modules: ["facilities", "tournaments", "communication"],
    capabilities: [
      { icon: Map, title: "Facility & Field Management", desc: "Every field, surface, format, and status — across all branches." },
      { icon: LayoutDashboard, title: "Master Schedule View", desc: "Calendar and field-grid views with drag-and-drop booking." },
      { icon: Zap, title: "Recurring Bookings", desc: "Weekly training slots fan out across the season automatically." },
      { icon: BarChart3, title: "Utilization Tracking", desc: "See which fields are over- or under-used by day and time." },
    ],
  },
  {
    key: "coach",
    label: "Coach",
    tagline: "Run the team, not the paperwork",
    icon: Users,
    color: "#059669",
    summary:
      "Sees their roster, schedule and RSVPs, writes player evaluations, and messages the team from one place.",
    modules: ["club_nexus", "communication", "development"],
    capabilities: [
      { icon: Calendar, title: "Team Calendar & RSVP", desc: "Practices and games with live RSVP counts." },
      { icon: Users, title: "Roster", desc: "Players, families and contact details for the team." },
      { icon: Target, title: "E.P.I.C. Evaluations", desc: "Evaluate players across technical, tactical, physical, and mental." },
      { icon: MessageSquare, title: "Team Messaging", desc: "Message the team and parents in one tap." },
    ],
  },
  {
    key: "parent",
    label: "Parent / Guardian",
    tagline: "One hub for the whole family",
    icon: HeartHandshake,
    color: "#DB2777",
    summary:
      "Registers their children, pays invoices, RSVPs to events, and follows development — all from a single family account.",
    modules: ["club_nexus", "communication", "development", "payments"],
    capabilities: [
      { icon: ClipboardList, title: "Registration & Tryouts", desc: "Register players for tryouts and programs with digital waivers." },
      { icon: Wallet, title: "Family Account", desc: "Invoices, payment plans, and history for every child in one place." },
      { icon: Calendar, title: "Team Calendar & RSVP", desc: "See upcoming practices and games, and RSVP in one tap." },
      { icon: TrendingUp, title: "Player Development", desc: "Read coach feedback, goals, and evaluation progress." },
    ],
  },
  {
    key: "player",
    label: "Player",
    tagline: "Owns their growth journey",
    icon: UserCircle,
    color: "#0B162B",
    summary:
      "Sees their team, schedule, evaluations, and development goals. A clean, motivating view of their own progress.",
    modules: ["development", "communication", "tournaments"],
    capabilities: [
      { icon: Calendar, title: "My Schedule", desc: "Practices, games, and team events with RSVP." },
      { icon: Target, title: "E.P.I.C. Evaluations", desc: "Coach evaluations across technical, tactical, physical, and mental." },
      { icon: Video, title: "Training Videos", desc: "Personalized video recommendations tied to development goals." },
      { icon: TrendingUp, title: "My Goals", desc: "Track development goals and progress over the season." },
    ],
  },
];

// Map module keys to the MODULES defined in moduleData.js for the "relevant modules" section.
export const MODULE_LABELS = {
  club_nexus: "Core Platform",
  communication: "Communication & Engagement",
  payments: "Storefront & Bookkeeping",
  kanban: "Kanban & Projects",
  development: "Player Development",
  facilities: "Facilities & Fields",
  tournaments: "Tournament Management",
  branding: "Website & Marketing",
};