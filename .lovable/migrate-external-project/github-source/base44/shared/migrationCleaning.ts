// Shared cleaning/normalization functions used by every migration template.
// Extracted from migrationMapping.ts so each template can reuse them without
// importing the entire transform.

export type CleaningResult = {
  value: any;
  ok: boolean;
  note?: string;
};

export function splitName(raw: string): { first_name: string; last_name: string } {
  if (!raw) return { first_name: '', last_name: '' };
  const name = String(raw).trim();
  if (name.includes(',')) {
    const [last, ...rest] = name.split(',');
    const first = rest.join(' ').trim();
    return { first_name: first, last_name: last.trim() };
  }
  const parts = name.split(/\s+/);
  if (parts.length === 1) return { first_name: '', last_name: parts[0] };
  const suffixes = ['Jr', 'Sr', 'II', 'III', 'IV'];
  let end = parts.length;
  if (suffixes.includes(parts[end - 1].replace('.', ''))) end -= 1;
  return { first_name: parts.slice(0, 1).join(' '), last_name: parts.slice(1, end).join(' ') };
}

export function normalizeEmail(raw: string): CleaningResult {
  if (!raw) return { value: '', ok: false, note: 'Email is missing' };
  const email = String(raw).trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { value: email, ok: false, note: `Invalid email format: "${raw}"` };
  }
  return { value: email, ok: true };
}

export function normalizePhone(raw: string): string {
  if (!raw) return '';
  const digits = String(raw).replace(/[^\d]/g, '');
  if (digits.length === 11 && digits[0] === '1') return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  return String(raw).trim();
}

export function normalizeState(raw: string): string {
  if (!raw) return '';
  const s = String(raw).trim().toUpperCase();
  const map: Record<string, string> = {
    MICHIGAN: 'MI', OHIO: 'OH', INDIANA: 'IN', ILLINOIS: 'IL', CALIFORNIA: 'CA',
    TEXAS: 'TX', FLORIDA: 'FL', NEWYORK: 'NY', PENNSYLVANIA: 'PA',
  };
  if (s.length === 2) return s;
  return map[s] || s;
}

export function preserveZip(raw: string): string {
  if (!raw) return '';
  const z = String(raw).trim();
  if (/^\d{4,5}$/.test(z)) return z.padStart(5, '0');
  if (/^\d{5}-\d{4}$/.test(z)) return z;
  return z;
}

export function parseDate(raw: string): CleaningResult {
  if (!raw) return { value: '', ok: false, note: 'Date is missing' };
  const s = String(raw).trim();
  let d = new Date(s);
  if (isNaN(d.getTime())) {
    const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (m) {
      let [, mo, dy, yr] = m;
      if (yr.length === 2) yr = (parseInt(yr) > 30 ? '19' : '20') + yr;
      d = new Date(parseInt(yr), parseInt(mo) - 1, parseInt(dy));
    }
  }
  if (isNaN(d.getTime())) {
    if (/^\d{1,2}\/\d{1,2}$/.test(s)) {
      return { value: s, ok: false, note: `Ambiguous date "${s}" — needs format confirmation (MM/DD or DD/MM?)` };
    }
    return { value: s, ok: false, note: `Unparseable date: "${s}"` };
  }
  return { value: d.toISOString().split('T')[0], ok: true };
}

export function normalizeGender(raw: string): string {
  if (!raw) return '';
  const g = String(raw).trim().toLowerCase();
  if (g.includes('girl') || g === 'f' || g === 'female') return 'Girls';
  if (g.includes('boy') || g === 'm' || g === 'male') return 'Boys';
  return 'Boys and Girls';
}

export function toBoolean(raw: string): boolean {
  if (!raw) return false;
  const s = String(raw).trim().toLowerCase();
  return ['yes', 'y', 'true', '1', 'x'].includes(s);
}