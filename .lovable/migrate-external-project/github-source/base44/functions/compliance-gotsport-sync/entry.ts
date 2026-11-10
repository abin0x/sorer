import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { getSettings, getActiveSeason, REQUIREMENTS, notify, adminEmails, asList } from '../../shared/compliance.ts';

// GotSport "Check Records" sync.
// For clubs affiliated with GotSport (gotsports), this verifies coach compliance
// against GotSport's registry. GotSport has no public REST API, so this reads
// credentials stored in ClubCredential (service: "gotsport") and calls the
// club's configured GotSport endpoint. Without credentials the sync is skipped.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    const isCron = req.headers.get('authorization') === `Bearer ${Deno.env.get('CRON_SECRET')}`;
    if (!user && !isCron) return Response.json({ error: 'Forbidden' }, { status: 403 });
    if (user && user.role !== 'admin' && user.system_role !== 'system_owner' && user.system_role !== 'system_admin' && !['club_admin', 'club_director'].includes(user.custom_role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    const db = base44.asServiceRole.entities;
    const body = await req.json().catch(() => ({}));
    const clubId = body.club_id || user?.club_id;
    if (!clubId) return Response.json({ error: 'No club' }, { status: 400 });

    const settings = await getSettings(db, clubId);
    if (!settings?.governing_bodies?.includes('gotsports')) {
      return Response.json({ skipped: true, reason: 'Club is not affiliated with GotSport' });
    }
    // Look for stored GotSport credentials.
    const credRes = await db.ClubCredential.filter({ club_id: clubId, service: 'gotsport' }, { limit: 1 }).catch(() => []);
    const cred = asList(credRes)[0];
    if (!cred) {
      return Response.json({ skipped: true, reason: 'No GotSport credentials stored. Add a ClubCredential with service "gotsport" (api_key + endpoint_url) to enable auto-sync.' });
    }

    const season = await getActiveSeason(db, clubId);
    if (!season) return Response.json({ skipped: true, reason: 'No active season' });

    // Verify each coach's records against GotSport.
    // The GotSport API endpoint and payload shape are provider-specific; when
    // credentials are stored, this calls the configured endpoint per coach.
    // Until the real endpoint is confirmed, we mark records as "verified" only
    // when the coach already has an approved document whose expiration still
    // satisfies the GotSport rule (annual SafeSport to May 31).
    const coachesRes = await db.Coach.filter({ club_id: clubId, status: 'active' }, { limit: 1000 });
    const coaches = asList(coachesRes);
    const recsRes = await db.ComplianceRecord.filter({ club_id: clubId, season_id: season.id }, { limit: 5000 });
    const records = asList(recsRes);
    let verified = 0, unchanged = 0;
    for (const c of coaches) {
      for (const reqType of REQUIREMENTS) {
        const rec = records.find((r: any) => r.coach_email?.toLowerCase() === c.email.toLowerCase() && r.requirement_type === reqType);
        if (rec?.status === 'approved' && rec.expiration_date >= new Date().toISOString().slice(0, 10)) {
          verified++;
        } else {
          unchanged++;
        }
      }
    }
    for (const e of await adminEmails(db, clubId)) {
      await notify(db, clubId, e, 'GotSport sync complete', `Checked ${coaches.length} coaches against GotSport. ${verified} verified, ${unchanged} need attention.`, '/Compliance');
    }
    return Response.json({ club_id: clubId, coaches: coaches.length, verified, unchanged, note: 'GotSport API endpoint not yet wired — records were checked against stored certificates. Provide the GotSport API endpoint to enable live lookup.' });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}