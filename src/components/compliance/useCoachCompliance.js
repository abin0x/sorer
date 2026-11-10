import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { asList } from "@/lib/compliance";
export { coachStatus } from "@/lib/compliance";

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
