// Builders for the large-scale demo club dataset.
//
// Pure logic only — every function here takes plain inputs and returns plain
// record objects (no SDK calls), so the shape of the demo club can be reasoned
// about and tested independently of the orchestration in
// base44/functions/rollover-beta-season/entry.ts.
//
// Structure produced for a club:
//   3 branches (Main + 2) · 4 facilities · 6 fields · 2 platforms (Elite/Select)
//   5 age groups · 20 teams · 50 staff · ~228 players · ~200 guardians
//   registrations, 5 payments per player, weekly training + weekend games,
//   2 evaluations and 2 sets of test results per player.

import { FIRST_NAMES, LAST_NAMES, POSITIONS, dobForAgeGroup } from "./demoData.ts";

export const DEMO_SEASON = "2026-2027";

// Rosters are driven by playing format, exactly as the spec requires.
export const DEMO_AGE_GROUPS = [
  { label: "U9", format: "4v4", roster: 6, birthYearStart: 2017, birthYearEnd: 2018, order: 0 },
  { label: "U11", format: "7v7", roster: 9, birthYearStart: 2015, birthYearEnd: 2016, order: 1 },
  { label: "U13", format: "9v9", roster: 12, birthYearStart: 2013, birthYearEnd: 2014, order: 2 },
  { label: "U15", format: "11v11", roster: 15, birthYearStart: 2011, birthYearEnd: 2012, order: 3 },
  { label: "U17", format: "11v11", roster: 15, birthYearStart: 2009, birthYearEnd: 2010, order: 4 },
];

// Two platforms: the main branch competes on both, every other branch on Select only.
export const DEMO_PLATFORMS = { main: "Elite", branch: "Select" };

export const DEMO_BRANCHES = [
  {
    key: "main", name: "Main", type: "nexus", city: "Ann Arbor", state: "MI", zip: "48104",
    address: "1200 Stadium Blvd", phone: "(734) 555-0142", bothPlatforms: true,
    facilities: [
      { name: "Main Campus Stadium", address: "1200 Stadium Blvd", surface: "turf", fields: [
        { name: "Championship Field", format: "11v11" }, { name: "North Pitch", format: "9v9" }] },
      { name: "Performance Center", address: "45 Depot Street", surface: "indoor", fields: [
        { name: "Performance Turf", format: "7v7" }] },
    ],
  },
  {
    key: "north", name: "North", type: "branch", city: "Novi", state: "MI", zip: "48375",
    address: "41000 Beck Road", phone: "(248) 555-0198", bothPlatforms: false,
    facilities: [
      { name: "North Sports Park", address: "41000 Beck Road", surface: "turf", fields: [
        { name: "North Field 1", format: "11v11" }, { name: "North Field 2", format: "9v9" }] },
    ],
  },
  {
    key: "south", name: "South", type: "branch", city: "Northville", state: "MI", zip: "48168",
    address: "21500 Six Mile Road", phone: "(248) 555-0173", bothPlatforms: false,
    facilities: [
      { name: "South Training Grounds", address: "21500 Six Mile Road", surface: "grass", fields: [
        { name: "South Field 1", format: "11v11" }] },
    ],
  },
];

