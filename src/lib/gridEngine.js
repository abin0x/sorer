// Pure grid scheduling engine. No imports, so it can be unit-tested anywhere.
// Implements blueprint sections 5 (grid model) and 6 (conflict rules).

export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

/* ---------- 5.1 layouts ---------- */
export const LAYOUTS = {
  "11v11": { labels: ["A1", "A2", "B1", "B2", "C1", "C2", "D1", "D2"], cols: ["A", "B", "C", "D"], rows: 2 },
  "9v9": { labels: ["A1", "A2", "B1", "B2", "C1", "C2"], cols: ["A", "B", "C"], rows: 2 },
  "7v7": { labels: ["A1", "A2", "B1", "B2"], cols: ["A", "B"], rows: 2 },
  "4v4": { labels: ["A", "B"], cols: ["A", "B"], rows: 1 },
};
export const layoutFor = (format) => LAYOUTS[format] || LAYOUTS["11v11"];

/** Display rows, e.g. 11v11 -> [[A1,B1,C1,D1],[A2,B2,C2,D2]] */
export function layoutRows(format) {
  const L = layoutFor(format);
  if (L.rows === 1) return [L.cols.slice()];
  return [L.cols.map((c) => c + "1"), L.cols.map((c) => c + "2")];
}
export const columnLabels = (format, col) => (layoutFor(format).rows === 1 ? [col] : [col + "1", col + "2"]);
export function sortLabels(labels, format) {
  const set = new Set(labels);
  return layoutFor(format).labels.filter((l) => set.has(l));
}

/** 5.5: A1+A2 shows as A; A + B1 shows as A+B1 */
export function compressLabels(labels = [], format) {
  const L = layoutFor(format);
  const set = new Set(labels);
  if (L.rows === 1) return L.labels.filter((l) => set.has(l)).join("+");
  const out = [];
  for (const c of L.cols) {
    if (set.has(c + "1") && set.has(c + "2")) out.push(c);
    else ["1", "2"].forEach((d) => set.has(c + d) && out.push(c + d));
  }
  return out.join("+");
}

/* ---------- field format mapping (3.3, editable config) ---------- */
export const FIELD_FORMATS = {
  "ITC F-2 (4v4)": "4v4",
  "ITC F-3 (7v7)": "7v7",
  "ITC D-2 (7v7)": "7v7",
  "ITC B-2 (9v9)": "9v9",
  "ITC E (11v11)": "11v11",
  "Wixom 9v9 Dome": "9v9",
  "Wixom 11v11 Dome": "11v11",
};
export function formatFromName(name = "", map = FIELD_FORMATS) {
  if (map[name]) return map[name];
  const m = name.match(/(\d+v\d+)/i);
  if (m && LAYOUTS[m[1].toLowerCase()]) return m[1].toLowerCase();
  return "11v11";
}

/* ---------- dates and times (all grid times are PM) ---------- */
export function addDays(dateStr, n) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export function snapToMonday(dateStr) {
  const dow = new Date(`${dateStr}T00:00:00Z`).getUTCDay();
  return addDays(dateStr, dow === 0 ? -6 : 1 - dow);
}
export function toMin(label) {
  const m = /(\d{1,2}):(\d\d)/.exec(label || "");
  if (!m) return NaN;
  let h = +m[1];
  if (h < 12) h += 12;
  return h * 60 + +m[2];
}
export function toLabel(min) {
  const h = Math.floor(min / 60);
  return `${h > 12 ? h - 12 : h}:${String(min % 60).padStart(2, "0")} PM`;
}

/* ---------- booking helpers ---------- */
export const bookingType = (etype) =>
  etype === "match" ? "game" : etype === "goalkeeping" ? "goalkeeping" : etype === "small group" ? "small group" : etype === "other" ? "other" : "training";
/** game | other | training (training = anything that needs a grid) */
export const kindOf = (b) => (b.event_type === "match" ? "game" : b.event_type === "other" ? "other" : "training");
export const fieldKey = (b) => b.field_id || b.field_name;
export const slotKey = (b) => `${fieldKey(b)}|${b.date}|${b.start}|${b.end}`;
export const overlaps = (a, b) => a.date === b.date && a.start < b.end && b.start < a.end;

