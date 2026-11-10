import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { getSettings, getActiveSeason, calcExpiration, asList, audit } from '../../shared/compliance.ts';

// CSV import for compliance data from GotSport or other organizations.
// Accepts rows with: first_name, last_name, email, background_check_date, safesport_date,
// background_check_expiration, safesport_expiration, background_check_status, safesport_status.
// Matches coaches by email (preferred) or first+last name. Creates/updates ComplianceRecord
// entries for the active season. Admins can manually override status afterwards.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const allowed = user.role === 'admin' || user.system_role === 'system_owner' || user.system_role === 'system_admin'
      || ['club_admin', 'club_director', 'master_admin'].includes(user.custom_role);
    if (!allowed) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const db = base44.asServiceRole.entities;
    const body = await req.json().catch(() => ({}));
    const clubId = body.club_id || user.club_id;
    if (!clubId) return Response.json({ error: 'No club' }, { status: 400 });
    const rows: any[] = body.rows || [];
    if (!rows.length) return Response.json({ error: 'No rows provided' }, { status: 400 });

    const settings = await getSettings(db, clubId);
    const season = await getActiveSeason(db, clubId);
    if (!season) return Response.json({ error: 'No active season — create or activate a season first' }, { status: 400 });

    // Load all coaches for matching
    const coachRes = await db.Coach.filter({ club_id: clubId, status: 'active' }, { limit: 1000 });
    const coaches = asList(coachRes);
    const byEmail = {};
    const byName = {};
    for (const c of coaches) {
      if (c.email) byEmail[c.email.toLowerCase()] = c;
      const nameKey = `${(c.first_name || '').toLowerCase()}|${(c.last_name || '').toLowerCase()}`;
      byName[nameKey] = c;
    }

    // Load existing records for this season to avoid duplicates
    const recRes = await db.ComplianceRecord.filter({ club_id: clubId, season_id: season.id }, { limit: 5000 });
    const existing = asList(recRes);
    const recKey = (email, type) => existing.find((r) => r.coach_email?.toLowerCase() === email?.toLowerCase() && r.requirement_type === type);

    const governingBodies = settings?.governing_bodies?.length ? settings.governing_bodies : ['us_soccer'];
    let matched = 0, unmatched = 0, updated = 0, created = 0;
    const unmatchedRows: any[] = [];

    for (const row of rows) {
      const email = (row.email || '').toLowerCase().trim();
      const firstName = (row.first_name || '').trim();
      const lastName = (row.last_name || '').trim();
      const nameKey = `${firstName.toLowerCase()}|${lastName.toLowerCase()}`;

      const coach = byEmail[email] || byName[nameKey];
      if (!coach) {
        unmatched++;
        unmatchedRows.push({ ...row, reason: 'No matching coach found' });
        continue;
      }
      matched++;

      // Process each requirement type
      const reqs = [
        { type: 'background_check', dateField: 'background_check_date', expField: 'background_check_expiration', statusField: 'background_check_status' },
        { type: 'safesport_certification', dateField: 'safesport_date', expField: 'safesport_expiration', statusField: 'safesport_status' },
      ];

      for (const r of reqs) {
        const completionDate = row[r.dateField];
        let expirationDate = row[r.expField];
        const importStatus = (row[r.statusField] || '').toLowerCase().trim();

        if (!completionDate && !expirationDate && !importStatus) continue; // skip empty

        // Compute expiration if not provided
        if (!expirationDate && completionDate) {
          const exp = calcExpiration(r.type, completionDate, governingBodies);
          expirationDate = exp?.expiration_date || null;
        }

        // Determine status from import data
        let status = 'approved';
        if (importStatus === 'missing' || importStatus === 'none' || importStatus === 'not complete') status = 'missing';
        else if (importStatus === 'pending' || importStatus === 'in review') status = 'pending';
        else if (importStatus === 'expired') status = 'expired';
        else if (importStatus === 'flagged') status = 'flagged';
        else if (expirationDate && expirationDate < new Date().toISOString().slice(0, 10)) status = 'expired';
        else if (expirationDate) {
          const days = (new Date(expirationDate).getTime() - Date.now()) / 86400000;
          if (days <= 30 && days > 0) status = 'expiring_soon';
        }

        const existingRec = recKey(coach.email, r.type);
        const recData = {
          club_id: clubId,
          branch_id: coach.location_id,
          branch_name: coach.location_name,
          coach_id: coach.id,
          coach_email: coach.email,
          coach_name: `${coach.first_name} ${coach.last_name}`,
          season_id: season.id,
          season_name: season.name,
          governing_body: governingBodies[0],
          governing_bodies: governingBodies,
          requirement_type: r.type,
          completion_date: completionDate || null,
          expiration_date: expirationDate || null,
          status,
          submitted_at: new Date().toISOString(),
          reviewed_by: user.email,
          reviewed_at: new Date().toISOString(),
          admin_notes: 'Imported via CSV',
        };

        if (existingRec) {
          await db.ComplianceRecord.update(existingRec.id, recData);
          updated++;
        } else {
          await db.ComplianceRecord.create(recData);
          created++;
        }
      }
    }

    // Audit log entry for the import
    await db.ComplianceAuditLog.create({
      club_id: clubId, record_id: '', coach_email: user.email, requirement_type: 'csv_import',
      season_name: season.name, old_status: '', new_status: 'imported',
      changed_by: user.email, changed_at: new Date().toISOString(),
      notes: `CSV import: ${matched} matched, ${unmatched} unmatched, ${created} created, ${updated} updated`,
    });

    return Response.json({
      club_id: clubId,
      season: season.name,
      total_rows: rows.length,
      matched,
      unmatched,
      records_created: created,
      records_updated: updated,
      unmatched_sample: unmatchedRows.slice(0, 20),
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}