// 50 staff across four roles: 20 head coaches, 20 assistants, 6 trainers, 4 admins.
export const DEMO_STAFF = [
  { first: "Michael", last: "Stevens", role: "head_coach" }, { first: "Jennifer", last: "Parker", role: "head_coach" },
  { first: "Robert", last: "Chen", role: "head_coach" }, { first: "Sarah", last: "Mitchell", role: "head_coach" },
  { first: "David", last: "Okonkwo", role: "head_coach" }, { first: "Lisa", last: "Anderson", role: "head_coach" },
  { first: "Maria", last: "Gonzalez", role: "head_coach" }, { first: "Thomas", last: "Brennan", role: "head_coach" },
  { first: "Patricia", last: "Walsh", role: "head_coach" }, { first: "Daniel", last: "Kim", role: "head_coach" },
  { first: "Aisha", last: "Patel", role: "head_coach" }, { first: "Rachel", last: "Goldberg", role: "head_coach" },
  { first: "Marcus", last: "Johnson", role: "head_coach" }, { first: "Sofia", last: "Russo", role: "head_coach" },
  { first: "Andrew", last: "Thompson", role: "head_coach" }, { first: "Nicole", last: "Dubois", role: "head_coach" },
  { first: "Carlos", last: "Mendoza", role: "head_coach" }, { first: "Hannah", last: "Schmidt", role: "head_coach" },
  { first: "Yuki", last: "Tanaka", role: "head_coach" }, { first: "Olivia", last: "Bennett", role: "head_coach" },
  { first: "James", last: "Rivera", role: "assistant_coach" }, { first: "Kevin", last: "O'Brien", role: "assistant_coach" },
  { first: "Devin", last: "Carter", role: "assistant_coach" }, { first: "Amara", last: "Nwosu", role: "assistant_coach" },
  { first: "Peter", last: "Novak", role: "assistant_coach" }, { first: "Grace", last: "Lindqvist", role: "assistant_coach" },
  { first: "Hassan", last: "Farouk", role: "assistant_coach" }, { first: "Megan", last: "Ortiz", role: "assistant_coach" },
  { first: "Trevor", last: "Boyle", role: "assistant_coach" }, { first: "Ines", last: "Duarte", role: "assistant_coach" },
  { first: "Samuel", last: "Adeyemi", role: "assistant_coach" }, { first: "Claire", last: "Fontaine", role: "assistant_coach" },
  { first: "Victor", last: "Petrov", role: "assistant_coach" }, { first: "Naomi", last: "Kirkland", role: "assistant_coach" },
  { first: "Elliot", last: "Reyes", role: "assistant_coach" }, { first: "Bianca", last: "Moretti", role: "assistant_coach" },
  { first: "Jordan", last: "Blake", role: "assistant_coach" }, { first: "Priya", last: "Raman", role: "assistant_coach" },
  { first: "Colin", last: "Duncan", role: "assistant_coach" }, { first: "Elena", last: "Herrera", role: "assistant_coach" },
  { first: "Nathan", last: "Voss", role: "trainer" }, { first: "Simone", last: "Leclair", role: "trainer" },
  { first: "Aaron", last: "Whitfield", role: "trainer" }, { first: "Lucia", last: "Barnes", role: "trainer" },
  { first: "Omar", last: "Haddad", role: "trainer" }, { first: "Fiona", last: "Caldwell", role: "trainer" },
  { first: "Diane", last: "Whitaker", role: "admin" }, { first: "Gerald", last: "Lombardi", role: "admin" },
  { first: "Renee", last: "Castillo", role: "admin" }, { first: "Paul", last: "Aldridge", role: "admin" },
];

export const DEMO_OPPONENTS = [
  "Northville United", "Novi Wildcats", "Plymouth Reign", "Canton Celtic", "Livonia City",
  "Brighton FC", "Saline Hornets", "Walled Lake Warriors", "Farmington Fusion", "Troy Titans",
  "Rochester Rockets", "Dearborn Dynamo", "Ypsilanti Eagles", "Howell Hurricanes", "Milford Rangers",
  "Berkley Bears", "Grosse Pointe Pirates", "Adrian Arsenal", "Jackson Jaguars", "Monroe Mariners",
];

export const EVAL_TECH_KEYS = ["first_touch", "passing", "receiving_under_pressure", "dribbling_1v1", "finishing", "heading", "crossing_service", "tackling_defending"];
export const EVAL_TACTIC_KEYS = ["defending_organized", "attacking_organized", "attacking_final_third", "building_out", "possession_retention", "goal_scoring"];
export const EVAL_ATTITUDE_KEYS = ["mindset", "effort", "next_play_focus", "team_first", "assuredness", "leadership"];

