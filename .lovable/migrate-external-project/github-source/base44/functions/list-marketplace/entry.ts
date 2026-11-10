import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Public: lists a club's marketplace offerings — events, spiritwear, and
// subscriptions. Resolves the club by slug (from the subdomain) so anonymous
// visitors get the right club. Returns sanitized projections only.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole;
    const payload = await req.json().catch(() => ({}));
    const clubSlug = payload.club_slug || payload.club;

    if (!clubSlug) return Response.json({ error: 'Missing club_slug' }, { status: 400 });
    const clubs = await svc.entities.Club.filter({ slug: clubSlug });
    const club = clubs?.[0];
    if (!club) return Response.json({ error: 'Club not found' }, { status: 404 });

    // --- Events (marketplace-enabled, public, open) ---
    const allEvents = await svc.entities.ClubEvent.filter({ club_id: club.id, marketplace_enabled: true }, 'start_date', 200);
    const today = new Date().toISOString().split('T')[0];
    const marketEvents = (allEvents || []).filter((e) =>
      (e.status === 'open' || e.status === 'full') &&
      e.is_public !== false &&
      (!e.registration_closes || today <= e.registration_closes) &&
      (!e.registration_opens || today >= e.registration_opens)
    );

    // Fetch occurrences for recurring/multi-day events
    const eventsWithDates = await Promise.all(marketEvents.map(async (e) => {
      if (e.schedule_type === 'single' || !e.scheduling_event_id) {
        return {
          ...e,
          available_dates: [e.start_date].filter(Boolean),
        };
      }
      const occurrences = await svc.entities.EventOccurrence.filter({
        event_id: e.scheduling_event_id,
        status: 'scheduled',
      }, 'occurrence_date', 200).catch(() => []);
      const upcoming = (occurrences || [])
        .filter((o) => o.occurrence_date >= today)
        .map((o) => o.occurrence_date);
      return {
        id: e.id,
        name: e.name,
        type: e.type,
        description: e.description,
        start_date: e.start_date,
        end_date: e.end_date,
        start_time: e.start_time,
        end_time: e.end_time,
        location: e.location,
        price: e.price,
        capacity: e.capacity,
        registered_count: e.registered_count,
        status: e.status,
        allow_waitlist: e.allow_waitlist,
        image_url: e.image_url,
        schedule_type: e.schedule_type,
        series_price: e.series_price || 0,
        bulk_price: e.bulk_price || 0,
        available_dates: upcoming.length > 0 ? upcoming : [e.start_date].filter(Boolean),
      };
    }));

    // --- Spiritwear ---
    const spiritwear = await svc.entities.SpiritwearProduct.filter({ club_id: club.id, status: 'active' }, 'sort_order', 200);
    const spiritwearPublic = (spiritwear || []).map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      image_url: p.image_url,
      category: p.category,
      base_price: p.base_price,
      variants: (p.variants || []).map((v) => ({
        size: v.size,
        color: v.color,
        sku: v.sku,
        price: v.price || p.base_price,
        in_stock: (v.stock || 0) > 0,
      })),
    }));

    // --- Subscriptions ---
    const subscriptions = await svc.entities.ClubSubscription.filter({ club_id: club.id, status: 'active' }, 'sort_order', 200);
    const subscriptionsPublic = (subscriptions || []).map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      image_url: s.image_url,
      price: s.price,
      billing_interval: s.billing_interval,
    }));

    return Response.json({
      club: { id: club.id, name: club.name, logo_url: club.logo_url, primary_color: club.primary_color },
      events: eventsWithDates,
      spiritwear: spiritwearPublic,
      subscriptions: subscriptionsPublic,
    });
  } catch (error) {
    console.error('list-marketplace error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}