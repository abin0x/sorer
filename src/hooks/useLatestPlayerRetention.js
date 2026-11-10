import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/lib/TenantContext';
import { latestRetentionByPlayer } from '@/lib/playerRetention';

/** Staff-only, club-wide view of each player's most recent retention review
 *  (any season). Players and guardians get `allowed: false` and no rows. */
export function useLatestPlayerRetention() {
  const { effectiveClubId: clubId } = useTenant();
  const query = useQuery({
    queryKey: ['playerRetentionLatest', clubId],
    enabled: !!clubId,
    queryFn: async () => {
      const permission = await supabase.rpc('can_review_club_players', { _club: clubId });
      if (permission.error || permission.data !== true) return { allowed: false, map: {} };
      const [reviews, coaches] = await Promise.all([
        supabase.from('player_season_reviews').select('*').eq('club_id', clubId).limit(1000),
        supabase.from('player_coach_reviews').select('*').eq('club_id', clubId).limit(1000),
      ]);
      if (reviews.error || coaches.error) throw reviews.error || coaches.error;
      return { allowed: true, map: latestRetentionByPlayer(reviews.data || [], coaches.data || [], clubId) };
    },
  });
  const allowed = query.data?.allowed === true;
  return { ...query, allowed, latestFor: (playerId) => (allowed && playerId ? query.data.map[playerId] || null : null) };
}
