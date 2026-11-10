// @ts-nocheck
import { createClientFromRequest } from '@/legacy-functions/_sdk';
import { FIRST_NAMES, LAST_NAMES, POSITIONS, rand, randInt, dobForAgeGroup } from "../../shared/demoData.ts";

/**
 * System-owner/admin only: creates a comprehensive "Demo FC" club with
 * 3 branches, 3 facilities, 6 fields, 4 platforms, 40 teams, 40 coaches,
 * ~480 players, ~480 guardians, a tournament with games, weekly bookings,
 * calendar events, marketing campaigns, expenses, skill tests, and
 * evaluations — enough data to showcase every module to customers.
 */

const AGE_GROUPS = [
  { label: "U9", format: "4v4", roster: 8 },
  { label: "U11", format: "7v7", roster: 10 },
  { label: "U13", format: "9v9", roster: 12 },
  { label: "U15", format: "11v11", roster: 14 },
  { label: "U17", format: "11v11", roster: 16 },
];

const BRANCHES = [
  { name: "Detroit", state: "MI", type: "nexus", teamsPerAG: 2, facility: "Detroit Sports Complex", fields: [{ name: "Stadium Field", format: "11v11" }, { name: "Training Field", format: "9v9" }] },
  { name: "Ann Arbor", state: "MI", type: "branch", teamsPerAG: 1, facility: "Ann Arbor Soccer Park", fields: [{ name: "Main Pitch", format: "11v11" }, { name: "Youth Field", format: "7v7" }] },
  { name: "Grand Rapids", state: "MI", type: "branch", teamsPerAG: 1, facility: "Grand Rapids Athletic Center", fields: [{ name: "Championship Field", format: "11v11" }, { name: "Practice Field", format: "9v9" }] },
];

const PLATFORMS = [
  { name: "MLS Next", gender: "Boys" },
  { name: "Girls Academy", gender: "Girls" },
  { name: "NPL", gender: "Boys and Girls" },
  { name: "ECNL", gender: "Boys and Girls" },
];

