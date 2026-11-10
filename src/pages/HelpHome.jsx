import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { kb, useViewer } from '@/lib/help/helpApi';
import HelpSearchBox from '@/components/help/HelpSearchBox';
import CategoryTile from '@/components/help/CategoryTile';
import ArticleList from '@/components/help/ArticleList';

export default function HelpHome() {
  const { data: user, isLoading: viewerLoading } = useViewer();
  const { data, isLoading } = useQuery({
    queryKey: ['kbHome', user?.id || 'anon'],
    queryFn: () => kb('home'),
    enabled: !viewerLoading,
  });

  return (
    <div>
      <section className="bg-gradient-to-b from-primary/10 to-transparent px-4 py-10 sm:py-16">
        <div className="max-w-2xl mx-auto text-center space-y-4">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">How can we help?</h1>
          <p className="text-muted-foreground">Search answers for players, parents, coaches and club admins.</p>
          <HelpSearchBox large />
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 pb-12 space-y-10">
        {(isLoading || viewerLoading) && <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}

        {data?.popular?.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-lg font-bold">Popular articles</h2>
            <ArticleList articles={data.popular} />
          </section>
        )}

        {data?.categories && (
          <section className="space-y-3">
            <h2 className="text-lg font-bold">Browse by topic</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {data.categories.map((c) => <CategoryTile key={c.id} category={c} />)}
            </div>
          </section>
        )}

        {data && data.popular.length === 0 && (
          <p className="text-center text-muted-foreground">Articles are on the way. Check back soon.</p>
        )}
      </div>
    </div>
  );
}