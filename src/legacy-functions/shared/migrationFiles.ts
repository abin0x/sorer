// @ts-nocheck
// Shared helpers for the migration import functions: errors, paged reads,
// batched writes and private file reads. No club data lives here.
import { decodeBytes } from './migrationAutomap.ts';

export class HttpError extends Error {
  status: number;
  constructor(status, message) { super(message); this.status = status; }
}

export const MAX_BYTES = 25 * 1024 * 1024;

export async function sha256(bytes) {
  const d = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Reads a private file through a short-lived signed URL.
export async function readPrivateFile(svc, fileUri) {
  const { signed_url } = await svc.integrations.Core.CreateFileSignedUrl({ file_uri: fileUri, expires_in: 120 });
  const res = await fetch(signed_url, { signal: AbortSignal.timeout(60000) });
  if (!res.ok) throw new HttpError(400, 'Could not read the uploaded file');
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (bytes.length > MAX_BYTES) throw new HttpError(413, 'File is larger than 25 MB');
  const { text, encoding } = decodeBytes(bytes);
  return { text, encoding, bytes };
}

export async function fetchAll(ent, query, sort = 'created_date', cap = 50000) {
  const seen = new Map();
  const page = 500;
  for (let skip = 0; skip < cap; skip += page) {
    const chunk = await ent.filter(query, sort, page, skip);
    for (const r of chunk) seen.set(r.id, r);
    if (chunk.length < page) break;
  }
  return [...seen.values()];
}

// Runs fn over fixed-size slices, a few at a time, and returns results in order.
export async function inBatches(items, size, fn, concurrency = 4) {
  const slices = [];
  for (let i = 0; i < items.length; i += size) slices.push(items.slice(i, i + size));
  const out = new Array(slices.length);
  let next = 0;
  const worker = async () => {
    while (next < slices.length) {
      const i = next++;
      out[i] = await fn(slices[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, slices.length) }, worker));
  return out;
}