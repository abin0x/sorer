// @ts-nocheck
import { createClientFromRequest } from '@/legacy-functions/_sdk';
import { createClubInvite, isValidEmail } from '../../shared/clubInvite.ts';

// PUBLIC: the website's "Create your club" form. Creates the same invite as the
// system-owner flow. Plan and modules are fixed defaults; visitors cannot choose them.

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const b = (await req.json()) || {};
    if (b.website) return Response.json({ ok: true }); // honeypot: bots fill this, humans never see it

    const clubName = String(b.club_name || '').trim();
    const adminName = String(b.admin_name || '').trim();
    const email = String(b.admin_email || '').trim().toLowerCase();
    if (!clubName || !adminName || !isValidEmail(email)) {
      return Response.json({ error: 'Club name, your name and a valid email are required' }, { status: 400 });
    }

    const result = await createClubInvite(base44, {
      origin: 'self_serve',
      inviter: null,
      club_name: clubName,
      admin_name: adminName,
      admin_email: email,
      source_system: String(b.source_system || '').trim().slice(0, 80),
    });
    // Never return tokens or club records to an anonymous caller.
    return Response.json({ ok: true, emailSent: result.emailSent !== false });
  } catch (error) {
    console.error('create-your-club error:', error);
    return Response.json({ error: 'We could not create your club right now. Please try again.' }, { status: 500 });
  }
}