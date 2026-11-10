// @ts-nocheck
// Shared tournament scheduling logic used by generate-tournament-schedule
// and detect-schedule-conflicts backend functions.

export interface ProposedGame {
  id?: string;
  field_id: string;
  field_name?: string;
  facility_id?: string;
  facility_name?: string;
  scheduled_date: string; // ISO date YYYY-MM-DD
  start_min: number; // minutes after midnight
  end_min: number;
  home_team_id: string;
  home_team_name: string;
  away_team_id: string;
  away_team_name: string;
  home_coach_name?: string;
  away_coach_name?: string;
  referee_id?: string;
  referee_name?: string;
  round?: string;
  round_number?: number;
  game_number?: number;
  division?: string;
}

export interface ScheduleConflict {
  type: "field_double" | "team_double" | "referee_double" | "coach_double" | "insufficient_rest" | "insufficient_travel_time";
  severity: "error" | "warning";
  message: string;
  game_ids: string[];
  games?: { id?: string; home_team_name: string; away_team_name: string; field_name?: string; scheduled_date: string; start_min: number }[];
}

/**
 * Round-robin schedule using the circle method.
 * Returns rounds of matches (home/away team id pairs).
 * Adds a BYE placeholder if the team count is odd.
 */
export function generateRoundRobin(
  teamIds: string[]
): { round: number; matches: { home: string; away: string }[] }[] {
  const teams = [...teamIds];
  if (teams.length < 2) return [];

  const hasBye = teams.length % 2 !== 0;
  if (hasBye) teams.push("BYE");

  const n = teams.length;
  const totalRounds = n - 1;
  const half = n / 2;
  const result: { round: number; matches: { home: string; away: string }[] }[] = [];
  const arr = [...teams];

  for (let r = 0; r < totalRounds; r++) {
    const matches: { home: string; away: string }[] = [];
    for (let i = 0; i < half; i++) {
      const home = arr[i];
      const away = arr[n - 1 - i];
      if (home !== "BYE" && away !== "BYE") {
        // Alternate home/away each round for fairness
        if ((r + i) % 2 === 0) matches.push({ home, away });
        else matches.push({ home: away, away: home });
      }
    }
    result.push({ round: r + 1, matches });
    // Rotate: fix first element, rotate the rest clockwise
    const fixed = arr[0];
    const rest = arr.slice(1);
    rest.unshift(rest.pop()!);
    arr.splice(0, arr.length, fixed, ...rest);
  }

  return result;
}

/**
 * Division-based round-robin: groups teams by their division, then generates
 * a separate round-robin within each division. Returns rounds tagged with
 * their division so the scheduler can interleave games across divisions.
 */
export function generateDivisionRoundRobin(
  teamIds: string[],
  teamDivisions: Record<string, string>
): { division: string; round: number; matches: { home: string; away: string }[] }[] {
  const divisions = new Map<string, string[]>();
  for (const id of teamIds) {
    const div = teamDivisions[id] || "General";
    if (!divisions.has(div)) divisions.set(div, []);
    divisions.get(div)!.push(id);
  }
  const result: { division: string; round: number; matches: { home: string; away: string }[] }[] = [];
  for (const [division, teams] of divisions) {
    const rounds = generateRoundRobin(teams);
    for (const round of rounds) {
      result.push({ division, ...round });
    }
  }
  return result;
}

function gameSummary(g: ProposedGame) {
  return {
    id: g.id,
    home_team_name: g.home_team_name,
    away_team_name: g.away_team_name,
    field_name: g.field_name,
    scheduled_date: g.scheduled_date,
    start_min: g.start_min,
  };
}

/**
 * Detect scheduling conflicts across a set of proposed games.
 * Checks for: field double-booking, team double-booking,
 * referee double-booking, coach double-booking, and insufficient rest
 * (same team, same day, less than `minRestMinutes` between games).
 */
