import React from 'react';
import { Link, useParams, useSearchParams, useLocation } from '@/lib/router-compat';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Users, CalendarCheck, Puzzle, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { kb, useViewer, audienceLabel, cleanHtml, MODULE_OPTIONS } from '@/lib/help/helpApi';
import ArticleList from '@/components/help/ArticleList';
import ArticleFeedback from '@/components/help/ArticleFeedback';

export default function HelpArticle() {
  const { slug } = useParams();
  const [params] = useSearchParams();
  const preview = params.get('preview') === '1';
  const loc = useLocation();
  const { data: user, isLoading: viewerLoading } = useViewer();
  const { data, isLoading } = useQuery({
    queryKey: ['kbArticle', slug, preview, user?.id || 'anon'],
    queryFn: () => kb('article', { slug, preview }),
    enabled: !viewerLoading,
    refetchOnWindowFocus: false,
  });

  if (isLoading || viewerLoading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  if (data?.status === 'signin_required') {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-3">
        <h1 className="text-xl font-bold">Sign in to read this article</h1>
        <p className="text-muted-foreground text-sm">This article is for signed-in users.</p>
        <Button asChild><Link to={`/login?returnTo=${encodeURIComponent(loc.pathname)}`}>Sign in</Link></Button>
      </div>
    );
  }
  if (data?.status !== 'ok') {
    return <p className="text-center py-16 text-muted-foreground">We couldn't find that article. <Link to="/help" className="text-primary underline">Back to Help</Link></p>;
  }

  const { article, category, related } = data;
  const moduleName = MODULE_OPTIONS.find((m) => m.key === article.module_gate)?.label;

  return (
    <article className="max-w-3xl mx-auto px-4 py-6 sm:py-8 space-y-5">
      <p className="text-sm">
        <Link to="/help" className="text-primary hover:underline">Help</Link>
        {category && <> / <Link to={`/help/category/${category.slug}`} className="text-primary hover:underline">{category.name}</Link></>}
      </p>
      {preview && article.status !== 'published' && <Badge variant="secondary">Preview ({article.status.replace('_', ' ')})</Badge>}
      <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{article.title}</h1>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> For: {audienceLabel(article)}</span>
        {moduleName && <span className="flex items-center gap-1"><Puzzle className="w-3.5 h-3.5" /> Requires the {moduleName} module</span>}
        {article.last_reviewed && <span className="flex items-center gap-1"><CalendarCheck className="w-3.5 h-3.5" /> Last reviewed {new Date(article.last_reviewed + 'T00:00:00').toLocaleDateString()}</span>}
      </div>

      {article.status === 'needs_update' && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-3 text-sm">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" /> This article is being updated and some details may be out of date.
        </div>
      )}

      {article.short_answer && (
        <div className="rounded-2xl bg-primary/10 border border-primary/20 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-primary mb-1">Short answer</p>
          <p className="text-foreground">{article.short_answer}</p>
        </div>
      )}

      <div className="kb-body" dangerouslySetInnerHTML={{ __html: cleanHtml(article.body) }} />

      <ArticleFeedback article={article} />

      {related.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-bold">Related articles</h2>
          <ArticleList articles={related} />
        </section>
      )}
    </article>
  );
}