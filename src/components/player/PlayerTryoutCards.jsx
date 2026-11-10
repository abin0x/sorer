import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useTenant } from '@/lib/TenantContext';
import { playerTryoutCards } from '@/lib/playerTryoutCards';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, ClipboardCheck } from 'lucide-react';
import { format } from 'date-fns';
import { useLatestPlayerRetention } from '@/hooks/useLatestPlayerRetention';
import { RetentionBadges } from '@/components/tryout/PlayerRetentionReview';

export default function PlayerTryoutCards({ playerId, clubId }) {
  const { effectiveClubId } = useTenant();
  // Staff-only: players and guardians never receive review rows, so nothing renders for them.
  const retention = useLatestPlayerRetention();
  const review = retention.allowed ? retention.latestFor(playerId) : null;
  const query = useQuery({
    queryKey: ['player-tryout-cards', effectiveClubId, playerId],
    enabled: !!playerId && !!clubId && clubId === effectiveClubId,
    queryFn: async () => {
      const registrations = await base44.entities.TryoutRegistration.filter({ club_id: clubId, player_id: playerId }, '-registered_date', 100);
      const eventIds = [...new Set(registrations.map(r => r.tryout_event_id).filter(Boolean))];
      const events = eventIds.length ? await base44.entities.TryoutEvent.filter({ club_id: clubId, id: { $in: eventIds } }) : [];
      const planIds = [...new Set([...events.map(e=>e.tryout_plan_id), ...registrations.map(r=>r.tryout_plan_id)].filter(Boolean))];
      const plans = planIds.length ? await base44.entities.TryoutPlan.filter({ club_id: clubId, id: { $in: planIds } }) : [];
      return playerTryoutCards(registrations, events, plans, playerId, clubId);
    },
  });
  if (!clubId || clubId !== effectiveClubId) return null;
  if (query.isLoading) return <p className="py-4 text-sm text-muted-foreground">Loading tryout cards…</p>;
  if (query.isError) return <div role="alert"><p className="text-sm text-destructive">Could not load tryout cards.</p><Button variant="outline" onClick={() => query.refetch()}>Try again</Button></div>;
  if (!query.data?.length) return <p className="py-4 text-sm text-muted-foreground">No tryout registrations yet.</p>;
  return <div className="grid gap-3 sm:grid-cols-2">{query.data.map(card=><article key={card.id} className="rounded-lg border border-border bg-card p-4 space-y-3">
    <div className="flex items-start justify-between gap-2"><ClipboardCheck className="size-5 text-primary shrink-0" /><Badge variant="secondary">{card.checkedIn ? 'Checked in' : 'Registered'}</Badge></div>
    <div><h3 className="font-semibold text-foreground">{card.title}</h3><p className="text-sm text-muted-foreground">{card.season} · {card.name}</p></div>
    {card.bib && <p className="text-2xl font-bold text-primary">#{card.bib}<span className="ml-2 text-xs font-normal text-muted-foreground">Tryout bib</span></p>}
    {card.date && <p className="flex items-start gap-2 text-sm"><Calendar className="size-4 shrink-0 mt-0.5" />{format(new Date(`${card.date}T12:00:00`), 'EEE, MMM d, yyyy')} · {card.start}–{card.end}</p>}
    {card.location && <p className="flex items-start gap-2 text-sm text-muted-foreground"><MapPin className="size-4 shrink-0 mt-0.5" />{card.location}</p>}
    {retention.allowed && <div className="border-t border-border pt-3"><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Staff only · Status, team role & recommendation</p>{review ? <RetentionBadges review={review.review} coaches={review.coaches} /> : <p className="text-xs text-muted-foreground mt-1">Not reviewed yet.</p>}</div>}
  </article>)}</div>;
}