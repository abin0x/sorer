// @ts-nocheck
import { createClientFromRequest } from '@/legacy-functions/_sdk';

const AYRSHARE = "https://app.ayrshare.com/api";
const PLATFORM_MAP: Record<string, string> = { x: "twitter", instagram: "instagram", facebook: "facebook", linkedin: "linkedin", tiktok: "tiktok", youtube: "youtube" };

// publishPost — sends a Post to the club's connected social account via
// Ayrshare, using the club's own Ayrshare API key (ClubCredential).
// If scheduled_for is in the future, Ayrshare schedules it; otherwise it
// publishes immediately. Updates the Post with the platform post id/url.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const { post_id, scheduled_for } = await req.json();
    if (!post_id) return Response.json({ error: "post_id required" }, { status: 400 });

    const post = await base44.asServiceRole.entities.Post.get(post_id);
    if (!post) return Response.json({ error: "Post not found" }, { status: 404 });
    if (user.role !== "admin" && !user.system_role && post.club_id !== user.club_id) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const credPage = await base44.asServiceRole.entities.ClubCredential.filter({ club_id: post.club_id }, { limit: 1 });
    const cred = credPage?.items?.[0] || credPage?.[0];
    const apiKey = cred?.ayrshare_api_key;
    if (!apiKey) return Response.json({ error: "No Ayrshare API key set. Add it in Connections." }, { status: 400 });

    const when = scheduled_for || post.scheduled_for || new Date().toISOString();
    const isFuture = new Date(when).getTime() > Date.now() + 60000;
    const body: any = {
      post: post.body || "",
      platforms: [PLATFORM_MAP[post.platform] || post.platform],
      mediaUrls: post.media_urls || [],
    };
    if (isFuture) body.scheduledAt = when;

    const r = await fetch(`${AYRSHARE}/post`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await r.json();
    if (!r.ok) {
      const attemptNum = (post.attempts || 0) + 1;
      await base44.asServiceRole.entities.Post.update(post_id, { status: "failed", failure_reason: data?.message || `HTTP ${r.status}`, attempts: attemptNum });
      try { await base44.asServiceRole.entities.PublishLog.create({ post_id, club_id: post.club_id, platform: post.platform, attempted_at: new Date().toISOString(), success: false, source: "composer", attempt_number: attemptNum, error: data?.message || `HTTP ${r.status}` }); } catch {}
      return Response.json({ success: false, error: data?.message || `Ayrshare error ${r.status}` }, { status: 502 });
    }

    const update: any = {
      platform_post_id: data?.id || data?.postId || "",
      platform_post_url: data?.postUrl || data?.url || "",
      attempts: (post.attempts || 0) + 1,
      failure_reason: null,
    };
    if (isFuture) {
      update.status = "scheduled";
      update.scheduled_for = when;
    } else {
      update.status = "published";
      update.published_at = new Date().toISOString();
    }
    await base44.asServiceRole.entities.Post.update(post_id, update);
    try { await base44.asServiceRole.entities.PublishLog.create({ post_id, club_id: post.club_id, platform: post.platform, attempted_at: new Date().toISOString(), success: true, source: "composer", attempt_number: (post.attempts || 0) + 1, platform_post_id: update.platform_post_id, platform_post_url: update.platform_post_url }); } catch {}
    // Update the social account's last_post_at
    try {
      const acctPage = await base44.asServiceRole.entities.SocialAccount.filter({ club_id: post.club_id, platform: post.platform }, { limit: 1 });
      const acct = acctPage?.items?.[0];
      if (acct) await base44.asServiceRole.entities.SocialAccount.update(acct.id, { last_post_at: new Date().toISOString() });
    } catch {}
    return Response.json({ success: true, status: update.status, url: update.platform_post_url, id: update.platform_post_id });
  } catch (error) {
    console.error("publishPost error", error?.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}