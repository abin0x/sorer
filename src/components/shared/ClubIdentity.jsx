import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useTenant } from '@/lib/TenantContext';
import { Shield } from 'lucide-react';

export default function ClubIdentity({ clubId, compact = false }) {
  const { effectiveClubId } = useTenant();
  const [failedUrl, setFailedUrl] = useState(null);
  const { data: club } = useQuery({
    queryKey: ['profile-club-brand', effectiveClubId, clubId],
    queryFn: () => base44.entities.Club.get(clubId),
    enabled: !!clubId && clubId === effectiveClubId,
  });
  if (!club || club.id !== clubId || clubId !== effectiveClubId) return null;
  return <div className="flex min-w-0 items-center gap-3">
    <div className={`${compact ? 'size-10' : 'size-16'} shrink-0 rounded-lg border border-border bg-card p-1.5 flex items-center justify-center`}>
      {club.logo_url && club.logo_url !== failedUrl ? <img src={club.logo_url} alt={`${club.name} logo`} className="size-full object-contain" onError={() => setFailedUrl(club.logo_url)} /> : <Shield className="size-6 text-primary" />}
    </div>
    <span className="text-sm font-semibold text-foreground break-words">{club.name}</span>
  </div>;
}