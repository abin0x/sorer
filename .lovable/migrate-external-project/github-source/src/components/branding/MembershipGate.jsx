import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useLocation } from 'react-router-dom';
import { getInviteToken, processInviteToken } from '@/lib/inviteProcessing';
import ClubChoice from '@/components/branding/ClubChoice';
import ClubLoadingScreen from '@/components/branding/ClubLoadingScreen';

export default function MembershipGate({ children }) {
  const { pathname } = useLocation();
  const consoleRoute = pathname.toLowerCase() === '/saasadmin';
  const [state, setState] = useState({ loading: true, clubs: [], userId: '', error: '' });
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const user = await base44.auth.me();
        if (consoleRoute && (user.system_role || user.is_super_admin || user.role === 'admin')) {
          if (active) setState({ loading: false, clubs: [], userId: user.id, error: '' });
          return;
        }
        const redirect = await processInviteToken(getInviteToken());
        if (redirect) { window.location.replace(redirect); return; }
        const res = await base44.functions.invoke('get-user-clubs');
        if (active) setState({ loading: false, clubs: res.data.clubs || [], userId: user.id, error: '' });
      } catch (e) { if (active) setState({ loading: false, clubs: [], userId: '', error: e.response?.data?.error || e.message }); }
    })();
    return () => { active = false; };
  }, [consoleRoute]);
  if (state.error) return <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6"><p role="alert" className="text-destructive">{state.error}</p><button onClick={() => base44.auth.logout('/login')} className="text-primary underline">Sign in with your invited account</button></div>;
  if (state.loading) return <ClubLoadingScreen title="Connecting your club access…" detail="Confirming your invitation and membership." />;
  if (state.clubs.length > 1 && sessionStorage.getItem('club-choice-user') !== state.userId) return <ClubChoice clubs={state.clubs} userId={state.userId} />;
  return children;
}