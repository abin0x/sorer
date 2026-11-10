import { base44, setEffectiveClubId, _resetCachedClubId } from "@/api/base44Client";
import { ROLE_ONBOARD_PATH } from "@/lib/onboardingRoles";

export function getInviteToken() {
  const params = new URLSearchParams(window.location.search);
  const nested = new URL(params.get('returnTo') || '/home', window.location.origin);
  const token = params.get('invite') || nested.searchParams.get('invite');
  if (token) localStorage.setItem('pending_invite_token', token);
  return token || localStorage.getItem('pending_invite_token');
}

export async function processInviteToken(token) {
  const res = await base44.functions.invoke('applyPendingInvitation', { token: token || null });
  const data = res.data;
  if (data?.error) throw new Error(data.error);
  if (token) localStorage.removeItem('pending_invite_token');
  if (!data?.applied) return null;
  _resetCachedClubId();
  setEffectiveClubId(data.club_id);
  sessionStorage.removeItem('viewingTenant');
  const target = ROLE_ONBOARD_PATH[data.pendingOnboarding?.[0]] || '/home';
  return window.location.pathname === target && !window.location.search.includes('invite=') ? null : target;
}

export function returnToWithInvite(fallback = '/home') {
  const token = getInviteToken();
  if (!token) return fallback;
  const url = new URL(fallback, window.location.origin);
  url.searchParams.set('invite', token);
  return url.pathname + url.search;
}