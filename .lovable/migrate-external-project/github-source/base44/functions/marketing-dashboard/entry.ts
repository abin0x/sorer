import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// marketing-dashboard — aggregated dashboard data for the Marketing tab.
// Returns upcoming posts, events/tryouts without campaigns, under-filled
// sessions, account health, failed posts, and per-post clicks + registrations
// by UTM source. Scoped by club_id and optional branch_id.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { club_id, branch_id } = body;
    if (!club_id) return Response.json({ error: 'club_id required' }, { status: 400 });

    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && !user.system_role && user.data?.club_id !== club_id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = base44.asServiceRole.entities;
    const now = new Date().toISOString();
    const today = now.slice(0, 10);

    const postQ: any = { club_id, ...(branch_id ? { branch_id } : {}) };
    const eventQ: any = { club_id, ...(branch_id ? { location_id: branch_id } : {}) };

    const [upcoming, failed, published, campaigns, clubEvents, tryoutEvents, accounts] = await Promise.all([
      db.Post.filter({ ...postQ, status: { $in: ['approved', 'scheduled'] }, scheduled_for: { $gte: now } }, { sort: 'scheduled_for', limit: 20, fields: ['title', 'platform', 'scheduled_for', 'event_title', 'campaign_id', 'status'] }),
      db.Post.filter({ ...postQ, status: 'failed' }, { sort: '-created_date', limit: 20, fields: ['title', 'platform', 'failure_reason', 'attempts', 'event_title', 'created_date'] }),
      db.Post.filter({ ...postQ, status: 'published' }, { sort: '-published_at', limit: 30, fields: ['title', 'platform', 'metrics', 'utm_link', 'campaign_id', 'published_at', 'event_title'] }),
      db.Campaign.filter({ club_id }, { limit: 100, fields: ['source_id', 'source_type', 'name', 'utm_campaign', 'status'] }),
      db.ClubEvent.filter({ ...eventQ, status: 'open', start_date: { $gte: today } }, { sort: 'start_date', limit: 50, fields: ['name', 'type', 'start_date', 'capacity', 'registered_count', 'location', 'location_id'] }),
      db.TryoutEvent.filter({ club_id, stage: { $in: ['planned', 'in_progress', 'ready'] }, date: { $gte: today } }, { sort: 'date', limit: 50, fields: ['type', 'date', 'start_time', 'location', 'expected_attendance', 'registration_count', 'stage'] }),
      db.SocialAccount.filter({ club_id }, { limit: 20, fields: ['platform', 'status', 'account_name', 'account_handle', 'token_expires_at', 'last_post_at'] }),
    ]);

    const campaignList = campaigns.items || [];
    const campaignSourceIds = new Set(campaignList.map((c: any) => c.source_id));
    const campaignUtmMap: Record<string, string> = {};
    campaignList.forEach((c: any) => { if (c.utm_campaign) campaignUtmMap[c.id] = c.utm_campaign; });

    // Events without campaigns
    const eventsWithoutCampaign = [
      ...(clubEvents.items || []).filter((e: any) => !campaignSourceIds.has(e.id)).map((e: any) => ({ id: e.id, kind: 'event', name: e.name, type: e.type, date: e.start_date, location: e.location })),
      ...(tryoutEvents.items || []).filter((e: any) => !campaignSourceIds.has(e.id)).map((e: any) => ({ id: e.id, kind: 'tryout', name: `${e.type?.replace(/_/g, ' ')}`, type: e.type, date: e.date, location: e.location })),
    ];

    // Under-filled sessions
    const underfilled = [
      ...(clubEvents.items || []).filter((e: any) => e.capacity > 0 && (e.registered_count || 0) < e.capacity).map((e: any) => ({ id: e.id, kind: 'event', name: e.name, date: e.start_date, registered: e.registered_count || 0, capacity: e.capacity, fillPct: Math.round(((e.registered_count || 0) / e.capacity) * 100) })),
      ...(tryoutEvents.items || []).filter((e: any) => e.expected_attendance > 0 && (e.registration_count || 0) < e.expected_attendance).map((e: any) => ({ id: e.id, kind: 'tryout', name: `${e.type?.replace(/_/g, ' ')}`, date: e.date, registered: e.registration_count || 0, capacity: e.expected_attendance, fillPct: Math.round(((e.registration_count || 0) / e.expected_attendance) * 100) })),
    ];

    // Account health
    const accountHealth = (accounts.items || []).map((a: any) => {
      const daysLeft = a.token_expires_at ? Math.ceil((new Date(a.token_expires_at).getTime() - Date.now()) / 86400000) : null;
      return { platform: a.platform, status: a.status, daysLeft, account_name: a.account_name, last_post_at: a.last_post_at };
    });

    // Registration attribution by utm_campaign
    let regByCampaign: Record<string, number> = {};
    try {
      const agg = await db.TryoutRegistration.aggregate({ query: { club_id }, groupBy: 'utm_campaign' });
      (agg.rows || []).forEach((r: any) => { if (r.utm_campaign) regByCampaign[r.utm_campaign] = r.count; });
    } catch {}

    // Per-post performance: clicks + registrations
    const postPerformance = (published.items || []).map((p: any) => {
      const utmCampaign = p.campaign_id ? campaignUtmMap[p.campaign_id] : null;
      const registrations = utmCampaign ? (regByCampaign[utmCampaign] || 0) : 0;
      return {
        id: p.id, title: p.title || p.event_title || 'Untitled', platform: p.platform,
        published_at: p.published_at, clicks: p.metrics?.clicks || 0,
        registrations, utm_campaign: utmCampaign || '',
      };
    });

    return Response.json({
      upcomingPosts: upcoming.items || [],
      failedPosts: failed.items || [],
      eventsWithoutCampaign,
      underfilled,
      accountHealth,
      postPerformance,
      campaigns: campaignList.map((c: any) => ({ id: c.id, name: c.name, source_id: c.source_id, source_type: c.source_type, utm_campaign: c.utm_campaign, status: c.status })),
    });
  } catch (error) {
    console.error('marketing-dashboard error', error?.message, error?.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
}