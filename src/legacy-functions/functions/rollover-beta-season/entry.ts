// @ts-nocheck
import { createClientFromRequest } from '@/legacy-functions/_sdk';
import {
  DEMO_SEASON, DEMO_AGE_GROUPS, DEMO_PLATFORMS, DEMO_BRANCHES, DEMO_STAFF, DEMO_SKILL_TESTS,
  EVAL_TECH_KEYS, EVAL_TACTIC_KEYS, EVAL_ATTITUDE_KEYS,
  makeRng, pick, isoDate, addDays, mondayOf, gridFor, sessionMinutes,
  buildTrainingPlan, buildTrainingBookings, buildTrainingEvents,
  buildGameSchedule, buildGameBookings, buildGameEvents,
  buildEvaluation, buildAssessment, buildSkillScore, buildFeedback,
  buildPayments, buildRegistration, demoPlayerName, demoGuardianName, playerPosition, playerDob,
} from '../../shared/demoSeasonDataset.ts';

/**
 * Builds the full demo club dataset for one club:
 *   3 branches · 4 facilities · 6 fields · 2 platforms (Elite / Select)
 *   20 teams · 50 staff · ~228 players · ~190 guardians · registrations
 *   5 payments per player · weekly training plan · weekend games Sep 1–Nov 10
 *   2 evaluations and 2 sets of test results per player
 *
 * Called by the guided tour (after the visitor's trial club exists) and by
 * system owners who want to (re)seed a demo club. Every record is linked:
 * a player resolves to its team, branch, coach, guardian, registration,
 * payments, evaluations, test results and schedule entries.
 */

const TRAINING_WEEKS = 2;
const GAME_START = '2026-09-01';
const GAME_END = '2026-11-10';
const MID_SEASON = '2026-09-20';
const END_SEASON = '2026-11-05';
const MID_TEST = '2026-09-14';
const END_TEST = '2026-11-02';
const CHUNK = 200;

async function createInChunks(entity, records) {
  const created = [];
  for (let i = 0; i < records.length; i += CHUNK) {
    const batch = await entity.bulkCreate(records.slice(i, i + CHUNK));
    if (Array.isArray(batch)) created.push(...batch);
  }
  return created;
}

async function updateInChunks(entity, records) {
  for (let i = 0; i < records.length; i += CHUNK) {
    await entity.bulkUpdate(records.slice(i, i + CHUNK));
  }
}

async function safeDelete(entity, filter) {
  try {
    await entity.deleteMany(filter);
  } catch (error) {
    console.warn('demo reset: could not clear records', error?.message);
  }
}

/** Households group siblings so one guardian can be linked to two players. */
function buildHouseholdPlan(teams, rng) {
  const households = [];
  const players = [];
  let playerSeed = 0;

  teams.forEach((team) => {
    const ag = DEMO_AGE_GROUPS.find((a) => a.label === team.ageGroup) || DEMO_AGE_GROUPS[3];
    const teamPlayers = [];
    for (let p = 0; p < ag.roster; p++) {
      const seed = playerSeed++;
      const name = demoPlayerName(seed);
      const isSibling = p > 0 && p % 4 === 1;
      let household = isSibling ? teamPlayers[p - 1].household : null;

      if (!household) {
        const mother = demoGuardianName(seed + 3);
        const father = demoGuardianName(seed + 71);
        household = {
          id: households.length,
          players: [],
          guardians: [
            { first: mother.first, last: name.last, relationship: p % 2 === 0 ? 'mother' : 'father' },
            ...(rng() < 0.45 ? [{ first: father.first, last: name.last, relationship: 'guardian' }] : []),
          ],
        };
        households.push(household);
      }

      const player = {
        seed, name, team, household, ageGroup: ag,
        gender: p % 2 === 0 ? 'Boys' : 'Girls',
        jersey: String(p + 1),
        position: playerPosition(seed),
        source: seed % 3 === 0 ? 'Mobile App' : 'Web',
        registrationDate: isoDate(addDays('2026-06-01', seed % 75)),
      };
      household.players.push(player);
      teamPlayers.push(player);
      players.push(player);
    }
  });

  return { households, players };
}

