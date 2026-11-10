import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * Returns whether the given club already has teams or players in the database.
 *
 * Used to decide:
 *  - Whether the Club Setup Wizard is still required (it isn't, once data exists).
 *  - Whether migration should be gated behind system-owner approval.
 *
 * hasData is `undefined` while loading, then `true`/`false` once resolved, so
 * callers can distinguish "not yet checked" from "confirmed empty".
 */
export function useClubDataExists(clubId) {
  const { data, isLoading } = useQuery({
    queryKey: ["clubDataExists", clubId],
    queryFn: async () => {
      if (!clubId) return { teams: false, players: false };
      const [teams, players] = await Promise.all([
        base44.entities.Team.filter({ club_id: clubId }, "-created_date", 1).catch(() => []),
        base44.entities.Player.filter({ club_id: clubId }, "-created_date", 1).catch(() => []),
      ]);
      return { teams: teams.length > 0, players: players.length > 0 };
    },
    enabled: !!clubId,
    staleTime: 30 * 1000,
  });
  const hasData = data ? !!(data.teams || data.players) : undefined;
  return { hasData, loading: isLoading };
}