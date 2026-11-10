import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { kb, useViewer } from '@/lib/help/helpApi';
import ArticleList from '@/components/help/ArticleList';

export default function HelpCategory() {
  const { slug } = useParams();
  const { data: user, isLoading: viewerLoading } = useViewer();
  const { data, isLoading } = useQuery({
    queryKey: ['kbCategory', slug, user?.id || 'anon'],
    queryFn: () => kb('category', { slug }),
    enabled: !viewerLoading,
  });

  if (isLoading || viewerLoading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  if (data?.status !== 'ok') return <p className="text-center py-16 text-muted-foreground">Topic not found. <Link to="/help" className="text-primary underline">Back to Help</Link></p>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
      <p className="text-sm"><Link to="/help" className="text-primary hover:underline">Help</Link> / {data.category.name}</p>
      <h1 className="text-2xl font-bold">{data.category.name}</h1>
      {data.articles.length ? <ArticleList articles={data.articles} /> : <p className="text-muted-foreground">No articles in this topic yet.</p>}
    </div>
  );
}