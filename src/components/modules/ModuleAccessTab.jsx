import React, { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import StripeConnectionCard from "@/components/modules/StripeConnectionCard";
import QuickBooksConnectionCard from "@/components/modules/QuickBooksConnectionCard";
import { MODULES } from "@/components/features/moduleData";
import TenantModuleRow from "@/components/modules/TenantModuleRow";
import { Button } from "@/components/ui/button";
import { MODULE_KEYS } from '@/lib/moduleRegistry';
const CONSOLE_MODULES = MODULES.filter(module => MODULE_KEYS.includes(module.key));



export default function ModuleAccessTab({ clubs = [] }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [updating, setUpdating] = useState({});
  const [error, setError] = useState("");

  const { data: tenantModules = [], isLoading: tmLoading, isError: loadFailed, error: loadError, refetch } = useQuery({
    queryKey: ["tenantModulesAll", clubs.map(c => c.id).join(',')],
    queryFn: async () => {
      const response = await base44.functions.invoke('setModuleStatus', { action: 'list', club_ids: clubs.map(c => c.id) });
      if (response.data?.error) throw new Error(response.data.error);
      if (!Array.isArray(response.data?.records)) throw new Error('Module access records were not returned.');
      return response.data.records;
    },
    enabled: clubs.length > 0,
    retry: 1,
  });

  const moduleLookup = useMemo(() => {
    const map = new Map();
    for (const m of tenantModules) {
      if (!map.has(`${m.club_id}:${m.module_key}`)) map.set(`${m.club_id}:${m.module_key}`, m);
    }
    return map;
  }, [tenantModules]);

  const accessQueryKey = ['tenantModulesAll', clubs.map(c => c.id).join(',')];

  const filteredClubs = useMemo(() => {
    if (!search) return clubs;
    return clubs.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));
  }, [clubs, search]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["tenantModulesAll"] });
    qc.invalidateQueries({ queryKey: ["tenantModules"] });
    qc.invalidateQueries({ queryKey: ["entitlementEvents"] });
  };

  const handleStatusChange = async (clubId, clubName, moduleKey, moduleName, enabled) => {
    const key = `${clubId}:${moduleKey}`;
    setUpdating(p => ({ ...p, [key]: true }));
    setError('');
    await qc.cancelQueries({ queryKey: accessQueryKey });
    const previous = (qc.getQueryData(accessQueryKey) || []).filter(r => r.club_id === clubId && r.module_key === moduleKey);
    const replace = records => qc.setQueryData(accessQueryKey, (rows = []) => [...records, ...rows.filter(r => !(r.club_id === clubId && r.module_key === moduleKey))]);
    replace([{ ...previous[0], club_id: clubId, module_key: moduleKey, status: enabled ? 'active' : 'expired', admin_enabled: enabled }]);
    try {
      const res = await base44.functions.invoke('setModuleStatus', { club_id: clubId, module_key: moduleKey, enabled });
      if (res.data.error) throw new Error(res.data.error);
      replace([res.data.record]);
      toast.success(`${moduleName} ${enabled ? 'enabled' : 'disabled'} for ${clubName}`);
      refresh();
    } catch (e) {
      replace(previous);
      const message = e.response?.data?.error || e.message;
      setError(`${moduleName} for ${clubName}: ${message}`);
      toast.error(message);
    } finally {
      setUpdating(p => ({ ...p, [key]: false }));
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <StripeConnectionCard />
        <QuickBooksConnectionCard />
      </div>

      {loadFailed && <div role="alert" className="space-y-3 border border-destructive rounded-md p-4">
        <p className="text-destructive">Saved module access could not be loaded. {loadError?.message}</p>
        <Button variant="outline" onClick={() => refetch()}>Try again</Button>
      </div>}
      {tmLoading && <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search tenants…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {error && <p role="alert" className="text-destructive border border-destructive rounded-md p-3">{error}</p>}

      <div className="bg-muted border border-border rounded-lg p-4 text-sm text-muted-foreground">
        Switch a module on to approve access, or off to remove access and its tenant menu items. Club Nexus must be on to use any other module. These switches manage access only; they do not charge or cancel billing subscriptions.
      </div>

      {!loadFailed && !tmLoading && <div className="overflow-x-auto border border-border rounded-xl">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left font-semibold px-4 py-3 w-44">Tenant</th>
              <th className="text-left font-semibold px-4 py-3">Module access — On / Off</th>
            </tr>
          </thead>
          <tbody>
            {filteredClubs.map((club) => (
              <TenantModuleRow
                key={club.id}
                club={club}
                modules={CONSOLE_MODULES}
                lookup={moduleLookup}
                updating={updating}
                onChange={handleStatusChange}
              />
            ))}
            {filteredClubs.length === 0 && (
              <tr>
                <td colSpan={2} className="text-center py-8 text-muted-foreground">No tenants found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>}
    </div>
  );
}