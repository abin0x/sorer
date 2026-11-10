// @ts-nocheck
// Migration request lifecycle: a club admin (or director) submits a request
// from inside their club, the request is pinned to that club, and a system
// owner approves or denies it. The club_id is always taken from the request
// payload (the club the admin is acting on behalf of), never inferred from
// the authenticated user's home club — so a platform owner who also holds a
// club role cannot accidentally attach a migration to their own club.
import { createClientFromRequest } from '@/legacy-functions/_sdk';
import { isMigrationReviewer, canManageMigrationClub, hasActiveSeason } from '../../shared/migrationAccess.ts';

const CLUB_ROLES = ['club_admin', 'club_director'];

function bad(msg: string) { return Response.json({ error: msg }, { status: 400 }); }
function forbidden(msg: string) { return Response.json({ error: msg }, { status: 403 }); }
function notFound(msg: string) { return Response.json({ error: msg }, { status: 404 }); }

async function resolveClub(svc, clubId: string) {
  if (!clubId) return null;
  try { return await svc.entities.Club.get(clubId); } catch { return null; }
}

async function latestJobForClub(svc, clubId: string) {
  const rows = await svc.entities.MigrationJob.filter({ club_id: clubId }, '-created_date', 1);
  return rows[0] || null;
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return forbidden('Unauthorized');
    const svc = base44.asServiceRole;

    const body = await req.json().catch(() => ({}));
    const action = body.action;

    // ---- list (system console) ----
    if (action === 'list') {
      if (!isMigrationReviewer(user)) return forbidden('Only system owners can list all migrations.');
      const jobs = await svc.entities.MigrationJob.list('-created_date', 200);
      return Response.json({ jobs });
    }

    // ---- load (club-side: latest job for a club) ----
    if (action === 'load') {
      const clubId = String(body.club_id || '');
      if (!clubId) return bad('club_id is required');
      if (!(await canManageMigrationClub(svc, user, clubId)) && !isMigrationReviewer(user)) {
        return forbidden('You can only load migrations for your own club.');
      }
      const job = await latestJobForClub(svc, clubId);
      return Response.json({ jobs: job ? [job] : [] });
    }

    // ---- request (club admin submits a new migration request) ----
    if (action === 'request') {
      const clubId = String(body.club_id || '');
      if (!clubId) return bad('Select the club this migration is for.');
      if (!(await canManageMigrationClub(svc, user, clubId))) {
        return forbidden('You can only request a migration for a club you administer.');
      }
      const club = await resolveClub(svc, clubId);
      if (!club) return notFound('Club not found.');

      // One active request per club: if the latest job is still open, return it.
      const existing = await latestJobForClub(svc, clubId);
      if (existing && ['pending_approval', 'draft', 'processing', 'client_review', 'support_review'].includes(existing.status)) {
        return Response.json({ job: existing });
      }

      // Migration is auto-approved for clubs that haven't set up their first
      // season yet — they go straight to draft (upload). Clubs with an existing
      // season require manual system-owner approval before proceeding.
      const seasonActive = await hasActiveSeason(svc, clubId);
      const now = new Date().toISOString();
      const job = await svc.entities.MigrationJob.create({
        club_id: clubId,
        club_name: club.name,
        competitor_source: body.competitor_source || undefined,
        status: seasonActive ? 'pending_approval' : 'draft',
        created_by_user_id: user.id,
        requested_by_name: user.full_name || '',
        requested_by_email: user.email || '',
        requested_by_role: user.custom_role || '',
        requested_at: now,
        ...(seasonActive ? {} : {
          specialist_name: 'Auto-approved',
          specialist_notes: 'Auto-approved — club has no active season yet.',
          reviewed_at: now,
        }),
      });
      return Response.json({ job });
    }

    // ---- submitReview (club submits their fixed team sheet + decisions) ----
    if (action === 'submitReview') {
      const job = await svc.entities.MigrationJob.get(String(body.migrationJobId || ''));
      if (!job) return notFound('Migration job not found.');
      if (job.status !== 'client_review') {
        return bad('Only jobs in client review can be submitted for specialist review.');
      }
      if (!(await canManageMigrationClub(svc, user, job.club_id))) {
        return forbidden('You can only submit your own club\'s migration.');
      }
      const team_sheet = Array.isArray(body.team_sheet) ? body.team_sheet : [];
      const client_decisions = body.client_decisions && typeof body.client_decisions === 'object' ? body.client_decisions : {};
      const duplicate_decisions = body.duplicate_decisions && typeof body.duplicate_decisions === 'object' ? body.duplicate_decisions : {};
      const updated = await svc.entities.MigrationJob.update(job.id, {
        status: 'support_review',
        team_sheet,
        client_decisions,
        duplicate_decisions,
        client_submitted_at: new Date().toISOString(),
      });
      return Response.json({ job: updated });
    }

    // ---- reset_to_upload (club re-opens the upload step from client_review or processing) ----
    if (action === 'reset_to_upload') {
      const job = await svc.entities.MigrationJob.get(String(body.migrationJobId || ''));
      if (!job) return notFound('Migration job not found.');
      if (!['client_review', 'processing'].includes(job.status)) {
        return bad('Only jobs in client review or processing can be reset to upload.');
      }
      if (!(await canManageMigrationClub(svc, user, job.club_id))) {
        return forbidden('You can only reset your own club\'s migration.');
      }
      const updated = await svc.entities.MigrationJob.update(job.id, { status: 'draft' });
      return Response.json({ job: updated });
    }

    // ---- retry (club admin re-opens a sent-back request) ----
    if (action === 'retry') {
      const job = await svc.entities.MigrationJob.get(String(body.migrationJobId || ''));
      if (!job) return notFound('Migration job not found.');
      if (job.status !== 'needs_fixes') return bad('Only sent-back requests can be retried.');
      if (!(await canManageMigrationClub(svc, user, job.club_id)) && !isMigrationReviewer(user)) {
        return forbidden('You can only retry your own club\'s migration.');
      }
      const seasonActive = await hasActiveSeason(svc, job.club_id);
      const updated = await svc.entities.MigrationJob.update(job.id, { status: seasonActive ? 'pending_approval' : 'draft' });
      return Response.json({ job: updated });
    }

    // ---- approve / deny (system owner) ----
    if (action === 'approve' || action === 'deny') {
      if (!isMigrationReviewer(user)) return forbidden('Only system owners can approve migrations.');
      const job = await svc.entities.MigrationJob.get(String(body.migrationJobId || ''));
      if (!job) return notFound('Migration job not found.');
      if (job.status !== 'pending_approval') {
        return bad(`Job is "${job.status}", not awaiting approval.`);
      }
      const notes = body.notes || (action === 'approve' ? 'Approved. You may now upload your files and proceed.' : 'Migration request denied.');
      const updated = await svc.entities.MigrationJob.update(job.id, {
        status: action === 'approve' ? 'draft' : 'needs_fixes',
        specialist_name: user.full_name || user.email || '',
        specialist_notes: notes,
        reviewed_by_user_id: user.id,
        reviewed_at: new Date().toISOString(),
      });
      return Response.json({ job: updated });
    }

    return bad('Unknown action.');
  } catch (error) {
    console.error('migrationRequests error', error);
    return Response.json({ error: error.message || 'Migration request failed' }, { status: 500 });
  }
}