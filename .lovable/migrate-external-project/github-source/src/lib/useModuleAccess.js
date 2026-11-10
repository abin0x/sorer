import { useEffect } from 'react';
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTenant } from '@/lib/TenantContext';
import { base44 } from "@/api/base44Client";
import { tenantModuleHasAccess, moduleRecord } from "@/lib/moduleAccess";

/**
 * Hook for checking module access from the frontend.
 * Loads TenantModule records for the current user's club and the ModuleCatalog.
 * Returns { hasModule, modules, catalog, loading }.
 */
export function useModuleAccess() {
  const tenant = useTenant();
  const qc = useQueryClient();
  const clubId = tenant.effectiveClubId;
  const club = tenant.club?.id === clubId ? tenant.club : tenant.userClub;
  const { data: modules = [], isLoading: modulesLoading, isError } = useQuery({
    queryKey: ['tenantModules', clubId],
    queryFn: () => base44.entities.TenantModule.filter({ club_id: clubId }, '-created_date', 200),
    enabled: !!clubId,
    refetchInterval: 5000,
  });
  useEffect(() => {
    if (!clubId) return;
    return base44.entities.TenantModule.subscribe(() => qc.invalidateQueries({ queryKey: ['tenantModules', clubId] }));
  }, [clubId, qc]);
  const hasModule = key => !isError && tenantModuleHasAccess(club, modules, key);
  const getModuleStatus = key => moduleRecord(modules, key)?.status || null;

  return {
    hasModule,
    getModuleStatus,
    modules,
    loading: modulesLoading,
  };
}