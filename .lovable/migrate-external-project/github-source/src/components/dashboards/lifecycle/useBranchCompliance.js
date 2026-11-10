import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useTenant } from "@/lib/TenantContext";
import { asList, REQUIREMENTS } from "@/lib/compliance";

// Per-branch compliance summary for the Branch Health Dashboard.
export default function useBranchCompliance() {
  const { effectiveClubId } = useTenant();
  return useQuery({
    queryKey: ["branchCompliance", effectiveClubId],
    enabled: !!effectiveClubId,
    queryFn: async () => {
      const [seasons, coachesRes, recsRes] = await Promise.all([
        base44.entities.Season.filter({ club_id: effectiveClubId, status: "active" }, { limit: 1 }),
        base44.entities.Coach.filter({ club_id: effectiveClubId, status: "active" }, { limit: 1000 }),
      ]);
      const season = asList(seasons)[0];
      const coaches = asList(coachesRes);
      const records = season ? asList(await base44.entities.ComplianceRecord.filter({ club_id: effectiveClubId, season_id: season.id }, { limit: 5000 })) : [];
      const recFor = (email, req) => records.find((r) => r.coach_email?.toLowerCase() === email.toLowerCase() && r.requirement_type === req);
      const isOk = (email) => REQUIREMENTS.every((req) => { const r = recFor(email, req); return r && ["approved", "expiring_soon"].includes(r.status); });
      const byBranch = {};
      for (const c of coaches) {
        const bid = c.location_id || "_unassigned";
        if (!byBranch[bid]) byBranch[bid] = { total: 0, compliant: 0 };
        byBranch[bid].total++;
        if (isOk(c.email)) byBranch[bid].compliant++;
      }
      return { byBranch, hasSeason: !!season };
    },
  });
}