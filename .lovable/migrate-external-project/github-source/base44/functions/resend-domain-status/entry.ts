import { createClientFromRequest } from 'npm:@base44/sdk@0.8.48';
import { getResendApiKey } from '../../shared/clubCredentials.ts';

// Returns the current club's Resend domain status including DNS records
// for display on the Connections page.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!user.club_id) return Response.json({ setup: false });

    const club = await base44.entities.Club.get(user.club_id);
    if (!club?.resend_domain_id) {
      return Response.json({ setup: false });
    }

    const RESEND_API_KEY = await getResendApiKey(base44, user.club_id);
    if (!RESEND_API_KEY) return Response.json({ setup: true, error: 'Resend API key not configured', status: 'failed' });

    const res = await fetch(`https://api.resend.com/domains/${club.resend_domain_id}`, {
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}` },
    });
    const data = await res.json();
    if (!res.ok) {
      return Response.json({ setup: true, error: data.message, status: 'failed' });
    }

    // Sync status to club record
    const newStatus = data.status === 'verified' ? 'verified' : 'pending';
    if (newStatus !== club.resend_domain_status) {
      await base44.asServiceRole.entities.Club.update(user.club_id, {
        resend_domain_status: newStatus,
      });
    }

    return Response.json({
      setup: true,
      domainId: club.resend_domain_id,
      domainName: club.resend_domain_name,
      status: newStatus,
      records: data.records || [],
    });
  } catch (error) {
    console.error('resend-domain-status error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}