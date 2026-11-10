import React, { useState } from 'react';
import { Loader2, Activity, ShieldCheck, AlertTriangle } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useHealthDashboard, healthColor } from '@/lib/systemHealthApi';
import { useTenant } from '@/lib/TenantContext';
import HealthOverview from '@/components/systemhealth/HealthOverview';
import IssuesPanel from '@/components/systemhealth/IssuesPanel';
import IncidentsPanel from '@/components/systemhealth/IncidentsPanel';

export default function SystemHealth() {
  const tenant = useTenant();
  const { data, isLoading, refetch } = useHealthDashboard();
  const [tab, setTab] = useState('overview');

  if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const { totals = {}, snapshots = [], open_issues = [], active_incidents = [] } = data || {};

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><ShieldCheck className="w-6 h-6" /></div>
        <div>
          <h1 className="text-2xl font-bold">System Health</h1>
          <p className="text-sm text-muted-foreground">Issue monitoring across all clubs</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="issues">Open issues ({open_issues.length})</TabsTrigger>
          <TabsTrigger value="incidents">Incidents ({active_incidents.length})</TabsTrigger>
          <TabsTrigger value="clubs">All clubs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <HealthOverview totals={totals} snapshots={snapshots} />
        </TabsContent>

        <TabsContent value="issues" className="mt-4">
          <IssuesPanel issues={open_issues} onChanged={refetch} />
        </TabsContent>

        <TabsContent value="incidents" className="mt-4">
          <IncidentsPanel incidents={active_incidents} onChanged={refetch} />
        </TabsContent>

        <TabsContent value="clubs" className="mt-4">
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {snapshots.map((s) => (
              <li key={s.club_id} className="px-4 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{s.club_name}</p>
                  <p className="text-xs text-muted-foreground">{s.open_issues_count} issues · {s.failed_payments_24h} failed pay · {s.failed_syncs_24h} failed sync · {s.stalled_migrations} stalled</p>
                </div>
                {s.needs_attention && <AlertTriangle className="w-4 h-4 text-orange-500" />}
                <span className={`text-lg font-bold ${healthColor(s.health_score)}`}>{s.health_score}</span>
              </li>
            ))}
          </ul>
        </TabsContent>
      </Tabs>
    </div>
  );
}