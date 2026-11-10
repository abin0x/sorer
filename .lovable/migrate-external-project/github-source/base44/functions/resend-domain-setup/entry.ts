import { createClientFromRequest } from 'npm:@base44/sdk@0.8.48';
import { getResendApiKey } from '../../shared/clubCredentials.ts';

// Registers a custom sending domain in Resend for the current club.
// Returns the DNS records the club must add at their DNS provider.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!user.club_id) return Response.json({ error: 'Your user is not associated with a club.' }, { status: 400 });

    const body = await req.json();
    const { domainName } = body;
    if (!domainName) return Response.json({ error: 'Domain name is required' }, { status: 400 });

    const RESEND_API_KEY = await getResendApiKey(base44, user.club_id);
    if (!RESEND_API_KEY) return Response.json({ error: 'Resend API key not configured. Add your Resend API key first.' }, { status: 500 });

    // Create the domain in Resend
    const createRes = await fetch('https://api.resend.com/domains', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: domainName }),
    });

    const data = await createRes.json();
    if (!createRes.ok) {
      console.error('Resend domain create failed:', data);
      return Response.json({ error: data.message || 'Failed to create domain in Resend' }, { status: 400 });
    }

    // Save the domain id and status on the club
    await base44.asServiceRole.entities.Club.update(user.club_id, {
      resend_domain_id: data.id,
      resend_domain_name: domainName,
      resend_domain_status: 'pending',
    });

    return Response.json({
      success: true,
      domainId: data.id,
      domainName,
      status: data.status || 'pending',
      records: data.records || [],
    });
  } catch (error) {
    console.error('resend-domain-setup error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}