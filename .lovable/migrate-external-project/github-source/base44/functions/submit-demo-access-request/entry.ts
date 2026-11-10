import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Public endpoint: creates a pending DemoAccessRequest from the public
// /demo-access form. No auth required — unauthenticated visitors submit
// this form, so the record is created via asServiceRole to bypass RLS.

export default async function(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { name, email, club_name, sport, branch_count, message } = body;

    if (!email || !name || !club_name) {
      return Response.json({ error: 'Name, email, and club name are required' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole;

    const record = await svc.entities.DemoAccessRequest.create({
      name: name.trim(),
      email: email.trim(),
      club_name: club_name.trim(),
      sport: sport || 'Soccer',
      branch_count: branch_count || '1',
      message: (message || '').trim(),
      status: 'pending',
      source: 'request',
    });

    return Response.json({ ok: true, id: record.id });
  } catch (error) {
    console.error('submit-demo-access-request error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}