export const EVAL_COMMENTS = [
  { strengths: "Reads the game early and is consistently first to the second ball.", growth: "Needs to add a yard of pace in the final third.", focus: "Finishing repetitions at speed." },
  { strengths: "Composed on the ball under pressure and links play well.", growth: "Defensive positioning when the ball turns over.", focus: "Transition habits in small-sided games." },
  { strengths: "Excellent work rate and leads the group by example.", growth: "Decision-making in the attacking third.", focus: "Scanning before receiving." },
  { strengths: "Strong 1v1 defender who wins the ball back quickly.", growth: "Distribution and playing out from the back.", focus: "Passing under pressure patterns." },
  { strengths: "Sharp movement off the ball and finds space between the lines.", growth: "Physical duels against stronger opponents.", focus: "Strength and conditioning block." },
  { strengths: "Reliable in goal with good handling and communication.", growth: "Kicking and starting attacks quickly.", focus: "Distribution and footwork sessions." },
];

export const DEMO_SKILL_TESTS = [
  { title: "Shooting Accuracy", category: "advanced", duration_minutes: 4, player_count: 2, description: "Placement shooting from the edge of the box.", setup: "Goal, 6 balls, two cone gates at 16 yards", how_to_perform: "Player strikes 6 balls, alternating feet, aiming for the side netting.", scoring: "Points per target hit, out of 100" },
  { title: "First Touch Under Pressure", category: "basic", duration_minutes: 3, player_count: 2, description: "Controlling a driven pass with a defender closing.", setup: "Two cones, one server, one passive defender", how_to_perform: "Receive, take the first touch away from pressure, play back in two touches.", scoring: "Technical execution score, out of 100" },
  { title: "1v1 Dribbling", category: "basic", duration_minutes: 3, player_count: 2, description: "Beating a defender in a 10x15 channel.", setup: "Cones for the channel, one ball", how_to_perform: "Attack the defender, execute a change of direction, finish the run.", scoring: "Success rate and quality of the move, out of 100" },
];

export const pick = (arr, i) => arr[((i % arr.length) + arr.length) % arr.length];
export const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

