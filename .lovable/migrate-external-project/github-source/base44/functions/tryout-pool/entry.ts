import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { ageGroupFor } from '../../shared/tryoutEligibility.ts';

/**
 * Tryout player pool.
 *
 * When a season is rolled over, every age-eligible player is added to the next
 * season's tryout player pool: a TryoutRegistration in status `pooled` (no
 * session, no fee) carrying the age group they are eligible for under the new
 * season's age rules. The public registration flow then upgrades that same
 * record with a session, fee, waivers and payment instead of creating a
 * duplicate.
 *
 * Idempotent: a player already pooled or registered for the season is skipped.
 */
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole.entities;
    const body = await req.json().catch(() => ({}));
    const { action = 'sync', club_id, season_id } = body;

    if (!club_id || !season_id) {
      return Response.json({ error: 'club_id and season_id are required' }, { status: 400 });
    }

    const season = await svc.Season.get(season_id).catch(() => null);
    if (!season) return Response.json({ error: 'Season not found' }, { status: 404 });

    const ageGroups = await svc.AgeGroup.filter({ club_id, season_id });
    const rulesMissing = ageGroups.length === 0;

    if (action === 'list') {
      const pooled = await svc.TryoutRegistration.filter({ club_id, season_id, status: 'pooled' }, 'player_name', 2000);
      return Response.json({ count: pooled.length, players: pooled.map((p: any) => ({ id: p.id, player_name: p.player_name, age_group: p.desired_age_group })) });
    }

    const players = await svc.Player.filter({ club_id }, 'last_name', 5000);
    const existing = await svc.TryoutRegistration.filter({ club_id, season_id }, null, 5000);
    const alreadyIn = new Set(
      existing.filter((r: any) => ['pooled', 'pending_payment', 'registered', 'waitlist', 'checked_in'].includes(r.status))
        .map((r: any) => r.player_id)
        .filter(Boolean),
    );

    const rows = [];
    let skippedNoDob = 0;
    let skippedNoAge = 0;

    for (const player of players) {
      if (!player.date_of_birth) { skippedNoDob += 1; continue; }
      if (alreadyIn.has(player.id)) continue;
      const age = ageGroupFor(player.date_of_birth, ageGroups);
      if (!rulesMissing && !age) { skippedNoAge += 1; continue; }
      rows.push({
        club_id,
        season_id,
        season_name: season.name,
        player_id: player.id,
        player_name: `${player.first_name || ''} ${player.last_name || ''}`.trim(),
        player_date_of_birth: player.date_of_birth,
        player_gender: player.gender || '',
        guardian_id: player.guardian_id || '',
        guardian_name: player.guardian_name || '',
        desired_age_group: age?.age_group || '',
        branch_id: player.location_id || '',
        branch_name: player.location_name || '',
        status: 'pooled',
        pool_status: 'in_pool',
        payment_status: 'unpaid',
        waiver_status: 'not_started',
        amount_due: 0,
        amount_paid: 0,
        source: 'rollover',
        registered_date: new Date().toISOString().slice(0, 10),
      });
    }

    let created = 0;
    for (let i = 0; i < rows.length; i += 200) {
      const batch = await svc.TryoutRegistration.bulkCreate(rows.slice(i, i + 200));
      created += Array.isArray(batch) ? batch.length : 0;
    }

    // Guardian email/phone are denormalized onto the pool rows so the pool can
    // be mailed without walking out to the Guardian for every player.
    if (created > 0) {
      const need = rows.filter((r) => r.guardian_id);
      const guardians = await Promise.all(
        [...new Set(need.map((r) => r.guardian_id))].map((id) => svc.Guardian.get(id).catch(() => null)),
      );
      const byId = new Map(guardians.filter(Boolean).map((g: any) => [g.id, g]));
      const fresh = await svc.TryoutRegistration.filter({ club_id, season_id, status: 'pooled' }, '-created_date', 5000);
      const updates = fresh
        .filter((r: any) => r.guardian_id && byId.get(r.guardian_id) && !r.guardian_email)
        .map((r: any) => {
          const g: any = byId.get(r.guardian_id);
          return { id: r.id, guardian_email: g.email || '', guardian_phone: g.phone || '' };
        });
      for (let i = 0; i < updates.length; i += 200) {
        await svc.TryoutRegistration.bulkUpdate(updates.slice(i, i + 200)).catch(() => {});
      }
    }

    return Response.json({
      ok: true,
      season: season.name,
      note: rulesMissing
        ? `No age groups are configured for ${season.name}, so every player with a date of birth was pooled. Set the birth-date windows to make this precise.`
        : undefined,
      added: created,
      already_in_pool: existing.filter((r: any) => r.status === 'pooled').length,
      skipped_no_birthdate: skippedNoDob,
      skipped_no_age_group: skippedNoAge,
      age_groups: ageGroups.length,
      total_players: players.length,
    });
  } catch (error) {
    console.error('tryout-pool error:', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}