import React, { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import CriticalActionsBar from "./CriticalActionsBar";
import UrgentAlertsPanel from "./UrgentAlertsPanel";
import TenantDirectory from "./TenantDirectory";
import TenantDetailDrawer from "./TenantDetailDrawer";
import { useOpsData } from "./useOpsData";

// Action-driven system-owner landing: critical actions up top, urgent alerts,
// then a searchable tenant directory. Selecting a tenant opens a detail drawer
// with lifecycle, usage/limits, modules, migration, and connection health.
export default function TenantOpsDashboard({ clubs, plans, loading, onTabChange, onReload, onProvision }) {
  const { toast } = useToast();
  const [user, setUser] = React.useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const searchRef = useRef(null);

  React.useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);

  const ops = useOpsData(clubs);
  const selectedClub = clubs.find((c) => c.id === selectedId) || null;

  const focusSearch = () => searchRef.current?.querySelector("input")?.focus();
  const handleProvision = () => { if (onProvision) onProvision(); else onTabChange("tenants"); };

  return (
    <div className="space-y-5">
      <CriticalActionsBar user={user} clubs={clubs} alerts={ops.alerts} onProvision={handleProvision} onTabChange={onTabChange} onFocusSearch={focusSearch} />

      <div className="grid lg:grid-cols-[1fr_320px] gap-5">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-700">Tenant Directory</h3>
            {ops.loading && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
          </div>
          <TenantDirectory clubs={clubs} counts={ops.counts} loading={loading} searchRef={searchRef} onSelect={setSelectedId} selectedId={selectedId} />
        </div>
        <UrgentAlertsPanel alerts={ops.alerts} loading={ops.loading} onSelectTenant={setSelectedId} onTabChange={onTabChange} />
      </div>

      <TenantDetailDrawer
        club={selectedClub}
        counts={ops.counts}
        latestMigration={ops.latestMigration}
        plans={plans}
        onEdit={() => { setSelectedId(null); onTabChange("tenants"); }}
        onReload={onReload}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}