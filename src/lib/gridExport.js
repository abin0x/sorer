import { recordsToCsv, CSV_HEADERS, DEFAULT_SETTINGS } from "@/lib/trainingGridParser";
import { DAYS, compressLabels } from "@/lib/gridEngine";

/** Club template CSV: Field, Day, Start Time, End Time, Team, Event Type, Notes (+ Grid when requested). */
export function bookingsToCsv(bookings, assignments, formatOf, withGrid) {
  const order = DEFAULT_SETTINGS.fields;
  const fi = (b) => { const i = order.indexOf(b.field_name); return i < 0 ? 999 : i; };
  const sorted = [...bookings].sort((a, b) =>
    fi(a) - fi(b) || a.field_name.localeCompare(b.field_name) || DAYS.indexOf(a.day) - DAYS.indexOf(b.day) || a.start - b.start || (a.team < b.team ? -1 : a.team > b.team ? 1 : 0)
  );
  const rows = sorted.map((b) => {
    const row = [b.field_name, b.day, b.start_time, b.end_time, b.team, b.event_type, b.notes || ""];
    if (withGrid) row.push(compressLabels(assignments[b.id] || [], formatOf(b)));
    return row;
  });
  return recordsToCsv(rows, withGrid ? [...CSV_HEADERS, "Grid"] : CSV_HEADERS);
}

export function downloadText(filename, text) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ---------- golden CSV comparison ---------- */
export function parseCsvText(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim() !== ""));
}

export function compareWithGolden(goldenText, records) {
  const golden = parseCsvText(goldenText).slice(1).map((r) => r.map((x) => x.trim()));
  const actual = records.map((r) => r.map((x) => String(x ?? "").trim()));
  const diffs = [];
  for (let i = 0; i < Math.max(golden.length, actual.length) && diffs.length < 10; i++) {
    if ((golden[i] || []).join("|") !== (actual[i] || []).join("|")) diffs.push({ row: i + 2, expected: (golden[i] || ["(missing)"]).join(" | "), actual: (actual[i] || ["(missing)"]).join(" | ") });
  }
  const norm = (list) => list.map((r) => r.join("|")).sort().join("\n");
  return { goldenCount: golden.length, actualCount: actual.length, exact: diffs.length === 0, sameRowsAnyOrder: norm(golden) === norm(actual), diffs };
}