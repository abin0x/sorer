// Automapping engine: CSV parsing, entity detection, and column matching.
// Pure functions only (no club data, no I/O) so they are easy to test.

export const ENTITIES = ['Player', 'Guardian', 'Team'];

const f = (name, label, type, extra = {}) => ({ name, label, type, required: false, aliases: [], options: null, ...extra });

// Mapping targets, mirroring the importable fields of the live Player, Guardian
// and Team schemas. Denormalized display fields (guardian_name, team_name, age_group
// on a player, ...), link IDs, club_id and season are intentionally absent:
// links are resolved after import, and club_id / season come from the project.
export const TARGETS = {
  Guardian: [
    f('first_name', 'First name', 'text', { required: true, aliases: ['first name', 'first', 'given name'] }),
    f('last_name', 'Last name', 'text', { required: true, aliases: ['last name', 'last', 'surname', 'family name'] }),
    f('email', 'Email', 'email', { required: true, aliases: ['email', 'e-mail', 'email address', 'parent email', 'contact email'] }),
    f('phone', 'Phone', 'phone', { aliases: ['phone', 'cell', 'cell phone', 'mobile', 'telephone', 'phone number', 'primary phone'] }),
    f('relationship', 'Relationship', 'enum', { options: ['mother', 'father', 'guardian', 'other'], aliases: ['relationship', 'relation', 'parent type'] }),
    f('street_address', 'Street address', 'text', { aliases: ['address', 'street', 'street address', 'address 1', 'address line 1'] }),
    f('address_line_2', 'Address line 2', 'text', { aliases: ['address 2', 'apt', 'suite', 'address line 2'] }),
    f('city', 'City', 'text', { aliases: ['city', 'town'] }),
    f('state', 'State', 'text', { aliases: ['state', 'province', 'region'] }),
    f('zip_code', 'ZIP / postal code', 'zip', { aliases: ['zip', 'zip code', 'postal code', 'postcode'] }),
    f('country', 'Country', 'text', { aliases: ['country'] }),
    f('emergency_contact_name', 'Emergency contact name', 'text', { aliases: ['emergency contact', 'emergency contact name'] }),
    f('emergency_contact_phone', 'Emergency contact phone', 'phone', { aliases: ['emergency phone', 'emergency contact phone'] }),
    f('household_id', 'Household ID', 'text', { aliases: ['household', 'family id', 'household id'] }),
    f('unique_id', 'Source ID', 'text', { aliases: ['id', 'guardian id', 'parent id', 'external id', 'source id', 'member id'] }),
    f('notes', 'Notes', 'text', { aliases: ['notes', 'comments', 'note'] }),
  ],
  Player: [
    f('first_name', 'First name', 'text', { required: true, aliases: ['first name', 'first', 'given name'] }),
    f('last_name', 'Last name', 'text', { required: true, aliases: ['last name', 'last', 'surname', 'family name'] }),
    f('date_of_birth', 'Date of birth', 'date', { required: true, aliases: ['dob', 'birth date', 'birthdate', 'date of birth', 'birthday', 'born'] }),
    f('gender', 'Gender', 'enum', { options: ['Boys', 'Girls'], aliases: ['gender', 'sex'] }),
    f('status', 'Status', 'enum', { options: ['active', 'inactive', 'waitlist', 'pending'], aliases: ['status', 'registration status', 'player status', 'enrollment status'] }),
    f('position', 'Position', 'enum', {
      options: ['1 - Goalkeeper', '2 - Right Back', '3 - Left Back', '4 - Right Centerback', '5 - Left Centerback', '6 - Holding Midfielder', '7 - Right Winger', '8 - Center Midfielder', '9 - Center Forward', '10 - Attacking Midfielder', '11 - Left Midfielder'],
      aliases: ['position', 'pos', 'preferred position'],
    }),
    f('jersey_number', 'Jersey number', 'text', { aliases: ['jersey', 'jersey number', 'uniform number', 'shirt number'] }),
    f('team_ref', 'Team (link by name)', 'text', { link: true, aliases: ['team', 'team name', 'squad'] }),
    f('location_ref', 'Branch (link by name)', 'text', { link: true, aliases: ['branch', 'location', 'site', 'club location'] }),
    f('medical_notes', 'Medical notes', 'text', { aliases: ['medical', 'medical notes', 'allergies', 'medical conditions'] }),
    f('unique_id', 'Source ID', 'text', { aliases: ['id', 'player id', 'external id', 'source id', 'member id', 'uid'] }),
    f('notes', 'Notes', 'text', { aliases: ['notes', 'comments', 'note'] }),
  ],
  Team: [
    f('name', 'Team name', 'text', { required: true, aliases: ['name', 'team', 'team name', 'squad'] }),
    f('age_group', 'Age group', 'text', { aliases: ['age group', 'age', 'division', 'birth year', 'bracket'] }),
    f('gender', 'Gender', 'enum', { options: ['Boys', 'Girls', 'Boys and Girls'], aliases: ['gender', 'sex'] }),
    f('playing_format', 'Playing format', 'enum', { options: ['4v4', '7v7', '9v9', '11v11'], aliases: ['format', 'game format', 'playing format'] }),
    f('league', 'League', 'text', { aliases: ['league', 'competition'] }),
    f('cost', 'Cost per player', 'number', { aliases: ['cost', 'price', 'fee', 'dues'] }),
    f('max_roster_size', 'Max roster size', 'number', { aliases: ['roster size', 'max roster', 'max roster size'] }),
    f('location_ref', 'Branch (link by name)', 'text', { link: true, aliases: ['branch', 'location', 'site'] }),
    f('unique_id', 'Source ID', 'text', { aliases: ['id', 'team id', 'external id', 'source id'] }),
    f('notes', 'Notes', 'text', { aliases: ['notes', 'comments', 'note'] }),
  ],
};

