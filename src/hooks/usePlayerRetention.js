import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/lib/TenantContext';
import { scopedPlayerReview } from '@/lib/playerRetention';

export function usePlayerRetention(season) {
  const { effectiveClubId: clubId } = useTenant();
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['playerRetention', clubId, season], enabled: !!clubId && !!season,
    queryFn: async () => {
      const [reviews, coaches, permission, manager] = await Promise.all([
        supabase.from('player_season_reviews').select('*').eq('club_id', clubId).eq('season', season).limit(1000),
        supabase.from('player_coach_reviews').select('*').eq('club_id', clubId).eq('season', season).limit(1000),
        supabase.rpc('can_review_club_players', { _club: clubId }),
        supabase.rpc('is_club_manager', { _club_id: clubId }),
      ]);
      if (reviews.error || coaches.error || permission.error || manager.error) throw reviews.error || coaches.error || permission.error || manager.error;
      return { reviews: reviews.data || [], coaches: coaches.data || [], allowed: permission.data === true, manager: manager.data === true };
    },
  });
  return { ...query, clubId, season, reviews: query.data?.reviews || [], coaches: query.data?.coaches || [], allowed: query.data?.allowed === true, manager: query.data?.manager === true,
    reviewFor: (playerId) => scopedPlayerReview(query.data?.reviews || [], clubId, season, playerId),
    refresh: () => qc.invalidateQueries({ queryKey: ['playerRetention', clubId, season] }),
  };
}