export function detectConflicts(
  games: ProposedGame[],
  minRestMinutes = 60,
  travelMatrix?: Record<string, number>,
  parkingMin = 10
): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = [];
  const ids = (g1: ProposedGame, g2: ProposedGame) =>
    [g1.id, g2.id].filter(Boolean) as string[];

  // Pairwise overlap check
  for (let i = 0; i < games.length; i++) {
    for (let j = i + 1; j < games.length; j++) {
      const g1 = games[i];
      const g2 = games[j];
      const sameDay = g1.scheduled_date === g2.scheduled_date;
      const overlap =
        sameDay && g1.start_min < g2.end_min && g2.start_min < g1.end_min;
      if (!overlap) continue;

      if (g1.field_id && g1.field_id === g2.field_id) {
        conflicts.push({
          type: "field_double",
          severity: "error",
          message: `Field "${g1.field_name || g1.field_id}" double-booked on ${g1.scheduled_date} (${minToTime(g1.start_min)} & ${minToTime(g2.start_min)})`,
          game_ids: ids(g1, g2),
          games: [gameSummary(g1), gameSummary(g2)],
        });
      }

      const teams1 = new Set([g1.home_team_id, g1.away_team_id]);
      const teams2 = new Set([g2.home_team_id, g2.away_team_id]);
      for (const t of teams1) {
        if (teams2.has(t)) {
          conflicts.push({
            type: "team_double",
            severity: "error",
            message: `Team scheduled in two overlapping games on ${g1.scheduled_date}`,
            game_ids: ids(g1, g2),
            games: [gameSummary(g1), gameSummary(g2)],
          });
        }
      }

      if (g1.referee_id && g1.referee_id === g2.referee_id) {
        conflicts.push({
          type: "referee_double",
          severity: "error",
          message: `Referee assigned to overlapping games on ${g1.scheduled_date}`,
          game_ids: ids(g1, g2),
          games: [gameSummary(g1), gameSummary(g2)],
        });
      }

      // Coach conflict: same coach name on different teams in overlapping games
      const coaches1 = new Set(
        [g1.home_coach_name, g1.away_coach_name].filter(Boolean) as string[]
      );
      const coaches2 = new Set(
        [g2.home_coach_name, g2.away_coach_name].filter(Boolean) as string[]
      );
      for (const c of coaches1) {
        if (coaches2.has(c)) {
          conflicts.push({
            type: "coach_double",
            severity: "error",
            message: `Coach "${c}" has two overlapping games on ${g1.scheduled_date} (${g1.home_team_name} vs ${g1.away_team_name} & ${g2.home_team_name} vs ${g2.away_team_name})`,
            game_ids: ids(g1, g2),
            games: [gameSummary(g1), gameSummary(g2)],
          });
        }
      }
    }
  }

  // Insufficient rest: same team, same day, non-overlapping but gap < minRestMinutes
  const byTeamDate = new Map<string, ProposedGame[]>();
  for (const g of games) {
    for (const t of [g.home_team_id, g.away_team_id]) {
      const key = `${t}|${g.scheduled_date}`;
      if (!byTeamDate.has(key)) byTeamDate.set(key, []);
      byTeamDate.get(key)!.push(g);
    }
  }
  for (const [, group] of byTeamDate) {
    if (group.length < 2) continue;
    const sorted = [...group].sort((a, b) => a.start_min - b.start_min);
    for (let i = 0; i < sorted.length - 1; i++) {
      const gap = sorted[i + 1].start_min - sorted[i].end_min;
      if (gap > 0 && gap < minRestMinutes) {
        conflicts.push({
          type: "insufficient_rest",
          severity: "warning",
          message: `Team has only ${gap} min rest between games on ${sorted[i].scheduled_date}`,
          game_ids: ids(sorted[i], sorted[i + 1]),
          games: [gameSummary(sorted[i]), gameSummary(sorted[i + 1])],
        });
      }
    }
  }

  // Insufficient travel time: coach with back-to-back games at different facilities
  if (travelMatrix) {
    const byCoachDate = new Map<string, ProposedGame[]>();
    for (const g of games) {
      for (const c of [g.home_coach_name, g.away_coach_name].filter(Boolean) as string[]) {
        const key = `${c}|${g.scheduled_date}`;
        if (!byCoachDate.has(key)) byCoachDate.set(key, []);
        byCoachDate.get(key)!.push(g);
      }
    }
    for (const [, group] of byCoachDate) {
      if (group.length < 2) continue;
      const sorted = [...group].sort((a, b) => a.start_min - b.start_min);
      for (let i = 0; i < sorted.length - 1; i++) {
        const gap = sorted[i + 1].start_min - sorted[i].end_min;
        if (gap <= 0) continue; // overlapping — already caught by coach_double
        const fromFac = sorted[i].facility_id;
        const toFac = sorted[i + 1].facility_id;
        if (fromFac && toFac && fromFac !== toFac) {
          const travel = getTravelTime(travelMatrix, fromFac, toFac);
          const required = travel + parkingMin;
          if (gap < required) {
            conflicts.push({
              type: "insufficient_travel_time",
              severity: "warning",
              message: `Coach needs ${required} min to travel between facilities but only has ${gap} min`,
              game_ids: ids(sorted[i], sorted[i + 1]),
              games: [gameSummary(sorted[i]), gameSummary(sorted[i + 1])],
            });
          }
        }
      }
    }
  }

  return conflicts;
}

