// @ts-nocheck
import { createClientFromRequest } from '@/legacy-functions/_sdk';
import { tenantModuleHasAccess } from '../../shared/moduleAccess.ts';
import { scoreArticles } from '../../shared/kbSearch.ts';

// Knowledge Base read API. Public + signed-in. Every article is filtered by the
// viewer's role and the club's subscribed modules on the server.
const slim = (a: any) => ({
  id: a.id, title: a.title, slug: a.slug, category_slug: a.category_slug,
  short_answer: a.short_answer || '', audience: a.audience, roles: a.roles || [],
  last_reviewed: a.last_reviewed || null,
});

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user: any = await base44.auth.me().catch(() => null);
    const db = base44.asServiceRole.entities;
    const { action, ...p } = await req.json().catch(() => ({}));

    const sysRole = user?.system_role || '';
    const elevated = !!user && (['system_owner', 'system_admin', 'system_support'].includes(sysRole) || user.role === 'admin');
    const role = user?.custom_role || '';
    const clubId = user?.data?.club_id || user?.club_id || '';

    let modCtx: Promise<any[]> | null = null;
    const hasModule = async (key: string) => {
      if (elevated) return true;
      if (!user || !clubId) return false;
      modCtx ??= Promise.all([db.Club.filter({ id: clubId }), db.TenantModule.filter({ club_id: clubId }, '-created_date', 200)]);
      const [clubs, mods] = await modCtx;
      return tenantModuleHasAccess(clubs[0], mods, key);
    };
    const canSee = async (a: any) => {
      if (elevated) return true;
      if (a.audience === 'signed_in' && !user) return false;
      if (a.audience === 'roles' && (!user || !(a.roles || []).includes(role))) return false;
      if (a.module_gate && !(await hasModule(a.module_gate))) return false;
      return true;
    };
    const live = async () => {
      const all = await db.KBArticle.filter({ status: { $in: ['published', 'needs_update'] } }, '-updated_date', 500);
      const flags = await Promise.all(all.map(canSee));
      return all.filter((_: any, i: number) => flags[i]);
    };

    if (action === 'home') {
      const [cats, arts] = await Promise.all([db.KBCategory.filter({}, 'sort_order', 50), live()]);
      const counts: Record<string, number> = {};
      arts.forEach((a: any) => { counts[a.category_slug] = (counts[a.category_slug] || 0) + 1; });
      const popular = [...arts].sort((a: any, b: any) => (b.view_count || 0) - (a.view_count || 0)).slice(0, 6).map(slim);
      return Response.json({ categories: cats.map((c: any) => ({ ...c, count: counts[c.slug] || 0 })), popular });
    }

    if (action === 'search') {
      const q = String(p.q || '').trim().slice(0, 200);
      if (!q) return Response.json({ results: [], log_id: null });
      const results = scoreArticles(q, await live()).slice(0, 20).map(slim);
      const log = await db.KBSearchLog.create({ query: q.toLowerCase(), results_count: results.length, club_id: clubId, role: role || sysRole || (user ? 'user' : 'anonymous') }).catch((e: any) => { console.error('search log failed', e); return null; });
      return Response.json({ results, log_id: log?.id || null });
    }

    if (action === 'click') {
      if (p.log_id) await db.KBSearchLog.update(String(p.log_id), { clicked_article_slug: String(p.slug || '') }).catch(() => {});
      return Response.json({ ok: true });
    }

    if (action === 'category') {
      const [cats, arts] = await Promise.all([db.KBCategory.filter({ slug: String(p.slug) }, null, 1), live()]);
      if (!cats[0]) return Response.json({ status: 'not_found' });
      return Response.json({ status: 'ok', category: cats[0], articles: arts.filter((a: any) => a.category_slug === p.slug).map(slim) });
    }

    if (action === 'article') {
      const a = (await db.KBArticle.filter({ slug: String(p.slug) }, null, 1))[0];
      const preview = !!p.preview && elevated;
      if (!a || (!preview && !['published', 'needs_update'].includes(a.status))) return Response.json({ status: 'not_found' });
      if (!(await canSee(a))) return Response.json({ status: user ? 'not_found' : 'signin_required' });
      if (!preview) db.KBArticle.update(a.id, { view_count: (a.view_count || 0) + 1 }).catch(() => {});
      const [cat, rel] = await Promise.all([
        db.KBCategory.filter({ slug: a.category_slug }, null, 1),
        (a.related_slugs || []).length ? live() : Promise.resolve([]),
      ]);
      const related = rel.filter((r: any) => (a.related_slugs || []).includes(r.slug)).map(slim);
      const { version_history, ...article } = a;
      return Response.json({ status: 'ok', article, category: cat[0] || null, related });
    }

    if (action === 'feedback') {
      const a = (await db.KBArticle.filter({ slug: String(p.slug) }, null, 1))[0];
      if (!a || !(await canSee(a))) return Response.json({ error: 'not_found' }, { status: 404 });
      const helpful = !!p.helpful;
      await db.KBFeedback.create({
        article_id: a.id, article_slug: a.slug, article_title: a.title, helpful,
        comment: String(p.comment || '').slice(0, 1000), club_id: clubId, role: role || sysRole || 'anonymous',
      });
      const patch: any = helpful ? { helpful_yes: (a.helpful_yes || 0) + 1 } : { helpful_no: (a.helpful_no || 0) + 1, negative_since_review: (a.negative_since_review || 0) + 1 };
      const noVotes = patch.negative_since_review || 0;
      if (!helpful && a.status === 'published' && noVotes >= 3 && noVotes > (a.helpful_yes || 0)) patch.status = 'needs_update';
      await db.KBArticle.update(a.id, patch);
      return Response.json({ ok: true });
    }

    if (action === 'page_map') {
      const [maps, arts] = await Promise.all([db.KBPageMap.filter({}, null, 300), live()]);
      const bySlug = new Map(arts.map((a: any) => [a.slug, a]));
      return Response.json({ maps: maps.filter((m: any) => bySlug.has(m.article_slug)).map((m: any) => ({ page_path: m.page_path, slug: m.article_slug, title: (bySlug.get(m.article_slug) as any).title })) });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('kb error:', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}