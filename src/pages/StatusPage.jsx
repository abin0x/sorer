import React from 'react';
import { Link } from '@/lib/router-compat';
import { Loader2, ShieldCheck, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { usePublicStatus, SEVERITY_COLORS, STATUS_COLORS } from '@/lib/systemHealthApi';
import { Badge } from '@/components/ui/badge';

export default function StatusPage() {
  const { data: incidents = [], isLoading } = usePublicStatus();
  const active = incidents.filter((i) => i.status !== 'resolved');
  const recent = incidents.filter((i) => i.status === 'resolved').slice(0, 5);
  const allOk = !active.length;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-primary" />
          <span className="font-bold">Club Rudder Status</span>
          <div className="flex-1" />
          <Link to="/help" className="text-sm text-primary hover:underline">Help Center</Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {isLoading ? <Loader2 className="w-6 h-6 animate-spin text-primary" /> : (
          <>
            <div className={`rounded-2xl p-6 flex items-center gap-3 ${allOk ? 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900' : 'bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900'}`}>
              {allOk ? <CheckCircle2 className="w-8 h-8 text-emerald-600" /> : <AlertTriangle className="w-8 h-8 text-orange-600" />}
              <div>
                <p className="text-lg font-bold">{allOk ? 'All systems operational' : 'Active incident in progress'}</p>
                <p className="text-sm text-muted-foreground">{allOk ? 'No issues detected right now.' : `${active.length} active incident${active.length > 1 ? 's' : ''}.`}</p>
              </div>
            </div>

            {active.map((inc) => (
              <section key={inc.id} className="rounded-2xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={SEVERITY_COLORS[inc.severity]}>{inc.severity}</Badge>
                  <Badge className={STATUS_COLORS[inc.status]}>{inc.status}</Badge>
                  <span className="font-semibold">{inc.name}</span>
                </div>
                <ul className="space-y-2 text-sm">
                  {inc.updates?.slice().reverse().map((u, idx) => (
                    <li key={idx} className="flex gap-3 pl-3 border-l-2 border-border">
                      <div><p className="font-medium">{u.status}</p><p className="text-muted-foreground">{u.message}</p><p className="text-xs text-muted-foreground mt-0.5">{new Date(u.timestamp).toLocaleString()}</p></div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}

            {recent.length > 0 && (
              <section className="space-y-2">
                <h2 className="font-semibold text-muted-foreground text-sm uppercase tracking-wider">Recent incidents</h2>
                {recent.map((inc) => (
                  <div key={inc.id} className="rounded-xl border border-border bg-card p-3">
                    <div className="flex items-center gap-2"><Badge variant="secondary">resolved</Badge><span className="font-medium text-sm">{inc.name}</span></div>
                    <p className="text-xs text-muted-foreground mt-1">Resolved {inc.end_time ? new Date(inc.end_time).toLocaleString() : ''}</p>
                  </div>
                ))}
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}