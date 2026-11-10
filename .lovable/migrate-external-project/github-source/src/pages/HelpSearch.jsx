import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2, SearchX } from 'lucide-react';
import { kb, useViewer } from '@/lib/help/helpApi';
import HelpSearchBox from '@/components/help/HelpSearchBox';
import ArticleList from '@/components/help/ArticleList';

export default function HelpSearch() {
  const [params] = useSearchParams();
  const q = params.get('q') || '';
  const { data: user, isLoading: viewerLoading } = useViewer();
  // One fetch per query: each fetch is logged on the server.
  const { data, isLoading } = useQuery({
    queryKey: ['kbSearch', q, user?.id || 'anon'],
    queryFn: () => kb('search', { q }),
    enabled: !viewerLoading && !!q,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-5">
      <HelpSearchBox initial={q} />
      {isLoading && <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}
      {data && data.results.length > 0 && (
        <>
          <p className="text-sm text-muted-foreground">{data.results.length} result{data.results.length === 1 ? '' : 's'} for "{q}"</p>
          <ArticleList articles={data.results} onOpen={(a) => kb('click', { log_id: data.log_id, slug: a.slug })} />
        </>
      )}
      {data && data.results.length === 0 && (
        <div className="text-center py-10 space-y-2">
          <SearchX className="w-10 h-10 mx-auto text-muted-foreground" />
          <p className="font-semibold">No articles found for "{q}"</p>
          <p className="text-sm text-muted-foreground">Try different words, or <Link to="/help" className="text-primary underline">browse by topic</Link>.</p>
        </div>
      )}
    </div>
  );
}