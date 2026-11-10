import { addMonths } from "date-fns";

const MAX_OCCURRENCES = 52;

// Expands a recurrence definition into a list of occurrence Date objects (dates only, time applied by caller).
// startDate: Date of the first occurrence.
// frequency: "weekly" | "biweekly" | "monthly"
// weekdays: array of JS day numbers (0=Sun..6=Sat), used for weekly/biweekly
// endType: "date" | "count"
export function expandOccurrences({ startDate, frequency, weekdays = [], endType, endDate, endCount }) {
  const occurrences = [];
  const cappedCount = Math.min(endCount || MAX_OCCURRENCES, MAX_OCCURRENCES);

  if (frequency === "monthly") {
    let cursor = new Date(startDate);
    for (let i = 0; i < MAX_OCCURRENCES; i++) {
      if (endType === "date" && cursor > endDate) break;
      occurrences.push(new Date(cursor));
      if (endType === "count" && occurrences.length >= cappedCount) break;
      cursor = addMonths(cursor, 1);
    }
    return occurrences;
  }

  // weekly / biweekly
  const stepWeeks = frequency === "biweekly" ? 2 : 1;
  const days = weekdays.length ? [...weekdays].sort((a, b) => a - b) : [startDate.getDay()];
  let weekStart = new Date(startDate);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());

  for (let week = 0; week < MAX_OCCURRENCES; week++) {
    for (const dow of days) {
      const occDate = new Date(weekStart);
      occDate.setDate(occDate.getDate() + dow);
      if (occDate < startDate) continue;
      if (endType === "date" && occDate > endDate) return occurrences;
      occurrences.push(new Date(occDate));
      if (endType === "count" && occurrences.length >= cappedCount) return occurrences;
    }
    weekStart.setDate(weekStart.getDate() + 7 * stepWeeks);
  }
  return occurrences;
}