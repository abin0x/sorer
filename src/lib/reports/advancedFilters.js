// Advanced report filters: field / operator / value rows applied to a query.
// Only fields the data source declares are allowed, so callers cannot query arbitrary columns.

export const ADVANCED_OPERATORS = [
  { key: "equals", label: "is", needsValue: true },
  { key: "not_equals", label: "is not", needsValue: true },
  { key: "contains", label: "contains", needsValue: true },
  { key: "gte", label: "is on/after or ≥", needsValue: true },
  { key: "lte", label: "is on/before or ≤", needsValue: true },
  { key: "is_set", label: "has a value", needsValue: false },
  { key: "not_set", label: "is empty", needsValue: false },
];

export function applyAdvancedFilters(query, rows, allowedKeys) {
  const q = { ...query };
  const allowed = new Set(allowedKeys);
  for (const row of rows || []) {
    if (!row || !allowed.has(row.field)) continue;
    const op = ADVANCED_OPERATORS.find((o) => o.key === row.op);
    if (!op) continue;
    const value = typeof row.value === "string" ? row.value.trim() : row.value;
    if (op.needsValue && (value == null || value === "")) continue;
    const prev = q[row.field] && typeof q[row.field] === "object" && !Array.isArray(q[row.field]) ? q[row.field] : {};
    const num = typeof value === "string" && /^-?\d+(\.\d+)?$/.test(value) ? Number(value) : value;
    switch (op.key) {
      case "equals": q[row.field] = value; break;
      case "not_equals": q[row.field] = { ...prev, $ne: value }; break;
      case "contains": q[row.field] = { ...prev, $regex: value }; break;
      case "gte": q[row.field] = { ...prev, $gte: num }; break;
      case "lte": q[row.field] = { ...prev, $lte: num }; break;
      case "is_set": q[row.field] = { ...prev, $exists: true }; break;
      case "not_set": q[row.field] = { ...prev, $exists: false }; break;
    }
  }
  return q;
}
