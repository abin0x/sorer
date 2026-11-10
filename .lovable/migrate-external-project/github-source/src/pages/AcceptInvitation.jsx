import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { getInviteToken } from '@/lib/inviteProcessing';
import ClubLoadingScreen from '@/components/branding/ClubLoadingScreen';

export default function AcceptInvitation() {
  const [error, setError] = useState('');
  useEffect(() => {
    const token = getInviteToken();
    if (!token) { setError('This invitation link is incomplete.'); return; }
    Promise.all([base44.functions.invoke('getInvitationDetails', { token }), base44.auth.isAuthenticated()]).then(([res, signedIn]) => {
      const data = res.data;
      if (data.error) throw new Error(data.error);
      const returnTo = `/home?invite=${encodeURIComponent(token)}`;
      window.location.replace(signedIn ? returnTo : `/${data.account_exists ? 'login' : 'register'}?${new URLSearchParams({ invite: token, returnTo })}`);
    }).catch(e => setError(e.response?.data?.error || e.message));
  }, []);
  return <ClubLoadingScreen title="Opening your club invitation…" error={error} onRetry={() => window.location.reload()} />;
}