/* ---------- 5.4 default split ---------- */
function splitAmong(pool, items) {
  const n = pool.length;
  const k = items.length;
  const base = Math.floor(n / k);
  const extra = n % k;
  const out = {};
  let i = 0;
  items.forEach((b, idx) => {
    const c = base + (idx < extra ? 1 : 0);
    out[b.id] = pool.slice(i, i + c);
    i += c;
  });
  return out;
}

function usedGrids(all, assignments, ref, excludeIds) {
  const used = new Set();
  for (const o of all) {
    if (excludeIds.has(o.id) || fieldKey(o) !== fieldKey(ref) || !overlaps(o, ref)) continue;
    (assignments[o.id] || []).forEach((l) => used.add(l));
  }
  return used;
}

/**
 * Group by field/day/exact times, process groups by start time, split the free pool
 * (grids not used by earlier overlapping bookings) as evenly as possible.
 * Bookings that already hold grids keep them unless reset is true.
 */
export function defaultSplit(bookings, current = {}, formatOf, { reset = false } = {}) {
  const train = bookings.filter((b) => kindOf(b) === "training");
  const next = {};
  train.forEach((b) => {
    if (!reset && current[b.id]?.length) next[b.id] = current[b.id];
  });
  const groups = new Map();
  train.filter((b) => !next[b.id]).forEach((b) => {
    const k = slotKey(b);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(b);
  });
  const ordered = [...groups.values()].sort((a, b) => a[0].date.localeCompare(b[0].date) || a[0].start - b[0].start);
  for (const g of ordered) {
    const used = usedGrids(train, next, g[0], new Set(g.map((x) => x.id)));
    const pool = layoutFor(formatOf(g[0])).labels.filter((l) => !used.has(l));
    Object.assign(next, splitAmong(pool, g));
  }
  return next;
}

/** Auto-fill grids for sessions in a slot that don't have any, preserving manual assignments. */
export function autoFillSlot(slotBks, all, assignments, format) {
  const train = slotBks.filter((b) => kindOf(b) === "training");
  const next = { ...assignments };
  const unassigned = train.filter((b) => !(next[b.id] || []).length);
  if (!unassigned.length) return next;
  const used = usedGrids(all.filter((b) => kindOf(b) === "training"), next, unassigned[0], new Set(slotBks.map((b) => b.id)));
  const pool = layoutFor(format).labels.filter((l) => !used.has(l));
  Object.assign(next, splitAmong(pool, unassigned));
  return next;
}

/** "Split this slot equally": re-split one slot, avoiding grids used by overlapping sessions. */
export function splitSlot(slotBks, all, assignments, format) {
  const train = slotBks.filter((b) => kindOf(b) === "training");
  if (!train.length) return assignments;
  const used = usedGrids(all.filter((b) => kindOf(b) === "training"), assignments, train[0], new Set(slotBks.map((b) => b.id)));
  const pool = layoutFor(format).labels.filter((l) => !used.has(l));
  return { ...assignments, ...splitAmong(pool, train) };
}

export function resetSlot(slotBks, assignments) {
  const next = { ...assignments };
  slotBks.forEach((b) => delete next[b.id]);
  return next;
}

/* ---------- 5.5 manual override ---------- */
/** Adds `label` to the booking and removes it from other holders in the same slot. `from` makes it a move. */
export function dropOnGrid(slotBks, assignments, format, bookingId, label, from) {
  const target = slotBks.find((b) => b.id === bookingId);
  if (!target || kindOf(target) !== "training") return assignments;
  const next = { ...assignments };
  slotBks.forEach((b) => {
    if (b.id !== bookingId && next[b.id]?.includes(label)) next[b.id] = next[b.id].filter((l) => l !== label);
  });
  const mine = new Set(next[bookingId] || []);
  if (from) mine.delete(from);
  mine.add(label);
  next[bookingId] = sortLabels([...mine], format);
  return next;
}

/** Dropping on a column header assigns both grids of that letter. */
export function dropOnColumn(slotBks, assignments, format, bookingId, col, from) {
  const labels = columnLabels(format, col);
  let next = assignments;
  labels.forEach((l) => {
    next = dropOnGrid(slotBks, next, format, bookingId, l, null);
  });
  if (from && !labels.includes(from) && next[bookingId]) next = { ...next, [bookingId]: next[bookingId].filter((l) => l !== from) };
  return next;
}

