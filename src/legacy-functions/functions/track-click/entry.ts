// @ts-nocheck
import { createClientFromRequest } from '@/legacy-functions/_sdk';

// track-click — public redirect endpoint for marketing post link tracking.
// Increments Post.metrics.clicks, then 302-redirects to the post's UTM link.
// Used as the destination URL in post bodies and QR codes so every click is counted.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const url = new URL(req.url);
    const post_id = url.searchParams.get('post_id') || '';
    const origin = url.origin;
    if (!post_id) return new Response(null, { status: 302, headers: { Location: `${origin}/` } });

    const db = base44.asServiceRole.entities;
    const post: any = await db.Post.get(post_id).catch(() => null);
    if (!post) return new Response(null, { status: 302, headers: { Location: `${origin}/` } });

    const metrics = post.metrics || {};
    const clicks = (metrics.clicks || 0) + 1;
    await db.Post.update(post_id, { metrics: { ...metrics, clicks, last_click_at: new Date().toISOString() } }).catch(() => {});

    const dest = post.utm_link || `${origin}/`;
    return new Response(null, { status: 302, headers: { Location: dest } });
  } catch (error) {
    console.error('track-click error', error?.message);
    return new Response(null, { status: 302, headers: { Location: '/' } });
  }
}