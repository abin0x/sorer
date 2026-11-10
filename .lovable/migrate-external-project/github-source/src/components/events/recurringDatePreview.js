import { addDays, format, parseISO } from "date-fns";
export const WEEKDAYS = [["MO", "Mon"], ["TU", "Tue"], ["WE", "Wed"], ["TH", "Thu"], ["FR", "Fri"], ["SA", "Sat"], ["SU", "Sun"]];
export function recurringDatePreview(start, end, frequency, weekdays) {
  if (!start || (end && end < start)) return [];
  const first = parseISO(start), last = end ? parseISO(end) : addDays(first, 90), result = [];
  const codes = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
  for (let day = first; day <= last; day = addDays(day, 1)) {
    if (frequency === "DAILY" || (frequency === "WEEKLY" && weekdays.includes(codes[day.getDay()])) || (frequency === "MONTHLY" && day.getDate() === first.getDate())) result.push(format(day, "yyyy-MM-dd"));
  }
  return result;
}