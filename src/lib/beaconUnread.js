/** Unread posts per channel for one person: not theirs and not yet read by them. */
export function unreadByChannel(messages, email) {
  const out = {};
  if (!email) return out;
  for (const m of Array.isArray(messages) ? messages : []) {
    if (!m?.channel_id || m.author_email === email || (m.read_by || []).includes(email)) continue;
    out[m.channel_id] = (out[m.channel_id] || 0) + 1;
  }
  return out;
}
