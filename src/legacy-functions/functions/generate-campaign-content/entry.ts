// @ts-nocheck
import { createClientFromRequest } from '@/legacy-functions/_sdk';

const PLATFORM_SPEC: Record<string, { label: string; limit: number; format: string }> = {
  x: { label: 'X', limit: 280, format: 'Short punchy post, max 280 chars. 1 emoji. No hashtags in body.' },
  instagram: { label: 'Instagram', limit: 2200, format: 'Caption with a hook first line, line breaks, 1-2 emojis. Return hashtags separately. Include an image_brief describing the visual (no text in image).' },
  facebook: { label: 'Facebook', limit: 5000, format: 'Longer conversational post, 2-3 short paragraphs, 1-2 emojis, clear CTA. No hashtags in body.' },
  club_feed: { label: 'Club feed', limit: 1000, format: 'Internal club announcement for the Beacon feed. Friendly, informational, no hashtags. Include registration link if present.' },
};

function qrUrl(link: string): string {
  if (!link) return '';
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(link)}`;
}

function addUtm(url: string, platform: string, campaign: string): string {
  try {
    const u = new URL(url);
    u.searchParams.set('utm_source', platform);
    u.searchParams.set('utm_medium', 'social');
    if (campaign) u.searchParams.set('utm_campaign', campaign);
    return u.toString();
  } catch {
    return url;
  }
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const {
      club_id,
      event = {},
      steps = [],
      platforms = ['facebook', 'instagram', 'x', 'club_feed'],
      brand_kit_id,
      marketing_plan_id,
      campaign_name,
      player_refs = [],
    } = await req.json();

    if (!club_id) return Response.json({ error: 'club_id required' }, { status: 400 });
    if (!event.title || !event.date) return Response.json({ error: 'event title and date required' }, { status: 400 });
    if (!steps.length) return Response.json({ error: 'steps required' }, { status: 400 });

    // Enforce tenant membership
    if (user.role !== 'admin' && !user.system_role && user.club_id !== club_id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const club = await base44.asServiceRole.entities.Club.get(club_id);
    const settingsPage = await base44.asServiceRole.entities.MarketingSettings.filter({ club_id }, { limit: 1 });
    const settings = settingsPage.items?.[0] || {};

    // Load brand kit (explicit or default)
    let brandKit: any = null;
    if (brand_kit_id) {
      try { brandKit = await base44.asServiceRole.entities.BrandKit.get(brand_kit_id); } catch {}
    }
    if (!brandKit) {
      const bkPage = await base44.asServiceRole.entities.BrandKit.filter({ club_id, is_default: true }, { limit: 1 });
      brandKit = bkPage.items?.[0] || null;
    }
    const voice = brandKit?.voice || settings.brand_voice || '';
    const defaultHashtags = [...(brandKit?.default_hashtags || settings.default_hashtags || [])];

    // ===== CONSENT ENFORCEMENT (data-side) =====
    // Filter player_refs by Guardian consent before any name/photo reaches the AI.
    // Only players whose guardian granted BOTH name_consent and photo_consent are
    // surfaced to the generator. Non-consented players are invisible to the AI.
    let consentedPlayers: any[] = [];
    if (player_refs.length) {
      const guardianIds = new Set<string>();
      const playerMap: Record<string, any> = {};
      for (const p of player_refs) {
        playerMap[p.player_id] = p;
        if (p.guardian_ids?.length) p.guardian_ids.forEach((g: string) => guardianIds.add(g));
      }
      if (guardianIds.size) {
        const guardians = await base44.asServiceRole.entities.Guardian.filter(
          { _id: { $in: [...guardianIds] } },
          { limit: 500 }
        );
        const consentByGuardian: Record<string, boolean> = {};
        for (const g of guardians.items) {
          consentByGuardian[g.id] = !!(g.name_consent && g.photo_consent);
        }
        consentedPlayers = player_refs.filter((p) =>
          (p.guardian_ids || []).some((g: string) => consentByGuardian[g])
        );
      }
    }

    const clubName = club?.name || '';
    const utmCampaign = campaign_name || `${event.title} promo`.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
    const baseLink = event.url || '';

    // Create the campaign
    const campaign = await base44.asServiceRole.entities.Campaign.create({
      club_id,
      name: campaign_name || `${event.title} promo`,
      source_type: event.source_type || 'club_event',
      source_id: event.source_id || '',
      event_type: event.marketing_type || 'custom',
      type: 'event_promo',
      start_date: steps[0]?.date?.slice(0, 10) || event.date,
      end_date: steps[steps.length - 1]?.date?.slice(0, 10) || event.date,
      status: 'draft',
      cadence_preset: 'standard',
      marketing_plan_id: marketing_plan_id || '',
      season_id: event.season_id || '',
      brand_kit_id: brandKit?.id || '',
      timeline_template: steps.map((s) => ({ offset: s.offset, role: s.role, label: s.label, platforms })),
      qr_code_url: baseLink ? qrUrl(addUtm(baseLink, 'social', utmCampaign)) : '',
      utm_campaign: utmCampaign,
    });

    const consentContext = consentedPlayers.length
      ? `\nPlayers available to feature (consent granted): ${consentedPlayers.map((p) => `${p.name}${p.photo_url ? ' (photo available)' : ''}`).join(', ')}.\nYou may reference these players by name. Do not invent other player names.`
      : '\nNo player names or photos are available. Do not reference any specific players by name.';

    const allPosts: any[] = [];

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const platformList = platforms.filter((p) => PLATFORM_SPEC[p]);
      if (!platformList.length) continue;

      const platformInstructions = platformList
        .map((p) => `- ${p}: ${PLATFORM_SPEC[p].format} (max ${PLATFORM_SPEC[p].limit} chars)`)
        .join('\n');

      const prompt = `You are a social media manager for a youth soccer club. Generate one post per platform for a single campaign step.