export function publicTargets() {
  const out = {};
  for (const [k, list] of Object.entries(TARGETS)) {
    out[k] = list.map(({ name, label, type, required, options, link }) => ({ name, label, type, required, options, link: !!link }));
  }
  return out;
}

const norm = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const NAME_SET = new Set(['name', 'fullname', 'playername', 'parentname', 'guardianname', 'contactname', 'athletename', 'studentname']);
const GROUP_RE = /^(parent\/guardian|parent|guardian|mother|father|contact)\s*#?\s*(\d+)\s*[-_:.\s]*(.*)$/i;

const SYN = {
  gender: { m: 'Boys', male: 'Boys', boy: 'Boys', boys: 'Boys', f: 'Girls', female: 'Girls', girl: 'Girls', girls: 'Girls', coed: 'Boys and Girls', mixed: 'Boys and Girls' },
  status: { active: 'active', registered: 'active', enrolled: 'active', paid: 'active', inactive: 'inactive', withdrawn: 'inactive', cancelled: 'inactive', canceled: 'inactive', dropped: 'inactive', waitlist: 'waitlist', waitlisted: 'waitlist', 'wait list': 'waitlist', pending: 'pending', incomplete: 'pending' },
  relationship: { mother: 'mother', mom: 'mother', m: 'mother', father: 'father', dad: 'father', guardian: 'guardian', 'legal guardian': 'guardian', other: 'other' },
};

export function mapEnumValue(field, raw) {
  const n = String(raw ?? '').trim().toLowerCase();
  if (!n) return null;
  const syn = SYN[field.name]?.[n];
  if (syn && field.options.includes(syn)) return syn;
  const exact = field.options.find((o) => norm(o) === norm(n));
  if (exact) return exact;
  if (norm(n).length >= 4) return field.options.find((o) => norm(o).includes(norm(n))) || null;
  return null;
}

// ---------- parsing ----------
export function decodeBytes(bytes) {
  let enc = 'utf-8';
  let start = 0;
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) start = 3;
  else if (bytes[0] === 0xff && bytes[1] === 0xfe) { enc = 'utf-16le'; start = 2; }
  else if (bytes[0] === 0xfe && bytes[1] === 0xff) { enc = 'utf-16be'; start = 2; }
  try {
    return { text: new TextDecoder(enc, { fatal: true }).decode(bytes.subarray(start)), encoding: enc };
  } catch {
    return { text: new TextDecoder('windows-1252').decode(bytes.subarray(start)), encoding: 'windows-1252' };
  }
}

function detectDelimiter(text) {
  const line = text.split(/\r?\n/).find((l) => l.trim()) || '';
  let best = ',';
  let max = -1;
  for (const d of [',', ';', '\t', '|']) {
    let count = 0;
    let q = false;
    for (const ch of line) { if (ch === '"') q = !q; else if (ch === d && !q) count++; }
    if (count > max) { max = count; best = d; }
  }
  return best;
}