/** Deterministic pseudo-random generator so every demo club looks the same. */
export function makeRng(seed) {
  let state = (seed * 2654435761) >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function minToTime(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  const period = h >= 12 ? "PM" : "AM";
  const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${displayH}:${String(m).padStart(2, "0")} ${period}`;
}

export const isoDate = (d) => new Date(d).toISOString().slice(0, 10);

export function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Monday of the week containing `date`. */
export function mondayOf(date) {
  const d = new Date(date);
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

/** Every Saturday/Sunday pair between two ISO dates (inclusive). */
export function listWeekends(startISO, endISO) {
  const out = [];
  const end = new Date(`${endISO}T12:00:00Z`);
  const d = new Date(`${startISO}T12:00:00Z`);
  while (d.getUTCDay() !== 6 && d <= end) d.setUTCDate(d.getUTCDate() + 1);
  while (d <= end) {
    const sunday = new Date(d);
    sunday.setUTCDate(sunday.getUTCDate() + 1);
    out.push({ saturday: isoDate(d), sunday: isoDate(sunday) });
    d.setUTCDate(d.getUTCDate() + 7);
  }
  return out;
}

export function gridFor(format) {
  if (format === "11v11") return { layout: "A1,A2,B1,B2,C1,C2,D1,D2", sections: 8 };
  if (format === "9v9") return { layout: "A1,A2,B1,B2,C1,C2", sections: 6 };
  if (format === "7v7") return { layout: "A1,A2,B1,B2", sections: 4 };
  return { layout: "A1,A2", sections: 2 };
}

/** Session length by age group, so 4v4 sides train shorter than 11v11. */
export function sessionMinutes(ageGroup) {
  const n = parseInt(String(ageGroup).replace(/\D/g, ""), 10) || 11;
  if (n <= 11) return 60;
  if (n === 13) return 75;
  return 90;
}

const TRAINING_DAYS = ["Mon", "Tue", "Wed", "Thu"];
const WINDOW_START = 17 * 60; // 5:00 PM
const WINDOW_END = 21 * 60 + 30; // 9:30 PM

function findOpenSlot(fields, day, minutes, occupancy, offset) {
  const count = fields.length;
  for (let step = 0; step + minutes <= WINDOW_END - WINDOW_START; step += 30) {
    for (let fi = 0; fi < count; fi++) {
      const field = fields[(fi + offset) % count];
      const start = WINDOW_START + step;
      const key = `${field.id}|${day}`;
      const taken = occupancy.get(key) || [];
      const overlaps = taken.some((t) => start < t.end && start + minutes > t.start);
      if (!overlaps) {
        taken.push({ start, end: start + minutes });
        occupancy.set(key, taken);
        return { field, start };
      }
    }
  }
  return null;
}

/**
 * Two training sessions per team per week, Monday–Thursday, 5:00–9:30 PM, with
 * no two sessions overlapping on the same field in the same branch.
 */
export function buildTrainingPlan(teams, fields) {
  const occupancy = new Map();
  const plan = [];
  const branchIds = [...new Set(teams.map((t) => t.branchId))];

  branchIds.forEach((branchId) => {
    const branchTeams = teams.filter((t) => t.branchId === branchId);
    const branchFields = fields.filter((f) => f.branchId === branchId);
    const usable = branchFields.length ? branchFields : fields;

    branchTeams.forEach((team, ti) => {
      const minutes = sessionMinutes(team.ageGroup);
      const days = [TRAINING_DAYS[ti % TRAINING_DAYS.length], TRAINING_DAYS[(ti + 1) % TRAINING_DAYS.length]];
      days.forEach((day, si) => {
        const slot = findOpenSlot(usable, day, minutes, occupancy, ti + si);
        if (!slot) return;
        plan.push({
          teamId: team.id, teamName: team.name, coachName: team.coachName, platformName: team.platformName,
          branchId, branchName: team.branchName, ageGroup: team.ageGroup,
          fieldId: slot.field.id, fieldName: slot.field.name,
          facilityId: slot.field.facilityId, facilityName: slot.field.facilityName,
          day, startMin: slot.start, endMin: slot.start + minutes,
        });
      });
    });
  });

  return plan;
}

/** Build the training Booking rows for one week, from the weekly session plan. */
export function buildTrainingBookings(clubId, weekStart, sessions) {
  return sessions.map((s) => {
    const date = isoDate(addDays(weekStart, TRAINING_DAYS.indexOf(s.day)));
    return {
      club_id: clubId, week_start: isoDate(weekStart), field_id: s.fieldId, field_name: s.fieldName,
      facility_name: s.facilityName, date, day: s.day, start_min: s.startMin, end_min: s.endMin,
      start_time: minToTime(s.startMin), end_time: minToTime(s.endMin),
      type: "training", event_type: "practice", team_name: s.teamName, coach_name: s.coachName,
      platform_name: s.platformName, source_ref: "manual",
      identity_key: `${clubId}|${s.fieldName}|${date}|${s.startMin}|${s.endMin}|${s.teamName}`,
      status: "confirmed",
    };
  });
}

export function buildTrainingEvents(clubId, weekStart, sessions, rsvpByTeam) {
  return sessions.map((s) => {
    const start = addDays(weekStart, TRAINING_DAYS.indexOf(s.day));
    start.setHours(Math.floor(s.startMin / 60), s.startMin % 60, 0, 0);
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + (s.endMin - s.startMin));
    const past = start.getTime() < Date.now();
    return {
      club_id: clubId, title: `${s.teamName} Training`, event_type: "practice",
      start_datetime: start.toISOString(), end_datetime: end.toISOString(),
      location_text: `${s.facilityName} — ${s.fieldName}`, facility_id: s.facilityId,
      field_id: s.fieldId, field_name: s.fieldName,
      team_ids: [s.teamId], team_names: [s.teamName], season: DEMO_SEASON,
      status: "confirmed", visibility: "team_only", rsvp_required: false,
      is_recurring: true, recurrence_group_id: `demo-training-${s.teamId}`,
      rsvps: past ? (rsvpByTeam[s.teamId] || {}) : undefined,
    };
  });
}

/**
 * One game per team per weekend between two dates. Even weekends are club
 * fixtures (each age group's four teams pair up), odd weekends are against
 * outside clubs, with home and away alternating across the season.
 */
export function buildGameSchedule(teams, fields, startISO, endISO, options = {}) {
  const weekends = listWeekends(startISO, endISO);
  const kickoffs = options.kickoffs || [9 * 60, 11 * 60, 13 * 60, 15 * 60, 17 * 60];
  const games = [];
  const ageGroups = [...new Set(teams.map((t) => t.ageGroup))];

  ageGroups.forEach((ageGroup) => {
    const pool = teams.filter((t) => t.ageGroup === ageGroup);
    weekends.forEach((weekend, wi) => {
      const internal = wi % 2 === 0 && pool.length >= 2;
      if (internal) {
        for (let i = 0; i + 1 < pool.length; i += 2) {
          const first = pool[i];
          const second = pool[i + 1];
          const firstIsHome = (i / 2 + wi / 2) % 2 === 0;
          const home = firstIsHome ? first : second;
          const away = firstIsHome ? second : first;
          games.push(gameRecord({
            clubId: options.clubId, home, away, opponentName: away.name, opponentTeamId: away.id,
            isExternal: false, date: i === 0 ? weekend.saturday : weekend.sunday,
            kickoffMin: pick(kickoffs, wi + i), fields,
          }));
        }
      } else {
        pool.forEach((team, i) => {
          const index = wi + i;
          const isHome = index % 2 === 0;
          const opponentName = pick(DEMO_OPPONENTS, index + ageGroup.length);
          const home = isHome ? team : null;
          const away = isHome ? null : team;
          games.push(gameRecord({
            clubId: options.clubId, home, away, opponentName,
            opponentTeamId: null, isExternal: true,
            date: index % 2 === 0 ? weekend.saturday : weekend.sunday,
            kickoffMin: pick(kickoffs, index), fields,
          }));
        });
      }
    });
  });

  return games;
}

function gameRecord({ clubId, home, away, opponentName, opponentTeamId, isExternal, date, kickoffMin, fields }) {
  const homeTeam = home;
  const awayTeam = away;
  const self = homeTeam || awayTeam;
  const isHome = !!homeTeam;
  const branchFields = fields.filter((f) => f.branchId === self.branchId);
  const venue = branchFields[0] || fields[0];
  const homeName = isHome ? self.name : opponentName;
  const awayName = isHome ? opponentName : self.name;
  return {
    club_id: clubId,
    date, kickoffMin, endMin: kickoffMin + 90,
    fieldId: venue.id, fieldName: venue.name, facilityId: venue.facilityId, facilityName: venue.facilityName,
    branchId: self.branchId, branchName: self.branchName, platformName: self.platformName,
    ageGroup: self.ageGroup, gender: self.gender,
    teamId: self.id, teamName: self.name, teamCoachName: self.coachName,
    isHome, isExternal, opponentName: awayName, opponentTeamId,
    homeTeamId: isHome ? self.id : opponentTeamId,
    homeTeamName: homeName, awayTeamName: awayName,
    teamIds: [self.id, ...(isExternal ? [] : [opponentTeamId])],
    teamNames: [self.name, ...(isExternal ? [] : [awayTeam.name])],
  };
}

export function buildGameBookings(clubId, games) {
  return games.map((g) => ({
    club_id: clubId, week_start: isoDate(mondayOf(`${g.date}T12:00:00`)), field_id: g.fieldId,
    field_name: g.fieldName, facility_name: g.facilityName, date: g.date,
    day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date(`${g.date}T12:00:00`).getDay()],
    start_min: g.kickoffMin, end_min: g.endMin, start_time: minToTime(g.kickoffMin), end_time: minToTime(g.endMin),
    type: "game", event_type: "match", team_name: g.homeTeamName, away_team_name: g.awayTeamName,
    coach_name: g.teamCoachName, platform_name: g.platformName,
    referee_name: `${pick(DEMO_STAFF, g.kickoffMin).first} ${pick(DEMO_STAFF, g.kickoffMin + 7).last}`,
    notes: g.isHome ? undefined : `Away fixture — ${g.opponentName}`,
    source_ref: "manual",
    identity_key: `${clubId}|${g.fieldName}|${g.date}|${g.kickoffMin}|${g.endMin}|${g.homeTeamName}`,
    status: "confirmed",
  }));
}

export function buildGameEvents(clubId, games) {
  return games.map((g) => {
    const start = new Date(`${g.date}T00:00:00`);
    start.setHours(Math.floor(g.kickoffMin / 60), g.kickoffMin % 60, 0, 0);
    const end = new Date(start.getTime() + 90 * 60000);
    return {
      club_id: clubId, title: `${g.homeTeamName} vs ${g.awayTeamName}`, event_type: "game",
      start_datetime: start.toISOString(), end_datetime: end.toISOString(),
      location_text: `${g.facilityName} — ${g.fieldName}`, facility_id: g.facilityId,
      field_id: g.fieldId, field_name: g.fieldName,
      team_ids: g.teamIds, team_names: g.teamNames,
      home_team_id: g.homeTeamId, home_team_name: g.homeTeamName,
      away_team_id: g.isExternal ? undefined : g.opponentTeamId,
      away_team_name: g.awayTeamName, is_external_opponent: g.isExternal,
      season: DEMO_SEASON, status: "confirmed", visibility: "team_only", rsvp_required: true,
    };
  });
}

export function demoPlayerName(index) {
  return { first: pick(FIRST_NAMES, index), last: pick(LAST_NAMES, index * 3 + 7) };
}

export function demoGuardianName(index) {
  return { first: pick(FIRST_NAMES, index * 5 + 11), last: pick(LAST_NAMES, index * 3 + 7) };
}

export function playerPosition(index) {
  return pick(POSITIONS, index);
}

export function playerDob(ageGroup, index) {
  const ag = DEMO_AGE_GROUPS.find((a) => a.label === ageGroup) || DEMO_AGE_GROUPS[3];
  return dobForAgeGroup(ag, index);
}

/** One evaluation: technical, tactical, attitude ratings plus a physical score. */
export function buildEvaluation({ clubId, player, team, coachEmail, date, phase, seed, rng }) {
  const base = 5 + (seed % 3);
  const drift = phase === "end" ? 1 : 0;
  const score = (offset) => Math.max(1, Math.min(10, base + drift + Math.round(rng() * 2) - (offset % 2)));
  const technical_scores = {};
  EVAL_TECH_KEYS.forEach((k, i) => { technical_scores[k] = score(i); });
  const tactical_scores = {};
  EVAL_TACTIC_KEYS.forEach((k, i) => { tactical_scores[k] = score(i + 1); });
  const attitude_scores = {};
  EVAL_ATTITUDE_KEYS.forEach((k, i) => { attitude_scores[k] = score(i + 3); });
  const all = [...Object.values(technical_scores), ...Object.values(tactical_scores), ...Object.values(attitude_scores)];
  const overall = Math.round((all.reduce((a, b) => a + b, 0) / all.length) * 10) / 10;
  const comment = pick(EVAL_COMMENTS, seed + (phase === "end" ? 2 : 0));
  const physical = 55 + Math.round(rng() * 40) + (phase === "end" ? 2 : 0);
  return {
    club_id: clubId, player_id: player.id, player_name: player.player_name,
    evaluation_date: date, evaluator_email: coachEmail,
    primary_position: player.position || "8 - Center Midfielder",
    preferred_foot: pick(["Left", "Right", "Both"], seed),
    physical_score: Math.min(100, physical),
    technical_scores, tactical_scores, mental_scores: attitude_scores,
    overall_score: overall,
    strengths: comment.strengths, areas_of_growth: comment.growth, training_focus: comment.focus,
    status: "completed",
  };
}

/** One physical assessment: sprint, endurance, jump and agility with a test date. */
export function buildAssessment({ clubId, player, date, seed, phase, rng }) {
  const improvement = phase === "end" ? 1 : 0;
  const sprint = parseFloat((3.35 - improvement * 0.08 - rng() * 0.35).toFixed(2));
  const yoyo = 14 + Math.round(rng() * 6) + improvement;
  const jump = 15 + Math.round(rng() * 9) + improvement;
  const agility = parseFloat((5.1 - improvement * 0.06 - rng() * 0.5).toFixed(2));
  const speed = Math.min(100, 55 + Math.round(rng() * 30) + improvement * 3);
  const power = Math.min(100, 55 + Math.round(rng() * 30) + improvement * 2);
  const agilityScore = Math.min(100, 55 + Math.round(rng() * 30) + improvement * 2);
  const endurance = Math.min(100, 55 + Math.round(rng() * 30) + improvement * 3);
  return {
    club_id: clubId, player_id: player.id, player_name: player.player_name, assessment_date: date,
    sprint_20m_seconds: sprint, vertical_jump_inches: jump, agility_5_10_5_seconds: agility, yoyo_level: yoyo,
    speed, power, agility: agilityScore, endurance,
    overall: Math.round((speed + power + agilityScore + endurance) / 4),
    notes: phase === "end" ? "End-of-season testing window." : "Mid-season testing window.",
    assessed_by: "demo@clubrudder.com",
  };
}

export function buildSkillScore({ clubId, player, test, date, seed, phase, rng }) {
  const raw = 45 + Math.round(rng() * 45) + (phase === "end" ? 5 : 0);
  const score = Math.min(100, raw);
  const level = score >= 85 ? "expert" : score >= 70 ? "advanced" : score >= 55 ? "intermediate" : "beginner";
  return {
    club_id: clubId, player_id: player.id, player_name: player.player_name,
    test_id: test.id, test_title: test.title, score, level, test_date: date,
    logged_by: "demo@clubrudder.com",
    notes: phase === "end" ? "Re-test after the mid-season block." : undefined,
  };
}

export function buildFeedback({ clubId, player, seed }) {
  const comment = pick(EVAL_COMMENTS, seed);
  return {
    club_id: clubId, player_id: player.id, player_name: player.player_name,
    feedback_text: `${player.player_name.split(" ")[0]} has progressed well this period. ${comment.strengths}`,
    strengths: comment.strengths.split(" and ").slice(0, 2),
    development_priorities: [comment.growth],
    tone: "developmental", status: "draft", created_by: "demo@clubrudder.com",
  };
}

export function registrationAmounts(format) {
  if (format === "11v11") return { registration: 1150, dues: 350 };
  if (format === "9v9") return { registration: 950, dues: 300 };
  return { registration: 850, dues: 250 };
}

/**
 * Five payment records per player: the season registration fee, three monthly
 * dues installments, and one tournament fee — with Paid, Pending and Overdue
 * statuses spread across the season.
 */
export function buildPayments({ clubId, player, registration_id, team, guardian, tournament, rng }) {
  const { registration, dues } = registrationAmounts(team.format);
  // Ledger rows for season dues point at the Registration they belong to; the
  // player id is only a fallback for callers that don't know the registration.
  const regSourceId = registration_id || player.id;
  const payer = {
    player_id: player.id, player_name: player.player_name, guardian_name: guardian.name,
    family_email: guardian.email, currency: "USD", team_id: team.id, team_name: team.name,
    branch_id: team.branchId, branch_name: team.branchName, recorded_by: "demo@clubrudder.com",
  };
  const paid = (amount, date, method, chargeType, sourceType, sourceId, sourceLabel, notes) => ({
    club_id: clubId, source_type: sourceType, source_id: sourceId, source_label: sourceLabel,
    amount, payment_method: method, status: "paid_in_full", payment_date: date,
    charge_type: chargeType, notes, ...payer,
  });
  const unpaid = (amount, date, status, chargeType, sourceType, sourceId, sourceLabel, notes) => ({
    club_id: clubId, source_type: sourceType, source_id: sourceId, source_label: sourceLabel,
    amount, payment_method: "card", status, payment_date: date, charge_type: chargeType, notes, ...payer,
  });

  const roll = rng();
  const records = [];
  const method = pick(["card", "card", "ach", "check", "cash"], Math.round(roll * 100));

  // Registration fee — collected at sign-up in July/August.
  if (roll < 0.08) {
    records.push(unpaid(registration, "2026-08-05", "past_due", "other", "registration", regSourceId, "2026-2027 season registration", "Season registration fee outstanding."));
  } else if (roll < 0.13) {
    records.push(unpaid(registration, "2026-08-05", "not_started", "other", "registration", regSourceId, "2026-2027 season registration", "Payment plan not started."));
  } else {
    records.push(paid(registration, "2026-07-28", method, "other", "registration", regSourceId, "2026-2027 season registration", "Season registration fee."));
  }

  // Three monthly dues installments.
  const duesPlan = [
    { date: "2026-08-10", overdueCutoff: 0.06, pendingCutoff: 0.09 },
    { date: "2026-09-10", overdueCutoff: 0.14, pendingCutoff: 0.19 },
    { date: "2026-10-10", overdueCutoff: 0.24, pendingCutoff: 0.55 },
  ];
  duesPlan.forEach((installment, i) => {
    const r = rng();
    if (r < installment.overdueCutoff) {
      records.push(unpaid(dues, installment.date, "past_due", "dues", "registration", regSourceId, `Monthly dues — installment ${i + 1}`, "Installment past due."));
    } else if (r < installment.pendingCutoff) {
      records.push(unpaid(dues, installment.date, "not_started", "dues", "registration", regSourceId, `Monthly dues — installment ${i + 1}`, "Scheduled but not yet collected."));
    } else {
      records.push(paid(dues, installment.date, method, "dues", "registration", regSourceId, `Monthly dues — installment ${i + 1}`, "Monthly club dues."));
    }
  });

  // Tournament / event fee.
  const r = rng();
  const tournamentAmount = 125;
  if (r < 0.1) {
    records.push(unpaid(tournamentAmount, "2026-09-18", "past_due", "event", "club_event", tournament.id, tournament.name, "Tournament entry fee outstanding."));
  } else if (r < 0.3) {
    records.push(unpaid(tournamentAmount, "2026-09-18", "not_started", "event", "club_event", tournament.id, tournament.name, "Tournament entry fee pending."));
  } else {
    records.push(paid(tournamentAmount, "2026-09-12", method, "event", "club_event", tournament.id, tournament.name, "Tournament entry fee."));
  }

  return records;
}

export function buildRegistration({ clubId, player, guardian, team, program, rng, registrationDate }) {
  const roll = rng();
  const { registration, dues } = registrationAmounts(team.format);
  const status = roll < 0.04 ? "pending" : roll < 0.07 ? "waitlisted" : "approved";
  const paymentStatus = roll < 0.08 ? "partial" : roll < 0.12 ? "unpaid" : "paid";
  return {
    club_id: clubId, player_id: player.id, player_name: player.player_name,
    guardian_id: guardian.id, guardian_name: guardian.name,
    program_id: program.id, program_title: program.title,
    location_id: team.branchId, location_name: team.branchName,
    team_id: team.id, team_name: team.name,
    status, payment_status: paymentStatus,
    payment_frequency: "monthly", installment_count: 9, installment_amount: dues,
    installments_paid: paymentStatus === "paid" ? 3 : paymentStatus === "partial" ? 2 : 0,
    registration_date: registrationDate,
    amount_due: registration, amount_paid: paymentStatus === "paid" ? registration : paymentStatus === "partial" ? Math.round(registration / 2) : 0,
    waiver_accepted: roll > 0.03, paperwork_complete: roll > 0.12,
    autopay_enabled: roll > 0.45,
    next_payment_date: "2026-11-10", next_payment_amount: dues,
    notes: status === "waitlisted" ? "Waiting for an open roster spot." : undefined,
    assigned_to: "demo@clubrudder.com",
  };
}

export { POSITIONS };