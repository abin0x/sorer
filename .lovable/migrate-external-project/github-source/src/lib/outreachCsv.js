export const IMPORT_FIELDS = [
  { key: 'first_name', label: 'First name', required: true },
  { key: 'last_name', label: 'Last name', required: true },
  { key: 'email', label: 'Email', required: true },
  { key: 'club_name', label: 'Club name', required: true },
  { key: 'title', label: 'Title' },
  { key: 'branch_count', label: 'Branch count' },
  { key: 'player_count', label: 'Player count' },
  { key: 'registration_platform', label: 'Registration platform' },
  { key: 'region', label: 'Region' },
  { key: 'pain_signal', label: 'Pain signal' },
  { key: 'club_website', label: 'Club website' },
  { key: 'linkedin_url', label: 'LinkedIn URL' },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  const src = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some((c) => c.trim() !== '')) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== '')) rows.push(row);
  const [headers = [], ...data] = rows;
  return { headers: headers.map((h) => h.trim()), rows: data };
}

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Guess a mapping { [columnIndex]: fieldKey | '' } from header names. */
export function autoMap(headers) {
  const used = new Set();
  const aliases = { email: ['emailaddress', 'mail'], first_name: ['firstname', 'first', 'fname'], last_name: ['lastname', 'last', 'lname', 'surname'], club_name: ['club', 'clubname', 'organization', 'org'], player_count: ['players', 'playercount'], branch_count: ['branches', 'branchcount', 'locations'], registration_platform: ['platform', 'registrationplatform'], club_website: ['website', 'url'], linkedin_url: ['linkedin'], pain_signal: ['pain', 'painsignal'] };
  const map = {};
  headers.forEach((h, i) => {
    const n = norm(h);
    const f = IMPORT_FIELDS.find((x) => !used.has(x.key) && (norm(x.key) === n || (aliases[x.key] || []).includes(n)));
    map[i] = f ? f.key : '';
    if (f) used.add(f.key);
  });
  return map;
}

export function buildRecords(rows, mapping) {
  return rows.map((r) => {
    const rec = {};
    Object.entries(mapping).forEach(([i, key]) => {
      if (key) rec[key] = (r[i] || '').trim();
    });
    return rec;
  });
}

/** Local status; server-side duplicate/suppression info is merged in by the caller. */
export function localStatus(rec) {
  if (!rec.first_name || !rec.last_name || !rec.club_name || !rec.email) return 'Missing required field';
  if (!EMAIL_RE.test(rec.email.toLowerCase())) return 'Invalid email';
  return 'Ready';
}