export function parseCsv(text, d) {
  const rows = [];
  let row = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === d) { row.push(cur); cur = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cur); cur = ''; rows.push(row); row = [];
    } else cur += ch;
  }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

function buildHeaders(row) {
  const seen = {};
  return row.map((h, i) => {
    let name = String(h ?? '').trim() || `Column ${i + 1}`;
    seen[name] = (seen[name] || 0) + 1;
    if (seen[name] > 1) name = `${name} (${seen[name]})`;
    return name;
  });
}

// Row-preserving parse used for staging: every non-blank row keeps its original
// row number (header = row 1). Values stay text.
export function parseFileRows(text) {
  const delimiter = detectDelimiter(text);
  const raw = parseCsv(text, delimiter);
  if (!raw.length) return { headers: [], rows: [] };
  const headers = buildHeaders(raw[0]);
  const rows = [];
  raw.slice(1).forEach((cells, i) => {
    if (cells.every((c) => !String(c ?? '').trim())) return;
    rows.push({ n: i + 2, cells });
  });
  return { headers, rows };
}

// Every value stays text (leading zeros preserved).
export function parseFile(text) {
  const delimiter = detectDelimiter(text);
  const raw = parseCsv(text, delimiter);
  if (!raw.length) return { delimiter, headers: [], columns: [], rowCount: 0, blankRows: 0 };
  const headers = buildHeaders(raw[0]);
  const data = raw.slice(1);
  const isBlank = (r) => r.every((c) => !String(c ?? '').trim());
  const live = data.filter((r) => !isBlank(r));
  const columns = headers.map((header, index) => ({
    header,
    index,
    values: live.map((r) => String(r[index] ?? '').trim()).filter(Boolean),
  }));
  return { delimiter, headers, columns, rowCount: live.length, blankRows: data.length - live.length };
}

// ---------- scoring ----------
function lev(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

function headerScore(h, field) {
  if (!h) return 0;
  const cands = [norm(field.name), norm(field.label), ...field.aliases.map(norm)];
  let best = 0;
  for (const c of cands) {
    let s;
    if (h === c) s = 1;
    else if (c.length >= 5 && h.includes(c)) s = 0.8;
    else {
      const sim = 1 - lev(h, c) / Math.max(h.length, c.length);
      s = sim >= 0.75 ? sim * 0.9 : sim * 0.4;
    }
    if (s > best) best = s;
  }
  return best;
}

const isDate = (v) =>
  /^\d{4}-\d{1,2}-\d{1,2}/.test(v) || /^\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}$/.test(v) || (/[a-z]{3}/i.test(v) && /\d{4}/.test(v) && !isNaN(Date.parse(v)));

function contentScore(vals, field) {
  if (!vals.length) return 0;
  const frac = (fn) => vals.filter(fn).length / vals.length;
  switch (field.type) {
    case 'email': return frac((v) => EMAIL.test(v));
    case 'phone': return frac((v) => v.replace(/\D/g, '').length >= 10 && /^[\d\s().+\-x]+$/i.test(v));
    case 'date': return frac(isDate);
    case 'zip': return frac((v) => /^\d{5}(-\d{4})?$/.test(v));
    case 'number': return frac((v) => /^-?\$?\s?[\d,]+(\.\d+)?$/.test(v));
    case 'enum': return frac((v) => !!mapEnumValue(field, v));
    default: return frac((v) => v.length <= 60 && !EMAIL.test(v) && !isDate(v)) * 0.5;
  }
}

function combine(h, c, field) {
  const strong = ['email', 'phone', 'date', 'zip', 'enum'].includes(field.type);
  if (h > 0.3) {
    const s = 0.7 * h + 0.3 * c;
    return strong && c < 0.3 ? s * 0.5 : s;
  }
  return strong && c >= 0.6 ? 0.65 * c : 0;
}

