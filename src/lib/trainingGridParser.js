// Port of grid_to_schedule.py — deterministic rule-based parser.
// Source of truth: the Python script. Do NOT use an LLM here.

import * as XLSX from "xlsx";

export const DEFAULT_SETTINGS = {
  fields: [
    "ITC F-2 (4v4)", "ITC F-3 (7v7)", "ITC D-2 (7v7)", "ITC B-2 (9v9)",
    "ITC E (11v11)", "Lyon Oaks 1", "Lyon Oaks 2", "Lyon Oaks Extra Field Space",
    "Lyon Oaks 3", "Lyon Oaks 4", "Wixom 9v9 Dome", "Wixom 11v11 Dome",
    "Wixom Wembley", "Wixom Old Trafford",
  ],
  days: {
    Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed",
    Thursday: "Thu", Friday: "Fri",
  },
  headerRow: 2, // 1-indexed, matching the Python script
  coachOnly: ["Joe Malachino"],
};

const TIME_RE = /^\d{1,2}(:\d\d)?\s*-\s*\d{1,2}(:\d\d)?$/;

// "6:30" -> "6:30 PM", "8" -> "8:00 PM"
function fmt(x) {
  const parts = x.split(":");
  const h = parts[0];
  const m = parts.length > 1 ? parts[1] : "00";
  return `${parseInt(h, 10)}:${m} PM`;
}

function span(slot) {
  const [a, b] = slot.trim().split(/\s*-\s*/);
  return [fmt(a), fmt(b)];
}

function colLetter(col) {
  // 1-indexed column number -> Excel letter (A, B, ... Z, AA, ...)
  let letter = "";
  let c = col;
  while (c > 0) {
    const rem = (c - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    c = Math.floor((c - 1) / 26);
  }
  return letter;
}

/**
 * @param {ArrayBuffer} arrayBuffer  — xlsx file bytes
 * @param {object} settings          — { fields, days, headerRow, coachOnly }
 * @returns {{ rows: Array, warnings: Array }}
 *   rows: [day, field, slot, raw, src]  (intermediate, before toRecords)
 *   warnings: string[]
 */
export function extractRows(arrayBuffer, settings) {
  const wb = XLSX.read(arrayBuffer, { type: "array" });
  const rows = [];
  const warnings = [];
  const headerRowIdx = settings.headerRow - 1; // 0-indexed for sheet_to_json

  for (const [sheet, day] of Object.entries(settings.days)) {
    if (!wb.SheetNames.includes(sheet)) {
      warnings.push(`Sheet '${sheet}' not found; skipped`);
      continue;
    }
    const ws = wb.Sheets[sheet];
    // Read the header row to map column index -> field name
    const range = XLSX.utils.decode_range(ws["!ref"]);
    const hdr = {};
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r: headerRowIdx, c });
      const cell = ws[addr];
      // Use formatted text (cell.w) so date-serial cells like 45387 display
      // as "4-5" matching what openpyxl's str(value) yields for text cells.
      const disp = cell ? (cell.w || cell.v) : null;
      if (disp != null && String(disp).trim()) {
        hdr[c + 1] = String(disp).trim(); // 1-indexed to match Python
      }
    }

    for (const [colNum, field] of Object.entries(hdr)) {
      const col = parseInt(colNum, 10);
      if (!settings.fields.includes(field)) continue; // match on name, not position
      let slot = null;
      for (let r = headerRowIdx + 1; r <= range.e.r; r++) {
        const addr = XLSX.utils.encode_cell({ r, c: col - 1 });
        const cell = ws[addr];
        const v = cell ? (cell.w || cell.v) : null;
        if (v == null || !String(v).trim()) continue;
        const s = String(v).trim();
        if (TIME_RE.test(s)) {
          slot = s.replace(/\s+/g, "");
          continue;
        }
        // Known typo in grid: a cell that is just "v"
        if (/^v$/i.test(s)) {
          slot = "6:15-7:30";
          warnings.push(`${sheet} ${field} ${colLetter(col)}${r + 1}: '${s}' treated as 6:15-7:30`);
          continue;
        }
        if (slot == null) continue; // stray labels above first time block
        rows.push([day, field, slot, s, `${sheet}!${colLetter(col)}${r + 1}`]);
      }
    }
  }
  return { rows, warnings };
}

/**
 * Convert intermediate rows to final output records.
 * @param {Array} rows  — from extractRows
 * @param {object} settings
 * @returns {Array} — [Field, Day, Start Time, End Time, Team, Event Type, Notes]
 */
