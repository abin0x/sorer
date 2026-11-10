/**
 * The tryout evaluation model shared by the coach scoring sheet and the admin
 * results view: what coaches score, what they recommend, and who may see what.
 */

export const DEFAULT_CRITERIA = [
  { key: "technical", label: "Technical skill" },
  { key: "tactical", label: "Tactical awareness" },
  { key: "athleticism", label: "Athleticism" },
  { key: "attitude", label: "Attitude" },
];

export const RECOMMENDATIONS = [
  { value: "offer", label: "Offer", tone: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  { value: "waitlist", label: "Waitlist", tone: "bg-amber-100 text-amber-800 border-amber-200" },
  { value: "needs_look", label: "Needs another look", tone: "bg-sky-100 text-sky-800 border-sky-200" },
  { value: "not_selected", label: "Not selected", tone: "bg-rose-100 text-rose-800 border-rose-200" },
];

export const SCALE_LABELS = {
  1: "Poor",
  2: "Below",
  3: "Solid",
  4: "Strong",
  5: "Standout",
};

export function criteriaFor(event) {
  const list = Array.isArray(event?.evaluation_criteria) ? event.evaluation_criteria.filter((c) => c && c.key) : [];
  return list.length ? list : DEFAULT_CRITERIA;
}

export function recommendationLabel(value) {
  return RECOMMENDATIONS.find((r) => r.value === value)?.label || "";
}

export function recommendationTone(value) {
  return RECOMMENDATIONS.find((r) => r.value === value)?.tone || "bg-muted text-muted-foreground border-border";
}

/** A coach scores a session they are assigned to evaluate or run. */
export function isAssignedToEvent(event, plan, user) {
  if (!event || !user) return false;
  if ((event.evaluator_ids || []).includes(user.id)) return true;
  if (event.responsible_user_id && event.responsible_user_id === user.id) return true;
  if (event.owner_user_id && event.owner_user_id === user.id) return true;
  if (plan?.lead_user_id && plan.lead_user_id === user.id) return true;
  return false;
}

export function eventsForUser(events, plansById, user, canManage) {
  if (!user) return [];
  if (canManage) return events;
  return events.filter((e) => isAssignedToEvent(e, plansById?.[e.tryout_plan_id], user));
}

/** Other coaches' scores stay hidden until the admin reveals them on the session. */
export function canSeeOtherScores(event, canManage) {
  return !!canManage || event?.evaluation_share_scores === true;
}

export function blocksOwnChild(event) {
  return event?.evaluation_block_own_child !== false;
}

/** True when this family email is the signed-in coach's own (case-insensitive). */
export function isOwnChild(row, user) {
  const email = (user?.email || "").toLowerCase();
  return !!email && (row?.guardian_email || "").toLowerCase() === email;
}

export function meanScore(values) {
  const nums = values.filter((v) => Number(v) > 0).map(Number);
  if (!nums.length) return 0;
  return Math.round((nums.reduce((s, v) => s + v, 0) / nums.length) * 10) / 10;
}

export function gradeTone(grade) {
  if (!grade) return "bg-muted text-muted-foreground";
  if (grade >= 4) return "bg-emerald-100 text-emerald-800";
  if (grade >= 3) return "bg-sky-100 text-sky-800";
  return "bg-amber-100 text-amber-800";
}