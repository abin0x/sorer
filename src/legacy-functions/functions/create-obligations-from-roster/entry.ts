// @ts-nocheck
import { createClientFromRequest } from '@/legacy-functions/_sdk';
import { computeObligationAmount, buildSchedule } from "../../shared/feeTemplates.ts";

/**
 * Roster-triggered fee automation (blueprint section 3).
 *
 * Given a team, finds the active FeeTemplate for that team+season (falling back
 * to a club-wide template for the season), snapshots it onto a Registration
 * obligation for each rostered player who doesn't already have one, computes
 * the amount (early-bird, sibling discount, staff-child exempt), and sets up
 * the default installment schedule.
 *
 * Idempotent: a player already having a Registration for the same team is skipped.
 * dry_run=true returns a preview without creating anything.
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const role = user.custom_role || user.role;
    const allowed = ["admin", "club_director", "club_admin", "branch_director", "master_admin"];
    if (!allowed.includes(role)) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { team_id, player_ids, dry_run } = body;
    if (!team_id) return Response.json({ error: "team_id is required" }, { status: 400 });

    const clubId = user.data?.club_id || user.club_id;
    const team = await base44.entities.Team.get(team_id);
    if (!team) return Response.json({ error: "Team not found" }, { status: 404 });
    if (team.club_id && clubId && team.club_id !== clubId) {
      return Response.json({ error: "Team does not belong to your club" }, { status: 403 });
    }

    const season = team.season || "";

    // Find an active template: team-specific first, then club-wide for the season.
    const teamTemplates = await base44.entities.FeeTemplate.filter({
      club_id: clubId,
      team_id,
      status: "active",
    });
    let template = teamTemplates[0];
    if (!template) {
      const clubTemplates = await base44.entities.FeeTemplate.filter({
        club_id: clubId,
        season,
        status: "active",
      });
      template = clubTemplates.find((t) => !t.team_id);
    }
    if (!template) {
      return Response.json({
        error: `No active fee template found for this team${season ? ` (season ${season})` : ""}. Create one on the Fee Templates page first.`,
      }, { status: 404 });
    }

    const rosterIds = Array.isArray(player_ids) && player_ids.length > 0
      ? player_ids
      : team.player_ids || [];
    if (rosterIds.length === 0) {
      return Response.json({ error: "This team has no rostered players." }, { status: 400 });
    }

    // Load players (paginated filter by id set isn't supported well; fetch in small batches).
    const players = [];
    for (let i = 0; i < rosterIds.length; i += 50) {
      const slice = rosterIds.slice(i, i + 50);
      const found = await base44.entities.Player.filter({ club_id: clubId });
      for (const p of found) {
        if (slice.includes(p.id) && !players.find((x) => x.id === p.id)) players.push(p);
      }
    }

    // Existing registrations for this team (to skip duplicates).
    const existing = await base44.entities.Registration.filter({ club_id: clubId, team_id });
    const existingByPlayer = new Set(existing.map((r) => r.player_id));

    // Resolve a program_id for the obligations (team.program_id, else create a dues program).
    let programId = team.program_id;
    if (!programId) {
      const seasonDoc = (await base44.entities.Season.filter({ club_id: clubId, name: season }))[0];
      const start = seasonDoc?.start_date || new Date().toISOString().slice(0, 10);
      const due = seasonDoc?.end_date || new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);
      const prog = await base44.entities.Program.create({
        club_id: clubId,
        title: `Dues — ${team.name}${season ? ` (${season})` : ""}`,
        category: "Registration",
        season,
        location_id: team.location_id,
        location_name: team.location_name,
        suggested_start_date: start,
        due_date: due,
        status: "todo",
        branches: [],
      });
      programId = prog.id;
      await base44.entities.Team.update(team_id, { program_id: programId, program_title: prog.title });
    }
    const program = await base44.entities.Program.get(programId).catch(() => null);

    // Sibling ranking: within this batch, order players by guardian, rank by index.
    const guardianOrder = {};
    const playersRanked = players.map((p) => {
      const gid = p.guardian_id || "";
      const rank = (guardianOrder[gid] = (guardianOrder[gid] || 0) + 1) - 1;
      return { player: p, siblingRank: rank };
    });

    const toCreate = [];
    const skipped = [];
    for (const { player, siblingRank } of playersRanked) {
      if (existingByPlayer.has(player.id)) {
        skipped.push({ player_id: player.id, reason: "already_has_obligation" });
        continue;
      }
      if (!player.guardian_id) {
        skipped.push({ player_id: player.id, reason: "no_guardian" });
        continue;
      }
      const isStaffChild = false; // reserved for a future staff-child flag on Player
      const amount = computeObligationAmount(template, { siblingRank, isStaffChild });
      const plan = template.default_plan || "one_time";
      const schedule = plan === "installments"
        ? buildSchedule(amount, template.installment_count, template.installment_interval, template.first_due_date)
        : [];
      toCreate.push({
        player,
        amount,
        plan,
        schedule,
      });
    }

    if (dry_run) {
      return Response.json({
        dry_run: true,
        template: { id: template.id, name: template.name, amount: template.amount },
        team: { id: team.id, name: team.name, season },
        to_create: toCreate.map((c) => ({
          player_id: c.player.id,
          player_name: `${c.player.first_name} ${c.player.last_name}`,
          amount: c.amount,
          plan: c.plan,
          installments: c.schedule.length,
        })),
        skipped,
        total_amount: toCreate.reduce((s, c) => s + c.amount, 0),
      });
    }

    const created = [];
    for (const c of toCreate) {
      const p = c.player;
      const guardian = await base44.entities.Guardian.get(p.guardian_id).catch(() => null);
      const regDate = new Date().toISOString().slice(0, 10);
      const installmentAmount = c.schedule.length > 0 ? c.schedule[0].amount : 0;
      const nextDue = c.schedule.length > 0 ? c.schedule[0].due_date : (template.first_due_date || regDate);
      const reg = await base44.entities.Registration.create({
        club_id: clubId,
        player_id: p.id,
        player_name: `${p.first_name} ${p.last_name}`,
        guardian_id: p.guardian_id,
        guardian_name: guardian ? `${guardian.first_name} ${guardian.last_name}` : "",
        program_id: programId,
        program_title: program?.title || team.name,
        team_id: team.id,
        team_name: team.name,
        location_id: team.location_id,
        location_name: team.location_name,
        registration_date: regDate,
        status: "pending",
        payment_status: "unpaid",
        amount_due: c.amount,
        amount_paid: 0,
        payment_frequency: c.plan === "installments" ? "monthly" : "one_time",
        installment_count: c.schedule.length,
        installment_amount: installmentAmount,
        installments_paid: 0,
        next_installment_date: c.plan === "installments" ? nextDue : undefined,
        notes: `Auto-created from fee template: ${template.name}`,
      });
      created.push({ id: reg.id, player_id: p.id, amount: c.amount });
    }

    return Response.json({
      created: created.length,
      skipped: skipped.length,
      total_amount: created.reduce((s, c) => s + c.amount, 0),
      template_id: template.id,
    });
  } catch (error) {
    console.error("create-obligations-from-roster error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}