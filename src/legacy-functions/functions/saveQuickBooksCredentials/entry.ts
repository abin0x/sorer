// @ts-nocheck
import { createClientFromRequest } from '@/legacy-functions/_sdk';

const ADMIN_ROLES = ['master_admin', 'admin', 'club_director', 'club_admin'];

// Saves the club's own QuickBooks/Intuit OAuth client ID and secret in
// ClubCredential (admin-only). These are used by the OAuth initiate and
// callback functions, falling back to platform env vars if not set.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!user.club_id) return Response.json({ error: 'Your user is not associated with a club.' }, { status: 400 });
    if (user.role !== 'admin' && !ADMIN_ROLES.includes(user.custom_role)) {
      return Response.json({ error: 'Forbidden — admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { clientId, clientSecret } = body;
    if (!clientId || !clientSecret) {
      return Response.json({ error: 'QuickBooks Client ID and Client Secret are both required.' }, { status: 400 });
    }

    // Upsert ClubCredential
    const existing = await base44.asServiceRole.entities.ClubCredential.filter({ club_id: user.club_id });
    const cred = existing?.[0];
    const credData = {
      club_id: user.club_id,
      quickbooks_client_id: clientId,
      quickbooks_client_secret: clientSecret,
    };
    if (cred) {
      await base44.asServiceRole.entities.ClubCredential.update(cred.id, credData);
    } else {
      await base44.asServiceRole.entities.ClubCredential.create(credData);
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('saveQuickBooksCredentials error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}