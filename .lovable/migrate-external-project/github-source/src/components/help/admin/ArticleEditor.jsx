import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, ArrowLeft, Eye, Send, Save, CalendarCheck, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { addDays, slugify, todayStr } from '@/lib/help/helpApi';
import RichEditor from './RichEditor';
import ArticleMetaFields from './ArticleMetaFields';
import VersionHistory from './VersionHistory';

const blank = (owner) => ({ title: '', slug: '', category_slug: '', short_answer: '', body: '', audience: 'public', roles: [], module_gate: '', status: 'draft', owner, last_reviewed: '', review_interval_days: 180, keywords: [], related_slugs: [] });

export default function ArticleEditor({ article, viewer, onClose }) {
  const { toast } = useToast();
  const [form, setForm] = useState(() => (article ? { ...blank(''), ...article, roles: article.roles || [], keywords: article.keywords || [], related_slugs: article.related_slugs || [] } : blank(viewer?.email || '')));
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const { data: categories = [] } = useQuery({ queryKey: ['kbCategories'], queryFn: () => base44.entities.KBCategory.filter({}, 'sort_order', 50) });

  const save = async (overrides = {}) => {
    const data = { ...form, ...overrides };
    data.slug = slugify(data.slug || data.title);
    if (!data.title.trim() || !data.slug) { toast({ title: 'A title is required', variant: 'destructive' }); return; }
    if (data.last_reviewed) data.review_due = addDays(data.last_reviewed, data.review_interval_days || 180);
    setSaving(true);
    const clash = await base44.entities.KBArticle.filter({ slug: data.slug }, null, 2);
    if (clash.some((c) => c.id !== article?.id)) { setSaving(false); toast({ title: 'That slug is already used', variant: 'destructive' }); return; }
    if (article?.id) {
      const changed = ['title', 'short_answer', 'body'].some((k) => article[k] !== data[k]);
      if (changed) {
        const snap = { version: article.version || 1, title: article.title, short_answer: article.short_answer, body: article.body, saved_at: new Date().toISOString(), saved_by: viewer?.email };
        data.version_history = [snap, ...(article.version_history || [])].slice(0, 20);
        data.version = (article.version || 1) + 1;
      }
      const { id, created_date, updated_date, created_by_id, ...rest } = data;
      await base44.entities.KBArticle.update(article.id, rest);
    } else {
      await base44.entities.KBArticle.create(data);
    }
    setSaving(false);
    toast({ title: 'Saved' });
    onClose(true);
  };

  const publish = () => save({ status: 'published', last_reviewed: form.last_reviewed || todayStr(), negative_since_review: 0 });
  const restore = (h) => setForm((f) => ({ ...f, title: h.title, short_answer: h.short_answer, body: h.body }));
  const remove = async () => {
    if (!window.confirm('Delete this article permanently?')) return;
    await base44.entities.KBArticle.delete(article.id);
    onClose(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => onClose(false)}><ArrowLeft className="w-4 h-4" /> Back</Button>
        <div className="flex-1" />
        {article?.id && <Button variant="outline" size="sm" asChild><a href={`/help/article/${article.slug}?preview=1`} target="_blank" rel="noopener noreferrer"><Eye className="w-4 h-4" /> Preview</a></Button>}
        {article?.id && <Button variant="ghost" size="sm" onClick={remove}><Trash2 className="w-4 h-4" /></Button>}
      </div>

      <div className="space-y-1.5"><Label className="text-xs">Title (in the user's words)</Label><Input value={form.title} onChange={(e) => set('title', e.target.value)} className="h-11 text-base" /></div>
      <div className="space-y-1.5"><Label className="text-xs">Short answer (shown first)</Label><Textarea rows={2} value={form.short_answer} onChange={(e) => set('short_answer', e.target.value)} /></div>
      <div className="space-y-1.5"><Label className="text-xs">Body: steps, screenshots, video, what to do if it still fails</Label><RichEditor value={form.body} onChange={(v) => set('body', v)} /></div>
      <ArticleMetaFields form={form} set={set} categories={categories} />
      <VersionHistory article={article} onRestore={restore} />

      <div className="flex flex-wrap gap-2 sticky bottom-0 bg-background/95 py-3 border-t border-border">
        <Button disabled={saving} onClick={() => save()} className="min-h-[44px]">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save</Button>
        <Button disabled={saving} variant="secondary" onClick={publish} className="min-h-[44px]"><Send className="w-4 h-4" /> Publish</Button>
        <Button disabled={saving} variant="outline" onClick={() => save({ last_reviewed: todayStr(), negative_since_review: 0 })} className="min-h-[44px]"><CalendarCheck className="w-4 h-4" /> Mark reviewed today</Button>
      </div>
    </div>
  );
}