export function toDetailedRecords(rows, settings) {
  const out = [];
  const seen = new Set();
  const daysList = Object.values(settings.days);

  for (const [day, field, slot, raw, src] of rows) {
    let [st, en] = span(slot);
    const notes = [];
    let etype = "practice";
    const low = raw.toLowerCase();

    // Try to extract coach from parentheses: "Team Name (Coach)" but not if
    // the paren content contains a digit (those are age/time descriptors).
    const m = raw.match(/^(.*?)\s*\(([^()]*)\)\s*$/);
    let team = raw;
    let coach = "";
    if (m && !/\d/.test(m[2])) {
      team = m[1];
      coach = m[2];
    }

    if (raw.toUpperCase() === "MATCH") {
      etype = "match";
      team = "";
      notes.push("Listed as MATCH, no team given");
    } else if (settings.coachOnly.includes(raw)) {
      etype = "other";
      team = "";
      notes.push(`Coach name only (${raw}); no team listed`);
    } else if (low.includes("goalkeeping")) {
      etype = "goalkeeping";
      team = raw;
      coach = "";
    } else if (low.startsWith("small group")) {
      etype = "small group";
      team = "Small Group";
      const t = raw.match(/(\d{1,2})\s*-\s*(\d{1,2})\s*pm/i);
      if (t) {
        st = fmt(t[1]);
        en = fmt(t[2]);
      }
    } else if (low.includes("technical training")) {
      etype = "training";
      const t = raw.match(/(\d{1,2}:\d\d)\s*-\s*(\d{1,2}:\d\d)\)?\s*$/);
      if (t) {
        st = fmt(t[1]);
        en = fmt(t[2]);
        team = raw.replace(/\s*\d{1,2}:\d\d-\d{1,2}:\d\d\)?\s*$/, "").trim();
        coach = "";
      }
    }

    if (coach && (etype === "practice" || etype === "training")) {
      notes.push(`Coach: ${coach}`);
    }
    const [origSt, origEn] = span(slot);
    if (st !== origSt || en !== origEn) {
      notes.push(`Grid block ${slot}`);
    }

    const key = `${field}|${day}|${st}|${en}|${team}|${etype}|${coach}`;
    if (seen.has(key)) continue; // same session listed in two blocks
    seen.add(key);

    out.push({ rec: [field, day, st, en, team, etype, notes.join("; ")], coach, src });
  }

  const dayIndex = (d) => daysList.indexOf(d);
  const mins = (r) => {
    const [h, m] = r.rec[2].split(":");
    return parseInt(h, 10) * 60 + parseInt(m.slice(0, 2), 10);
  };
  out.sort((a, b) => {
    const fa = settings.fields.indexOf(a.rec[0]);
    const fb = settings.fields.indexOf(b.rec[0]);
    if (fa !== fb) return fa - fb;
    const da = dayIndex(a.rec[1]);
    const db = dayIndex(b.rec[1]);
    if (da !== db) return da - db;
    const ma = mins(a);
    const mb = mins(b);
    if (ma !== mb) return ma - mb;
    return a.rec[4] < b.rec[4] ? -1 : a.rec[4] > b.rec[4] ? 1 : 0;
  });

  return out;
}

/** Same rows as before: [Field, Day, Start, End, Team, Event Type, Notes] */
export function toRecords(rows, settings) {
  return toDetailedRecords(rows, settings).map((o) => o.rec);
}

export const CSV_HEADERS = ["Field", "Day", "Start Time", "End Time", "Team", "Event Type", "Notes"];

export function recordsToCsv(records, headers = CSV_HEADERS) {
  const escape = (val) => {
    const s = String(val ?? "");
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const lines = [headers.join(",")];
  for (const r of records) {
    lines.push(r.map(escape).join(","));
  }
  return lines.join("\n");
}

/**
 * Full parse pipeline.
 * @param {ArrayBuffer} arrayBuffer
 * @param {object} settings
 * @returns {{ records: Array, warnings: Array }}
 */
export function parseTrainingGrid(arrayBuffer, settings) {
  const { rows, warnings } = extractRows(arrayBuffer, settings);
  const records = toRecords(rows, settings);
  return { records, warnings };
}

/** Header cells that are not in the mapping config. Blueprint 3.3: warn, never silently skip. */
export function findUnknownHeaders(arrayBuffer, settings) {
  const wb = XLSX.read(arrayBuffer, { type: "array" });
  const out = [];
  for (const sheet of Object.keys(settings.days)) {
    const ws = wb.Sheets[sheet];
    if (!ws || !ws["!ref"]) continue;
    const range = XLSX.utils.decode_range(ws["!ref"]);
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r: settings.headerRow - 1, c })];
      const disp = cell ? String(cell.w || cell.v).trim() : "";
      if (disp && !settings.fields.includes(disp)) {
        out.push({ sheet, header: disp, src: `${sheet}!${colLetter(c + 1)}${settings.headerRow}` });
      }
    }
  }
  return out;
}