import { base44 } from "@/api/base44Client";

/**
 * Field-side evaluation drafts. Every keystroke is kept on the device first, so
 * scoring a session keeps working with a bad connection: the draft is pushed to
 * the server, and anything that did not reach it is retried when the connection
 * comes back or the coach opens the list again.
 */

const DRAFT_KEY = "cr_tryout_eval_drafts_v1";
const ROWS_KEY = "cr_tryout_eval_rows_v1";

const keyOf = (eventId, playerId) => `${eventId}:${playerId}`;

function readStore(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "{}") || {};
  } catch {
    return {};
  }
}

function writeStore(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or unavailable — the draft still lives in React state */
  }
}

export function readDrafts() {
  return readStore(DRAFT_KEY);
}

export function putDraft(draft) {
  const all = readStore(DRAFT_KEY);
  all[keyOf(draft.event_id, draft.player_id)] = draft;
  writeStore(DRAFT_KEY, all);
  return all;
}

export function dropDraft(eventId, playerId) {
  const all = readStore(DRAFT_KEY);
  delete all[keyOf(eventId, playerId)];
  writeStore(DRAFT_KEY, all);
  return all;
}

export function draftFor(eventId, playerId) {
  return readStore(DRAFT_KEY)[keyOf(eventId, playerId)] || null;
}

export function pendingDrafts() {
  return Object.values(readStore(DRAFT_KEY)).filter((d) => d?.pending);
}

/** Send one draft to the server. Throws when it could not be saved. */
export async function pushDraft(draft) {
  const res = await base44.functions.invoke("tryout-evaluation", {
    action: "save",
    event_id: draft.event_id,
    registration_id: draft.registration_id,
    scores: draft.scores || {},
    overall_grade: draft.overall_grade || 0,
    recommendation: draft.recommendation || "",
    notes: draft.notes || "",
  });
  if (res?.data?.error) throw new Error(res.data.error);
  dropDraft(draft.event_id, draft.player_id);
  return res?.data?.evaluation || null;
}

/** Retry everything that is still only on this device. */
export async function flushPending() {
  const pending = pendingDrafts();
  let synced = 0;
  let failed = 0;
  for (const draft of pending) {
    try {
      await pushDraft(draft);
      synced += 1;
    } catch {
      failed += 1;
    }
  }
  return { synced, failed };
}

/** Keep the last loaded session on the device so a reload at the field still shows the list. */
export function cacheRows(eventId, rows) {
  const all = readStore(ROWS_KEY);
  all[eventId] = { at: Date.now(), rows };
  writeStore(ROWS_KEY, all);
}

export function cachedRows(eventId) {
  return readStore(ROWS_KEY)[eventId]?.rows || null;
}