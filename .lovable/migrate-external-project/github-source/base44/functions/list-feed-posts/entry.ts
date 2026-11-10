import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// list-feed-posts — public endpoint for the Social Feed page.
// Returns published club_feed posts for a club, optionally filtered by branch.
// Resolves the club from a subdomain or club_id query param.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const url = new URL(req.url);
    const club_id = url.searchParams.get('club_id') || '';
    const subdomain = url.searchParams.get('subdomain') || '';
    const branch_id = url.searchParams.get('branch_id') || '';

    const db = base44.asServiceRole.entities;

    let club: any = null;
    if (club_id) {
      try { club = await db.Club.get(club_id); } catch {}
    } else if (subdomain) {
      const page = await db.Club.filter({ subdomain }, { limit: 1 });
      club = page?.items?.[0] || null;
    }
    if (!club) return Response.json({ error: 'Club not found' }, { status: 404 });

    const query: any = { club_id: club.id, platform: 'club_feed', status: 'published' };
    if (branch_id) query.branch_id = branch_id;

    const postPage = await db.Post.filter(query, { sort: '-published_at', limit: 50, fields: ['title', 'body', 'media_urls', 'hashtags', 'event_title', 'event_type', 'published_at', 'branch_id', 'source_type', 'source_id'] });
    const posts = (postPage.items || []).map((p: any) => ({
      id: p.id, title: p.title, body: p.body, media_urls: p.media_urls || [],
      hashtags: p.hashtags || [], event_title: p.event_title, event_type: p.event_type,
      published_at: p.published_at, branch_id: p.branch_id,
    }));

    // Return branch list for the filter dropdown
    let branches: any[] = [];
    try {
      const locPage = await db.Location.filter({ club_id: club.id }, { limit: 50, fields: ['name'] });
      branches = (locPage.items || []).map((l: any) => ({ id: l.id, name: l.name }));
    } catch {}

    return Response.json({
      club: { id: club.id, name: club.name, logo_url: club.logo_url || '', primary_color: club.primary_color || '' },
      branches,
      posts,
    });
  } catch (error) {
    console.error('list-feed-posts error', error?.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}