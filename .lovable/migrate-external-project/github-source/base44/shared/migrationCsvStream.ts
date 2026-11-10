// UTF-8 byte cursor always stops immediately after a complete CSV record.
// Multiline quoted cells and escaped quotes stay intact across network buffers.
export async function csvChunk(svc, fileUri, checkpoint, limit) {
  const { signed_url } = await svc.integrations.Core.CreateFileSignedUrl({ file_uri: fileUri, expires_in: 600 });
  const offset = checkpoint.byte_cursor || 0;
  const response = await fetch(signed_url, { headers: offset ? { Range: `bytes=${offset}-` } : {}, signal: AbortSignal.timeout(90000) });
  if (response.status === 416) return { lines: [], headers: checkpoint.headers, byte_cursor: offset, eof: true };
  if (!response.ok) throw Object.assign(new Error(`CSV download failed (${response.status})`), { status: response.status });
  const reader = response.body.getReader(), decoder = new TextDecoder('utf-8', { fatal: true });
  let discard = response.status === 206 ? 0 : offset;
  let cursor = offset, bytes = [], quoted = false, headers = checkpoint.headers || null, eof = false;
  const lines = [];
  try {
    while (lines.length < limit) {
      const result = await reader.read();
      if (result.done) {
        eof = true;
        if (quoted) throw Object.assign(new Error('Unclosed quoted CSV cell. Re-save the file as UTF-8 CSV.'), { status: 422 });
        if (bytes.length) {
          const line = decoder.decode(new Uint8Array(bytes)).replace(/^\uFEFF/, '');
          if (line.trim()) { if (!headers) headers = line; else lines.push(line); }
        }
        break;
      }
      for (const byte of result.value) {
        if (discard > 0) { discard--; continue; }
        cursor++; bytes.push(byte);
        if (byte === 34) quoted = !quoted;
        if (bytes.length > 65536) throw Object.assign(new Error('A CSV record exceeds 64 KB. Remove oversized notes or attachments from that row.'), { status: 422 });
        if (byte === 10 && !quoted) {
          const line = decoder.decode(new Uint8Array(bytes)).replace(/^\uFEFF/, ''); bytes = [];
          if (line.trim()) { if (!headers) headers = line; else lines.push(line); }
          if (lines.length >= limit) break;
        }
      }
    }
  } finally { await reader.cancel(); }
  if (!headers) throw Object.assign(new Error('CSV header row is missing.'), { status: 422 });
  return { lines, headers, byte_cursor: cursor, eof };
}