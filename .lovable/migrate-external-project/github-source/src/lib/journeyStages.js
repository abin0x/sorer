// Shared pipeline stage list for the client journey (status sheet, prospect
// dashboard, and admin board). Keep in sync with base44/entities/ClientJourney.jsonc.
export const JOURNEY_STAGES = [
  { key: "lead", label: "Lead" },
  { key: "demo_booked", label: "Demo Booked" },
  { key: "demo_held", label: "Demo Held" },
  { key: "trial_active", label: "Trial Active" },
  { key: "agreement_signed", label: "Agreement Signed" },
  { key: "paid", label: "Paid" },
  { key: "migrating", label: "Migrating" },
  { key: "live", label: "Live" },
  { key: "active", label: "Active" },
  { key: "renewal_due", label: "Renewal Due" },
];

export const stageIndex = (key) => JOURNEY_STAGES.findIndex((s) => s.key === key);