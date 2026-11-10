// @ts-nocheck
// Guards for user-triggered email actions: recipients must already be known to a club
// the caller belongs to, and caller-supplied HTML is stripped of active content.
import { legacyCallerClient } from '../_sdk';

const MAX_RECIPIENTS = 500;
const SOURCES: Array<[string, string, string?]> = [
  ['coaches', 'email'], ['guardians', 'email'], ['club_invitations', 'email'], ['referees', 'email'],
  ['tryout_registrations', 'guardian_email'], ['tryout_final_registrations', 'guardian_email'],
  ['staff_pays', 'staff_email'], ['user_roleses', 'user_email'], ['users', 'email', 'core'],
];

export { sanitizeEmailHtml } from '@/lib/sanitizeHtml';

/** Returns the normalized recipient list or throws a user-facing error. */
export async function assertClubRecipients(req, rawRecipients) {
  const token = req.headers.get('authorization')?.replace(/^Bearer /, '');
  if (!token) throw Object.assign(new Error('Please sign in to send email.'), { status: 401 });
  const list = (Array.isArray(rawRecipients) ? rawRecipients : [rawRecipients])
    .map((r) => String(r || '').trim().toLowerCase()).filter(Boolean);
  const emails = [...new Set(list)];
  if (!emails.length) throw Object.assign(new Error('Add at least one recipient.'), { status: 400 });
  if (emails.length > MAX_RECIPIENTS) throw Object.assign(new Error(`You can email up to ${MAX_RECIPIENTS} people at once.`), { status: 400 });
  if (emails.some((e) => !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(e))) throw Object.assign(new Error('One of the email addresses is not valid.'), { status: 400 });

  const caller = legacyCallerClient(token);
  const { data: who } = await caller.auth.getUser(token);
  const me = who?.user;
  if (!me) throw Object.assign(new Error('Please sign in to send email.'), { status: 401 });
  const { data: owner } = await caller.rpc('is_system_owner');
  if (owner === true) return emails;
  const { data: memberships } = await caller.from('club_members').select('club_id').eq('user_id', me.id);
  const clubIds = (memberships || []).map((m) => m.club_id);
  if (!clubIds.length) throw Object.assign(new Error('Only club staff can send email.'), { status: 403 });

  const admin = (await import('@/integrations/supabase/client.server')).supabaseAdmin;
  const known = new Set([String(me.email || '').toLowerCase()]);
  const { data: peers } = await admin.from('club_members').select('user_id').in('club_id', clubIds);
  const peerIds = (peers || []).map((p) => p.user_id);
  if (peerIds.length) {
    const { data: users } = await admin.schema('core').from('users').select('email').in('id', peerIds);
    for (const u of users || []) known.add(String(u.email || '').toLowerCase());
  }
  const pending = () => emails.filter((e) => !known.has(e));
  for (const [table, col, schema] of SOURCES) {
    const left = pending();
    if (!left.length) break;
    const q = (schema ? admin.schema(schema) : admin).from(table).select(col).in('club_id', clubIds).in(col, left);
    const { data } = await q;
    for (const row of data || []) known.add(String(row[col] || '').toLowerCase());
    // case-insensitive fallback for mixed-case stored addresses
    for (const e of pending()) {
      const { data: ci } = await (schema ? admin.schema(schema) : admin).from(table).select(col).in('club_id', clubIds).ilike(col, e).limit(1);
      if (ci?.length) known.add(e);
    }
  }
  const unknown = pending();
  if (unknown.length) throw Object.assign(new Error(`${unknown.length} recipient(s) aren't part of your club, so the email was not sent.`), { status: 403 });
  return emails;
}