export default async function (req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { branchNames, club_id, reset } = body;

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const ownClubId = user.data?.club_id || user.club_id;
    const isAdmin = user.role === 'admin' || user.is_super_admin === true
      || user.system_role === 'system_owner' || user.system_role === 'system_admin';
    const clubId = club_id || ownClubId;
    if (!clubId) return Response.json({ error: 'No club found for this user' }, { status: 400 });
    if (!isAdmin && clubId !== ownClubId) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const svc = base44.asServiceRole;
    const rng = makeRng(20261022);
    const summary = {};

    // ---- Reset (optional): clear the generated rows, keep structure ----
    if (reset) {
      await safeDelete(svc.entities.PaymentResolution, { club_id: clubId });
      await safeDelete(svc.entities.Payment, { club_id: clubId });
      await safeDelete(svc.entities.Registration, { club_id: clubId });
      await safeDelete(svc.entities.Booking, { club_id: clubId });
      await safeDelete(svc.entities.CalendarEvent, { club_id: clubId });
      await safeDelete(svc.entities.PlayerEvaluation, { club_id: clubId });
      await safeDelete(svc.entities.PhysicalAssessment, { club_id: clubId });
      await safeDelete(svc.entities.SkillTestScore, { club_id: clubId });
      await safeDelete(svc.entities.PlayerFeedback, { club_id: clubId });
      await safeDelete(svc.entities.Player, { club_id: clubId });
      await safeDelete(svc.entities.Guardian, { club_id: clubId });
      await safeDelete(svc.entities.Team, { club_id: clubId });
      await safeDelete(svc.entities.Coach, { club_id: clubId });
      await safeDelete(svc.entities.Registration, { club_id: clubId });
    }

    // ---- Already seeded? Report what is there instead of building a second,
    //      identical season. The tour can be replayed on the same club (page
    //      reload, back button), and duplicating teams and players would break
    //      the very demo it is meant to power. Pass { reset: true } to rebuild.
    if (!reset) {
      const seededPlayers = await svc.entities.Player.count({ club_id: clubId, season: DEMO_SEASON });
      if (seededPlayers > 0) {
        const [branches, teams, coaches, players, events, payments, evaluations, assessments] = await Promise.all([
          svc.entities.Location.count({ club_id: clubId }),
          svc.entities.Team.count({ club_id: clubId, season: DEMO_SEASON }),
          svc.entities.Coach.count({ club_id: clubId }),
          svc.entities.Player.count({ club_id: clubId, season: DEMO_SEASON }),
          svc.entities.CalendarEvent.count({ club_id: clubId }),
          svc.entities.Payment.count({ club_id: clubId }),
          svc.entities.PlayerEvaluation.count({ club_id: clubId }),
          svc.entities.PhysicalAssessment.count({ club_id: clubId }),
        ]);
        return Response.json({
          success: true, alreadySeeded: true, club_id: clubId,
          summary: {
            season: 1, branches, teams, coaches, players, events, payments, evaluations, assessments,
            attendance: teams, seasonName: DEMO_SEASON,
          },
        });
      }
    }

    // ---- 1. Season + age groups ----
    const existingSeasons = await svc.entities.Season.filter({ club_id: clubId, name: DEMO_SEASON });
    const season = existingSeasons[0] || await svc.entities.Season.create({
      club_id: clubId, name: DEMO_SEASON, status: 'active', is_current: true,
      start_date: '2026-08-01', end_date: '2027-07-31',
    });
    summary.season = 1;

    const existingAgeGroups = await svc.entities.AgeGroup.filter({ club_id: clubId, season_id: season.id });
    const ageGroups = existingAgeGroups.length
      ? existingAgeGroups
      : await createInChunks(svc.entities.AgeGroup, DEMO_AGE_GROUPS.map((ag) => ({
        club_id: clubId, season_id: season.id, season_name: DEMO_SEASON, age_group: ag.label,
        birth_date_start: `${ag.birthYearStart}-08-01`, birth_date_end: `${ag.birthYearEnd}-07-31`,
        playing_format: ag.format, order: ag.order,
      })));
    summary.ageGroups = ageGroups.length;

    // ---- 2. Branches (reuse the visitor's, top up to three) ----
    let branches = await svc.entities.Location.filter({ club_id: clubId }, 'created_date');
    if (branches.length < DEMO_BRANCHES.length) {
      const wanted = branchNames?.filter((n) => n?.trim());
      const missing = DEMO_BRANCHES.slice(branches.length).map((plan, i) => ({
        club_id: clubId,
        name: wanted?.[branches.length + i] || `${plan.name} Branch`,
        branch_type: plan.type, is_active: true,
        address: plan.address, city: plan.city, state: plan.state, zip_code: plan.zip, phone: plan.phone,
      }));
      const created = await createInChunks(svc.entities.Location, missing);
      branches = branches.concat(created);
    }
    branches = branches.slice(0, DEMO_BRANCHES.length);

    // Fill in address and contact details the tour left blank.
    await updateInChunks(svc.entities.Location, branches.map((b, i) => {
      const plan = DEMO_BRANCHES[i];
      return {
        id: b.id,
        branch_type: i === 0 ? plan.type : (b.branch_type || plan.type),
        role_description: i === 0 ? 'Core club campus — both platforms' : `${plan.name} branch — Select platform`,
        address: b.address || plan.address,
        city: b.city || plan.city,
        state: b.state || plan.state,
        zip_code: b.zip_code || plan.zip,
        phone: b.phone || plan.phone,
        is_active: true,
      };
    }));
    summary.branches = branches.length;

    // ---- 3. Facilities + fields (4 facilities, 6 fields) ----
    let facilities = await svc.entities.Facility.filter({ club_id: clubId });
    let fields = await svc.entities.Field.filter({ club_id: clubId });

    if (fields.length === 0) {
      for (let i = 0; i < branches.length; i++) {
        const plan = DEMO_BRANCHES[i];
        for (const facilityPlan of plan.facilities) {
          const facility = await svc.entities.Facility.create({
            club_id: clubId, name: facilityPlan.name,
            address: facilityPlan.address, location_id: branches[i].id, location_name: branches[i].name,
            branch_ids: [branches[i].id], branch_names: [branches[i].name],
            surface_type: facilityPlan.surface, field_count: facilityPlan.fields.length,
            capacity: facilityPlan.fields.length, operating_hours: '5:00 PM – 9:30 PM',
            available_days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'], is_active: true,
          });
          facilities.push(facility);
          for (const fieldPlan of facilityPlan.fields) {
            const grid = gridFor(fieldPlan.format);
            const field = await svc.entities.Field.create({
              club_id: clubId, name: `${branches[i].name} ${fieldPlan.name}`,
              facility_id: facility.id, facility_name: facility.name,
              format: fieldPlan.format, grid_layout: grid.layout, surface: facilityPlan.surface === 'indoor' ? 'indoor_hard' : 'turf',
              indoor_outdoor: facilityPlan.surface === 'indoor' ? 'indoor' : 'outdoor', lighted: true,
              format_supported: [fieldPlan.format], max_sections: grid.sections, status: 'active',
            });
            fields.push(field);
          }
        }
      }
    }
    summary.facilities = facilities.length;
    summary.fields = fields.length;

    const facilityById = new Map(facilities.map((f) => [f.id, f]));
    const schedulableFields = fields
      .map((f) => {
        const facility = facilityById.get(f.facility_id);
        const branchId = facility?.location_id || branches[0].id;
        const branch = branches.find((b) => b.id === branchId) || branches[0];
        return {
          id: f.id, name: f.name, facilityId: f.facility_id, facilityName: f.facility_name || facility?.name,
          branchId: branch.id, branchName: branch.name, format: f.format,
        };
      })
      .filter((f) => f.branchId);

    // ---- 4. Platforms: main competes on both, other branches on Select only ----
    let platforms = await svc.entities.Platform.filter({ club_id: clubId });
    if (platforms.length < 2) {
      const existingNames = platforms.map((p) => p.name);
      const missing = [];
      if (!existingNames.includes(DEMO_PLATFORMS.main)) missing.push({ club_id: clubId, name: DEMO_PLATFORMS.main, gender: 'Boys and Girls', is_active: true });
      if (!existingNames.includes(DEMO_PLATFORMS.branch)) missing.push({ club_id: clubId, name: DEMO_PLATFORMS.branch, gender: 'Boys and Girls', is_active: true });
      platforms = platforms.concat(await createInChunks(svc.entities.Platform, missing));
    }
    const elitePlatform = platforms[0];
    const selectPlatform = platforms[1] || platforms[0];
    summary.platforms = platforms.length;

    // ---- 5. Programs (one per age group, drives registrations) ----
    let programs = await svc.entities.Program.filter({ club_id: clubId, season: DEMO_SEASON });
    if (programs.length < DEMO_AGE_GROUPS.length) {
      const created = await createInChunks(svc.entities.Program, DEMO_AGE_GROUPS.slice(programs.length).map((ag) => ({
        club_id: clubId, title: `${ag.label} Competitive Program`, category: 'Registration',
        workstream: 'Registration & Family', year: '2026', season: DEMO_SEASON,
        description: `${ag.label} (${ag.format}) competitive program for the ${DEMO_SEASON} season.`,
        status: 'in_progress', priority: 'medium', suggested_start_date: '2026-08-01', due_date: '2027-05-31',
        location_id: branches[0].id, location_name: branches[0].name,
        age_eligibility: `${ag.birthYearStart}-${ag.birthYearEnd}`, gender_eligibility: 'Boys and Girls',
        created_by_email: 'demo@clubrudder.com',
      })));
      programs = programs.concat(created);
    }
    const programByAge = new Map(programs.map((p) => [(String(p.title || '').match(/^U\d+/) || [''])[0], p]));

    // ---- 6. Teams: two per age group at the main branch (Elite + Select),
    //         one per age group (Select) at every other branch ----
    const teamRecords = [];
    branches.forEach((branch, bi) => {
      const isMain = bi === 0;
      DEMO_AGE_GROUPS.forEach((ag) => {
        const platform = isMain ? elitePlatform : selectPlatform;
        const secondary = isMain ? selectPlatform : null;
        const build = (platformRecord, platformName) => ({
          club_id: clubId, name: `${branch.name} ${ag.label} ${platformName}`,
          age_group: ag.label, gender: 'Boys and Girls', playing_format: ag.format, season: DEMO_SEASON,
          league: platformName, platform_id: platformRecord?.id, platform_name: platformName,
          location_id: branch.id, location_name: branch.name,
          cost: ag.format === '11v11' ? 1150 : ag.format === '9v9' ? 950 : 850,
          max_roster_size: ag.roster + 2, status: 'active', player_ids: [],
        });
        teamRecords.push(build(platform, platform.name));
        if (secondary) teamRecords.push(build(secondary, secondary.name));
      });
    });
    const teams = await createInChunks(svc.entities.Team, teamRecords);
    summary.teams = teams.length;

    // Teams as the scheduler and per-player builders need them.
    const teamMeta = teams.map((t) => {
      const branch = branches.find((b) => b.id === t.location_id) || branches[0];
      return {
        id: t.id, name: t.name, ageGroup: t.age_group, format: t.playing_format, gender: t.gender,
        platformName: t.platform_name, branchId: branch.id, branchName: branch.name, coachName: '',
      };
    });

    // ---- 7. Staff: 50 people across four roles ----
    const branchForCoach = (i) => branches[i % branches.length];
    const coachRecords = DEMO_STAFF.map((s, i) => {
      const headTeam = s.role === 'head_coach' ? teamMeta[i % teamMeta.length] : null;
      const assistantTeam = s.role === 'assistant_coach' ? teamMeta[(i - 20) % teamMeta.length] : null;
      const assigned = headTeam || assistantTeam;
      const branch = assigned
        ? branches.find((b) => b.id === assigned.branchId) || branchForCoach(i)
        : branchForCoach(s.role === 'trainer' ? i : 0);
      return {
        club_id: clubId, first_name: s.first, last_name: s.last,
        email: `${s.first.toLowerCase()}.${s.last.toLowerCase()}${i}@democlub.example`,
        phone: `(${['734', '248', '313'][i % 3]}) 555-${String(1000 + i * 7).slice(0, 4)}`,
        role: s.role, status: 'active',
        location_id: branch.id, location_name: branch.name,
        team_id: assigned?.id, team_name: assigned?.name,
        notes: s.role === 'admin' ? 'Club office — registration, compliance and finance support.' : undefined,
      };
    });
    const coaches = await createInChunks(svc.entities.Coach, coachRecords);
    summary.coaches = coaches.length;

    // Link head + assistant coaches back onto each team.
    const headCoaches = coaches.filter((c) => c.role === 'head_coach');
    const assistantCoaches = coaches.filter((c) => c.role === 'assistant_coach');
    await updateInChunks(svc.entities.Team, teams.map((t, i) => {
      const head = headCoaches[i % headCoaches.length];
      const assistant = assistantCoaches[i % assistantCoaches.length];
      const names = [head, assistant].filter(Boolean).map((c) => `${c.first_name} ${c.last_name}`);
      teamMeta[i].coachName = head ? `${head.first_name} ${head.last_name}` : '';
      return {
        id: t.id, coach_id: head?.id, coach_name: teamMeta[i].coachName,
        coach_ids: [head?.id, assistant?.id].filter(Boolean), coach_names: names,
      };
    }));

    // ---- 8. Guardians + players (siblings share a guardian) ----
    const { households, players: playerPlan } = buildHouseholdPlan(teamMeta, rng);

    const guardianRecords = [];
    const householdGuardianIds = new Map();
    households.forEach((h) => {
      const ids = [];
      h.guardians.forEach((g, gi) => {
        guardianRecords.push({
          club_id: clubId, first_name: g.first, last_name: g.last,
          email: `${g.first.toLowerCase()}.${g.last.toLowerCase()}${h.id}${gi}@example.com`,
          phone: `(248) 555-${String(1000 + ((h.id * 13 + gi * 7) % 8999))}`,
          relationship: g.relationship, household_id: `household-${h.id}`,
          city: branches[h.id % branches.length].city, state: branches[h.id % branches.length].state,
          player_ids: [],
        });
        ids.push(gi);
      });
      householdGuardianIds.set(h.id, ids);
    });
    const guardians = await createInChunks(svc.entities.Guardian, guardianRecords);
    summary.guardians = guardians.length;

    // Map household slot index -> created guardian id.
    let guardianCursor = 0;
    const householdSlotIds = new Map();
    households.forEach((h) => {
      const ids = [];
      h.guardians.forEach(() => { ids.push(guardians[guardianCursor++]?.id); });
      householdSlotIds.set(h.id, ids);
    });

    const playerRecords = playerPlan.map((p) => {
      const ids = householdSlotIds.get(p.household.id) || [];
      const primary = guardians.find((g) => g.id === ids[0]);
      return {
        club_id: clubId, first_name: p.name.first, last_name: p.name.last,
        date_of_birth: playerDob(p.ageGroup.label, p.seed), gender: p.gender,
        guardian_id: ids[0], guardian_name: primary ? `${primary.first_name} ${primary.last_name}` : '',
        guardian_ids: ids, location_id: p.team.branchId, location_name: p.team.branchName,
        team_id: p.team.id, team_name: p.team.name, age_group: p.ageGroup.label,
        league: p.team.platformName, coach_name: p.team.coachName,
        season: DEMO_SEASON, status: 'active', position: p.position, jersey_number: p.jersey,
        source: p.source, notes: `Registered through the ${p.source === 'Web' ? 'web portal' : 'mobile app'}.`,
      };
    });
    const players = await createInChunks(svc.entities.Player, playerRecords);
    summary.players = players.length;

    // Back-fill the links that make the graph walkable in both directions.
    await updateInChunks(svc.entities.Team, teams.map((t) => ({
      id: t.id, player_ids: players.filter((p) => p.team_id === t.id).map((p) => p.id),
    })));
    await updateInChunks(svc.entities.Guardian, guardians.map((g) => ({
      id: g.id, player_ids: players.filter((p) => (p.guardian_ids || []).includes(g.id)).map((p) => p.id),
    })));

    // ---- 9. Tournament (source of the event fees) ----
    const tournament = await svc.entities.Tournament.create({
      club_id: clubId, name: `${branches[0].name} Fall Classic`, format: 'group_knockout',
      status: 'registration_open', sport: 'Soccer', age_group: 'U13', gender: 'Coed',
      start_date: '2026-10-24', end_date: '2026-10-25', entry_fee: 125, max_teams: 32,
      description: 'Home tournament weekend for the demo club.',
      contact_email: 'tournaments@democlub.example', is_public: true,
    });
    summary.tournaments = 1;

    // ---- 10. Registrations (one per player) ----
    const registrationRecords = players.map((player, i) => {
      const plan = playerPlan[i];
      const program = programByAge.get(plan.ageGroup.label) || programs[0];
      const guardian = guardians.find((g) => g.id === player.guardian_id);
      return buildRegistration({
        clubId, player: { id: player.id, player_name: `${player.first_name} ${player.last_name}` },
        guardian: { id: guardian?.id, name: player.guardian_name, email: guardian?.email },
        team: plan.team, program: { id: program?.id, title: program?.title },
        rng, registrationDate: plan.registrationDate,
      });
    });
    const registrations = await createInChunks(svc.entities.Registration, registrationRecords);
    summary.registrations = registrations.length;

    // ---- 11. Payments: registration fee + 3 dues installments + tournament fee ----
    const paymentRecords = [];
    players.forEach((player, i) => {
      const plan = playerPlan[i];
      const guardian = guardians.find((g) => g.id === player.guardian_id) || { name: player.guardian_name, email: '' };
      paymentRecords.push(...buildPayments({
        clubId,
        player: { id: player.id, player_name: `${player.first_name} ${player.last_name}` },
        registration_id: registrations[i]?.id,
        team: plan.team,
        guardian: { name: guardian.name || `${guardian.first_name || ''} ${guardian.last_name || ''}`.trim(), email: guardian.email },
        tournament: { id: tournament.id, name: tournament.name },
        rng,
      }));
    });
    summary.payments = (await createInChunks(svc.entities.Payment, paymentRecords)).length;

    // ---- 12. Training schedule: 2 sessions per team per week, Mon–Thu ----
    const trainingPlan = buildTrainingPlan(teamMeta, schedulableFields);
    const firstWeek = mondayOf(new Date());
    const weeks = Array.from({ length: TRAINING_WEEKS }, (_, w) => addDays(firstWeek, w * 7));

    const rsvpByTeam = {};
    teamMeta.forEach((team, ti) => {
      const roster = {};
      players.filter((p) => p.team_id === team.id).forEach((p, pi) => {
        roster[p.id] = (ti + pi) % 9 === 0 ? 'not_attending' : (ti + pi) % 11 === 0 ? 'maybe' : 'attending';
      });
      rsvpByTeam[team.id] = roster;
    });

    const trainingBookings = [];
    const trainingEvents = [];
    weeks.forEach((week) => {
      trainingBookings.push(...buildTrainingBookings(clubId, week, trainingPlan));
      trainingEvents.push(...buildTrainingEvents(clubId, week, trainingPlan, rsvpByTeam));
    });
    summary.bookings = (await createInChunks(svc.entities.Booking, trainingBookings)).length;
    summary.trainingEvents = (await createInChunks(svc.entities.CalendarEvent, trainingEvents)).length;
    summary.attendance = Object.keys(rsvpByTeam).length;

    // ---- 13. Games: one per team per weekend, September 1 – November 10 ----
    const games = buildGameSchedule(teamMeta, schedulableFields, GAME_START, GAME_END, { clubId });
    const gameBookings = buildGameBookings(clubId, games);
    const gameEvents = buildGameEvents(clubId, games);
    summary.gameBookings = (await createInChunks(svc.entities.Booking, gameBookings)).length;
    summary.games = (await createInChunks(svc.entities.CalendarEvent, gameEvents)).length;
    summary.events = summary.trainingEvents + summary.games;

    // ---- 14. Skill tests + physical assessments + evaluations + feedback ----
    const skillTests = await createInChunks(svc.entities.SkillTest, DEMO_SKILL_TESTS.map((st, i) => ({
      club_id: clubId, title: st.title, category: st.category, duration_minutes: st.duration_minutes,
      player_count: st.player_count, description: st.description, setup: st.setup,
      how_to_perform: st.how_to_perform, scoring: st.scoring, order: i,
    })));
    summary.skillTests = skillTests.length;

    const evaluationRecords = [];
    const assessmentRecords = [];
    const skillScoreRecords = [];
    const feedbackRecords = [];

    players.forEach((player, i) => {
      const plan = playerPlan[i];
      const coach = headCoaches[teams.findIndex((t) => t.id === player.team_id) % headCoaches.length];
      const coachEmail = coach?.email || 'demo@clubrudder.com';
      const playerRef = {
        id: player.id, player_name: `${player.first_name} ${player.last_name}`, position: player.position,
      };

      [MID_SEASON, END_SEASON].forEach((date, phaseIndex) => {
        evaluationRecords.push(buildEvaluation({
          clubId, player: playerRef, team: plan.team, coachEmail, date,
          phase: phaseIndex === 0 ? 'mid' : 'end', seed: i, rng,
        }));
      });

      [MID_TEST, END_TEST].forEach((date, phaseIndex) => {
        assessmentRecords.push(buildAssessment({
          clubId, player: playerRef, date, seed: i,
          phase: phaseIndex === 0 ? 'mid' : 'end', rng,
        }));
        skillScoreRecords.push(buildSkillScore({
          clubId, player: playerRef, test: skillTests[0], date, seed: i,
          phase: phaseIndex === 0 ? 'mid' : 'end', rng,
        }));
      });

      feedbackRecords.push(buildFeedback({ clubId, player: playerRef, seed: i }));
    });

    summary.evaluations = (await createInChunks(svc.entities.PlayerEvaluation, evaluationRecords)).length;
    summary.assessments = (await createInChunks(svc.entities.PhysicalAssessment, assessmentRecords)).length;
    summary.skillScores = (await createInChunks(svc.entities.SkillTestScore, skillScoreRecords)).length;
    summary.feedback = (await createInChunks(svc.entities.PlayerFeedback, feedbackRecords)).length;

    summary.seasonName = DEMO_SEASON;
    summary.trainingPlanSlots = trainingPlan.length;
    summary.evalCategories = {
      technical: EVAL_TECH_KEYS.length, tactical: EVAL_TACTIC_KEYS.length, attitude: EVAL_ATTITUDE_KEYS.length,
    };

    return Response.json({ success: true, club_id: clubId, summary });
  } catch (error) {
    console.error('demo dataset generation failed:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}