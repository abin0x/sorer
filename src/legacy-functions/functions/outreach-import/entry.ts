// @ts-nocheck
import { createClientFromRequest } from '@/legacy-functions/_sdk';
import { requireSystemOwner, logAudit, ensureSettings, isSuppressed } from '../../shared/outreachAccess.ts';
import { ensureDefaultSegments, applySegmentation } from '../../shared/outreachSegmentation.ts';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const ROLE_LOCALS = ['info', 'admin', 'office', 'contact', 'support', 'sales', 'hello', 'team', 'noreply', 'no-reply', 'registrar', 'president'];
const PLATFORMS = ['stack_sports', 'sportsengine', 'playmetrics', '2enroll', 'spreadsheets', 'unknown'];

const chunk = (arr, n) => {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
};
const num = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(String(v).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
};
const platform = (v) => {
  const p = String(v || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (p === 'stacksports') return 'stack_sports';
  if (p === 'sports_engine') return 'sportsengine';
  return PLATFORMS.includes(p) ? p : 'unknown';
};
const isRoleBased = (email) => ROLE_LOCALS.includes(email.split('@')[0]);

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const { action, ...params } = await req.json();
    const { user, error } = await requireSystemOwner(base44);
    if (error) return error;
    const db = base44.asServiceRole.entities;

    if (action === 'seed_segments') {
      const segments = await ensureDefaultSegments(base44);
      return Response.json({ count: segments.length });
    }

    if (action === 'preview') {
      const emails = [...new Set((params.emails || []).map((e) => String(e || '').trim().toLowerCase()).filter(Boolean))];
      const settings = await ensureSettings(base44);
      const existing = [];
      for (const c of chunk(emails, 200)) {
        const page = await db.Prospect.filter({ email: { $in: c } }, { limit: 500, fields: ['email'] });
        existing.push(...page.items.map((p) => p.email));
      }
      const suppressed = emails.filter((e) => isSuppressed(e, settings));
      return Response.json({ existing, suppressed });
    }

    if (action === 'commit') {
      const records = (params.records || []).slice(0, 200);
      const settings = await ensureSettings(base44);
      const segments = await ensureDefaultSegments(base44);
      const res = { created: 0, updated: 0, invalid: 0, suppressed: 0, duplicates_in_file: 0, needs_review: 0, segments_assigned: 0 };

      const clean = [];
      const seen = new Set();
      for (const r of records) {
        const email = String(r.email || '').trim().toLowerCase();
        const first = String(r.first_name || '').trim();
        const last = String(r.last_name || '').trim();
        const club = String(r.club_name || '').trim();
        if (!EMAIL_RE.test(email) || !first || !last || !club) { res.invalid++; continue; }
        if (seen.has(email)) { res.duplicates_in_file++; continue; }
        seen.add(email);
        if (isSuppressed(email, settings)) { res.suppressed++; continue; }
        clean.push({
          email, first_name: first, last_name: last, club_name: club,
          title: String(r.title || '').trim(),
          club_website: String(r.club_website || '').trim(),
          linkedin_url: String(r.linkedin_url || '').trim(),
          region: String(r.region || '').trim(),
          pain_signal: String(r.pain_signal || '').trim(),
          branch_count: num(r.branch_count),
          player_count: num(r.player_count),
          registration_platform: r.registration_platform ? platform(r.registration_platform) : '',
        });
      }

      const existingByEmail = new Map();
      for (const c of chunk(clean.map((r) => r.email), 200)) {
        const page = await db.Prospect.filter({ email: { $in: c } }, { limit: 500 });
        page.items.forEach((p) => existingByEmail.set(p.email.toLowerCase(), p));
      }

      const toCreate = [];
      const toUpdate = [];
      for (const r of clean) {
        const ex = existingByEmail.get(r.email);
        if (ex) {
          const patch = {};
          for (const [k, v] of Object.entries(r)) {
            if (k !== 'email' && v !== '' && v !== null) patch[k] = v;
          }
          toUpdate.push({ id: ex.id, patch });
        } else {
          const review = isRoleBased(r.email);
          if (review) res.needs_review++;
          toCreate.push({
            ...r,
            registration_platform: r.registration_platform || 'unknown',
            source: 'import',
            status: 'new',
            owner_id: user.id,
            owner_name: user.full_name || user.email,
            suppressed: false,
            email_verified: !review,
            needs_review: review,
          });
        }
      }

      for (const c of chunk(toCreate, 100)) await db.Prospect.bulkCreate(c);
      res.created = toCreate.length;
      for (const c of chunk(toUpdate, 10)) await Promise.all(c.map((u) => db.Prospect.update(u.id, u.patch)));
      res.updated = toUpdate.length;

      // Segment every imported / updated prospect
      const all = [];
      for (const c of chunk(clean.map((r) => r.email), 200)) {
        const page = await db.Prospect.filter({ email: { $in: c } }, { limit: 500 });
        all.push(...page.items);
      }
      const seg = await applySegmentation(base44, all, segments);
      res.segments_assigned = seg.added.length;

      await logAudit(base44, user, 'prospect.csv_import', 'Prospect', null, { results: res });
      return Response.json(res);
    }

    return Response.json({ error: 'Unknown action: ' + action }, { status: 400 });
  } catch (error) {
    console.error('outreach-import error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}