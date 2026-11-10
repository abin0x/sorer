// Field-sectioning model — 11v11 is the base unit (12 sections);
// other formats subdivide the same physical area into fewer, larger sections.
export const FORMAT_SECTION_COUNTS = {
  "11v11": 12,
  "9v9": 6,
  "7v7": 3,
  "4v4": 3,
};

export const FORMATS = ["11v11", "9v9", "7v7", "4v4"];

export function getSectionCount(format) {
  return FORMAT_SECTION_COUNTS[format] || 12;
}

export function getDefaultFormat(field) {
  if (!field?.format_supported?.length) return "11v11";
  return field.format_supported.includes("11v11") ? "11v11" : field.format_supported[0];
}

// Returns the set of event ids that have a hard conflict: overlapping time on the same field.
export function computeConflicts(events) {
  const conflictIds = new Set();
  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const a = events[i];
      const b = events[j];
      if (!a.field_id || a.field_id !== b.field_id) continue;
      const aStart = new Date(a.start_datetime);
      const aEnd = new Date(a.end_datetime || a.start_datetime);
      const bStart = new Date(b.start_datetime);
      const bEnd = new Date(b.end_datetime || b.start_datetime);
      if (aStart < bEnd && bStart < aEnd) {
        conflictIds.add(a.id);
        conflictIds.add(b.id);
      }
    }
  }
  return conflictIds;
}