import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { getInviteToken, returnToWithInvite } from '@/lib/inviteProcessing';
import { safeReturnTo } from '@/lib/authReturnTo';

export default function useInvitationAuth(mode, setEmail) {
  const [state, setState] = useState({ loading: !!getInviteToken(), details: null, error: '' });
  useEffect(() => {
    const token = getInviteToken();
    if (!token) return;
    let active = true;
    base44.functions.invoke('getInvitationDetails', { token }).then(({ data }) => {
      if (!active) return;
      if (data.error) throw new Error(data.error);
      const target = data.account_exists ? 'login' : 'register';
      if (target !== mode) {
        const params = new URLSearchParams({ invite: token, returnTo: returnToWithInvite(safeReturnTo()) });
        window.location.replace(`/${target}?${params}`);
        return;
      }
      setEmail(data.email);
      setState({ loading: false, details: data, error: '' });
    }).catch(e => { if (active) setState({ loading: false, details: null, error: e.response?.data?.error || e.message }); });
    return () => { active = false; };
  }, [mode, setEmail]);
  return state;
}