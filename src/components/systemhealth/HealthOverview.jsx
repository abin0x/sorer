import React from 'react';
import { Activity, AlertTriangle, ShieldCheck, TrendingDown } from 'lucide-react';
import { healthColor } from '@/lib/systemHealthApi';

function Stat({ icon: Icon, label, value, tone }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tone}`}><Icon className="w-5 h-5" /></div>
      <div><p className="text-2xl font-bold leading-none">{value}</p><p className="text-xs text-muted-foreground mt-1">{label}</p></div>
    </div>
  );
}

export default function HealthOverview({ totals, snapshots }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat icon={ShieldCheck} label="Avg health" value={`${totals.avg_health ?? 100}`} tone="bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300" />
        <Stat icon={AlertTriangle} label="Open issues" value={totals.open_issues ?? 0} tone="bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-300" />
        <Stat icon={Activity} label="P1 / P2 open" value={totals.open_p1_p2 ?? 0} tone="bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-300" />
        <Stat icon={TrendingDown} label="Need attention" value={totals.needs_attention ?? 0} tone="bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-300" />
      </div>

      {snapshots?.length > 0 && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border font-semibold flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-orange-500" /> Clubs needing attention</div>
          <ul className="divide-y divide-border">
            {snapshots.filter((s) => s.needs_attention).slice(0, 12).map((s) => (
              <li key={s.club_id} className="px-4 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{s.club_name}</p>
                  <p className="text-xs text-muted-foreground">{s.open_issues_count} open issues · {s.failed_payments_24h} failed payments · {s.failed_syncs_24h} failed syncs · {s.stalled_migrations} stalled migrations</p>
                </div>
                <span className={`text-lg font-bold ${healthColor(s.health_score)}`}>{s.health_score}</span>
              </li>
            ))}
            {snapshots.filter((s) => s.needs_attention).length === 0 && <li className="px-4 py-6 text-center text-sm text-muted-foreground">All clubs are healthy.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}