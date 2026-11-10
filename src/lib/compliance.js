export const BODIES = [
  { key: "us_soccer", label: "US Soccer" },
  { key: "girls_academy_league", label: "Girls Academy League" },
  { key: "mls_next", label: "MLS Next" },
  { key: "gotsports", label: "GotSport (US Club Soccer)" },
  { key: "us_youth_soccer", label: "US Youth Soccer" },
  { key: "us_club_soccer", label: "US Club Soccer" },
  { key: "michigan_youth_soccer", label: "Michigan Youth Soccer (MSYSA)" },
];

export const REQUIREMENTS = [
  { key: "background_check", label: "Background Check" },
  { key: "safesport_certification", label: "SafeSport Certification" },
];
export const reqLabel = (k) => REQUIREMENTS.find((r) => r.key === k)?.label || k;
export const bodyLabel = (k) => BODIES.find((b) => b.key === k)?.label || k;

export const STATUS_META = {
  missing: { label: "Missing", cls: "bg-red-100 text-red-700" },
  pending: { label: "Pending Review", cls: "bg-amber-100 text-amber-700" },
  approved: { label: "Approved", cls: "bg-emerald-100 text-emerald-700" },
  flagged: { label: "Action Required", cls: "bg-orange-100 text-orange-700" },
  expired: { label: "Expired", cls: "bg-red-100 text-red-700" },
  expiring_soon: { label: "Expiring Soon", cls: "bg-yellow-100 text-yellow-800" },
};

export const FLAG_REASONS = ["Certificate expired", "Name mismatch", "Illegible upload", "Wrong course completed", "Other"];

const ADMIN_ROLES = ["club_admin", "club_director", "branch_director", "master_admin", "admin"];
export const isComplianceAdmin = (user) => ADMIN_ROLES.includes(user?.custom_role) || user?.role === "admin";

export const isCompliant = (rec) => rec && ["approved", "expiring_soon"].includes(rec.status);

// Missing/loading records must never imply that an assigned coach is compliant.
export function coachStatus(emails, byEmail) {
  if (!emails?.length) return "unassigned";
  let worst = "compliant";
  for (const email of emails) {
    const recs = byEmail?.[(email || "").toLowerCase()] || {};
    for (const { key } of REQUIREMENTS) {
      const r = recs[key];
      if (!r || r.status === "missing") { worst = "incomplete"; continue; }
      if (r.status === "flagged") return "flagged";
      if (r.status === "pending") { if (worst === "compliant") worst = "pending"; }
      else if (!isCompliant(r)) worst = "incomplete";
    }
  }
  return worst;
}

export const fmtDate = (d) => (d ? new Date(d.slice(0, 10) + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—");

export const asList = (r) => (Array.isArray(r) ? r : r?.items || []);