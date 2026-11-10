// Staging transform: turns parsed CSV rows + confirmed column mappings into
// staged-record drafts. Pure functions, no I/O, no club data.
import { TARGETS, mapEnumValue } from './migrationAutomap.ts';

const ORDER = { Team: 0, Guardian: 1, Player: 2 };
export const ENTITY_ORDER = ['Team', 'Guardian', 'Player'];
export const fileOrder = (entity) => ORDER[entity] ?? 9;

const t = (v) => String(v ?? '').trim();

export function hash(str) {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

export function normPhone(v) {
  let d = v.replace(/\D/g, '');
  if (d.length === 11 && d[0] === '1') d = d.slice(1);
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : v;
}

const validYmd = (y, m, d) => {
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
};
const ymd = (y, m, d) => `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

// Returns YYYY-MM-DD or null. Slash dates are read month/day/year unless the
// first number can only be a day.
export function normDate(v) {
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(v);
  if (m) { const [y, mo, d] = [+m[1], +m[2], +m[3]]; return validYmd(y, mo, d) ? ymd(y, mo, d) : null; }
  m = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/.exec(v);
  if (m) {
    let [a, b, y] = [+m[1], +m[2], +m[3]];
    if (m[3].length === 2) y += y > (new Date().getUTCFullYear() % 100) ? 1900 : 2000;
    let [mo, d] = [a, b];
    if (a > 12 && b <= 12) [mo, d] = [b, a];
    return validYmd(y, mo, d) ? ymd(y, mo, d) : null;
  }
  const p = Date.parse(v);
  if (!isNaN(p)) { const dt = new Date(p); return ymd(dt.getFullYear(), dt.getMonth() + 1, dt.getDate()); }
  return null;
}

export function deriveTeam(name) {
  const out = {};
  const n = String(name || '');
  const u = /\bU[-\s]?(\d{1,2})\b/i.exec(n);
  if (u) {
    const age = +u[1];
    out.age_group = `U${age}`;
    out.playing_format = age <= 8 ? '4v4' : age <= 10 ? '7v7' : age <= 12 ? '9v9' : '11v11';
  }
  if (/\bgirls?\b/i.test(n)) out.gender = 'Girls';
  else if (/\bboys?\b/i.test(n)) out.gender = 'Boys';
  return out;
}

function normalizeValue(field, raw, valueMap) {
  const v = t(raw);
  if (!v) return { value: '' };
  switch (field.type) {
    case 'email': return { value: v.toLowerCase() };
    case 'phone': return { value: normPhone(v) };
    case 'date': { const d = normDate(v); return { value: d || v, invalid: !d }; }
    case 'number': {
      const n = Number(v.replace(/[$,\s]/g, ''));
      return isNaN(n) ? { value: v, invalid: true } : { value: n };
    }
    case 'zip': return { value: /^\d{4}$/.test(v) ? `0${v}` : v };
    case 'enum': {
      const mapped = (valueMap && valueMap[v]) || mapEnumValue(field, v);
      return mapped ? { value: mapped } : { value: v, invalid: true };
    }
    default:
      return { value: field.name === 'state' && v.length === 2 ? v.toUpperCase() : v };
  }
}

// Used for specialist edits: normalizes a typed value the same way staging does.
export function normalizeFieldValue(entity, fieldName, raw) {
  const field = TARGETS[entity]?.find((x) => x.name === fieldName);
  if (!field) return null;
  return normalizeValue(field, raw, null);
}

function applyTransform(raw, transform) {
  const v = t(raw);
  if (transform === 'split_first') return v.split(/\s+/)[0] || '';
  if (transform === 'split_last') return v.split(/\s+/).slice(1).join(' ');
  return v;
}

// Builds one set of fields (main record or one repeating group) from a row.
function readGroup(cells, headers, maps, entity) {
  const fields = TARGETS[entity];
  const mapped = {};
  const links = {};
  const changes = [];
  const invalid = [];
  for (const m of maps) {
    if (!m.target_field || ['ignored', 'kept', 'unmapped'].includes(m.status)) continue;
    const field = fields.find((x) => x.name === m.target_field);
    if (!field) continue;
    const rawCell = cells[m.source_index];
    const after = applyTransform(rawCell, m.transform);
    const { value, invalid: bad } = normalizeValue(field, after, m.value_map);
    if (value === '') continue;
    if (field.link) { links[field.name === 'team_ref' ? 'team_name' : 'location_name'] = String(value); continue; }
    if (mapped[field.name] === undefined || mapped[field.name] === '') mapped[field.name] = value;
    if (bad) invalid.push(field.name);
    if (String(value) !== t(rawCell) && changes.length < 12) changes.push({ field: field.name, before: t(rawCell).slice(0, 80), after: String(value).slice(0, 80) });
  }
  return { mapped, links, changes, invalid };
}

export function dedupeKey(entity, mapped, links) {
  const low = (x) => String(x ?? '').trim().toLowerCase();
  if (entity === 'Guardian') return mapped.email ? `g|${low(mapped.email)}` : '';
  if (entity === 'Team') return mapped.name ? `t|${low(mapped.name)}` : '';
  const g = (links.guardian_emails || [])[0] || '';
  return `p|${low(g)}|${low(mapped.first_name)}|${low(mapped.last_name)}|${low(mapped.date_of_birth)}`;
}

export function stableUniqueId(entity, key, mapped) {
  if (mapped.unique_id) return String(mapped.unique_id);
  return `mig-${entity[0].toLowerCase()}-${hash(key)}`;
}

// rows: [{ n, cells }]; mappings: ColumnMapping rows for this file.
export function buildDrafts({ file, headers, rows, mappings }) {
  const entity = file.selected_entity;
  const main = mappings.filter((m) => m.group === 0);
  const groupNums = [...new Set(mappings.filter((m) => m.group > 0).map((m) => m.group))].sort((a, b) => a - b);
  const drafts = [];
  for (const row of rows) {
    const raw = {};
    headers.forEach((h, i) => { raw[h] = t(row.cells[i]).slice(0, 500); });
    const base = readGroup(row.cells, headers, main, entity);
    const guardianEmails = [];
    const groupDrafts = [];
    for (const g of groupNums) {
      const gr = readGroup(row.cells, headers, mappings.filter((m) => m.group === g), 'Guardian');
      if (!Object.keys(gr.mapped).length) continue; // skip a group when all fields are empty
      if (gr.mapped.email) guardianEmails.push(gr.mapped.email);
      groupDrafts.push({ entity: 'Guardian', is_primary: false, group: g, source_file_id: file.id, source_row_number: row.n, raw_data: raw, mapped_data: gr.mapped, links: {}, changes: gr.changes, invalid: gr.invalid });
    }
    const links = { ...base.links };
    if (entity === 'Player') links.guardian_emails = guardianEmails;
    if (entity === 'Team') {
      const d = deriveTeam(base.mapped.name);
      for (const [k, v] of Object.entries(d)) {
        if (!base.mapped[k]) { base.mapped[k] = v; base.changes.push({ field: k, before: '', after: String(v), derived: true }); }
      }
    }
    drafts.push({ entity, is_primary: true, group: 0, source_file_id: file.id, source_row_number: row.n, raw_data: raw, mapped_data: base.mapped, links, changes: base.changes, invalid: base.invalid });
    drafts.push(...groupDrafts);
    if (entity === 'Player' && links.team_name) {
      const d = deriveTeam(links.team_name);
      drafts.push({ entity: 'Team', is_primary: false, group: 0, source_file_id: file.id, source_row_number: row.n, raw_data: {}, mapped_data: { name: links.team_name, ...d }, links: {}, changes: Object.entries(d).map(([k, v]) => ({ field: k, before: '', after: String(v), derived: true })), invalid: [], derived: true });
    }
  }
  return drafts;
}

// Collapses duplicates across all drafts of a project. First seen wins; blank
// fields on the survivor are filled from later duplicates. Non-primary duplicates
// (siblings sharing a parent) vanish; primary duplicates stay as 'merged' rows so
// row accounting still balances.
export function dedupeDrafts(drafts, clubSeed) {
  const survivors = new Map();
  const out = [];
  for (const d of drafts) {
    d.dedupe_key = dedupeKey(d.entity, d.mapped_data, d.links);
    const named = d.dedupe_key && !(d.entity === 'Player' && !d.mapped_data.first_name && !d.mapped_data.last_name);
    const keyed = named ? d.dedupe_key : `row|${d.source_file_id}|${d.source_row_number}|${d.entity}|${d.group}`;
    d.dedupe_key = keyed;
    d.unique_id = stableUniqueId(d.entity, `${clubSeed}|${keyed}`, d.mapped_data);
    const first = survivors.get(keyed);
    if (!first) { survivors.set(keyed, d); d.status = 'pending'; out.push(d); continue; }
    for (const [k, v] of Object.entries(d.mapped_data)) {
      if (first.mapped_data[k] === undefined || first.mapped_data[k] === '') first.mapped_data[k] = v;
    }
    if (d.entity === 'Player') {
      first.links.guardian_emails = [...new Set([...(first.links.guardian_emails || []), ...(d.links.guardian_emails || [])])];
    }
    if (d.is_primary) { d.status = 'merged'; d.merged_key = keyed; out.push(d); }
  }
  return out;
}