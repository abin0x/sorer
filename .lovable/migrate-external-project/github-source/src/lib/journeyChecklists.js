// Static checklist content for the trial, migration, setup, and onboarding
// stages of the client journey. Completion state is stored per-item on the
// ClientJourney record (checklist_trial / checklist_migration / checklist_setup / checklist_onboarding).
export const TRIAL_CHECKLIST = [
  { key: "connect_payments", label: "Connect payments in test mode" },
  { key: "create_fee", label: "Create a fee" },
  { key: "create_event", label: "Create an event" },
  { key: "invite_coach", label: "Invite a coach" },
  { key: "preview_family_app", label: "Preview the family app" },
];

export const MIGRATION_CHECKLIST = [
  { key: "export_data", label: "Export data from your current platform" },
  { key: "upload_files", label: "Upload member, team, event and payment files" },
  { key: "staged", label: "Staging import completed" },
  { key: "verified", label: "Specialist verification complete" },
  { key: "club_approved", label: "You approved the discrepancy report" },
  { key: "cutover", label: "Cutover date confirmed" },
];

export const SETUP_CHECKLIST = [
  { key: "payments", label: "Connect payments (and QuickBooks if included)" },
  { key: "branches_staff", label: "Create branches and invite staff" },
  { key: "fees", label: "Create fee templates and dues plans" },
  { key: "teams_events", label: "Set up teams, rosters and this season's events" },
  { key: "branding", label: "Add branding and messaging defaults" },
  { key: "test_payment", label: "Run a test registration and test payment" },
];

export const ONBOARDING_CHECKLIST = [
  { key: "staff_training", label: "Staff attend training" },
  { key: "family_announcement", label: "Send the family announcement email" },
  { key: "first_registration", label: "First registration completed" },
  { key: "first_payment", label: "First payment completed" },
  { key: "first_message", label: "First message sent" },
  { key: "first_event", label: "First event created" },
  { key: "day7_checkin", label: "Day 7 check-in" },
  { key: "day30_checkin", label: "Day 30 check-in" },
];