/** Convert minutes-after-midnight to a display time string. */
export function minToTime(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  const period = h >= 12 ? "PM" : "AM";
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${displayH}:${m.toString().padStart(2, "0")} ${period}`;
}

/** Convert a display time string (e.g. "9:00 AM") to minutes after midnight. */
export function timeToMin(time: string): number {
  const match = time.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return 0;
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  if (period === "PM" && h !== 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
  return h * 60 + m;
}

// ===== Coach-aware scheduling =====

/** Look up travel time (minutes) between two facilities from a travel matrix. */
function getTravelTime(matrix: Record<string, number>, fromId: string, toId: string): number {
  if (fromId === toId) return 0;
  return matrix[`${fromId}|${toId}`] ?? 15;
}

export interface FieldInfo {
  field_id: string;
  field_name: string;
  facility_id: string;
  facility_name: string;
}

export interface CoachAwareParams {
  matchups: { home: string; away: string; round: number; division?: string }[];
  fields: FieldInfo[];
  teamNames: Map<string, string>;
  teamCoaches: Map<string, string>;
  dates: string[];
  firstKickoff: number;
  duration: number;
  gap: number;
  travelMatrix: Record<string, number>;
  parkingMin: number;
  referees?: { referee_id: string; referee_name: string }[];
}

/**
 * Coach-aware slot assignment: greedily assigns each match to the best
 * field+time slot, prioritizing same/adjacent fields for coaches with
 * multiple teams and ensuring enough travel+parking buffer between a
 * coach's consecutive games at different facilities.
 */
export function assignSlotsCoachAware(params: CoachAwareParams): ProposedGame[] {
  const { matchups, fields, teamNames, teamCoaches, dates, firstKickoff, duration, gap, travelMatrix, parkingMin, referees } = params;
  const refList = referees || [];
  const DAY_END = 1320;

  const proposed: ProposedGame[] = [];
  const fieldSlots = new Map<string, { date: string; start: number; end: number }[]>();
  for (const f of fields) fieldSlots.set(f.field_id, []);
  const coachGames = new Map<string, ProposedGame[]>();
  let gameNumber = 0;

  for (const match of matchups) {
    const homeName = teamNames.get(match.home) || match.home;
    const awayName = teamNames.get(match.away) || match.away;
    const homeCoach = teamCoaches.get(match.home) || "";
    const awayCoach = teamCoaches.get(match.away) || "";
    const coaches = [homeCoach, awayCoach].filter(Boolean) as string[];

    let best: { field: FieldInfo; date: string; start: number; end: number } | null = null;
    let bestScore = -Infinity;

    for (let dateIdx = 0; dateIdx < dates.length; dateIdx++) {
      const date = dates[dateIdx];
      for (const field of fields) {
        const slots = fieldSlots.get(field.field_id)!.filter((s) => s.date === date);
        let start = firstKickoff;
        if (slots.length > 0) start = Math.max(...slots.map((s) => s.end)) + gap;
        if (start + duration > DAY_END) continue;

        // Team availability
        const teamBusy = proposed.some(
          (g) =>
            g.scheduled_date === date &&
            g.start_min < start + duration &&
            start < g.end_min &&
            (g.home_team_id === match.home || g.away_team_id === match.home || g.home_team_id === match.away || g.away_team_id === match.away)
        );
        if (teamBusy) continue;

        let score = 0;
        let adjustedStart = start;

        for (const coach of coaches) {
          const prev = (coachGames.get(coach) || []).filter((g) => g.scheduled_date === date);
          if (prev.length === 0) continue;
          for (const p of prev) {
            // Push past overlap
            if (adjustedStart < p.end_min && p.start_min < adjustedStart + duration) {
              adjustedStart = Math.max(adjustedStart, p.end_min + 1);
            }
            // Travel time between prev facility and this field's facility
            const prevFacId = p.facility_id || field.facility_id;
            const travel = getTravelTime(travelMatrix, prevFacId, field.facility_id);
            const required = travel + parkingMin;
            const actualGap = adjustedStart - p.end_min;
            if (actualGap < required) adjustedStart = p.end_min + required;
            // Score: same field > same facility > minimize travel
            if (p.field_id === field.field_id) score += 100;
            else if (prevFacId === field.facility_id) score += 50;
            else score -= travel;
          }
        }

        if (adjustedStart + duration > DAY_END) continue;

        // Re-check team availability with adjusted start
        const teamBusy2 = proposed.some(
          (g) =>
            g.scheduled_date === date &&
            g.start_min < adjustedStart + duration &&
            adjustedStart < g.end_min &&
            (g.home_team_id === match.home || g.away_team_id === match.home || g.home_team_id === match.away || g.away_team_id === match.away)
        );
        if (teamBusy2) continue;

        // Re-check field availability
        const fieldBusy = slots.some((s) => adjustedStart < s.end + gap && s.start < adjustedStart + duration);
        if (fieldBusy) continue;

        // Prefer earlier slots
        score -= dateIdx * 10;
        score -= adjustedStart * 0.01;

        if (score > bestScore) {
          bestScore = score;
          best = { field, date, start: adjustedStart, end: adjustedStart + duration };
        }
      }
    }

    // Fallback: sequential assignment
    if (!best) {
      const slotIdx = proposed.length;
      let dIdx = Math.floor(slotIdx / 10) % dates.length;
      let s = firstKickoff + (slotIdx % 10) * (duration + gap);
      while (s + duration > DAY_END && dIdx < dates.length - 1) { dIdx++; s = firstKickoff; }
      const field = fields[slotIdx % fields.length];
      best = { field, date: dates[dIdx], start: s, end: s + duration };
    }

    const ref = refList.length > 0 ? refList[gameNumber % refList.length] : null;
    const game: ProposedGame = {
      field_id: best.field.field_id,
      field_name: best.field.field_name,
      facility_id: best.field.facility_id,
      facility_name: best.field.facility_name,
      scheduled_date: best.date,
      start_min: best.start,
      end_min: best.end,
      home_team_id: match.home,
      home_team_name: homeName,
      away_team_id: match.away,
      away_team_name: awayName,
      home_coach_name: homeCoach,
      away_coach_name: awayCoach,
      referee_id: ref?.referee_id,
      referee_name: ref?.referee_name,
      round: match.division ? `${match.division} - Round ${match.round}` : `Round ${match.round}`,
      round_number: match.round,
      game_number: gameNumber + 1,
      division: match.division || "",
    };

    proposed.push(game);
    fieldSlots.get(best.field.field_id)!.push({ date: best.date, start: best.start, end: best.end });
    for (const c of coaches) {
      if (!coachGames.has(c)) coachGames.set(c, []);
      coachGames.get(c)!.push(game);
    }
    gameNumber++;
  }

  return proposed;
}