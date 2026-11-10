// @ts-nocheck
import { createClientFromRequest } from '@/legacy-functions/_sdk';

const ADMIN_ROLES = ['master_admin', 'admin', 'club_director', 'club_admin'];

// Saves the club's own Resend.com API key in ClubCredential (admin-only).
// Optionally validates by listing domains.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const systemUser = !!(user.system_role || user.is_super_admin === true || user.role === 'admin');
    if (!systemUser && !ADMIN_ROLES.includes(user.custom_role)) {
      return Response.json({ error: 'Forbidden — admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const clubId = systemUser && body.club_id ? String(body.club_id) : user.club_id;
    if (!clubId) return Response.json({ error: 'Select a club before configuring email.' }, { status: 400 });
    const apiKey = String(body.apiKey || '').trim();
    const domainName = String(body.domainName || '').trim().toLowerCase();
    if (!apiKey || !apiKey.startsWith('re_')) {
      return Response.json({ error: 'A valid Resend API key (starting with re_) is required.' }, { status: 400 });
    }

    // Validate by listing domains
    const res = await fetch('https://api.resend.com/domains', {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const msg = data.message || `Resend rejected this API key (${res.status}).`;
      return Response.json({ error: msg }, { status: 400 });
    }

    let domain;
    if (domainName) {
      const domains = await res.json();
      const match = domains.data?.find((item) => item.name?.toLowerCase() === domainName);
      if (!match) return Response.json({ error: 'This domain is not in this Resend account. Add and verify it in Resend first.' }, { status: 400 });
      const detail = await fetch(`https://api.resend.com/domains/${encodeURIComponent(match.id)}`, {
        headers: { Authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(15000),
      });
      domain = await detail.json();
      if (!detail.ok || domain.status !== 'verified') return Response.json({ error: 'The sending domain is not verified yet. Complete its DNS verification in Resend, then try again.' }, { status: 400 });
    }
    // Upsert ClubCredential
    const existing = await base44.asServiceRole.entities.ClubCredential.filter({ club_id: clubId });
    const cred = existing?.[0];
    const credData = {
      club_id: clubId,
      resend_api_key: apiKey,
    };
    if (cred) {
      await base44.asServiceRole.entities.ClubCredential.update(cred.id, credData);
    } else {
      await base44.asServiceRole.entities.ClubCredential.create(credData);
    }

    if (domain) {
      await base44.asServiceRole.entities.Club.update(clubId, {
        resend_domain_id: domain.id, resend_domain_name: domainName, resend_domain_status: 'verified',
      });
    }
    return Response.json({ success: true });
  } catch (error) {
    console.error('saveResendApiKey error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}