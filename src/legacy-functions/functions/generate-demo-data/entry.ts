// @ts-nocheck
import { createClientFromRequest } from '@/legacy-functions/_sdk';
import { FIRST_NAMES, LAST_NAMES, POSITIONS, rand, randInt, dobForAgeGroup } from "../../shared/demoData.ts";

// Demo data generator for trial clubs. Creates branches, teams, players,
// guardians, schedule, assessments, evaluations, and feedback so a new trial
// user lands in a fully populated club they can explore immediately.

const BRANCH_CITIES = [
  { name: "Northville", state: "MI" }, { name: "Novi", state: "MI" }, { name: "Lansing", state: "MI" },
  { name: "Ann Arbor", state: "MI" }, { name: "Grand Rapids", state: "MI" }, { name: "Detroit", state: "MI" },
  { name: "Kalamazoo", state: "MI" }, { name: "Flint", state: "MI" }, { name: "Warren", state: "MI" },
  { name: "Sterling Heights", state: "MI" }, { name: "Toledo", state: "OH" },
];
const AGE_GROUPS = [
  { label: "U9", format: "4v4", roster: 7 }, { label: "U11", format: "7v7", roster: 10 },
  { label: "U13", format: "9v9", roster: 12 }, { label: "U15", format: "11v11", roster: 16 },
];
const LEAGUES = ["MSPRL","NPL","ECNL","MLS Next"];

const pick = (n) => FIRST_NAMES[n % FIRST_NAMES.length];

