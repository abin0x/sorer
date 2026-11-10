// @ts-nocheck
// Auto-segmentation engine for Outreach prospects.
// Rules: { combinator: 'and'|'or', conditions: [{ field, op, value }] }
// ops: gte, lte, eq, contains_any

export const DEFAULT_SEGMENTS = [
  {
    name: 'directors-multi-branch',
    description: 'Directors / admins running 3+ branches',
    is_dynamic: true,
    rules: { combinator: 'and', conditions: [
      { field: 'branch_count', op: 'gte', value: 3 },
      { field: 'title', op: 'contains_any', value: ['Director', 'Admin'] },
    ] },
  },
  {
    name: 'admins-single-branch',
    description: 'Admins running 1-2 branches',
    is_dynamic: true,
    rules: { combinator: 'and', conditions: [
      { field: 'branch_count', op: 'lte', value: 2 },
      { field: 'title', op: 'contains_any', value: ['Admin'] },
    ] },
  },
  {
    name: 'high-value',
    description: '2,000+ players',
    is_dynamic: true,
    rules: { combinator: 'and', conditions: [{ field: 'player_count', op: 'gte', value: 2000 }] },
  },
  {
    name: 'stack-sports-clubs',
    description: 'Clubs registering on Stack Sports',
    is_dynamic: true,
    rules: { combinator: 'and', conditions: [{ field: 'registration_platform', op: 'eq', value: 'stack_sports' }] },
  },
  { name: 'warm-leads', description: 'Set by webhook: opened an email', is_dynamic: false, rules: {} },
  { name: 'hot-leads', description: 'Set by webhook: clicked within the last 72h', is_dynamic: false, rules: {} },
  { name: 'clicked-pricing', description: 'Set by webhook: clicked a /pricing link', is_dynamic: false, rules: {} },
  { name: 'replied-interested', description: 'Set by AI reply classifier', is_dynamic: false, rules: {} },
  { name: 'replied-question', description: 'Set by AI reply classifier', is_dynamic: false, rules: {} },
  { name: 'booked', description: 'Set by booking webhook', is_dynamic: false, rules: {} },
  { name: 'suppressed', description: 'Set by bounce, complaint, or unsubscribe', is_dynamic: false, rules: {} },
];

export function matchesRule(prospect, rules) {
  const conds = rules?.conditions || [];
  if (!conds.length) return false;
  const test = (c) => {
    const v = prospect[c.field];
    const empty = v === null || v === undefined || v === '';
    switch (c.op) {
      case 'gte': return !empty && Number(v) >= Number(c.value);
      case 'lte': return !empty && Number(v) <= Number(c.value);
      case 'eq': return !empty && String(v).toLowerCase() === String(c.value).toLowerCase();
      case 'contains_any': {
        if (empty) return false;
        const s = String(v).toLowerCase();
        return (c.value || []).some((x) => s.includes(String(x).toLowerCase()));
      }
      default: return false;
    }
  };
  return rules.combinator === 'or' ? conds.some(test) : conds.every(test);
}

/** Creates any default segment that does not exist yet. Returns all segments. */
export async function ensureDefaultSegments(base44) {
  const { items } = await base44.asServiceRole.entities.ProspectSegment.filter({}, { limit: 500 });
  const names = new Set(items.map((s) => s.name));
  const missing = DEFAULT_SEGMENTS.filter((s) => !names.has(s.name));
  if (!missing.length) return items;
  await base44.asServiceRole.entities.ProspectSegment.bulkCreate(missing);
  const res = await base44.asServiceRole.entities.ProspectSegment.filter({}, { limit: 500 });
  return res.items;
}

const chunk = (arr, n) => {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
};

/**
 * Evaluates dynamic segment rules for the given prospects and syncs rule-based memberships.
 * Manual / webhook memberships are never removed. Returns the memberships added.
 */
