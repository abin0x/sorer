import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useActiveIncidents } from '@/lib/systemHealthApi';
import { useTenant } from '@/lib/TenantContext';

// Shows a banner for any active incident that is platform-wide or affects
// the current user's club. Used inside the app Layout and on /help.
export default function IncidentBanner({ publicOnly = false }) {
  const { data: incidents = [] } = useActiveIncidents();
  const tenant = useTenant();
  const [dismissed, setDismissed] = React.useState({});

  if (!incidents.length) return null;

  const visible = incidents.filter((inc) => {
    if (inc.status === 'resolved' || !inc.show_banner) return false;
    if (publicOnly) return !inc.affected_club_ids?.length; // platform-wide only on public pages
    if (!inc.affected_club_ids?.length) return true; // platform-wide
    return tenant.effectiveClubId && inc.affected_club_ids.includes(tenant.effectiveClubId);
  }).filter((inc) => !dismissed[inc.id]);

  if (!visible.length) return null;
  const inc = visible[0];

  return (
    <div className="bg-orange-50 dark:bg-orange-950/40 border-b border-orange-200 dark:border-orange-900 text-orange-800 dark:text-orange-200 text-sm">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <p className="flex-1 min-w-0"><span className="font-semibold">{inc.name}:</span> {inc.banner_message || inc.updates?.[inc.updates.length - 1]?.message || 'We are investigating a service issue.'}</p>
        <a href="/status" className="underline shrink-0 hidden sm:inline">Status</a>
        <button onClick={() => setDismissed((d) => ({ ...d, [inc.id]: true }))} className="p-1 min-w-[32px] min-h-[32px] rounded hover:bg-orange-100 dark:hover:bg-orange-900" aria-label="Dismiss"><X className="w-3.5 h-3.5" /></button>
      </div>
    </div>
  );
}