// @ts-nocheck
import { createClientFromRequest } from '@/legacy-functions/_sdk';
import { buildClubDigest, adminEmails, BODIES_LABEL } from '../../shared/compliance.ts';

const bodyLabel = (k: string) => (BODIES_LABEL as any)[k] || k;

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user || (user.role !== 'admin' && user.system_role !== 'system_owner' && user.system_role !== 'system_admin')) {
      const auth = req.headers.get('authorization') || '';
      if (!Deno.env.get('CRON_SECRET') || auth !== `Bearer ${Deno.env.get('CRON_SECRET')}`) return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    const db = base44.asServiceRole.entities;
    const body = await req.json().catch(() => ({}));
    const clubId = body.club_id || user?.club_id;
    if (clubId) {
      const digest = await buildClubDigest(db, clubId);
      const emails = await adminEmails(db, clubId, undefined, true);
      for (const e of emails) {
        await base44.integrations.Core.SendEmail({
          to: e, template_name: 'ComplianceDigest',
          variables: { ...digest, recipient_email: e, bodies: digest.bodies.map(bodyLabel).join(', ') || 'None set' },
        }).catch((err: Error) => console.error('digest email failed', e, err.message));
      }
      return Response.json({ sent: emails.length, digest });
    }
    // No club specified: send to every club with settings.
    const settings = await db.ComplianceSettings.filter({}, { limit: 1000 });
    const list = Array.isArray(settings) ? settings : settings.items || [];
    let sent = 0;
    for (const s of list) {
      if (!s.governing_bodies?.length) continue;
      const digest = await buildClubDigest(db, s.club_id);
      const emails = await adminEmails(db, s.club_id, undefined, true);
      for (const e of emails) {
        await base44.integrations.Core.SendEmail({
          to: e, template_name: 'ComplianceDigest',
          variables: { ...digest, recipient_email: e, bodies: digest.bodies.map(bodyLabel).join(', ') || 'None set' },
        }).catch((err: Error) => console.error('digest email failed', e, err.message));
        sent++;
      }
    }
    return Response.json({ clubs: list.length, sent });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}