import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { sendBrandedEmail } from '../../shared/resendEmail.ts';

const AYRSHARE = 'https://app.ayrshare.com/api';
const PLATFORM_MAP: Record<string, string> = { x: 'twitter', instagram: 'instagram', facebook: 'facebook', linkedin: 'linkedin', tiktok: 'tiktok', youtube: 'youtube' };
const MAX_ATTEMPTS = 3;

async function loadCred(svc: any, clubId: string) {
  const page = await svc.entities.ClubCredential.filter({ club_id: clubId }, { limit: 1 });
  return page?.items?.[0] || (Array.isArray(page) ? page[0] : null);
}

// publish-queue — scheduled function called by the "Marketing Publish Queue"
// workflow every 10 minutes. Finds approved posts whose scheduled_for is due
// and publishes them via Ayrshare. club_feed posts are marked published
// directly (no external API). Retries up to MAX_ATTEMPTS; on final failure
// marks the post "failed" and emails the club's marketing manager / director.
// Never publishes unapproved content.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);

    // Auth: admin/system user, or CRON_SECRET for workflow calls
    const user = await base44.auth.me().catch(() => null);
    if (!user || (user.role !== 'admin' && !user.system_role)) {
      const authHeader = req.headers.get('authorization') || '';
      const cronSecret = Deno.env.get('CRON_SECRET');
      if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const db = base44.asServiceRole.entities;
    const now = new Date().toISOString();

    // Find approved posts that are due (scheduled_for in the past or now)
    const duePage = await db.Post.filter(
      { status: 'approved', scheduled_for: { $lte: now } },
      { sort: 'scheduled_for', limit: 100 }
    );
    const duePosts = duePage.items || [];

    const results = { processed: 0, published: 0, failed: 0, skipped: 0 };

    for (const post of duePosts) {
      results.processed++;

      // club_feed posts publish directly to the internal feed — no external API
      if (post.platform === 'club_feed') {
        await db.Post.update(post.id, { status: 'published', published_at: now, failure_reason: null });
        await db.PublishLog.create({
          post_id: post.id, club_id: post.club_id, platform: post.platform,
          attempted_at: now, success: true, source: 'queue', attempt_number: (post.attempts || 0) + 1,
        });
        results.published++;
        continue;
      }

      // External platform — publish via Ayrshare
      const cred = await loadCred(base44.asServiceRole, post.club_id);
      const apiKey = cred?.ayrshare_api_key;
      if (!apiKey) {
        await db.PublishLog.create({
          post_id: post.id, club_id: post.club_id, platform: post.platform,
          attempted_at: now, success: false, source: 'queue', attempt_number: (post.attempts || 0) + 1,
          error: 'No Ayrshare API key set for this club',
        });
        results.skipped++;
        continue;
      }

      const attemptNum = (post.attempts || 0) + 1;
      try {
        const headers: Record<string, string> = { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' };
        if (cred.ayrshare_profile_key) headers['Profile-Key'] = cred.ayrshare_profile_key;
        const r = await fetch(`${AYRSHARE}/post`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            post: post.body || '',
            platforms: [PLATFORM_MAP[post.platform] || post.platform],
            mediaUrls: post.media_urls || [],
          }),
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data?.message || `HTTP ${r.status}`);

        // Success
        await db.Post.update(post.id, {
          status: 'published',
          published_at: now,
          platform_post_id: data?.id || data?.postId || '',
          platform_post_url: data?.postUrl || data?.url || '',
          attempts: attemptNum,
          failure_reason: null,
        });
        await db.PublishLog.create({
          post_id: post.id, club_id: post.club_id, platform: post.platform,
          attempted_at: now, success: true, source: 'queue', attempt_number: attemptNum,
          platform_post_id: data?.id || data?.postId || '',
          platform_post_url: data?.postUrl || data?.url || '',
        });
        // Update the social account's last_post_at
        try {
          const acctPage = await db.SocialAccount.filter({ club_id: post.club_id, platform: post.platform }, { limit: 1 });
          const acct = acctPage?.items?.[0];
          if (acct) await db.SocialAccount.update(acct.id, { last_post_at: now });
        } catch {}
        results.published++;
      } catch (err: any) {
        // Failure — log and maybe mark failed
        const isFinal = attemptNum >= MAX_ATTEMPTS;
        await db.Post.update(post.id, {
          attempts: attemptNum,
          failure_reason: err?.message || 'Unknown error',
          ...(isFinal ? { status: 'failed' } : {}),
        });
        await db.PublishLog.create({
          post_id: post.id, club_id: post.club_id, platform: post.platform,
          attempted_at: now, success: false, source: 'queue', attempt_number: attemptNum,
          error: err?.message || 'Unknown error',
        });
        if (isFinal) {
          results.failed++;
          // Notify the club's marketing manager / director
          try {
            const rolesPage = await db.UserRoles.filter({ club_id: post.club_id, role: { $in: ['marketing_director', 'club_director', 'club_admin'] }, status: 'active' }, { limit: 20 });
            const recipients = (rolesPage.items || []).map((r: any) => r.user_email).filter(Boolean);
            for (const email of recipients) {
              await sendBrandedEmail(base44, {
                to: email,
                subject: `Marketing post failed to publish: ${post.title || post.event_title || ''}`,
                body: `A scheduled post for ${post.platform} failed after ${MAX_ATTEMPTS} attempts and has been marked as failed.\n\nPost: ${post.title || post.event_title}\nError: ${err?.message}\n\nReview it in the Marketing calendar and retry or re-create it.`,
              });
            }
          } catch (e) { console.error('notify failed', e?.message); }
        }
      }
    }

    return Response.json({ ...results, due: duePosts.length });
  } catch (error) {
    console.error('publish-queue error', error?.message, error?.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
}