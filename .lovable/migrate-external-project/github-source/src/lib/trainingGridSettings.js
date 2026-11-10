import { DEFAULT_SETTINGS } from "./trainingGridParser";

const STORAGE_KEY = "trainingGridSettings";

export function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    return {
      fields: Array.isArray(parsed.fields) ? parsed.fields : [...DEFAULT_SETTINGS.fields],
      days: parsed.days && typeof parsed.days === "object" ? parsed.days : { ...DEFAULT_SETTINGS.days },
      headerRow: typeof parsed.headerRow === "number" ? parsed.headerRow : DEFAULT_SETTINGS.headerRow,
      coachOnly: Array.isArray(parsed.coachOnly) ? parsed.coachOnly : [...DEFAULT_SETTINGS.coachOnly],
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore quota errors
  }
}

export function resetSettings() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  return { ...DEFAULT_SETTINGS };
}