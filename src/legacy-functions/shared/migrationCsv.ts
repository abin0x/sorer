// @ts-nocheck
import { getTemplate } from './migrationTemplates.ts';
// Deterministic CSV ingestion: quoted commas, escaped quotes and multiline cells.
export function parseMigrationCsv(text) {
  text = text.replace(/^\uFEFF/, '');
  const delimiter = text.split(/\r?\n/, 1)[0].includes('\t') ? '\t' : ',';
  const rows = []; let row = [], cell = '', quoted = false, line = 1;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++; }
      else if (quoted || cell === '') quoted = !quoted;
      else throw new Error(`Line ${line}: unexpected quote. Save again as CSV with quoted text cells.`);
    } else if (c === delimiter && !quoted) { row.push(cell); cell = ''; }
    else if ((c === '\n' || c === '\r') && !quoted) {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); if (row.some(v => v.trim())) rows.push(row);
      row = []; cell = ''; line++;
    } else { cell += c; if (c === '\n') line++; }
  }
  if (quoted) throw new Error(`Line ${line}: unclosed quoted cell. Check quotes or re-save as CSV.`);
  row.push(cell); if (row.some(v => v.trim())) rows.push(row);
  if (rows.length < 2) throw new Error('The CSV needs a header row and at least one data row.');
  const headers = rows.shift().map(v => v.trim());
  const normalized = headers.map(v => v.toLowerCase());
  const duplicates = headers.filter((v, i) => normalized.indexOf(v.toLowerCase()) !== i);
  if (duplicates.length) throw new Error(`Duplicate headers: ${duplicates.join(', ')}. Give each column a unique name.`);
  return { headers, records: rows.map((values, i) => {
    if (values.length !== headers.length) throw new Error(`CSV record ${i + 2}: expected ${headers.length} columns but found ${values.length}. Check commas and quoted cells.`);
    return Object.fromEntries(headers.map((h, j) => [h.toLowerCase(), values[j].trim()]));
  }) };
}

// Source-aware column matching: given a template's column map (fieldKey →
// possible header names), match CSV headers case-insensitively and produce
// records keyed by fieldKey.
export function mapMigrationCsv(text, type, source = 'teamsnap') {
  const template = getTemplate(source);
  const columnMap = type === 'teams' ? template.teamColumns : template.memberColumns;
  const parsed = parseMigrationCsv(text);

  // Build header → fieldKey lookup (case-insensitive, first alias wins)
  const headerToField = {};
  for (const [fieldKey, aliases] of Object.entries(columnMap)) {
    for (const alias of aliases) {
      const lower = alias.toLowerCase();
      if (parsed.headers.some(h => h.toLowerCase() === lower)) {
        headerToField[lower] = fieldKey;
        break;
      }
    }
  }

  // Check required fields
  if (type === 'members') {
    const required = ['player_first_name', 'player_last_name', 'date_of_birth', 'p1_email'];
    const missing = required.filter(f => !Object.values(headerToField).includes(f));
    if (missing.length) {
      throw new Error(`Missing required columns for ${template.label}: ${missing.join(', ')}. Use the ${type} template; keep headers on the first row.`);
    }
  } else {
    if (!Object.values(headerToField).includes('name')) {
      throw new Error(`Missing required column: Team Name. The teams template needs a single "Team Name" column.`);
    }
  }

  return parsed.records.map(row => {
    const out = {};
    for (const [lowerHeader, value] of Object.entries(row)) {
      const fieldKey = headerToField[lowerHeader];
      if (fieldKey) out[fieldKey] = value;
    }
    return out;
  });
}