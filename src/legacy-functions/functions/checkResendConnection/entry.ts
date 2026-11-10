// @ts-nocheck
import { createClientFromRequest } from '@/legacy-functions/_sdk';
import { getResendApiKey } from '../../shared/clubCredentials.ts';

// Lightweight check used by the invite dialog to show a live "email connected" badge
// before letting the admin send anything.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!user.club_id) return Response.json({ connected: false, reason: 'no_club' });

    const resendKey = await getResendApiKey(base44, user.club_id);
    if (!resendKey) return Response.json({ connected: false, reason: 'not_configured' });

    const res = await fetch('https://api.resend.com/domains', {
      headers: { Authorization: `Bearer ${resendKey}` },
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return Response.json({ connected: false, reason: 'invalid_key', detail: errData?.message || res.statusText });
    }

    return Response.json({ connected: true });
  } catch (error) {
    console.error('checkResendConnection error:', error);
    return Response.json({ connected: false, reason: 'error', detail: error.message });
  }
}