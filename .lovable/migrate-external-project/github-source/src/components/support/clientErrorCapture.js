// Captures the last 5 client-side errors so they can be attached to support
// tickets, and feeds recurring errors to the issue-monitoring engine (grouped
// by message + filename, debounced). Initialize once at app startup by
// calling initErrorCapture(). Get the captured errors with getRecentErrors().

import { base44 } from '@/api/base44Client';

const errors = [];
const MAX_ERRORS = 5;
let initialized = false;
let ingestTimer = null;

export function initErrorCapture() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  window.addEventListener('error', (e) => {
    addError({
      type: 'error',
      message: e.message,
      filename: e.filename,
      lineno: e.lineno,
      colno: e.colno,
      timestamp: new Date().toISOString(),
    });
  });

  window.addEventListener('unhandledrejection', (e) => {
    const reason = e.reason;
    addError({
      type: 'unhandledrejection',
      message: reason?.message || String(reason),
      stack: reason?.stack?.substring(0, 500),
      timestamp: new Date().toISOString(),
    });
  });
}

function addError(err) {
  errors.push(err);
  if (errors.length > MAX_ERRORS) errors.shift();
  scheduleIngest(err);
}

// Debounce: one ingest per 5s, keyed by the latest error so repeated errors
// group into a single Issue (fingerprint dedupes server-side).
function scheduleIngest(err) {
  if (ingestTimer) return;
  ingestTimer = setTimeout(() => {
    ingestTimer = null;
    ingestError(err);
  }, 5000);
}

async function ingestError(err) {
  try {
    const user = await base44.auth.me().catch(() => null);
    const clubId = user?.club_id || user?.data?.club_id || '';
    const key = `${err.type}:${(err.message || '').slice(0, 80)}:${err.filename || ''}`;
    await base44.functions.invoke('issue-ingest', {
      signal_type: 'client_error',
      severity: 'P4',
      title: `Client error: ${(err.message || 'Unknown error').slice(0, 100)}`,
      description: `Recurring client-side error captured by the app.`,
      club_id: clubId,
      key,
      context: { type: err.type, message: err.message, filename: err.filename, lineno: err.lineno, stack: err.stack },
    });
  } catch (e) { /* never let monitoring break the app */ }
}

export function getRecentErrors() {
  return [...errors];
}

export function clearErrors() {
  errors.length = 0;
}