function minToTime(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h > 12 ? h - 12 : (h === 0 ? 12 : h);
  return `${displayH}:${String(m).padStart(2,'0')} ${period}`;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const isAuthorized = user.role === 'admin' || user.is_super_admin === true || user.system_role === 'system_owner' || user.system_role === 'system_admin';
    if (!isAuthorized) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const svc = base44.asServiceRole;
    const summary = {};
    const errors = [];

    // 1. Create Club
    const club = await svc.entities.Club.create({
      name: "Demo FC",
      slug: "demo-fc",
      club_type: "live",
      is_demo: true,
      plan_tier: "pro",
      status: "active",
      primary_color: "#399F7D",
      enabled_modules: { registration: true, payments: true, messaging: true, scheduling: true, tryouts: true, player_dev: true, facilities: true, tournaments: true, merchandise: true },
      max_players: 1000, max_branches: 10, max_teams: 100,
    });
    const clubId = club.id;
    summary.club = clubId;

    // 2. Create Branches
    const branches = await svc.entities.Location.bulkCreate(
      BRANCHES.map(b => ({ club_id: clubId, name: `${b.name} Branch`, city: b.name, state: b.state, branch_type: b.type, is_active: true }))
    );
    summary.branches = branches.length;

    // 3. Create Facilities + Fields
    const facilities = [];
    const allFields = [];
    for (let bi = 0; bi < BRANCHES.length; bi++) {
      const f = BRANCHES[bi];
      const fac = await svc.entities.Facility.create({
        club_id: clubId, name: f.facility, location_id: branches[bi].id, location_name: branches[bi].name,
        branch_ids: [branches[bi].id], branch_names: [branches[bi].name], surface_type: "mixed",
        field_count: f.fields.length, capacity: f.fields.length, is_active: true,
      });
      facilities.push(fac);
      for (const fld of f.fields) {
        const grid = fld.format === "11v11" ? "A1,A2,B1,B2,C1,C2,D1,D2" : fld.format === "9v9" ? "A1,A2,B1,B2,C1,C2" : fld.format === "7v7" ? "A1,A2,B1,B2" : "A1,A2";
        const maxSec = fld.format === "11v11" ? 8 : fld.format === "9v9" ? 6 : fld.format === "7v7" ? 4 : 2;
        const field = await svc.entities.Field.create({
          club_id: clubId, name: fld.name, facility_id: fac.id, facility_name: fac.name,
          format: fld.format, grid_layout: grid, surface: "turf", max_sections: maxSec, status: "active",
        });
        allFields.push(field);
      }
    }
    summary.facilities = facilities.length;
    summary.fields = allFields.length;

    // 4. Create Platforms
    const platforms = await svc.entities.Platform.bulkCreate(
      PLATFORMS.map(p => ({ club_id: clubId, name: p.name, gender: p.gender, is_active: true }))
    );
    summary.platforms = platforms.length;

    // 5. Create Coaches (1 per team)
    const coachRecords = [];
    let coachIdx = 0;
    for (const branch of BRANCHES) {
      for (const gender of ["Boys", "Girls"]) {
        for (const ag of AGE_GROUPS) {
          for (let t = 0; t < branch.teamsPerAG; t++) {
            const fn = FIRST_NAMES[coachIdx % FIRST_NAMES.length];
            const ln = LAST_NAMES[coachIdx % LAST_NAMES.length];
            coachIdx++;
            coachRecords.push({
              club_id: clubId, first_name: fn, last_name: ln,
              email: `coach.${fn.toLowerCase()}.${ln.toLowerCase()}${coachIdx}@demofc.com`,
              phone: `555-${String(randInt(100,999))}-${String(randInt(1000,9999))}`,
              role: "head_coach",
              location_id: branches[BRANCHES.indexOf(branch)].id,
              location_name: branches[BRANCHES.indexOf(branch)].name,
              status: "active",
            });
          }
        }
      }
    }
    const coaches = await svc.entities.Coach.bulkCreate(coachRecords);
    summary.coaches = coaches.length;

    // 6. Create Teams
    const teamRecords = [];
    let coachCounter = 0;
    for (let bi = 0; bi < BRANCHES.length; bi++) {
      const branch = BRANCHES[bi];
      for (const gender of ["Boys", "Girls"]) {
        for (const ag of AGE_GROUPS) {
          for (let t = 0; t < branch.teamsPerAG; t++) {
            const suffix = branch.teamsPerAG > 1 ? (t === 0 ? ' Blue' : ' White') : '';
            const teamName = `${branch.name} ${gender} ${ag.label}${suffix}`;
            const platform = gender === "Boys" ? platforms[0] : platforms[1];
            teamRecords.push({
              club_id: clubId, name: teamName, age_group: ag.label, gender,
              playing_format: ag.format, season: "2026-2027",
              league: rand(["MSPRL", "NPL", "ECNL", "MLS Next"]),
              platform_id: platform.id, platform_name: platform.name,
              location_id: branches[bi].id, location_name: branches[bi].name,
              coach_id: coaches[coachCounter]?.id,
              coach_name: coaches[coachCounter] ? `${coaches[coachCounter].first_name} ${coaches[coachCounter].last_name}` : '',
              max_roster_size: ag.roster + 2, player_ids: [],
            });
            coachCounter++;
          }
        }
      }
    }
    const teams = await svc.entities.Team.bulkCreate(teamRecords);
    summary.teams = teams.length;

    // 7. Create Guardians + Players
    const playerRecords = [];
    const guardianRecords = [];
    let nameCounter = 0;
    for (const team of teams) {
      const ag = AGE_GROUPS.find(a => a.label === team.age_group) || AGE_GROUPS[3];
      for (let p = 0; p < Math.min(ag.roster, 12); p++) {
        const fn = FIRST_NAMES[nameCounter % FIRST_NAMES.length];
        const ln = LAST_NAMES[nameCounter % LAST_NAMES.length];
        nameCounter++;
        const gFn = FIRST_NAMES[(nameCounter + 50) % FIRST_NAMES.length];
        const gIdx = guardianRecords.length;
        guardianRecords.push({
          club_id: clubId, first_name: gFn, last_name: ln,
          email: `guardian.${gFn.toLowerCase()}.${ln.toLowerCase()}${gIdx}@demofc.com`,
          phone: `555-${String(randInt(100,999))}-${String(randInt(1000,9999))}`,
          relationship: 'parent',
        });
        playerRecords.push({
          club_id: clubId, first_name: fn, last_name: ln,
          date_of_birth: dobForAgeGroup(ag), gender: team.gender,
          location_id: team.location_id, location_name: team.location_name,
          team_id: team.id, team_name: team.name, age_group: team.age_group,
          league: team.league, season: team.season, status: 'active',
          position: rand(POSITIONS), jersey_number: String(p + 1),
          guardian_id: '', guardian_name: '',
        });
      }
    }
    const guardians = await svc.entities.Guardian.bulkCreate(guardianRecords);
    summary.guardians = guardians.length;
    playerRecords.forEach((pr, i) => {
      pr.guardian_id = guardians[i]?.id;
      pr.guardian_name = guardians[i] ? `${guardians[i].first_name} ${guardians[i].last_name}` : '';
    });
    const players = await svc.entities.Player.bulkCreate(playerRecords);
    summary.players = players.length;

    // Update teams with player_ids
    await svc.entities.Team.bulkUpdate(teams.map(t => ({
      id: t.id,
      player_ids: players.filter(p => p.team_id === t.id).map(p => p.id),
    })));

    // 8. Tournament + Registrations + Games
    try {
      const tournament = await svc.entities.Tournament.create({
        club_id: clubId, name: "Demo FC Invitational", sport: "soccer", format: "round_robin",
        age_group: "U15", gender: "Boys", start_date: "2026-11-15", end_date: "2026-11-16",
        entry_fee: 500, max_teams: 8, status: "registration_open", is_public: true,
        contact_email: "info@demofc.com",
      });
      const regs = await svc.entities.TournamentRegistration.bulkCreate(
        Array.from({ length: 8 }, (_, i) => ({
          tournament_id: tournament.id, club_id: clubId,
          team_name: `External Team ${i + 1}`, team_contact_name: `Contact ${i + 1}`,
          team_contact_email: `team${i + 1}@external.com`,
          age_group: "U15", gender: "Boys",
          status: i < 6 ? "approved" : "pending",
          payment_status: i < 6 ? "paid" : "pending",
          entry_fee: 500, registered_at: new Date().toISOString(),
        }))
      );
      const games = await svc.entities.Game.bulkCreate(
        Array.from({ length: 8 }, (_, i) => {
          const startMin = 540 + i * 120;
          return {
            club_id: clubId, tournament_id: tournament.id, game_number: i + 1,
            round: "Round 1", round_number: 1,
            home_team_id: teams[i % teams.length].id, home_team_name: teams[i % teams.length].name,
            away_team_id: teams[(i + 1) % teams.length].id, away_team_name: teams[(i + 1) % teams.length].name,
            field_id: allFields[i % allFields.length].id, field_name: allFields[i % allFields.length].name,
            facility_name: allFields[i % allFields.length].facility_name,
            scheduled_date: "2026-11-15", start_min: startMin, end_min: startMin + 90,
            start_time: minToTime(startMin), end_time: minToTime(startMin + 90),
            status: "scheduled",
          };
        })
      );
      summary.tournament = tournament.id;
      summary.tournamentRegistrations = regs.length;
      summary.games = games.length;
    } catch (e) { errors.push(`Tournament: ${e.message}`); }

    // 9. Bookings (1 training per team for current week)
    try {
      const now = new Date();
      const monday = new Date(now);
      monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
      const weekStart = monday.toISOString().slice(0, 10);
      const bookingRecords = [];
      for (let ti = 0; ti < teams.length; ti++) {
        const team = teams[ti];
        const field = allFields[ti % allFields.length];
        const dayOffset = (ti % 5) + 1;
        const bookingDate = new Date(monday);
        bookingDate.setDate(monday.getDate() + dayOffset);
        const dateStr = bookingDate.toISOString().slice(0, 10);
        const startMin = 1020, endMin = 1110;
        const dayName = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][dayOffset];
        bookingRecords.push({
          club_id: clubId, week_start: weekStart, field_id: field.id,
          field_name: field.name, facility_name: field.facility_name,
          date: dateStr, day: dayName, start_min: startMin, end_min: endMin,
          start_time: '5:00 PM', end_time: '6:30 PM', type: 'training',
          event_type: 'practice', team_name: team.name, coach_name: team.coach_name,
          source_ref: 'manual',
          identity_key: `${clubId}|${field.name}|${dateStr}|${startMin}|${endMin}|${team.name}`,
          status: 'confirmed',
        });
      }
      const bookings = await svc.entities.Booking.bulkCreate(bookingRecords);
      summary.bookings = bookings.length;
    } catch (e) { errors.push(`Bookings: ${e.message}`); }

    // 10. Calendar Events (1 training + 1 game per team)
    try {
      const eventRecords = [];
      const now = new Date();
      const monday = new Date(now);
      monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
      for (const team of teams) {
        const trainDate = new Date(monday); trainDate.setDate(monday.getDate() + 2); trainDate.setHours(17,0,0,0);
        const trainEnd = new Date(trainDate); trainEnd.setMinutes(trainEnd.getMinutes() + 90);
        eventRecords.push({
          club_id: clubId, title: `${team.name} Training`, event_type: 'practice',
          start_datetime: trainDate.toISOString(), end_datetime: trainEnd.toISOString(),
          location_text: team.location_name, team_ids: [team.id], team_names: [team.name],
          status: 'confirmed', visibility: 'team_only', rsvp_required: false,
        });
        const gameDate = new Date(monday); gameDate.setDate(monday.getDate() + 6); gameDate.setHours(10,0,0,0);
        const gameEnd = new Date(gameDate); gameEnd.setMinutes(gameEnd.getMinutes() + 75);
        eventRecords.push({
          club_id: clubId, title: `${team.name} vs Rival FC`, event_type: 'game',
          start_datetime: gameDate.toISOString(), end_datetime: gameEnd.toISOString(),
          location_text: team.location_name + ' Stadium', team_ids: [team.id], team_names: [team.name],
          home_team_id: team.id, home_team_name: team.name, away_team_name: 'Rival FC',
          is_external_opponent: true, status: 'confirmed', visibility: 'team_only', rsvp_required: true,
        });
      }
      for (let i = 0; i < eventRecords.length; i += 200) {
        await svc.entities.CalendarEvent.bulkCreate(eventRecords.slice(i, i + 200));
      }
      summary.events = eventRecords.length;
    } catch (e) { errors.push(`CalendarEvents: ${e.message}`); }

    // 11. Marketing data
    try {
      await svc.entities.Campaign.create({
        club_id: clubId, name: "Fall Season Registration", source_type: "club_event",
        event_type: "registration", type: "event_promo", start_date: "2026-10-01",
        end_date: "2026-11-30", status: "active", cadence_preset: "standard",
      });
      const posts = await svc.entities.Post.bulkCreate([
        { club_id: clubId, platform: "instagram", status: "published", title: "Join Demo FC!", body: "Registration is open for the 2026-2027 season. #DemoFC #YouthSoccer", hashtags: ["DemoFC","YouthSoccer"], published_at: new Date().toISOString(), source_type: "club_event", event_type: "registration" },
        { club_id: clubId, platform: "facebook", status: "scheduled", title: "Tryout Reminder", body: "Tryouts start next week! Don't miss out. #DemoFC", hashtags: ["DemoFC","Tryouts"], scheduled_for: new Date(Date.now()+86400000).toISOString(), source_type: "club_event", event_type: "tryout" },
        { club_id: clubId, platform: "instagram", status: "draft", title: "Game Day", body: "Big game this weekend! Come support the team. #DemoFC", hashtags: ["DemoFC","GameDay"], source_type: "club_event", event_type: "match" },
      ]);
      await svc.entities.SocialAccount.bulkCreate([
        { club_id: clubId, platform: "instagram", account_name: "Demo FC", account_handle: "@demofc", status: "active" },
        { club_id: clubId, platform: "facebook", account_name: "Demo FC Soccer", account_handle: "DemoFCSoccer", status: "active" },
      ]);
      await svc.entities.MarketingSettings.create({ club_id: clubId, require_approval: false, brand_voice: "Energetic, community-focused, inspiring young athletes.", default_hashtags: ["DemoFC","YouthSoccer"], utm_enabled: true });
      summary.posts = posts.length;
    } catch (e) { errors.push(`Marketing: ${e.message}`); }

    // 12. Expenses
    try {
      const expType = await svc.entities.ExpenseType.create({ club_id: clubId, name: "Travel", calculation_method: "flat" });
      const expType2 = await svc.entities.ExpenseType.create({ club_id: clubId, name: "Equipment", calculation_method: "flat" });
      const report = await svc.entities.ExpenseReport.create({
        club_id: clubId, submitter_id: user.id, submitter_name: user.full_name || "Demo Admin",
        title: "October Tournament Travel", status: "submitted", submitted_total: 855,
        report_date: new Date().toISOString().slice(0,10), submitted_date: new Date().toISOString(),
      });
      await svc.entities.ExpenseLine.bulkCreate([
        { club_id: clubId, report_id: report.id, line_date: "2026-10-15", description: "Hotel - 2 nights", expense_type_id: expType.id, expense_type_name: "Travel", amount: 450, approved_amount: 450, calculation_method: "flat" },
        { club_id: clubId, report_id: report.id, line_date: "2026-10-15", description: "Gas and tolls", expense_type_id: expType.id, expense_type_name: "Travel", amount: 85, approved_amount: 85, calculation_method: "flat" },
        { club_id: clubId, report_id: report.id, line_date: "2026-10-16", description: "Team meals", expense_type_id: expType.id, expense_type_name: "Travel", amount: 320, approved_amount: 320, calculation_method: "flat" },
      ]);
      summary.expenseReports = 1;
    } catch (e) { errors.push(`Expenses: ${e.message}`); }

    // 13. Skill Tests + Scores + Physical Assessments + Evaluations (first 60 players)
    try {
      const skillTests = await svc.entities.SkillTest.bulkCreate([
        { club_id: clubId, title: "Directional 1st Touch", category: "basic", duration_minutes: 2, player_count: 2, description: "First touch under pressure", setup: "Cone gates", how_to_perform: "Receive and redirect", scoring: "Out of 100", order: 0 },
        { club_id: clubId, title: "Wall Pass", category: "basic", duration_minutes: 2, player_count: 2, description: "Quick combination passing", setup: "Wall + cones", how_to_perform: "One-two around cone", scoring: "Out of 100", order: 1 },
        { club_id: clubId, title: "Finishing Under Pressure", category: "advanced", duration_minutes: 3, player_count: 3, description: "Finishing with defender", setup: "Goal + defender", how_to_perform: "Receive, turn, finish", scoring: "Out of 100", order: 2 },
      ]);
      const today = new Date().toISOString().slice(0,10);
      const scoreRecords = [], assessmentRecords = [], evalRecords = [];
      for (const player of players.slice(0, 60)) {
        for (const st of skillTests) {
          scoreRecords.push({
            club_id: clubId, player_id: player.id, player_name: `${player.first_name} ${player.last_name}`,
            test_id: st.id, test_title: st.title, score: randInt(55,95),
            level: rand(["beginner","intermediate","advanced","expert"]),
            test_date: today, logged_by: 'demo@demofc.com',
          });
        }
        const sp = randInt(55,95), pw = randInt(55,95), ag = randInt(55,95), en = randInt(55,95);
        assessmentRecords.push({
          club_id: clubId, player_id: player.id, player_name: `${player.first_name} ${player.last_name}`,
          assessment_date: today, sprint_20m_seconds: parseFloat((3.0+Math.random()*0.8).toFixed(2)),
          vertical_jump_inches: randInt(14,26), agility_5_10_5_seconds: parseFloat((4.5+Math.random()).toFixed(2)),
          yoyo_level: randInt(14,21), speed: sp, power: pw, agility: ag, endurance: en,
          overall: Math.round((sp+pw+ag+en)/4), assessed_by: 'demo@demofc.com',
        });
        evalRecords.push({
          club_id: clubId, player_id: player.id, player_name: `${player.first_name} ${player.last_name}`,
          evaluation_date: today, evaluator_email: 'demo@demofc.com',
          primary_position: player.position || '8 - Center Midfielder',
          preferred_foot: rand(['Left','Right','Both']),
          technical_scores: { first_touch: randInt(5,9), passing: randInt(5,9), dribbling_1v1: randInt(5,9), finishing: randInt(5,9) },
          tactical_scores: { defending_organized: randInt(5,9), attacking_organized: randInt(5,9), building_out: randInt(5,9) },
          mental_scores: { mindset: randInt(5,9), effort: randInt(5,9), leadership: randInt(5,9) },
          overall_score: randInt(5,9), strengths: 'Strong technical foundation and good positional awareness.',
          areas_of_growth: 'Consistency in transition moments.', training_focus: 'Decision-making under pressure and finishing.',
          status: 'completed',
        });
      }
      if (scoreRecords.length) await svc.entities.SkillTestScore.bulkCreate(scoreRecords);
      if (assessmentRecords.length) await svc.entities.PhysicalAssessment.bulkCreate(assessmentRecords);
      if (evalRecords.length) await svc.entities.PlayerEvaluation.bulkCreate(evalRecords);
      summary.skillScores = scoreRecords.length;
      summary.assessments = assessmentRecords.length;
      summary.evaluations = evalRecords.length;
    } catch (e) { errors.push(`PlayerDev: ${e.message}`); }

    // 14. Communication channel + messages
    try {
      const channel = await svc.entities.Channel.create({
        club_id: clubId, name: "Club Announcements", type: "club_announcements", scope: "club", allow_replies: false, is_default: true,
      });
      const teamChannel = await svc.entities.Channel.create({
        club_id: clubId, team_id: teams[0].id, team_name: teams[0].name,
        name: `${teams[0].name} Chat`, type: "team_chat", scope: "team", allow_replies: true, is_default: true,
      });
      await svc.entities.ChannelMessage.bulkCreate([
        { club_id: clubId, channel_id: channel.id, channel_type: "club_announcements", author_email: "director@demofc.com", author_name: "Director Sarah", content: "Welcome to Demo FC! We're excited for the 2026-2027 season.", created_date: new Date(Date.now()-86400000).toISOString() },
        { club_id: clubId, channel_id: channel.id, channel_type: "club_announcements", author_email: "director@demofc.com", author_name: "Director Sarah", content: "Don't forget about the Demo FC Invitational tournament in November!", created_date: new Date(Date.now()-43200000).toISOString() },
        { club_id: clubId, channel_id: teamChannel.id, channel_type: "team_chat", team_id: teams[0].id, author_email: "coach@demofc.com", author_name: teams[0].coach_name || "Coach", content: "Training is on for this week. See you all there!", created_date: new Date().toISOString() },
      ]);
      summary.channels = 2;
    } catch (e) { errors.push(`Communication: ${e.message}`); }

    // 15. Payments
    try {
      const payRecords = [];
      for (let i = 0; i < 6; i++) {
        payRecords.push({
          club_id: clubId, source_type: "registration", source_id: `demo-reg-${i}`,
          source_label: `External Team ${i+1} - Tournament Entry`,
          amount: 500, currency: "USD", payment_method: "card",
          status: "paid_in_full", payment_date: new Date().toISOString().slice(0,10),
          charge_type: "event", team_id: teams[i]?.id, team_name: teams[i]?.name,
          branch_id: branches[0].id, branch_name: branches[0].name,
        });
      }
      await svc.entities.Payment.bulkCreate(payRecords);
      summary.payments = payRecords.length;
    } catch (e) { errors.push(`Payments: ${e.message}`); }

    // 16. ClubSetupProgress (mark wizard as completed)
    try {
      await svc.entities.ClubSetupProgress.create({ club_id: clubId, wizard_completed_at: new Date().toISOString() });
    } catch (e) { errors.push(`SetupProgress: ${e.message}`); }

    // 17. TenantModule records (activate all modules)
    try {
      const moduleKeys = ["registration","communication","payments","operations","development","facilities","tournaments","branding"];
      await svc.entities.TenantModule.bulkCreate(
        moduleKeys.map(key => ({ club_id: clubId, module_key: key, status: "complimentary", admin_enabled: true, complimentary_reason: "Demo club", complimentary_granted_by: user.id }))
      );
    } catch (e) { errors.push(`TenantModules: ${e.message}`); }

    // 18. Referees
    try {
      const refRecords = [];
      for (let i = 0; i < 5; i++) {
        const fn = FIRST_NAMES[(i + 20) % FIRST_NAMES.length];
        const ln = LAST_NAMES[(i + 10) % LAST_NAMES.length];
        refRecords.push({
          club_id: clubId, first_name: fn, last_name: ln,
          email: `referee.${fn.toLowerCase()}${i}@demofc.com`,
          phone: `555-${String(randInt(100,999))}-${String(randInt(1000,9999))}`,
          certification_level: rand(["Grade 8","State","National"]),
          sport: "soccer", is_active: true,
        });
      }
      await svc.entities.Referee.bulkCreate(refRecords);
      summary.referees = refRecords.length;
    } catch (e) { errors.push(`Referees: ${e.message}`); }

    return Response.json({ success: true, summary, errors, clubId });
  } catch (error) {
    console.error('generate-demo-fc error:', error);
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
}