// One-to-one assignment: highest-scoring pairs claim columns and fields first.
function mapColumns(cols, entity) {
  const fields = TARGETS[entity];
  const pairs = [];
  for (const col of cols) {
    const h = norm(col.header);
    const vals = col.values.slice(0, 200);
    for (const fl of fields) {
      const s = combine(headerScore(h, fl), contentScore(vals, fl), fl);
      if (s >= 0.5) pairs.push({ col, fl, s });
    }
  }
  pairs.sort((a, b) => b.s - a.s);
  const usedCols = new Set();
  const usedFields = new Set();
  const out = new Map();
  const add = (idx, a) => out.set(idx, [...(out.get(idx) || []), a]);
  for (const p of pairs) {
    if (usedCols.has(p.col.index) || usedFields.has(p.fl.name)) continue;
    usedCols.add(p.col.index);
    usedFields.add(p.fl.name);
    add(p.col.index, { field: p.fl.name, score: p.s, transform: 'none' });
  }
  // Full name column -> first + last
  if (fields.some((x) => x.name === 'first_name') && !usedFields.has('first_name') && !usedFields.has('last_name')) {
    const nameCol = cols.find((c) => !usedCols.has(c.index) && NAME_SET.has(norm(c.header)));
    if (nameCol) {
      add(nameCol.index, { field: 'first_name', score: 0.75, transform: 'split_first' });
      add(nameCol.index, { field: 'last_name', score: 0.75, transform: 'split_last' });
    }
  }
  return out;
}

function uniqueValues(values) {
  const counts = new Map();
  for (const v of values) counts.set(v, (counts.get(v) || 0) + 1);
  if (counts.size > 30) return [];
  return [...counts.entries()].map(([value, count]) => ({ value, count }));
}

function buildRecord(col, entity, assignment, group, label) {
  const field = assignment && TARGETS[entity].find((x) => x.name === assignment.field);
  const uniq = uniqueValues(col.values);
  const value_map = {};
  if (field?.type === 'enum') for (const u of uniq) value_map[u.value] = mapEnumValue(field, u.value) || '';
  const score = assignment ? Math.round(assignment.score * 100) / 100 : 0;
  return {
    source_column: col.original || col.header,
    source_index: col.index,
    group,
    group_label: label,
    target_entity: entity,
    target_field: assignment ? assignment.field : '',
    transform: assignment ? assignment.transform : 'none',
    confidence: score,
    status: !assignment ? 'unmapped' : score >= 0.8 ? 'auto' : 'suggested',
    non_empty_count: col.values.length,
    samples: [...new Set(col.values)].slice(0, 5).map((v) => v.slice(0, 60)),
    unique_values: uniq,
    value_map,
  };
}

function recordsFor(cols, entity, group, label) {
  const assigned = mapColumns(cols, entity);
  const out = [];
  for (const col of cols) {
    const list = assigned.get(col.index);
    if (list) for (const a of list) out.push(buildRecord(col, entity, a, group, label));
    else out.push(buildRecord(col, entity, null, group, label));
  }
  return out;
}

// Proposes mappings for one entity. Repeating groups (Parent 1 ..., Parent 2 ...)
// are pulled out and mapped to Guardian fields, one group per guardian.
export function proposeMapping(parsed, entity) {
  const main = [];
  const groups = {};
  for (const col of parsed.columns) {
    const m = ['Player', 'Guardian'].includes(entity) ? GROUP_RE.exec(col.header) : null;
    if (m) {
      const key = m[2];
      groups[key] = groups[key] || { label: `${m[1][0].toUpperCase()}${m[1].slice(1).toLowerCase()} ${key}`, cols: [] };
      groups[key].cols.push({ ...col, header: m[3] || 'name', original: col.header });
    } else main.push(col);
  }
  const records = recordsFor(main, entity, 0, '');
  for (const [key, g] of Object.entries(groups)) records.push(...recordsFor(g.cols, 'Guardian', Number(key), g.label));
  return records;
}

export function detectEntity(parsed) {
  const scores = {};
  for (const entity of ENTITIES) {
    const recs = proposeMapping(parsed, entity).filter((r) => r.group === 0);
    const fields = TARGETS[entity];
    let got = 0;
    let assignedW = 0;
    const have = new Set();
    for (const r of recs) {
      if (!r.target_field || r.confidence < 0.5) continue;
      const w = fields.find((x) => x.name === r.target_field)?.required ? 2 : 1;
      got += r.confidence * w;
      assignedW += w;
      have.add(r.target_field);
    }
    const missing = fields.filter((x) => x.required && !have.has(x.name)).length * 2;
    let s = got / (assignedW + missing + 1);
    if (entity === 'Player' && parsed.columns.some((c) => GROUP_RE.test(c.header))) s += 0.15;
    scores[entity] = Math.round(Math.min(s, 1) * 100) / 100;
  }
  const entity = ENTITIES.reduce((a, b) => (scores[b] > scores[a] ? b : a), ENTITIES[0]);
  return { entity, scores };
}