Club: ${clubName}
Event: ${event.title}
Type: ${event.marketing_type || 'custom'}
${event.team_name ? `Team: ${event.team_name}${event.age_group ? ` (${event.age_group})` : ''}\n` : ''}Date: ${event.date}${event.time ? ` at ${event.time}` : ''}
Location: ${event.location || 'TBD'}
Description: ${event.description || ''}
Registration link: ${baseLink || 'none'}
Brand voice: ${voice || 'warm, family-first, authentic'}
Campaign step: ${step.label} (role: ${step.role}, ${step.offset > 0 ? '+' : ''}${step.offset} days from event)
${consentContext}

Generate a post for EACH of these platforms:
${platformInstructions}

Return a JSON object with a "posts" array. Each item: { platform, body, hashtags (array, no #), alt_text, image_brief }.
- body must be ready to publish and respect the platform's char limit.
- hashtags: 5-8 for instagram, 0 for x/club_feed, 3-5 for facebook.
- image_brief: 1-2 sentence visual direction for an AI image generator (no text in image). Only include if the platform uses imagery.
- Never invent facts, dates, or prices not provided above.`;

      const parsed = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            posts: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  platform: { type: 'string' },
                  body: { type: 'string' },
                  hashtags: { type: 'array', items: { type: 'string' } },
                  alt_text: { type: 'string' },
                  image_brief: { type: 'string' },
                },
                required: ['platform', 'body'],
              },
            },
          },
          required: ['posts'],
        },
      });

      const generated: any[] = parsed.posts || [];
      for (const g of generated) {
        const p = g.platform;
        if (!PLATFORM_SPEC[p]) continue;
        const link = baseLink ? addUtm(baseLink, p, utmCampaign) : '';
        const hashtags = [...(g.hashtags || []).map((h: string) => h.replace(/^#/, '')), ...defaultHashtags];
        allPosts.push({
          club_id,
          campaign_id: campaign.id,
          campaign_role: step.role,
          sequence_order: i + 1,
          offset_days: step.offset,
          platform: p,
          status: 'draft',
          title: `${event.title} · ${step.label} · ${PLATFORM_SPEC[p].label}`,
          event_title: event.title,
          event_type: event.marketing_type || 'custom',
          source_type: event.source_type || 'club_event',
          source_id: event.source_id || '',
          body: g.body || '',
          hashtags: p === 'instagram' || p === 'facebook' ? hashtags : [],
          alt_text: g.alt_text || '',
          image_brief: g.image_brief || '',
          tone: voice ? 'brand' : 'friendly',
          scheduled_for: step.date,
          utm_link: link,
          qr_code_url: qrUrl(link),
          brand_kit_id: brandKit?.id || '',
          marketing_plan_id: marketing_plan_id || '',
        });
      }
    }

    let created: any[] = [];
    if (allPosts.length) {
      created = await base44.asServiceRole.entities.Post.bulkCreate(allPosts);
    }

    // ===== MARKETING TASK REMINDERS =====
    // One Task per step with a due date, so each campaign step shows up in the
    // task system as a reminder to review/approve/schedule that step's posts.
    const tasks: any[] = steps.map((s, i) => ({
      club_id,
      campaign_id: campaign.id,
      marketing_plan_id: marketing_plan_id || '',
      task_type: 'marketing',
      title: `${event.title} — ${s.label} posts`,
      description: `Review and approve the ${platforms.length} draft post(s) for the "${s.label}" step (${s.role}) of the ${event.title} campaign. ${s.offset > 0 ? `${s.offset} day(s) after` : s.offset < 0 ? `${Math.abs(s.offset)} day(s) before` : 'day of'} the event.`,
      category: 'Marketing',
      due_date: (s.date || '').slice(0, 10),
      completed: false,
    }));
    let createdTasks: any[] = [];
    if (tasks.length) {
      try { createdTasks = await base44.asServiceRole.entities.Task.bulkCreate(tasks); } catch (e) { console.error('task creation failed', e?.message); }
    }

    return Response.json({
      campaign_id: campaign.id,
      post_count: created.length,
      task_count: createdTasks.length,
      consented_players: consentedPlayers.length,
      total_players_requested: player_refs.length,
    });
  } catch (error) {
    console.error('generate-campaign-content error', error?.message, error?.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
}