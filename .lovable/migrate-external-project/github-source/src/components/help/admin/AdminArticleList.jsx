import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Plus } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { STATUS_OPTIONS, audienceLabel } from '@/lib/help/helpApi';

export default function AdminArticleList({ onEdit, onNew }) {
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const { data = [], isLoading } = useQuery({
    queryKey: ['kbAdminArticles', status, search],
    queryFn: () => {
      const q = {};
      if (status !== 'all') q.status = status;
      if (search.trim()) q.title = { $regex: search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
      return base44.entities.KBArticle.filter(q, 'title', 200);
    },
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <Input placeholder="Search titles" value={search} onChange={(e) => setSearch(e.target.value)} className="h-10" />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-10 sm:w-44"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All statuses</SelectItem>{STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
        </Select>
        <Button onClick={onNew} className="min-h-[40px]"><Plus className="w-4 h-4" /> New article</Button>
      </div>
      {isLoading && <Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" />}
      <ul className="divide-y divide-border rounded-xl border border-border bg-card">
        {data.map((a) => (
          <li key={a.id}>
            <button onClick={() => onEdit(a)} className="w-full text-left px-4 py-3 min-h-[56px] hover:bg-primary/5 flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{a.title}</p>
                <p className="text-xs text-muted-foreground truncate">{a.category_slug || 'No category'} · {audienceLabel(a)}{a.module_gate ? ` · ${a.module_gate}` : ''}</p>
              </div>
              <Badge variant={a.status === 'published' ? 'default' : 'secondary'}>{a.status.replace('_', ' ')}</Badge>
            </button>
          </li>
        ))}
        {!isLoading && data.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">No articles match.</li>}
      </ul>
    </div>
  );
}