import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { asList, isCompliant, REQUIREMENTS } from "@/lib/compliance";

// Loads active-season compliance records for the club and returns a lookup by coach email.
export default function useCoachCompliance(clubId) {
  return useQuery({
    queryKey: ["coachCompliance", clubId],
    enabled: !!clubId,
    queryFn: async () => {
      const seasons = await base44.entities.Season.filter({ club_id: clubId, status: "active" }, { limit: 1 });
      const season = asList(seasons)[0];
      if (!season) return { byEmail: {}, season: null };
      const recs = await base44.entities.ComplianceRecord.filter({ club_id: clubId, season_id: season.id }, { limit: 5000 });
      const records = asList(recs);
      const byEmail = {};
      for (const r of records) {
        const key = (r.coach_email || "").toLowerCase();
        if (!byEmail[key]) byEmail[key] = {};
        byEmail[key][r.requirement_type] = r;
      }
      return { byEmail, season };
    },
  });
}

// Returns "compliant" | "flagged" | "pending" | "incomplete" for a set of coach emails.
export function coachStatus(emails, byEmail) {
  if (!emails?.length) return "unassigned";
  let worst = "compliant";
  for (const email of emails) {
    const recs = byEmail[(email || "").toLowerCase()] || {};
    for (const req of REQUIREMENTS) {
      const r = recs[req];
      if (!r || r.status === "missing") { if (worst !== "flagged") worst = "incomplete"; continue; }
      if (r.status === "flagged") return "flagged";
      if (r.status === "pending") { if (worst === "compliant") worst = "pending"; }
      else if (r.status === "expired") { if (worst !== "flagged") worst = "incomplete"; }
    }
  }
  return worst;
}