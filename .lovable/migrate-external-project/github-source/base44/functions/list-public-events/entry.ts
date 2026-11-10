import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { getStripeSecretKey } from '../../shared/clubCredentials.ts';
import { validatePromoCode, incrementPromoUsage } from '../../shared/promoCodes.ts';

// Public: lists a club's open, public events for the signup page. Resolves the
// club by slug (from the subdomain) so anonymous visitors get the right club.
// Returns a sanitized projection (no internal notes).
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

    const events = await svc.entities.ClubEvent.filter({ club_id: club.id, is_public: true }, 'start_date', 200);
    const today = new Date().toISOString().split('T')[0];
    const open = (events || []).filter((e) =>
      e.status === 'open' || e.status === 'full'
    ).filter((e) => !e.registration_closes || today <= e.registration_closes);

    return Response.json({
      club: { id: club.id, name: club.name, logo_url: club.logo_url, primary_color: club.primary_color },
      events: open.map((e) => ({
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
        waitlist_count: e.waitlist_count,
        status: e.status,
        allow_waitlist: e.allow_waitlist,
        image_url: e.image_url,
      })),
    });
  } catch (error) {
    console.error('list-public-events error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}