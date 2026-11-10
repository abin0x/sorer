import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, CalendarCheck, Pencil } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { addDays, todayStr } from '@/lib/help/helpApi';

function reasons(a) {
  const r = [];
  if (a.status === 'needs_update') r.push('Marked needs update');
  if (a.status === 'published' && a.review_due && a.review_due < todayStr()) r.push(`Review overdue (${a.review_due})`);
  if ((a.negative_since_review || 0) > 0) r.push(`${a.negative_since_review} "No" vote${a.negative_since_review > 1 ? 's' : ''}`);
  return r;
}

function Comments({ slug }) {
  const { data = [] } = useQuery({ queryKey: ['kbNoComments', slug], queryFn: () => base44.entities.KBFeedback.filter({ article_slug: slug, helpful: false }, '-created_date', 20) });
  const withText = data.filter((f) => f.comment).slice(0, 3);
  if (!withText.length) return null;
  return <ul className="mt-2 space-y-1">{withText.map((f) => <li key={f.id} className="text-xs text-muted-foreground italic">"{f.comment}"</li>)}</ul>;
}

export default function NeedsUpdateList({ onEdit }) {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ['kbNeedsUpdate'],
    queryFn: () => base44.entities.KBArticle.filter({ $or: [{ status: 'needs_update' }, { status: 'published', review_due: { $lt: todayStr() } }, { negative_since_review: { $gt: 0 } }] }, '-negative_since_review', 100),
  });

  const markReviewed = async (a) => {
    await base44.entities.KBArticle.update(a.id, {
      last_reviewed: todayStr(), review_due: addDays(todayStr(), a.review_interval_days || 180),
      negative_since_review: 0, status: a.status === 'needs_update' ? 'published' : a.status,
    });
    qc.invalidateQueries({ queryKey: ['kbNeedsUpdate'] });
  };

  if (isLoading) return <Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" />;
  if (!data.length) return <p className="text-center text-sm text-muted-foreground py-8">Nothing needs an update right now.</p>;
  return (
    <ul className="space-y-2">
      {data.map((a) => (
        <li key={a.id} className="rounded-xl border border-border bg-card p-3">
          <div className="flex flex-wrap items-start gap-2 justify-between">
            <div className="min-w-0">
              <p className="font-medium">{a.title}</p>
              <div className="flex flex-wrap gap-1 mt-1">{reasons(a).map((r) => <Badge key={r} variant="secondary" className="text-[11px]">{r}</Badge>)}</div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => onEdit(a)}><Pencil className="w-3.5 h-3.5" /> Edit</Button>
              <Button size="sm" onClick={() => markReviewed(a)}><CalendarCheck className="w-3.5 h-3.5" /> Mark reviewed</Button>
            </div>
          </div>
          <Comments slug={a.slug} />
        </li>
      ))}
    </ul>
  );
}