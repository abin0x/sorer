import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ROLE_LABELS } from '@/lib/rbac';
import { MODULE_OPTIONS, STATUS_OPTIONS } from '@/lib/help/helpApi';

function Field({ label, children }) {
  return <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}

function Pick({ value, onChange, options }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
      <SelectContent>{options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
    </Select>
  );
}

export default function ArticleMetaFields({ form, set, categories }) {
  const toggleRole = (r) => set('roles', form.roles.includes(r) ? form.roles.filter((x) => x !== r) : [...form.roles, r]);
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Field label="Category"><Pick value={form.category_slug || 'none'} onChange={(v) => set('category_slug', v === 'none' ? '' : v)} options={[{ value: 'none', label: 'Choose...' }, ...categories.map((c) => ({ value: c.slug, label: c.name }))]} /></Field>
      <Field label="Status"><Pick value={form.status} onChange={(v) => set('status', v)} options={STATUS_OPTIONS} /></Field>
      <Field label="Audience"><Pick value={form.audience} onChange={(v) => set('audience', v)} options={[{ value: 'public', label: 'Public (anyone)' }, { value: 'signed_in', label: 'Signed-in users' }, { value: 'roles', label: 'Specific roles' }]} /></Field>
      <Field label="Module gate (optional)"><Pick value={form.module_gate || 'none'} onChange={(v) => set('module_gate', v === 'none' ? '' : v)} options={[{ value: 'none', label: 'No module required' }, ...MODULE_OPTIONS.map((m) => ({ value: m.key, label: m.label }))]} /></Field>
      {form.audience === 'roles' && (
        <div className="sm:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-2 rounded-lg border border-border p-3">
          {Object.entries(ROLE_LABELS).map(([r, label]) => (
            <label key={r} className="flex items-center gap-2 text-sm min-h-[32px]"><Checkbox checked={form.roles.includes(r)} onCheckedChange={() => toggleRole(r)} /> {label}</label>
          ))}
        </div>
      )}
      <Field label="Owner (email)"><Input type="email" value={form.owner} onChange={(e) => set('owner', e.target.value)} /></Field>
      <Field label="Review every (days)"><Input type="number" inputMode="numeric" value={form.review_interval_days} onChange={(e) => set('review_interval_days', Number(e.target.value))} /></Field>
      <Field label="Last reviewed"><Input type="date" value={form.last_reviewed || ''} onChange={(e) => set('last_reviewed', e.target.value)} /></Field>
      <Field label="Slug"><Input value={form.slug} onChange={(e) => set('slug', e.target.value)} placeholder="auto from title" /></Field>
      <div className="sm:col-span-2"><Field label="Search keywords and synonyms (comma separated)"><Input value={form.keywords.join(', ')} onChange={(e) => set('keywords', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))} /></Field></div>
      <div className="sm:col-span-2"><Field label="Related article slugs (comma separated)"><Input value={form.related_slugs.join(', ')} onChange={(e) => set('related_slugs', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))} /></Field></div>
    </div>
  );
}