// Stages a weekly training grid: deterministic parse -> bookings + review flags. No LLM involved.
import { extractRows, toDetailedRecords, findUnknownHeaders } from "@/lib/trainingGridParser";
import { DAYS, addDays, toMin, formatFromName, kindOf } from "@/lib/gridEngine";

export const MAPPING_VERSION = "v1";
export const PLATFORMS = ["DPL", "Girls Academy", "Pre-GA", "MLS Next", "Pre-MLS", "NAL", "United", "CW3", "Novi", "Programs"];

// Seeding aid only (blueprint 4.3). Teams that fall through are flagged for staff.
const PLATFORM_RULES = [
  [/pre-?\s?ga\b/i, "Pre-GA"], [/girls academy|\bga\b/i, "Girls Academy"], [/pre-?\s?mls/i, "Pre-MLS"],
  [/mls/i, "MLS Next"], [/\bnal\b/i, "NAL"], [/\bunited\b/i, "United"], [/cw3/i, "CW3"],
  [/novi/i, "Novi"], [/\bdpl\b/i, "DPL"], [/junior|program/i, "Programs"],
];
export const seedPlatform = (team) => (PLATFORM_RULES.find(([re]) => re.test(team)) || [])[1] || "";

export function teamMeta(team) {
  const age = team.match(/\bU-?(\d{1,2})\b/i);
  const gender = team.match(/\b(boys|girls)\b/i);
  return { age_group: age ? `U${age[1]}` : "", gender: gender ? gender[1][0].toUpperCase() + gender[1].slice(1).toLowerCase() : "" };
}

const isTeamRow = (b) => kindOf(b) === "training" && ["practice", "training"].includes(b.event_type) && !!b.team;

export function stageGrid(arrayBuffer, settings, weekStart, savedPlatforms = {}) {
  const { rows, warnings } = extractRows(arrayBuffer, settings);
  const detailed = toDetailedRecords(rows, settings);
  const globalFlags = warnings.map((message) => {
    const m = message.match(/^(\S+) .* ([A-Z]+\d+): /);
    return { severity: "warning", message, src: m ? `${m[1]}!${m[2]}` : "" };
  });
  findUnknownHeaders(arrayBuffer, settings).forEach((h) =>
    globalFlags.push({ severity: "warning", message: `Unknown field header '${h.header}' on ${h.sheet}; not imported (add it to the mapping)`, src: h.src })
  );
  const bookings = detailed.map((d, i) => {
    const [field, day, st, en, team, etype, notes] = d.rec;
    return {
      id: `s${i}`, field_id: field, field_name: field, day, date: addDays(weekStart, DAYS.indexOf(day)),
      start: toMin(st), end: toMin(en), start_time: st, end_time: en, team, coach: d.coach,
      event_type: etype, notes, source_ref: d.src,
      platform: team ? savedPlatforms[team] ?? seedPlatform(team) : "",
    };
  });
  return { bookings, records: detailed.map((d) => d.rec), globalFlags };
}

/** Flags that depend on the (editable) staged rows, so they clear as staff fix them. */
export function reviewFlags(bookings) {
  const flags = [];
  const byKey = {};
  const seenTeams = new Set();
  bookings.forEach((b) => {
    if (b.event_type === "other") flags.push({ severity: "warning", message: `Coach-only cell '${b.coach || b.notes}'; no team listed`, src: b.source_ref, bookingId: b.id });
    if (isTeamRow(b)) {
      const k = `${b.field_name}|${b.day}|${b.start}|${b.end}|${b.team}`;
      (byKey[k] ||= []).push(b);
      if (!b.platform && !seenTeams.has(b.team)) {
        seenTeams.add(b.team);
        flags.push({ severity: "warning", message: `No platform set for '${b.team}'`, src: b.source_ref, bookingId: b.id });
      }
    }
  });
  Object.values(byKey).forEach((g) => {
    if (new Set(g.map((x) => x.coach)).size > 1) {
      g.forEach((b) => flags.push({ severity: "warning", message: `${b.team} listed with different coaches (${g.map((x) => x.coach || "none").join(" / ")})`, src: b.source_ref, bookingId: b.id }));
    }
  });
  return flags;
}

export const stagedFormatOf = (b) => formatFromName(b.field_name);