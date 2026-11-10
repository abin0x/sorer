// @ts-nocheck
import { createClientFromRequest } from '@/legacy-functions/_sdk';

const LIMITS: Record<string, number> = { x: 280, instagram: 2200, facebook: 5000, linkedin: 3000, tiktok: 2200, youtube: 5000 };

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { club_id, event = {}, platform = 'facebook', tone = 'friendly', role, template_hint, include_image = true } = await req.json();
    if (!club_id) return Response.json({ error: 'club_id required' }, { status: 400 });
    if (user.role !== 'admin' && !user.system_role && user.club_id !== club_id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const club = await base44.asServiceRole.entities.Club.get(club_id);
    const settingsPage = await base44.asServiceRole.entities.MarketingSettings.filter({ club_id }, { limit: 1 });
    const voice = settingsPage.items?.[0]?.brand_voice || '';
    const limit = LIMITS[platform] || 2200;

    const prompt = `You are a social media manager for a youth soccer club. Write engaging, authentic posts.
Tone: ${tone}. Platform: ${platform}. Max length: ${limit} characters.
Include 1-2 relevant emojis. End with a clear CTA. Never use hashtags in the body, return them separately.
Never invent facts that are not provided below.

Club: ${club?.name || ''}
Event: ${event.title || ''}
Type: ${event.marketing_type || 'custom'}
${event.team_name ? `Team: ${event.team_name}${event.age_group ? ` (${event.age_group})` : ''}\n` : ''}Date: ${event.date || 'TBD'}${event.time ? ` at ${event.time}` : ''}
Location: ${event.location || 'TBD'}
Description: ${event.description || ''}
Registration link (include it exactly as written if present): ${event.url || 'none'}
Club voice notes: ${voice || 'none'}
${role ? `This post's role in the promo campaign: ${role} (teaser, reminder, day_of, live, recap, or thank_you)\n` : ''}${template_hint ? `Base structure to follow loosely: ${template_hint}\n` : ''}Audience: parents of youth players.

Generate:
1. body: post body, ready to publish
2. hashtags: 5-8 hashtags (no # symbol) mixing local, niche and broad
3. alt_text: alt text for the image
4. image_prompt: a prompt for an AI image generator (no text in the image)`;

    const parsed = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          body: { type: 'string' },
          hashtags: { type: 'array', items: { type: 'string' } },
          alt_text: { type: 'string' },
          image_prompt: { type: 'string' },
        },
        required: ['body', 'hashtags'],
      },
    });

    let image_url = null;
    if (include_image && parsed.image_prompt) {
      try {
        const img = await base44.asServiceRole.integrations.Core.GenerateImage({ prompt: parsed.image_prompt });
        image_url = img?.url || null;
      } catch (e) {
        console.error('Image generation failed', e?.message);
      }
    }

    return Response.json({
      body: parsed.body,
      hashtags: (parsed.hashtags || []).map((h: string) => h.replace(/^#/, '')),
      alt_text: parsed.alt_text || '',
      image_prompt: parsed.image_prompt || '',
      image_url,
    });
  } catch (error) {
    console.error('generatePost error', error?.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}