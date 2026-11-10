import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Public: returns a single dues Offer + club info for the PayDues page.
// No auth required — the link is meant to be opened by players/families.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole;

    const body = await req.json().catch(() => ({}));
    const { offer_id } = body;

    if (!offer_id) return Response.json({ error: 'Missing offer_id' }, { status: 400 });

    const offer = await svc.entities.Offer.get(offer_id).catch(() => null);
    if (!offer || offer.type !== 'dues' || offer.status !== 'active') {
      return Response.json({ error: 'Dues link not found or inactive' }, { status: 404 });
    }

    const club = await svc.entities.Club.get(offer.club_id).catch(() => null);
    if (!club) return Response.json({ error: 'Club not found' }, { status: 404 });

    return Response.json({
      offer: {
        id: offer.id,
        name: offer.name,
        description: offer.description,
        config: offer.config,
      },
      club: {
        name: club.name,
        logo_url: club.logo_url,
        slug: club.slug,
      },
    });
  } catch (error) {
    console.error('get-dues-offer error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}