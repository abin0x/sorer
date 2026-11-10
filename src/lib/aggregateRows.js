// Pure in-memory aggregation used by the entity adapters' `aggregate()`.
// Returns { rows: [{ _id, [groupBy]: value, bucket, date, count, sum_<field> }] }.
const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

function bucketOf(value, unit) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getUTCFullYear(), m = String(d.getUTCMonth() + 1).padStart(2, "0"), day = String(d.getUTCDate()).padStart(2, "0");
  if (unit === "year") return `${y}`;
  if (unit === "day") return `${y}-${m}-${day}`;
  if (unit === "week") {
    const s = new Date(Date.UTC(y, d.getUTCMonth(), d.getUTCDate() - d.getUTCDay()));
    return s.toISOString().slice(0, 10);
  }
  return `${y}-${m}`;
}

export function aggregateRows(records = [], { groupBy, dateBucket, sum, sort, limit } = {}) {
  const sums = sum == null ? [] : Array.isArray(sum) ? sum : [sum];
  const groups = new Map();
  for (const r of records) {
    let key = "__all__";
    let bucket = null;
    if (dateBucket?.field) {
      bucket = bucketOf(r[dateBucket.field], dateBucket.unit || "month");
      if (!bucket) continue;
      key = bucket;
    }
    if (groupBy) key = `${key}|${r[groupBy] ?? ""}`;
    let g = groups.get(key);
    if (!g) {
      g = { count: 0 };
      if (bucket) { g._id = bucket; g.bucket = bucket; g.date = bucket; }
      if (groupBy) { g[groupBy] = r[groupBy] ?? null; if (!bucket) g._id = r[groupBy] ?? null; }
      for (const f of sums) g[`sum_${f}`] = 0;
      groups.set(key, g);
    }
    g.count += 1;
    for (const f of sums) g[`sum_${f}`] += num(r[f]);
  }
  let rows = [...groups.values()];
  if (!groupBy && !dateBucket && rows.length === 0) {
    const empty = { _id: null, count: 0 };
    for (const f of sums) empty[`sum_${f}`] = 0;
    rows = [empty];
  }
  if (typeof sort === "string" && sort) {
    const desc = sort.startsWith("-"), f = desc ? sort.slice(1) : sort;
    rows.sort((a, b) => { const x = a[f], y = b[f]; if (x === y) return 0; return (x > y ? 1 : -1) * (desc ? -1 : 1); });
  } else if (dateBucket) rows.sort((a, b) => String(a.bucket).localeCompare(String(b.bucket)));
  if (limit) rows = rows.slice(0, Number(limit));
  return { rows };
}
