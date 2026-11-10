// @ts-nocheck
import { createClientFromRequest } from '@/legacy-functions/_sdk';
import { getResendApiKey } from '../../shared/clubCredentials.ts';

// Verifies the club's Resend sending domain (checks DNS records) and returns
// the updated status + records.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!user.club_id) return Response.json({ error: 'Your user is not associated with a club.' }, { status: 400 });

    const club = await base44.entities.Club.get(user.club_id);
    if (!club?.resend_domain_id) {
      return Response.json({ error: 'No Resend domain set up for this club' }, { status: 400 });
    }

    const RESEND_API_KEY = await getResendApiKey(base44, user.club_id);
    if (!RESEND_API_KEY) return Response.json({ error: 'Resend API key not configured' }, { status: 500 });

    // Trigger verification in Resend
    const verifyRes = await fetch(`https://api.resend.com/domains/${club.resend_domain_id}/verify`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await verifyRes.json();
    if (!verifyRes.ok) {
      console.error('Resend domain verify failed:', data);
      return Response.json({ error: data.message || 'Verification failed' }, { status: 400 });
    }

    // Fetch the latest domain status with records
    const getRes = await fetch(`https://api.resend.com/domains/${club.resend_domain_id}`, {
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}` },
    });
    const domainData = await getRes.json();

    const newStatus = domainData.status === 'verified' ? 'verified' : 'pending';
    await base44.asServiceRole.entities.Club.update(user.club_id, {
      resend_domain_status: newStatus,
    });

    return Response.json({
      success: true,
      status: newStatus,
      records: domainData.records || [],
    });
  } catch (error) {
    console.error('resend-domain-verify error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}