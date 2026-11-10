// @ts-nocheck
import { createClientFromRequest } from '@/legacy-functions/_sdk';

// Public: lists a club's active Offers (unified catalog — dues, events,
// spiritwear). Resolves the club by slug so anonymous visitors get the
// right club. Enriches event offers with dates/capacity from the linked
// ClubEvent. Returns sanitized projections only (no stock counts leaked
// for spiritwear — just in-stock boolean).
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole;
    const payload = await req.json().catch(() => ({}));
    const clubSlug = payload.club_slug || payload.club;
    const clubId = payload.club_id;

    if (!clubSlug && !clubId) return Response.json({ error: 'Missing club_slug or club_id' }, { status: 400 });

    let club: any = null;
    if (clubId) {
      club = await svc.entities.Club.get(clubId).catch(() => null);
    } else {
      const clubs = await svc.entities.Club.filter({ slug: clubSlug });
      club = clubs?.[0];
    }
    if (!club) return Response.json({ error: 'Club not found' }, { status: 404 });

    const allOffers = await svc.entities.Offer.filter(
      { club_id: club.id, status: 'active' },
      'sort_order',
      200,
    );
    // Dues are never shown in the public marketplace — they are linked to
    // team pages and only accessible to parents/families assigned to that team.
    const offers = (allOffers || []).filter((o) => o.type !== 'dues');

    const today = new Date().toISOString().split('T')[0];

    // Enrich event offers with dates from the linked ClubEvent
    const enriched = await Promise.all((offers || []).map(async (offer) => {
      if (offer.type === 'event' && offer.config?.club_event_id) {
        const ev = await svc.entities.ClubEvent.get(offer.config.club_event_id).catch(() => null);
        if (ev) {
          let available_dates: string[] = [ev.start_date].filter(Boolean);
          if (ev.scheduling_event_id) {
            const occs = await svc.entities.EventOccurrence.filter(
              { event_id: ev.scheduling_event_id, status: 'scheduled' },
              'occurrence_date',
              500,
            ).catch(() => []);
            const upcoming = (occs || [])
              .filter((o) => o.occurrence_date >= today)
              .map((o) => o.occurrence_date);
            if (upcoming.length > 0) available_dates = upcoming;
          }

          const spotsLeft = (ev.capacity || 0) - (ev.registered_count || 0);

          return {
            ...offer,
            config: {
              ...offer.config,
              event_name: ev.name,
              event_type: ev.type,
              start_date: ev.start_date,
              end_date: ev.end_date,
              start_time: ev.start_time,
              end_time: ev.end_time,
              location: ev.location,
              schedule_type: ev.schedule_type,
              capacity: ev.capacity,
              registered_count: ev.registered_count,
              spots_left: spotsLeft,
              available_dates,
            },
          };
        }
      }

      // Sanitize spiritwear: don't leak exact stock counts, just in_stock
      if (offer.type === 'spiritwear' && offer.config?.variants) {
        return {
          ...offer,
          config: {
            ...offer.config,
            variants: offer.config.variants.map((v) => ({
              ...v,
              in_stock: (v.stock || 0) > 0,
              stock: undefined,
            })),
          },
        };
      }

      return offer;
    }));

    return Response.json({
      club: { id: club.id, name: club.name, logo_url: club.logo_url, primary_color: club.primary_color },
      offers: enriched,
    });
  } catch (error) {
    console.error('list-offers error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}