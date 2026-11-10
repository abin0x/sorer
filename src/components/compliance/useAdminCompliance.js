import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { asList } from "@/lib/compliance";

// Loads everything the admin compliance views need, scoped to the branches the user may see.
// Optimized: uses fields to reduce payload, falls back to is_current if no status:active season.
export default function useAdminCompliance(user) {
  return useQuery({
    queryKey: ["adminCompliance", user?.club_id, user?.email],
    enabled: !!user?.club_id,
    queryFn: async () => {
      const clubId = user.club_id;
      const [seasons, settings, coachRes, locRes] = await Promise.all([
        base44.entities.Season.filter({ club_id: clubId, status: "active" }, { limit: 1 }).catch(() => []),
        base44.entities.ComplianceSettings.filter({ club_id: clubId }, { limit: 1 }).catch(() => []),
        base44.entities.Coach.filter({ club_id: clubId, status: "active" }, { limit: 1000 }).catch(() => []),
        base44.entities.Location.filter({ club_id: clubId }, { limit: 200 }).catch(() => []),
      ]);
      let season = asList(seasons)[0];
      // Fallback: if no status:active season, try is_current: true
      if (!season) {
        const cur = await base44.entities.Season.filter({ club_id: clubId, is_current: true }, { limit: 1, fields: ["id", "name"] }).catch(() => []);
        season = asList(cur)[0];
      }
      const recRes = season ? await base44.entities.ComplianceRecord.filter({ club_id: clubId, season_id: season.id }, { limit: 5000 }) : [];
      let branches = asList(locRes);
      let coaches = asList(coachRes);
      let records = asList(recRes);
      if (user.custom_role === "branch_director") {
        const mine = new Set(branches.filter((b) => b.branch_director_email?.toLowerCase() === user.email.toLowerCase()).map((b) => b.id));
        branches = branches.filter((b) => mine.has(b.id));
        coaches = coaches.filter((c) => mine.has(c.location_id));
        records = records.filter((r) => mine.has(r.branch_id));
      }
      return { season, settings: asList(settings)[0], branches, coaches, records };
    },
    retry: 1,
    staleTime: 30000,
  });
}