export default async function(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { generateSchedule, generateGuardians, generateEpic, generateEvaluations } = body;

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const clubId = user.data?.club_id || user.club_id;
    if (!clubId) return Response.json({ error: 'No club found for this user' }, { status: 400 });

    const svc = base44.asServiceRole;
    const summary = { branches: 0, teams: 0, players: 0, guardians: 0, events: 0, assessments: 0, skillScores: 0, evaluations: 0, feedback: 0 };

    // --- Branches ---
    let branches = await svc.entities.Location.filter({ club_id: clubId });
    if (!branches || branches.length === 0) {
      const branchDefs = BRANCH_CITIES.slice(0, 3);
      const created = await svc.entities.Location.bulkCreate(
        branchDefs.map((b, i) => ({
          club_id: clubId,
          name: `${b.name} Branch`,
          city: b.name, state: b.state,
          branch_type: i === 0 ? 'nexus' : 'branch',
          is_active: true,
        }))
      );
      branches = created;
    }
    summary.branches = branches.length;

    // --- Teams (max 4 per gender per branch) ---
    const teamRecords = [];
    for (const branch of branches) {
      for (const gender of ["Boys", "Girls"]) {
        const teamCount = Math.min(4, AGE_GROUPS.length);
        for (let i = 0; i < teamCount; i++) {
          const ag = AGE_GROUPS[i];
          const teamName = `${branch.city || branch.name} ${gender} ${ag.label}`;
          teamRecords.push({
            club_id: clubId,
            name: teamName,
            age_group: ag.label,
            gender,
            playing_format: ag.format,
            season: "2026-2027",
            league: rand(LEAGUES),
            location_id: branch.id,
            location_name: branch.name,
            max_roster_size: ag.roster + 2,
            player_ids: [],
          });
        }
      }
    }
    const teams = await svc.entities.Team.bulkCreate(teamRecords);
    summary.teams = teams.length;

    // --- Players + Guardians ---
    const playerRecords = [];
    const guardianRecords = [];
    const guardianMap = {}; // playerIdx -> [guardianIdx1, guardianIdx2]
    let nameCounter = 0;

    for (const team of teams) {
      const ag = AGE_GROUPS.find((a) => a.format === team.playing_format) || AGE_GROUPS[3];
      for (let p = 0; p < ag.roster; p++) {
        const fn = pick(nameCounter), ln = rand(LAST_NAMES);
        nameCounter++;
        const pIdx = playerRecords.length;
        const gIdx1 = guardianRecords.length;
        const gIdx2 = guardianRecords.length + 1;

        // 2 guardians per player
        const g1Fn = pick(nameCounter + 50), g1Ln = ln;
        const g2Fn = pick(nameCounter + 100), g2Ln = ln;
        guardianRecords.push({
          club_id: clubId,
          first_name: g1Fn, last_name: g1Ln,
          email: `${g1Fn.toLowerCase()}.${g1Ln.toLowerCase()}${gIdx1}@example.com`,
          phone: `555-${String(randInt(100,999))}-${String(randInt(1000,9999))}`,
          relationship: Math.random() > 0.5 ? 'mother' : 'father',
        });
        guardianRecords.push({
          club_id: clubId,
          first_name: g2Fn, last_name: g2Ln,
          email: `${g2Fn.toLowerCase()}.${g2Ln.toLowerCase()}${gIdx2}@example.com`,
          phone: `555-${String(randInt(100,999))}-${String(randInt(1000,9999))}`,
          relationship: g1Fn === pick(nameCounter+50) ? 'guardian' : 'mother',
        });
        guardianMap[pIdx] = [gIdx1, gIdx2];

        playerRecords.push({
          club_id: clubId,
          first_name: fn, last_name: ln,
          date_of_birth: dobForAgeGroup(ag),
          gender: team.gender,
          location_id: team.location_id,
          location_name: team.location_name,
          team_id: team.id,
          team_name: team.name,
          age_group: team.age_group,
          league: team.league,
          season: team.season,
          status: 'active',
          position: rand(POSITIONS),
          jersey_number: String(p + 1),
        });
      }
    }

    // Create guardians first (if requested or always — needed for player.guardian_id required field)
    let guardians = [];
    if (generateGuardians) {
      guardians = await svc.entities.Guardian.bulkCreate(guardianRecords);
      summary.guardians = guardians.length;
      // Stamp players with primary guardian_id
      playerRecords.forEach((pr, idx) => {
        const [g1] = guardianMap[idx];
        pr.guardian_id = guardians[g1]?.id;
        pr.guardian_name = guardians[g1] ? `${guardians[g1].first_name} ${guardians[g1].last_name}` : '';
        pr.guardian_ids = [guardians[guardianMap[idx][0]]?.id, guardians[guardianMap[idx][1]]?.id].filter(Boolean);
      });
    } else {
      // Still need a guardian_id (required field) — create one stub per player
      const stubGuardians = await svc.entities.Guardian.bulkCreate(
        playerRecords.map((pr, i) => ({
          club_id: clubId,
          first_name: `Guardian`, last_name: pr.last_name,
          email: `guardian.${i}@example.com`,
        }))
      );
      guardians = stubGuardians;
      summary.guardians = stubGuardians.length;
      playerRecords.forEach((pr, i) => {
        pr.guardian_id = stubGuardians[i]?.id;
        pr.guardian_name = `Guardian ${pr.last_name}`;
      });
    }

    const players = await svc.entities.Player.bulkCreate(playerRecords);
    summary.players = players.length;

    // Update teams with player_ids
    const teamUpdates = teams.map((t) => {
      const tps = players.filter((p) => p.team_id === t.id).map((p) => p.id);
      return { id: t.id, player_ids: tps };
    });
    await svc.entities.Team.bulkUpdate(teamUpdates);

    // --- Schedule: 2 training + 1 game per week for 8 weeks ---
    if (generateSchedule) {
      const eventRecords = [];
      const now = new Date();
      const startMonday = new Date(now);
      startMonday.setDate(now.getDate() + 1);
      for (const team of teams) {
        for (let week = 0; week < 8; week++) {
          // 2 training sessions (Tue, Thu)
          for (const day of [2, 4]) {
            const d = new Date(startMonday);
            d.setDate(startMonday.getDate() + week * 7 + day);
            d.setHours(17, 0, 0, 0);
            const end = new Date(d); end.setMinutes(90);
            eventRecords.push({
              club_id: clubId,
              title: `${team.name} Training`,
              event_type: 'practice',
              start_datetime: d.toISOString(),
              end_datetime: end.toISOString(),
              location_text: team.location_name + ' Field 1',
              team_ids: [team.id],
              team_names: [team.name],
              status: 'confirmed',
              visibility: 'team_only',
              rsvp_required: false,
            });
          }
          // 1 game (Saturday)
          const gd = new Date(startMonday);
          gd.setDate(startMonday.getDate() + week * 7 + 6);
          gd.setHours(10, 0, 0, 0);
          const gend = new Date(gd); gend.setMinutes(75);
          eventRecords.push({
            club_id: clubId,
            title: `${team.name} vs Opponent FC`,
            event_type: 'game',
            start_datetime: gd.toISOString(),
            end_datetime: gend.toISOString(),
            location_text: team.location_name + ' Stadium',
            team_ids: [team.id],
            team_names: [team.name],
            home_team_id: team.id,
            home_team_name: team.name,
            away_team_name: 'Opponent FC',
            is_external_opponent: true,
            status: 'confirmed',
            visibility: 'team_only',
            rsvp_required: true,
          });
        }
      }
      // Chunk to avoid oversized payloads
      for (let i = 0; i < eventRecords.length; i += 200) {
        await svc.entities.CalendarEvent.bulkCreate(eventRecords.slice(i, i + 200));
      }
      summary.events = eventRecords.length;
    }

    // --- E.P.I.C + evaluation test results (PhysicalAssessment + SkillTestScore) ---
    if (generateEpic) {
      // Create a few SkillTests to score against
      const skillTests = await svc.entities.SkillTest.bulkCreate([
        { club_id: clubId, title: "Directional 1st Touch", category: "basic", duration_minutes: 2, player_count: 2, description: "First touch under pressure", setup: "Cone gates", how_to_perform: "Receive and redirect", scoring: "Out of 100", order: 0 },
        { club_id: clubId, title: "Wall Pass", category: "basic", duration_minutes: 2, player_count: 2, description: "Quick combination passing", setup: "Wall + cones", how_to_perform: "One-two around cone", scoring: "Out of 100", order: 1 },
        { club_id: clubId, title: "Finishing Under Pressure", category: "advanced", duration_minutes: 3, player_count: 3, description: "Finishing with defender", setup: "Goal + defender", how_to_perform: "Receive, turn, finish", scoring: "Out of 100", order: 2 },
      ]);

      const assessmentRecords = [];
      const skillScoreRecords = [];
      const today = new Date().toISOString().slice(0, 10);
      for (const player of players) {
        // Physical assessment
        const sprint = (3.0 + Math.random() * 0.8).toFixed(2);
        const vert = randInt(14, 26);
        const agility = (4.5 + Math.random() * 1.0).toFixed(2);
        const yoyo = randInt(14, 21);
        const speedScore = randInt(55, 95), powerScore = randInt(55, 95), agilityScore = randInt(55, 95), enduranceScore = randInt(55, 95);
        assessmentRecords.push({
          club_id: clubId,
          player_id: player.id,
          player_name: `${player.first_name} ${player.last_name}`,
          assessment_date: today,
          sprint_20m_seconds: parseFloat(sprint),
          vertical_jump_inches: vert,
          agility_5_10_5_seconds: parseFloat(agility),
          yoyo_level: yoyo,
          speed: speedScore, power: powerScore, agility: agilityScore, endurance: enduranceScore,
          overall: Math.round((speedScore + powerScore + agilityScore + enduranceScore) / 4),
          assessed_by: 'demo@clubrudder.com',
        });
        // Skill test scores (2 per player)
        for (const st of skillTests.slice(0, 2)) {
          skillScoreRecords.push({
            club_id: clubId,
            player_id: player.id,
            player_name: `${player.first_name} ${player.last_name}`,
            test_id: st.id,
            test_title: st.title,
            score: randInt(55, 95),
            level: rand(["beginner","intermediate","advanced","expert"]),
            test_date: today,
            logged_by: 'demo@clubrudder.com',
          });
        }
      }
      if (assessmentRecords.length) {
        for (let i = 0; i < assessmentRecords.length; i += 200) {
          await svc.entities.PhysicalAssessment.bulkCreate(assessmentRecords.slice(i, i + 200));
        }
        summary.assessments = assessmentRecords.length;
      }
      if (skillScoreRecords.length) {
        for (let i = 0; i < skillScoreRecords.length; i += 200) {
          await svc.entities.SkillTestScore.bulkCreate(skillScoreRecords.slice(i, i + 200));
        }
        summary.skillScores = skillScoreRecords.length;
      }
    }

    // --- Evaluations + Feedback ---
    if (generateEvaluations) {
      const evalRecords = [];
      const feedbackRecords = [];
      const today = new Date().toISOString().slice(0, 10);
      const techKeys = ["first_touch","passing","receiving_under_pressure","dribbling_1v1","finishing","heading","crossing_service","tackling_defending"];
      const tacKeys = ["defending_organized","attacking_organized","attacking_final_third","building_out","possession_retention","goal_scoring"];
      const mentKeys = ["mindset","effort","next_play_focus","team_first","assuredness","leadership"];
      for (const player of players) {
        const tech = {}, tac = {}, ment = {};
        techKeys.forEach((k) => tech[k] = randInt(5, 9));
        tacKeys.forEach((k) => tac[k] = randInt(5, 9));
        mentKeys.forEach((k) => ment[k] = randInt(5, 9));
        const all = [...Object.values(tech), ...Object.values(tac), ...Object.values(ment)];
        const overall = Math.round((all.reduce((a,b)=>a+b,0) / all.length) * 10) / 10;
        evalRecords.push({
          club_id: clubId,
          player_id: player.id,
          player_name: `${player.first_name} ${player.last_name}`,
          evaluation_date: today,
          evaluator_email: 'demo@clubrudder.com',
          primary_position: player.position || '8 - Center Midfielder',
          preferred_foot: rand(['Left','Right','Both']),
          technical_scores: tech,
          tactical_scores: tac,
          mental_scores: ment,
          overall_score: overall,
          strengths: 'Strong technical foundation and good positional awareness.',
          areas_of_growth: 'Consistency in transition moments.',
          training_focus: 'Decision-making under pressure and finishing.',
          status: 'completed',
        });
        feedbackRecords.push({
          club_id: clubId,
          player_id: player.id,
          player_name: `${player.first_name} ${player.last_name}`,
          feedback_text: `${player.first_name} has shown strong progress this period. Key strengths include first touch and work rate. Focus areas: finishing under pressure and defensive transition awareness.`,
          strengths: ['First touch','Work rate','Positional awareness'],
          development_priorities: ['Finishing under pressure','Defensive transitions'],
          tone: 'developmental',
          status: 'draft',
          created_by: 'demo@clubrudder.com',
        });
      }
      if (evalRecords.length) {
        for (let i = 0; i < evalRecords.length; i += 200) {
          await svc.entities.PlayerEvaluation.bulkCreate(evalRecords.slice(i, i + 200));
        }
        summary.evaluations = evalRecords.length;
      }
      if (feedbackRecords.length) {
        for (let i = 0; i < feedbackRecords.length; i += 200) {
          await svc.entities.PlayerFeedback.bulkCreate(feedbackRecords.slice(i, i + 200));
        }
        summary.feedback = feedbackRecords.length;
      }
    }

    return Response.json({ success: true, summary });
  } catch (error) {
    console.error('generate-demo-data error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}