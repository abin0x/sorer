/**
 * Platform module catalog — the feature areas a subscription plan can toggle on/off.
 * Used by the plan editor (ConfigTab) and could be enforced at runtime via PluginGate.
 */
export const PLATFORM_MODULES = [
  { key: "kanban", label: "Kanban & Programs", description: "Project board, programs, tasks, and roadmap" },
  { key: "recruiting", label: "Player Recruitment", description: "Inquiries, tryouts, evaluations, and offers" },
  { key: "player_development", label: "Player Development", description: "Center of Excellence, skill tests, and assessments" },
  { key: "facility_management", label: "Facility Management", description: "Facilities, fields, bookings, and scheduling" },
  { key: "calendar", label: "Team Calendar", description: "Events, practices, games, and RSVPs" },
  { key: "communication", label: "Communication", description: "Messaging, notifications, and email" },
  { key: "payments", label: "Payments & Billing", description: "Payment processing, ledger, and QuickBooks sync" },
  { key: "branding", label: "Branding & Marketing", description: "Automated social campaigns and club website" },
  { key: "analytics", label: "Analytics & Reports", description: "Dashboards, reports, and scheduled reports" },
];