export async function applySegmentation(base44, prospects, segments) {
  const dynamic = segments.filter((s) => s.is_dynamic && s.rules?.conditions?.length);
  if (!prospects.length || !dynamic.length) return { added: [], removed: 0 };

  const existing = [];
  for (const ids of chunk(prospects.map((p) => p.id), 200)) {
    const page = await base44.asServiceRole.entities.ProspectSegmentMember.filter(
      { prospect_id: { $in: ids } }, { limit: 2000 }
    );
    existing.push(...page.items);
  }
  const have = new Map(existing.map((m) => [`${m.prospect_id}|${m.segment_id}`, m]));

  const toAdd = [];
  const toRemove = [];
  for (const p of prospects) {
    for (const s of dynamic) {
      const match = !p.suppressed && matchesRule(p, s.rules);
      const m = have.get(`${p.id}|${s.id}`);
      if (match && !m) {
        toAdd.push({
          prospect_id: p.id,
          prospect_name: `${p.first_name || ''} ${p.last_name || ''}`.trim(),
          prospect_email: p.email,
          segment_id: s.id,
          segment_name: s.name,
          added_by: 'rule',
        });
      } else if (!match && m && m.added_by === 'rule') {
        toRemove.push(m.id);
      }
    }
  }
  for (const c of chunk(toAdd, 100)) await base44.asServiceRole.entities.ProspectSegmentMember.bulkCreate(c);
  for (const c of chunk(toRemove, 100)) await base44.asServiceRole.entities.ProspectSegmentMember.deleteMany({ id: { $in: c } });

  // Auto-enroll any newly segmented prospect into the active sequence tied to that segment.
  for (const m of toAdd) {
    try { await autoEnrollFromSegment(base44, m.prospect_id, m.segment_id); } catch (e) { console.error('autoEnroll failed:', e); }
  }
  return { added: toAdd, removed: toRemove.length };
}

/** Ensure a manual/webhook segment exists by name, then add the prospect (idempotent). Triggers auto-enroll. */
export async function addProspectToSegment(base44, prospect, segmentName, addedBy = 'webhook') {
  const found = await base44.asServiceRole.entities.ProspectSegment.filter({ name: segmentName }, { limit: 1 });
  let seg = found?.items?.[0];
  if (!seg) {
    seg = await base44.asServiceRole.entities.ProspectSegment.create({
      name: segmentName, description: 'Auto-created by webhook', is_dynamic: false, rules: {},
    });
  }
  const mem = await base44.asServiceRole.entities.ProspectSegmentMember.filter(
    { prospect_id: prospect.id, segment_id: seg.id }, { limit: 1 }
  );
  if (!mem?.items?.[0]) {
    await base44.asServiceRole.entities.ProspectSegmentMember.create({
      prospect_id: prospect.id,
      prospect_name: `${prospect.first_name || ''} ${prospect.last_name || ''}`.trim(),
      prospect_email: prospect.email,
      segment_id: seg.id,
      segment_name: segmentName,
      added_by: addedBy,
    });
    try { await autoEnrollFromSegment(base44, prospect.id, seg.id); } catch (e) { console.error('autoEnroll on webhook segment:', e); }
  }
  return seg;
}

/**
 * If an active sequence targets this segment, enroll the prospect (unless already enrolled
 * or suppressed). The first step's delay_days sets when the opening email is due.
 */
export async function autoEnrollFromSegment(base44, prospectId, segmentId) {
  const { items: sequences } = await base44.asServiceRole.entities.OutreachSequence.filter(
    { segment_id: segmentId, status: 'active' }, { limit: 20 }
  );
  if (!sequences.length) return { enrolled: 0 };

  const prospect = await base44.asServiceRole.entities.Prospect.get(prospectId);
  if (!prospect || prospect.suppressed || prospect.needs_review ||
      prospect.status === 'unsubscribed' || prospect.status === 'bounced') {
    return { enrolled: 0 };
  }

  let enrolled = 0;
  for (const seq of sequences) {
    const existing = await base44.asServiceRole.entities.OutreachEnrollment.filter(
      { prospect_id: prospectId, sequence_id: seq.id, status: { $in: ['active', 'paused'] } }, { limit: 1 }
    );
    if (existing?.[0]) continue;

    const { items: steps } = await base44.asServiceRole.entities.OutreachSequenceStep.filter(
      { sequence_id: seq.id }, { sort: 'step_order', limit: 1 }
    );
    const firstDelayDays = steps?.[0]?.delay_days || 0;
    const nextSendAt = new Date(Date.now() + firstDelayDays * 86400000).toISOString();

    await base44.asServiceRole.entities.OutreachEnrollment.create({
      prospect_id: prospectId,
      prospect_name: `${prospect.first_name || ''} ${prospect.last_name || ''}`.trim(),
      prospect_email: prospect.email,
      sequence_id: seq.id,
      sequence_name: seq.name,
      current_step_order: 0,
      status: 'active',
      enrolled_at: new Date().toISOString(),
      next_send_at: nextSendAt,
    });
    enrolled++;
  }
  return { enrolled };
}