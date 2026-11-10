import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Public endpoint: validates a demo access token (from an invite/approval email)
// and returns the matching request so the GuidedTour can gate access.
// Also tracks when the recipient first opens the link (invite_opened_date).
// No auth required — the token itself is the credential.

export default async function(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { token, email } = body;

    if (!token && !email) {
      return Response.json({ valid: false, error: 'Token or email required' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole;

    // Query without status filter — we accept invited, opened, approved, and trial_in_progress
    let filter = {};
    if (token) {
      filter = { access_token: token };
    } else {
      filter = { email };
    }

    const rows = await svc.entities.DemoAccessRequest.filter(filter);
    // Find the first record that is not denied
    const match = (rows || []).find((r) => r.status !== 'denied');

    if (!match) {
      return Response.json({ valid: false });
    }

    // Track link open: set invite_opened_date and bump status to "opened" if currently "invited"
    if (match.status === 'invited' || (match.status === 'approved' && !match.invite_opened_date)) {
      try {
        const updateData = { invite_opened_date: new Date().toISOString() };
        if (match.status === 'invited') {
          updateData.status = 'opened';
        }
        await svc.entities.DemoAccessRequest.update(match.id, updateData);
      } catch { /* best-effort tracking */ }
    }

    return Response.json({
      valid: true,
      name: match.name,
      email: match.email,
      club_name: match.club_name,
      sport: match.sport,
    });
  } catch (error) {
    console.error('validate-demo-access error:', error);
    return Response.json({ valid: false, error: error.message }, { status: 500 });
  }
}