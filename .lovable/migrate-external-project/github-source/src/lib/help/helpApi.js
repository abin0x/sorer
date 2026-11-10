import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { ROLE_LABELS } from '@/lib/rbac';

export async function kb(action, payload = {}) {
  const res = await base44.functions.invoke('kb', { action, ...payload });
  return res.data;
}

/** Current viewer (null when signed out). Cached across Help pages. */
export function useViewer() {
  return useQuery({
    queryKey: ['helpViewer'],
    queryFn: () => base44.auth.me().catch(() => null),
    staleTime: 5 * 60 * 1000,
  });
}

export function isHelpAdmin(user) {
  return !!user && (user.role === 'admin' || user.is_super_admin === true || ['system_owner', 'system_admin'].includes(user.system_role));
}

export function audienceLabel(article) {
  if (article.audience === 'signed_in') return 'All signed-in users';
  if (article.audience === 'roles') {
    const labels = (article.roles || []).map((r) => ROLE_LABELS[r] || r);
    return labels.length ? labels.join(', ') : 'Specific roles';
  }
  return 'Everyone';
}

export const todayStr = () => new Date().toISOString().slice(0, 10);

export function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + Number(days || 0));
  return d.toISOString().slice(0, 10);
}

export const slugify = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);

/** Strip scripts and inline handlers from authored HTML before rendering. */
export function cleanHtml(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/javascript:/gi, '');
}

export const MODULE_OPTIONS = [
  { key: 'club_nexus', label: 'Club Nexus (core)' },
  { key: 'payments', label: 'Payments and events' },
  { key: 'communication', label: 'Communication' },
  { key: 'development', label: 'Player Development' },
  { key: 'facilities', label: 'Facility Management' },
  { key: 'tournaments', label: 'Tournaments' },
  { key: 'kanban', label: 'Project management' },
  { key: 'branding', label: 'Marketing and email' },
];

export const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'in_review', label: 'In review' },
  { value: 'published', label: 'Published' },
  { value: 'needs_update', label: 'Needs update' },
];