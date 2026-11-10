import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function ZeroResultsList() {
  const { data, isLoading } = useQuery({
    queryKey: ['kbZeroResults'],
    queryFn: async () => {
      const [rows, total, zero] = await Promise.all([
        base44.entities.KBSearchLog.aggregate({ query: { results_count: 0 }, groupBy: 'query', sort: '-count', limit: 50 }),
        base44.entities.KBSearchLog.count({}),
        base44.entities.KBSearchLog.count({ results_count: 0 }),
      ]);
      return { rows: rows.rows || [], total, zero };
    },
  });

  if (isLoading) return <Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" />;
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{data.total} searches logged, {data.zero} with no results. Write an article or add keywords for the top ones.</p>
      <ul className="divide-y divide-border rounded-xl border border-border bg-card">
        {data.rows.map((r) => (
          <li key={r.query} className="flex items-center justify-between px-4 py-2.5 text-sm"><span>{r.query}</span><span className="text-muted-foreground">{r.count}x</span></li>
        ))}
        {!data.rows.length && <li className="p-6 text-center text-sm text-muted-foreground">No zero-result searches yet.</li>}
      </ul>
    </div>
  );
}