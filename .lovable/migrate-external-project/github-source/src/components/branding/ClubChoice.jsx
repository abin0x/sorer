import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import ClubLogo from '@/components/branding/ClubLogo';
import { ROLE_ONBOARD_PATH } from '@/lib/onboardingRoles';

export default function ClubChoice({ clubs, userId }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const choose = async (club) => {
    setBusy(true); setError('');
    try {
      const { data } = await base44.functions.invoke('switchClub', { club_id: club.club_id });
      sessionStorage.setItem('club-choice-user', userId);
      sessionStorage.removeItem('viewingTenant');
      window.location.href = ROLE_ONBOARD_PATH[data.pendingOnboarding?.[0]] || '/home';
    } catch (e) { setError(e.response?.data?.error || e.message); setBusy(false); }
  };
  return <div className="min-h-screen bg-background flex items-center justify-center p-6">
    <div className="w-full max-w-md space-y-4"><h1 className="text-2xl font-bold">Choose your club</h1>
      <p className="text-muted-foreground">Choose where to work today. You can switch clubs at any time.</p>
      {error && <p role="alert" className="text-destructive">{error}</p>}
      {clubs.map(club => <Button key={club.club_id} variant="outline" disabled={busy} onClick={() => choose(club)} className="w-full h-auto justify-start p-4 gap-3 whitespace-normal">
        <ClubLogo primaryColor={club.primary_color} size={36} /><span className="text-left"><span className="block font-semibold">{club.club_name}</span><span className="block text-xs text-muted-foreground">{club.role_label || club.role}</span></span>
      </Button>)}
    </div>
  </div>;
}