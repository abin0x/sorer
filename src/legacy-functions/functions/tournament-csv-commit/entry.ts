// @ts-nocheck
import { createClientFromRequest } from '@/legacy-functions/_sdk';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { tournament_id, teams } = body;

    if (!tournament_id) {
      return Response.json({ error: 'tournament_id required' }, { status: 400 });
    }
    if (!Array.isArray(teams) || teams.length === 0) {
      return Response.json({ error: 'teams array required' }, { status: 400 });
    }

    const tournament = await base44.asServiceRole.entities.Tournament.get(tournament_id).catch(() => null);
    if (!tournament) {
      return Response.json({ error: 'Tournament not found' }, { status: 404 });
    }

    // Authorization: only the organizing club's admins or platform admins can import teams.
    const user = await base44.auth.me().catch(() => null);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const isAuthorized =
      user.role === 'admin' ||
      user.system_role === 'system_owner' ||
      user.system_role === 'system_admin' ||
      user.data?.club_id === tournament.club_id;
    if (!isAuthorized) {
      return Response.json({ error: 'Forbidden — you can only import teams to your own tournament' }, { status: 403 });
    }

    // Validate and build registration records
    const valid = [];
    const errors = [];
    for (let i = 0; i < teams.length; i++) {
      const t = teams[i];
      if (!t.team_name) {
        errors.push(`Row ${i + 1}: missing team name`);
        continue;
      }
      if (!t.team_contact_email) {
        errors.push(`Row ${i + 1} (${t.team_name}): missing contact email`);
        continue;
      }
      valid.push({
        tournament_id,
        club_id: tournament.club_id,
        team_name: t.team_name,
        team_contact_name: t.team_contact_name || '',
        team_contact_email: t.team_contact_email,
        team_contact_phone: t.team_contact_phone || '',
        coach_name: t.coach_name || '',
        team_city: t.team_city || '',
        team_state: t.team_state || '',
        age_group: t.age_group || tournament.age_group || '',
        gender: t.gender || tournament.gender || 'Coed',
        division: t.division || '',
        roster_count: Number(t.roster_count) || 0,
        notes: t.notes || '',
        entry_fee: tournament.entry_fee || 0,
        payment_status: 'paid',
        status: 'approved',
        registered_at: new Date().toISOString(),
      });
    }

    if (valid.length === 0) {
      return Response.json({ error: 'No valid teams to import', errors }, { status: 400 });
    }

    // Bulk create registrations
    const created = await base44.asServiceRole.entities.TournamentRegistration.bulkCreate(valid);

    // Update registered count on the tournament
    const newCount = (tournament.registered_count || 0) + valid.length;
    await base44.asServiceRole.entities.Tournament.update(tournament_id, {
      registered_count: newCount,
    });

    return Response.json({
      success: true,
      imported: valid.length,
      errors,
      total_submitted: teams.length,
    });
  } catch (error) {
    console.error('tournament-csv-commit error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}