export function unassignGrid(assignments, bookingId, label) {
  if (!assignments[bookingId]) return assignments;
  return { ...assignments, [bookingId]: assignments[bookingId].filter((l) => l !== label) };
}

/* ---------- 6 conflicts ---------- */
const isTeamSession = (b) => ["practice", "training"].includes(b.event_type) && !!b.team;

export function detectConflicts(bookings, assignments, formatOf) {
  const out = [];
  const desc = (b) => `${b.team || b.event_type} ${toLabel(b.start)}-${toLabel(b.end)}`;
  const add = (type, severity, a, b, message) =>
    out.push({ key: `${type}|${a.id}|${b?.id || ""}`, type, severity, booking_id: a.id, other_booking_id: b?.id || "", message });

  for (const b of bookings) {
    if (kindOf(b) === "training" && !(assignments[b.id] || []).length) add("no_grid", "error", b, null, "No grid assigned");
  }
  for (let i = 0; i < bookings.length; i++) {
    for (let j = i + 1; j < bookings.length; j++) {
      const a = bookings[i];
      const b = bookings[j];
      if (!overlaps(a, b)) continue;
      const ga = kindOf(a) === "game";
      const gb = kindOf(b) === "game";
      if (fieldKey(a) === fieldKey(b)) {
        if (ga !== gb) {
          const g = ga ? a : b;
          const o = ga ? b : a;
          add("game_needs_whole_field", "error", g, o, `Game needs the whole field, overlaps ${desc(o)}`);
          add("overlaps_game", "error", o, g, `Overlaps a game (${desc(g)})`);
        } else if (!ga) {
          const shared = (assignments[a.id] || []).filter((l) => (assignments[b.id] || []).includes(l));
          if (shared.length) {
            add("grid_shared", "error", a, b, `Shares ${shared.join(", ")} with ${desc(b)}`);
            add("grid_shared", "error", b, a, `Shares ${shared.join(", ")} with ${desc(a)}`);
          }
        }
      }
      if (a.coach && a.coach === b.coach) {
        add("coach_double", "warning", a, b, `${a.coach} is also in ${desc(b)}`);
        add("coach_double", "warning", b, a, `${b.coach} is also in ${desc(a)}`);
      }
      if (isTeamSession(a) && isTeamSession(b) && a.team === b.team) {
        add("team_double", "error", a, b, `${a.team} is also booked ${desc(b)}`);
        add("team_double", "error", b, a, `${b.team} is also booked ${desc(a)}`);
      }
    }
  }
  // 5.3: at most 2 teams in total on a field during a game
  for (const g of bookings.filter((b) => kindOf(b) === "game")) {
    const teams = new Set();
    bookings.forEach((o) => {
      if (kindOf(o) === "game" && fieldKey(o) === fieldKey(g) && overlaps(o, g) && o.team) teams.add(o.team);
    });
    if (teams.size > 2) add("game_team_limit", "error", g, null, "More than 2 teams on the field during a game");
  }
  return out;
}

/* ---------- week-over-week diff ---------- */
export function diffWeeks(prev, next) {
  const key = (b) => `${b.field_name}|${b.day}|${b.start}|${b.end}|${b.team}|${b.event_type}`;
  const group = (list) => {
    const m = new Map();
    list.forEach((b) => m.set(key(b), [...(m.get(key(b)) || []), b]));
    return m;
  };
  const pm = group(prev);
  const nm = group(next);
  const added = [];
  const removed = [];
  const changed = [];
  for (const [k, arr] of nm) {
    const p = pm.get(k) || [];
    arr.forEach((b, i) => {
      if (!p[i]) added.push(b);
      else if ((p[i].coach || "") !== (b.coach || "")) changed.push({ before: p[i], after: b });
    });
    removed.push(...p.slice(arr.length));
  }
  for (const [k, p] of pm) if (!nm.has(k)) removed.push(...p);
  // a session that moved time on the same field/day/team is a change, not add+remove
  const mk = (b) => `${b.field_name}|${b.day}|${b.team}|${b.event_type}`;
  for (const a of [...added]) {
    if (!a.team) continue;
    const r = removed.find((x) => mk(x) === mk(a));
    if (!r) continue;
    changed.push({ before: r, after: a });
    added.splice(added.indexOf(a), 1);
    removed.splice(removed.indexOf(r), 1);
  }
  return { added, removed, changed };
}