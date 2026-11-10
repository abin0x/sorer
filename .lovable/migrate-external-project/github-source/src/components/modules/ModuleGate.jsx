import React from 'react';
import { Loader2 } from 'lucide-react';
import { useModuleAccess } from '@/lib/useModuleAccess';
import { useTenant } from '@/lib/TenantContext';
import { MODULES } from '@/components/features/moduleData';
import { canonicalModuleKey } from '@/lib/moduleAccess';
import ModuleLockedScreen from '@/components/modules/ModuleLockedScreen';

export default function ModuleGate({ moduleKey, title, description, children }) {
  const tenant = useTenant();
  const { hasModule, loading } = useModuleAccess();
  const key = canonicalModuleKey(moduleKey);
  if (tenant.isSystemUser && !tenant.effectiveClubId) return children;
  if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  if (hasModule(key)) return children;
  const definition = MODULES.find(m => m.key === key);
  return <ModuleLockedScreen title={title || definition?.title || 'Module'} description={description} baseRequired={key !== 'club_nexus' && !hasModule('club_nexus')} />;
}