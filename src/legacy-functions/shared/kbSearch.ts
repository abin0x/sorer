// @ts-nocheck
// Typo-tolerant, synonym-aware article scoring for the Knowledge Base.

const STOP = new Set(['the', 'and', 'for', 'how', 'can', 'why', 'what', 'from', 'with', 'are', 'was', 'you', 'your', 'this', 'that', 'does', 'did', 'into', 'have', 'has', 'but', 'not', 'my', 'is', 'to', 'a', 'of', 'in', 'on', 'it', 'do', 'i']);

const SYN: Record<string, string[]> = {
  password: ['login', 'reset', 'locked'], login: ['password', 'signin', 'access'], signin: ['login'],
  pay: ['payment', 'card', 'charge'], payment: ['pay', 'card', 'charge', 'invoice'], card: ['payment'],
  refund: ['reimburse', 'chargeback'], stripe: ['payment', 'card'], quickbooks: ['qbo', 'accounting', 'sync'],
  qbo: ['quickbooks'], import: ['upload', 'csv', 'migrate'], csv: ['import', 'spreadsheet'],
  parent: ['guardian', 'family'], guardian: ['parent'], coach: ['staff', 'trainer'],
  tryout: ['trial', 'evaluation'], event: ['camp', 'clinic'], camp: ['event'],
  notification: ['alert', 'email', 'push'], report: ['export', 'analytics'], delete: ['remove', 'erase'],
  team: ['roster', 'squad'], roster: ['team', 'squad'], field: ['facility', 'pitch', 'booking'],
  logo: ['branding', 'colors'], invoice: ['bill', 'billing'], subscription: ['plan', 'modules', 'billing'],
};

export const stripHtml = (s: string) => String(s || '').replace(/<[^>]*>/g, ' ');

export function tokenize(s: string): string[] {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(' ').filter(w => w.length > 1 && !STOP.has(w));
}

function lev(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return dp[a.length][b.length];
}

function match(q: string, w: string): number {
  if (q === w) return 1;
  if (q.length >= 3 && w.startsWith(q)) return 0.8;
  if (w.length >= 4 && q.startsWith(w)) return 0.7;
  const maxd = q.length >= 8 ? 2 : q.length >= 4 ? 1 : 0;
  if (maxd && Math.abs(q.length - w.length) <= maxd && lev(q, w) <= maxd) return 0.6;
  return 0;
}

export function scoreArticles(query: string, articles: any[]): any[] {
  const qt = tokenize(query);
  if (!qt.length) return [];
  const terms = qt.flatMap(t => [{ t, f: 1 }, ...(SYN[t] || []).map(s => ({ t: s, f: 0.5 }))]);
  const scored: { a: any; score: number }[] = [];
  for (const a of articles) {
    const fields: [number, Set<string>][] = [
      [5, new Set(tokenize(a.title))],
      [4, new Set(tokenize((a.keywords || []).join(' ')))],
      [2, new Set(tokenize(a.short_answer))],
      [1, new Set(tokenize(stripHtml(a.body).slice(0, 4000)))],
    ];
    let score = 0;
    for (const { t, f } of terms) {
      for (const [weight, set] of fields) {
        let best = 0;
        for (const w of set) {
          const m = match(t, w);
          if (m > best) best = m;
          if (best === 1) break;
        }
        score += best * weight * f;
      }
    }
    if (score >= 1.5) scored.push({ a, score });
  }
  return scored.sort((x, y) => y.score - x.score).map(s => s.a);
}