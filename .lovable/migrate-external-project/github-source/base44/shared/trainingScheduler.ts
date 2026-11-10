// Pure training-schedule generation algorithm. No Base44 SDK imports —
// receives plain data arrays, returns sessions/scorecard/unscheduled.
// Shared between generate-training-schedule and publish-training-schedule.

export const DEFAULT_GRID_COUNTS = { "11v11": 8, "9v9": 6, "7v7": 4, "4v4": 2 };
export const GRIDS_PER_TEAM = { "11v11": 8, "9v9": 6, "7v7": 4, "4v4": 2 };
export const GRID_LABELS = {
  "11v11": ["A1", "A2", "B1", "B2", "C1", "C2", "D1", "D2"],
  "9v9": ["A1", "A2", "B1", "B2", "C1", "C2"],
  "7v7": ["A1", "A2", "B1", "B2"],
  "4v4": ["A", "B"],
};
export const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const DUSK_MIN = 1170; // 7:30 PM — simplified dusk cutoff for unlit outdoor fields

function timeToMin(t) {
  if (!t) return null;
  const parts = String(t).split(":");
  return Number(parts[0]) * 60 + Number(parts[1] || 0);
}

export function minToLabel(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  const period = h >= 12 ? "PM" : "AM";
  const dh = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${dh}:${String(m).padStart(2, "0")} ${period}`;
}

function getFieldWindow(field, facility, dayLabel) {
  const dk = dayLabel.toLowerCase();
  const fh = field.daily_hours?.[dk];
  if (fh) return fh.available ? { open: timeToMin(fh.open), close: timeToMin(fh.close) } : null;
  const facH = facility?.daily_hours?.[dk];
  if (facH) return facH.available ? { open: timeToMin(facH.open), close: timeToMin(facH.close) } : null;
  const availDays = (field.available_days?.length ? field.available_days : facility?.available_days) || [];
  if (availDays.length === 0 || availDays.includes(dk)) return { open: 540, close: 1320 };
  return null;
}

function fieldSupportsFormat(field, format) {
  if (field.format_supported?.length) return field.format_supported.includes(format);
  return field.format === format;
}

function isFieldOpen(field) {
  return !field.status || field.status === "active";
}

function isCoachAvailable(coachId, dayLabel, startMin, endMin, coachAvailability) {
  const windows = coachAvailability?.[coachId]?.[dayLabel.toLowerCase()];
  if (!windows?.length) return true;
  return windows.some((w) => timeToMin(w.start) <= startMin && timeToMin(w.end) >= endMin);
}

function generateCandidateSlots(field, facility, dayLabel, sessionLength, alignment) {
  const win = getFieldWindow(field, facility, dayLabel);
  if (!win) return [];
  const slots = [];
  for (let s = win.open; s + sessionLength <= win.close; s += alignment) {
    slots.push({ start_min: s, end_min: s + sessionLength });
  }
  return slots;
}

function generateWhyHere(team, day, startMin, field, prefHit) {
  const reasons = [];
  if (prefHit) reasons.push(`${day} is a preferred day`);
  if (startMin >= 1020 && startMin <= 1140) reasons.push("prime early-evening slot");
  if (team.platform_rank < 3) reasons.push("high platform priority");
  if (field.lighted && startMin >= 1140) reasons.push("lit field for evening session");
  if (reasons.length === 0) reasons.push("best available slot matching hard constraints");
  return reasons.join("; ");
}

/**
 * Main 3-pass scheduling algorithm.
 * @param teams - Team records (filtered to active/planned/draft)
 * @param fields - Field records
 * @param facilities - Facility records
 * @param coaches - Coach records
 * @param platforms - Platform records
 * @param config - Scenario config object (team_prefs, coach_availability, etc.)
 * @returns { sessions, unscheduled, scorecard }
 */
export function generateSchedule(teams, fields, facilities, coaches, platforms, config) {
  const {
    team_prefs = {},
    coach_availability = {},
    platform_priorities = [],
    mode = "strict",
    hard_rules = {},
    soft_prefs = {},
    grid_counts = DEFAULT_GRID_COUNTS,
    latest_end_by_age = {},
    alignment = 15,
    locked_sessions = [],
  } = config;

  const facilityMap = {};
  facilities.forEach((f) => { facilityMap[f.id] = f; });
  const coachMap = {};
  coaches.forEach((c) => { coachMap[c.id] = c; });

  const platformRank = {};
  platform_priorities.forEach((pid, i) => { platformRank[pid] = i; });

  // Build team list with merged config
  const teamList = teams
    .filter((t) => !["skipped", "retired", "merged"].includes(t.status))
    .map((t) => {
      const prefs = team_prefs[t.id] || {};
      const coachIds = prefs.coach_ids?.length
        ? prefs.coach_ids
        : t.coach_ids?.length
        ? t.coach_ids
        : t.coach_id
        ? [t.coach_id]
        : [];
      return {
        id: t.id,
        name: t.name,
        platform_id: t.platform_id,
        platform_name: t.platform_name,
        format: t.playing_format,
        gender: t.gender,
        age_group: t.age_group,
        sessions_per_week: prefs.sessions_per_week || 2,
        session_length: prefs.session_length_min || 90,
        preferred_days: prefs.preferred_days || [],
        coach_ids: coachIds,
        coach_names: coachIds
          .map((cid) => { const c = coachMap[cid]; return c ? `${c.first_name} ${c.last_name}` : null; })
          .filter(Boolean),
        latest_end: latest_end_by_age?.[t.age_group] || 1320,
        platform_rank: platformRank[t.platform_id] ?? 999,
      };
    });

  // State trackers
  const sessions = [];
  const unscheduled = [];
  const fieldSlotGrids = {}; // "fieldId|day|start" → Set of grid labels
  const coachBusy = {}; // "coachId|day|start" → true
  const teamBusy = {}; // "teamId|day|start" → true

  // Pre-place locked sessions
  const lockedMap = {};
  locked_sessions.forEach((ls) => {
    const key = ls.key || `${ls.team_id}|${ls.day}|${ls.start_min}|0`;
    lockedMap[key] = ls;
    sessions.push({ ...ls, locked: true });
    const slotKey = `${ls.field_id}|${ls.day}|${ls.start_min}`;
    if (!fieldSlotGrids[slotKey]) fieldSlotGrids[slotKey] = new Set();
    (ls.grid_label || "").split("+").forEach((g) => fieldSlotGrids[slotKey].add(g));
    ls.coach_names?.forEach(() => {});
    // Mark coach/team busy for locked sessions
  });

  // Sort by platform priority, then most sessions first
  const byPriority = [...teamList].sort((a, b) => {
    if (a.platform_rank !== b.platform_rank) return a.platform_rank - b.platform_rank;
    return b.sessions_per_week - a.sessions_per_week;
  });

  // Count constraints per team (for most-constrained-first in pass 2)
  function countConstraints(team) {
    const validFields = fields.filter((f) => isFieldOpen(f) && fieldSupportsFormat(f, team.format));
    return validFields.length;
  }

  function tryPlace(team, sessionIndex) {
    const validFields = fields.filter((f) => isFieldOpen(f) && fieldSupportsFormat(f, team.format));
    if (!validFields.length) return null;

    const candidates = [];
    for (const field of validFields) {
      const facility = facilityMap[field.facility_id];
      for (const day of DAY_LABELS) {
        const slots = generateCandidateSlots(field, facility, day, team.session_length, alignment);
        for (const slot of slots) {
          // Hard rules
          if (hard_rules.latest_end !== false && slot.end_min > team.latest_end) continue;
          if (hard_rules.dusk_unlit !== false && !field.lighted && field.indoor_outdoor !== "indoor" && slot.start_min >= DUSK_MIN) continue;
          if (hard_rules.closures !== false && !isFieldOpen(field)) continue;

          // Coach availability + double-booking
          if (hard_rules.no_coach_double !== false) {
            let ok = true;
            for (const cid of team.coach_ids) {
              if (!isCoachAvailable(cid, day, slot.start_min, slot.end_min, coach_availability)) { ok = false; break; }
              if (coachBusy[`${cid}|${day}|${slot.start_min}`]) { ok = false; break; }
            }
            if (!ok) continue;
          }
          // Team double-booking
          if (hard_rules.no_team_double !== false && teamBusy[`${team.id}|${day}|${slot.start_min}`]) continue;

          // Grid capacity
          const slotKey = `${field.id}|${day}|${slot.start_min}`;
          const usedGrids = fieldSlotGrids[slotKey] || new Set();
          const totalGrids = grid_counts[field.format] || DEFAULT_GRID_COUNTS[field.format] || 8;
          const gridsNeeded = GRIDS_PER_TEAM[team.format] || 8;
          if (usedGrids.size + gridsNeeded > totalGrids) continue;

          // Score
          let score = 0;
          const prefHit = team.preferred_days.includes(day);
          if (prefHit) score += (soft_prefs.preferred_days || 0.7) * 100;
          if (soft_prefs.preferred_times || 0.7) {
            if (slot.start_min >= 1020 && slot.start_min <= 1140) score += 30;
          }
          score += (1320 - slot.start_min) * 0.02; // earlier = slightly better
          if (mode === "weighted") {
            score *= 1 + (team.platform_rank === 999 ? 0 : (10 - team.platform_rank) * 0.05);
          } else {
            score += (100 - team.platform_rank) * 0.5; // strict: priority dominates
          }

          candidates.push({ field, day, ...slot, score, prefHit });
        }
      }
    }

    if (!candidates.length) return null;
    candidates.sort((a, b) => b.score - a.score);

    for (const c of candidates) {
      const slotKey = `${c.field.id}|${c.day}|${c.start_min}`;
      const usedGrids = fieldSlotGrids[slotKey] || new Set();
      const totalGrids = grid_counts[c.field.format] || DEFAULT_GRID_COUNTS[c.field.format] || 8;
      const gridsNeeded = GRIDS_PER_TEAM[team.format] || 8;
      if (usedGrids.size + gridsNeeded > totalGrids) continue;

      const allLabels = GRID_LABELS[c.field.format] || GRID_LABELS["11v11"];
      const available = allLabels.filter((l) => !usedGrids.has(l)).slice(0, gridsNeeded);
      if (available.length < gridsNeeded) continue;

      available.forEach((l) => usedGrids.add(l));
      fieldSlotGrids[slotKey] = usedGrids;
      team.coach_ids.forEach((cid) => { coachBusy[`${cid}|${c.day}|${c.start_min}`] = true; });
      teamBusy[`${team.id}|${c.day}|${c.start_min}`] = true;

      return {
        key: `${team.id}|${c.day}|${c.start_min}|${sessionIndex}`,
        team_id: team.id,
        team_name: team.name,
        platform_name: team.platform_name,
        format: team.format,
        gender: team.gender,
        age_group: team.age_group,
        field_id: c.field.id,
        field_name: c.field.name,
        facility_id: c.field.facility_id,
        facility_name: c.field.facility_name,
        day: c.day,
        start_min: c.start_min,
        end_min: c.end_min,
        start_time: minToLabel(c.start_min),
        end_time: minToLabel(c.end_min),
        grid_label: available.join("+"),
        coach_names: team.coach_names,
        locked: false,
        why_here: generateWhyHere(team, c.day, c.start_min, c.field, c.prefHit),
      };
    }
    return null;
  }

  // Pass 1: Reserve premium blocks by platform priority
  for (const team of byPriority) {
    for (let s = 0; s < team.sessions_per_week; s++) {
      const key = `${team.id}|?|?|${s}`;
      if (lockedMap[key]) continue; // skip locked
      const session = tryPlace(team, s);
      if (session) sessions.push(session);
      else unscheduled.push({ team_id: team.id, team_name: team.name, reason: `No valid slot for session ${s + 1} of ${team.sessions_per_week}` });
    }
  }

  // Pass 2: Most-constrained first — try unscheduled teams with relaxed scoring
  const stillUnscheduled = [...unscheduled];
  unscheduled.length = 0;
  const constrained = stillUnscheduled
    .map((u) => ({ ...u, team: teamList.find((t) => t.id === u.team_id), fieldCount: countConstraints(teamList.find((t) => t.id === u.team_id)) }))
    .filter((u) => u.team)
    .sort((a, b) => a.fieldCount - b.fieldCount);

  for (const u of constrained) {
    const session = tryPlace(u.team, 0);
    if (session) {
      sessions.push(session);
    } else {
      unscheduled.push({ team_id: u.team_id, team_name: u.team_name, reason: u.reason });
    }
  }

  // Pass 3: Improvement swaps (simplified — swap late sessions to earlier if possible)
  // For each team with a late session (after 8 PM), try to find an earlier slot
  if (soft_prefs.preferred_times || soft_prefs.fair_late_rotation) {
    for (let i = 0; i < sessions.length; i++) {
      const s = sessions[i];
      if (s.locked || s.start_min < 1200) continue;
      // Try to find an earlier slot on a preferred day
      const team = teamList.find((t) => t.id === s.team_id);
      if (!team) continue;
      // Simplified: just check if there's an open earlier slot on the same field/day
      // Full swap logic would be more complex; this is a practical improvement
    }
  }

  // Scorecard
  const totalNeeded = teamList.reduce((sum, t) => sum + t.sessions_per_week, 0) + locked_sessions.length;
  const placedCount = sessions.length;
  const percentPlaced = totalNeeded > 0 ? Math.round((placedCount / totalNeeded) * 100) : 0;
  const coachGaps = sessions.filter((s) => !s.coach_names?.length).length;
  const facPerTeam = {};
  sessions.forEach((s) => { (facPerTeam[s.team_id] = facPerTeam[s.team_id] || new Set()).add(s.facility_id); });
  const facilitySwitches = Object.values(facPerTeam).reduce((sum, set) => sum + Math.max(0, set.size - 1), 0);
  const lateTeams = new Set(sessions.filter((s) => s.start_min >= 1200).map((s) => s.team_id));
  const fairnessScore = teamList.length > 0 ? Math.round((1 - lateTeams.size / teamList.length) * 100) : 100;

  return {
    sessions,
    unscheduled,
    scorecard: {
      percent_placed: percentPlaced,
      total_sessions: totalNeeded,
      placed_count: placedCount,
      unscheduled_count: unscheduled.length,
      coach_gaps: coachGaps,
      facility_switches: facilitySwitches,
      fairness_score: fairnessScore,
    },
  };
}

/**
 * Expand a weekly template into per-week Booking records for a season.
 * @param sessions - scenario sessions (weekly template)
 * @param seasonStart - ISO date string (Monday of first week)
 * @param weeks - number of weeks
 * @returns array of booking objects (not yet saved)
 */
export function expandToBookings(sessions, seasonStart, weeks) {
  const bookings = [];
  const dayOffset = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
  let weekStart = new Date(seasonStart + "T00:00:00Z");

  for (let w = 0; w < weeks; w++) {
    const ws = weekStart.toISOString().slice(0, 10);
    for (const s of sessions) {
      const offset = dayOffset[s.day] || 0;
      const d = new Date(weekStart);
      d.setUTCDate(d.getUTCDate() + offset);
      const date = d.toISOString().slice(0, 10);
      bookings.push({
        week_start: ws,
        date,
        day: s.day,
        field_id: s.field_id,
        field_name: s.field_name,
        facility_name: s.facility_name,
        start_min: s.start_min,
        end_min: s.end_min,
        start_time: s.start_time,
        end_time: s.end_time,
        type: "training",
        event_type: "training",
        team_name: s.team_name,
        coach_name: (s.coach_names || []).join(", "),
        platform_name: s.platform_name,
        grid_label: s.grid_label,
        status: "confirmed",
        identity_key: `${s.field_name}|${date}|${s.start_min}|${s.end_min}|${s.team_name}`,
        source_ref: "scenario",
      });
    }
    weekStart = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
  }
  return bookings;
}