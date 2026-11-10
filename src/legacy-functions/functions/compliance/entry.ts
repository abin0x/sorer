// @ts-nocheck
import { createClientFromRequest } from '@/legacy-functions/_sdk';
import {
  ADMIN_ROLES, REQ_LABEL, REQUIREMENTS, GOVERNING_RULES, calcExpiration, today, getSettings, getActiveSeason,
  audit, notify, adminEmails, runRulesForClub,
} from '../../shared/compliance.ts';

const bad = (error: string, status = 400) => Response.json({ error }, { status });

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return bad('Unauthorized', 401);
    const clubId = user.club_id;
    if (!clubId) return bad('No club selected');
    const db = base44.asServiceRole.entities;
    const isAdmin = ADMIN_ROLES.includes(user.custom_role) || user.role === 'admin';
    const body = await req.json().catch(() => ({}));
    const { action } = body;

    if (action === 'preview') {
      const settings = await getSettings(db, clubId);
      const calc = calcExpiration(body.requirement_type, body.completion_date, settings?.governing_bodies || []);
      return Response.json({ ...(calc || {}), configured: !!calc });
    }

    if (action === 'submit') {
      const { requirement_type, completion_date, document_url, document_name } = body;
      if (!REQUIREMENTS.includes(requirement_type)) return bad('Invalid requirement');
      if (!document_url || !completion_date) return bad('Document and completion date are required');
      if (completion_date > today()) return bad('Completion date cannot be in the future');
      const [settings, season] = await Promise.all([getSettings(db, clubId), getActiveSeason(db, clubId)]);
      const bodies: string[] = settings?.governing_bodies || [];
      if (!season) return bad('No active season');
      const calc = calcExpiration(requirement_type, completion_date, bodies);
      if (!calc) return bad('Your club has not selected a governing body yet. Ask your club admin to set one.');
      const found = await db.ComplianceRecord.filter({ club_id: clubId, season_id: season.id, coach_email: user.email, requirement_type }, { limit: 1 });
      const existing = (Array.isArray(found) ? found : found.items || [])[0];
      if (existing?.status === 'pending') return bad('Your document is under review. Do not upload another certificate.', 409);
      if (existing?.status === 'approved') return bad('This requirement is already approved.', 409);
      const coachRes = await db.Coach.filter({ club_id: clubId, email: user.email }, { limit: 1 });
      const coach = (Array.isArray(coachRes) ? coachRes : coachRes.items || [])[0];
      const data = {
        club_id: clubId, coach_id: user.id, coach_email: user.email, coach_name: user.full_name || user.email,
        branch_id: coach?.location_id || existing?.branch_id || '', branch_name: coach?.location_name || existing?.branch_name || '',
        season_id: season.id, season_name: season.name, requirement_type, document_url, document_name: document_name || '',
        completion_date, expiration_date: calc.expiration_date, governing_body: calc.governing_body, governing_bodies: bodies,
        status: 'pending', submitted_at: new Date().toISOString(), admin_notes: '', escalated_at: null,
        resubmission_count: (existing?.resubmission_count || 0) + (existing?.status === 'flagged' ? 1 : 0),
      };
      const rec = existing ? await db.ComplianceRecord.update(existing.id, data) : await db.ComplianceRecord.create(data);
      await audit(db, rec, existing?.status || null, 'pending', user.email, existing?.status === 'flagged' ? 'Resubmitted after flag' : 'Document submitted');
      await notify(db, clubId, user.email, 'Document under review', 'Your document is under review.');
      for (const e of await adminEmails(db, clubId, data.branch_id)) {
        await notify(db, clubId, e, 'New compliance submission', `${data.coach_name} submitted a ${REQ_LABEL[requirement_type]} for review.`, '/Compliance');
      }
      return Response.json({ record: rec });
    }

    // Everything below is admin-only.
    if (!isAdmin) return bad('Forbidden', 403);

    if (action === 'review') {
      const { record_id, decision, reason } = body;
      const rec = await db.ComplianceRecord.get(record_id);
      if (!rec || rec.club_id !== clubId) return bad('Record not found', 404);
      if (rec.status !== 'pending') return bad('Only pending submissions can be reviewed', 409);
      if (user.custom_role === 'branch_director' && rec.branch_id) {
        const loc = await db.Location.get(rec.branch_id).catch(() => null);
        if (loc?.branch_director_email && loc.branch_director_email.toLowerCase() !== user.email.toLowerCase()) return bad('Not your branch', 403);
      }
      const label = REQ_LABEL[rec.requirement_type];
      if (decision === 'approve') {
        if (rec.expiration_date < today()) return bad('This certificate is already expired. Flag it instead.');
        const updated = await db.ComplianceRecord.update(rec.id, { status: 'approved', reviewed_by: user.email, reviewed_at: new Date().toISOString(), admin_notes: '' });
        await audit(db, rec, 'pending', 'approved', user.email, 'Approved');
        await notify(db, clubId, rec.coach_email, 'Compliance approved', `Your ${label} has been approved. You are compliant for the ${rec.season_name} season.`);
        return Response.json({ record: updated });
      }
      if (decision === 'flag') {
        if (!reason) return bad('A reason is required');
        const updated = await db.ComplianceRecord.update(rec.id, { status: 'flagged', reviewed_by: user.email, reviewed_at: new Date().toISOString(), admin_notes: reason });
        await audit(db, rec, 'pending', 'flagged', user.email, reason);
        await notify(db, clubId, rec.coach_email, 'Compliance submission flagged', `Your ${label} submission was flagged. Reason: ${reason}. Please resubmit.`);
        return Response.json({ record: updated });
      }
      return bad('Invalid decision');
    }

    if (action === 'save_settings') {
      const bodies = (body.governing_bodies || []).filter((b: string) => GOVERNING_RULES[b]);
      const settings = await getSettings(db, clubId);
      const data = { club_id: clubId, governing_bodies: bodies, ankored_url: body.ankored_url || '' };
      const saved = settings ? await db.ComplianceSettings.update(settings.id, data) : await db.ComplianceSettings.create(data);
      const stats = await runRulesForClub(db, clubId);
      return Response.json({ settings: saved, stats });
    }

    if (action === 'run_rules') {
      return Response.json({ stats: await runRulesForClub(db, clubId) });
    }

    return bad('Unknown action');
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}