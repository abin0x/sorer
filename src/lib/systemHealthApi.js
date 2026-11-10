import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

export const sh = (action, payload = {}) => base44.functions.invoke('tenant-health', { action, ...payload }).then((r) => r.data);
export const issueManage = (payload) => base44.functions.invoke('issue-manage', payload).then((r) => r.data);
export const incidentManage = (payload) => base44.functions.invoke('incident-manage', payload).then((r) => r.data);
export const ingestIssue = (payload) => base44.functions.invoke('issue-ingest', payload).then((r) => r.data);

export function useHealthDashboard(enabled = true) {
  return useQuery({
    queryKey: ['systemHealth'],
    queryFn: () => sh('dashboard'),
    enabled,
    staleTime: 30 * 1000,
  });
}

export function useActiveIncidents() {
  return useQuery({
    queryKey: ['activeIncidents'],
    queryFn: () => base44.entities.Incident.filter({ status: { $ne: 'resolved' }, show_banner: true }, '-start_time', 20).catch(() => []),
    staleTime: 60 * 1000,
  });
}

export function usePublicStatus() {
  return useQuery({
    queryKey: ['publicStatus'],
    queryFn: () => base44.entities.Incident.filter({ is_public: true }, '-start_time', 30).catch(() => []),
    staleTime: 60 * 1000,
  });
}

export const SEVERITY_COLORS = {
  P1: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  P2: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
  P3: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  P4: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
};

export const STATUS_COLORS = {
  monitoring: 'bg-blue-100 text-blue-700',
  identified: 'bg-amber-100 text-amber-700',
  investigating: 'bg-orange-100 text-orange-700',
  mitigated: 'bg-emerald-100 text-emerald-700',
  resolved: 'bg-slate-100 text-slate-500',
  new: 'bg-blue-100 text-blue-700',
};

export function healthColor(score) {
  if (score >= 90) return 'text-emerald-600';
  if (score >= 75) return 'text-amber-600';
  if (score >= 50) return 'text-orange-600';
  return 'text-red-600';
}