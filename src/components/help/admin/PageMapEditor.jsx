import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function PageMapEditor() {
  const qc = useQueryClient();
  const [path, setPath] = useState('');
  const [slug, setSlug] = useState('');
  const { data: maps = [], isLoading } = useQuery({ queryKey: ['kbMapAdmin'], queryFn: () => base44.entities.KBPageMap.filter({}, 'page_path', 300) });
  const { data: arts = [] } = useQuery({ queryKey: ['kbMapArticles'], queryFn: () => base44.entities.KBArticle.filter({}, 'title', 300) });

  const refresh = () => { qc.invalidateQueries({ queryKey: ['kbMapAdmin'] }); qc.invalidateQueries({ queryKey: ['kbPageMap'] }); };
  const add = async () => {
    const p = '/' + path.trim().replace(/^\/+/, '');
    if (p === '/' || !slug) return;
    const existing = maps.find((m) => m.page_path.toLowerCase() === p.toLowerCase());
    if (existing) await base44.entities.KBPageMap.update(existing.id, { article_slug: slug });
    else await base44.entities.KBPageMap.create({ page_path: p, article_slug: slug });
    setPath(''); setSlug(''); refresh();
  };
  const remove = async (m) => { await base44.entities.KBPageMap.delete(m.id); refresh(); };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">The "?" in the app header opens the article mapped to the current page. Unmapped pages open the Help home.</p>
      <div className="flex flex-col sm:flex-row gap-2">
        <Input placeholder="/Reports" value={path} onChange={(e) => setPath(e.target.value)} className="h-10 sm:w-48" />
        <Select value={slug} onValueChange={setSlug}>
          <SelectTrigger className="h-10 flex-1"><SelectValue placeholder="Choose an article" /></SelectTrigger>
          <SelectContent>{arts.map((a) => <SelectItem key={a.id} value={a.slug}>{a.title}</SelectItem>)}</SelectContent>
        </Select>
        <Button onClick={add} className="min-h-[40px]"><Plus className="w-4 h-4" /> Add</Button>
      </div>
      {isLoading && <Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" />}
      <ul className="divide-y divide-border rounded-xl border border-border bg-card">
        {maps.map((m) => (
          <li key={m.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
            <span className="font-mono w-40 shrink-0 truncate">{m.page_path}</span>
            <span className="flex-1 truncate text-muted-foreground">{arts.find((a) => a.slug === m.article_slug)?.title || m.article_slug}</span>
            <Button variant="ghost" size="icon" onClick={() => remove(m)}><Trash2 className="w-4 h-4" /></Button>
          </li>
        ))}
      </ul>
    </div>
  );
}