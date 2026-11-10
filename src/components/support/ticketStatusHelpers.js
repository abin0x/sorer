// Shared helpers for the support ticket UI — status colors, priority labels,
// SLA progress computation, and role checks.
import { isSystemUser, isSystemOwner } from '@/lib/rbac';

export const TICKET_STATUSES = ['new', 'open', 'pending_customer', 'escalated', 'resolved', 'closed'];

export const STATUS_LABELS = {
  new: 'New',
  open: 'Open',
  pending_customer: 'Pending Customer',
  escalated: 'Escalated',
  resolved: 'Resolved',
  closed: 'Closed',
};

export const STATUS_COLORS = {
  new: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  open: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300',
  pending_customer: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  escalated: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  resolved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
  closed: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
};

export const PRIORITY_LABELS = {
  P1: 'P1 — Critical',
  P2: 'P2 — High',
  P3: 'P3 — Normal',
  P4: 'P4 — Low',
};

export const PRIORITY_COLORS = {
  P1: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  P2: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  P3: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  P4: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
};

export const CATEGORY_LABELS = {
  billing: 'Billing & Payments',
  technical: 'Technical Issue',
  feature_request: 'Feature Request',
  account: 'Account & Access',
  data_migration: 'Data Migration',
  other: 'Other',
};

export const URGENCY_OPTIONS = [
  { value: 'P1', label: 'P1 — Urgent (blocking all work)' },
  { value: 'P2', label: 'P2 — High (blocking some work)' },
  { value: 'P3', label: 'P3 — Normal (need help soon)' },
  { value: 'P4', label: 'P4 — Low (question or minor issue)' },
];

export const CATEGORY_OPTIONS = [
  { value: 'billing', label: 'Billing & Payments' },
  { value: 'technical', label: 'Technical Issue' },
  { value: 'feature_request', label: 'Feature Request' },
  { value: 'account', label: 'Account & Access' },
  { value: 'data_migration', label: 'Data Migration' },
  { value: 'other', label: 'Other' },
];

/** True if the current user can access the system support console. */
export function canAccessConsole(user) {
  if (!user) return false;
  if (isSystemOwner(user) || isSystemUser(user)) return true;
  if (user.role === 'admin') return true;
  return false;
}

/** Compute SLA progress percentage for display (0-100). */
export function slaProgress(ticket) {
  if (!ticket.sla_resolution_deadline) return { pct: 0, breached: false, label: 'No SLA' };
  const created = new Date(ticket.created_date).getTime();
  const paused = ticket.sla_paused_at ? new Date(ticket.sla_paused_at).getTime() : null;
  const ref = paused || Date.now();
  const elapsed = ref - created - (ticket.sla_total_paused_seconds || 0) * 1000;
  const dl = new Date(ticket.sla_resolution_deadline).getTime();
  if (dl <= created) return { pct: 100, breached: true, label: 'Breached' };
  const pct = Math.min(100, (elapsed / (dl - created)) * 100);
  const breached = elapsed >= dl - created;
  return {
    pct: Math.round(pct),
    breached,
    label: ticket.status === 'pending_customer' ? 'Paused' : breached ? 'Breached' : `${Math.round(pct)}%`,
  };
}

/** Format a date for compact display. */
export function formatDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

/** Relative time (e.g., "3h ago", "2d ago"). */
export function relativeTime(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return formatDateTime(iso);
}