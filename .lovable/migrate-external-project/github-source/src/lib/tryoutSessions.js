import { base44 } from "@/api/base44Client";

/**
 * Shared tryout-session helpers: creating sessions, cleaning one up, and
 * carrying a previous season's setup onto a new plan. Kept here so the setup
 * table, the bulk builder and the duplicate flow all write events identically.
 */

/** ISO date shifted by n days. */
export function shiftDate(dateStr, days) {
  if (!dateStr) return "";
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Whole days from one ISO date to another (negative when `to` is earlier). */
export function daysBetween(fromStr, toStr) {
  if (!fromStr || !toStr) return 0;
  const a = new Date(`${fromStr}T00:00:00`).getTime();
  const b = new Date(`${toStr}T00:00:00`).getTime();
  return Math.round((b - a) / 86400000);
}

export function tryoutSignupUrl(eventId) {
  return eventId ? `${window.location.origin}/TryoutSignup?id=${eventId}` : "";
}

/** TryoutEvent record for one session, from the setup form's values. */
export function sessionPayload(plan, values) {
  return {
    tryout_plan_id: plan.id,
    club_id: plan.club_id,
    type: values.type,
    is_anchor: values.type === "main_tryout",
    supplemental_index: values.supplemental_index,
    date: values.date,
    start_time: values.start_time || "",
    end_time: values.end_time || "",
    location: values.location || "",
    branch_id: values.branch_id || (plan.location_ids || [])[0] || "",
    branch_name: values.branch_name || (plan.location_names || [])[0] || "",
    field_id: values.field_id || "",
    field_name: values.field_name || "",
    capacity: values.capacity ? Number(values.capacity) : undefined,
    evaluator_ids: values.evaluator_ids || [],
    evaluator_names: values.evaluator_names || [],
    responsible_user_id: values.responsible_user_id || "",
    responsible_name: values.responsible_name || "",
    owner_user_id: values.owner_user_id || plan.lead_user_id || "",
    owner_name: values.owner_name || plan.lead_name || "",
    expected_attendance: values.expected_attendance ? Number(values.expected_attendance) : undefined,
    auto_registration: values.auto_registration !== false,
    registration_url: "",
    notes: values.notes || "",
    stage: "planned",
  };
}

/** Creates one session and points its public signup link at the new record. */
export async function createSession(plan, values) {
  const created = await base44.entities.TryoutEvent.create(sessionPayload(plan, values));
  if (created.auto_registration) {
    await base44.entities.TryoutEvent.update(created.id, { registration_url: tryoutSignupUrl(created.id) });
    created.registration_url = tryoutSignupUrl(created.id);
  }
  return created;
}

/** Removes a session with the same cleanup the event detail view performs. */
export async function deleteSession(event) {
  if ((event.registration_count || 0) > 0) {
    await base44.functions.invoke("tryoutNotify", { event_id: event.id, type: "cancelled" }).catch(() => {});
  }
  const tasks = await base44.entities.TryoutTask.filter({ tryout_event_id: event.id }).catch(() => []);
  for (const task of tasks) {
    await base44.entities.TryoutSubtask.deleteMany({ tryout_task_id: task.id }).catch(() => {});
    await base44.entities.TryoutTask.delete(task.id).catch(() => {});
  }
  await base44.entities.TryoutEvent.delete(event.id);
}

/** New plan record carrying a previous plan's settings onto another season. */
export function duplicatePlanPayload(source, { title, season, startDate }) {
  const lengthDays = source.start_date && source.end_date ? daysBetween(source.start_date, source.end_date) : 0;
  return {
    title,
    season,
    age_group: source.age_group || "",
    gender: source.gender,
    format: source.format,
    location_ids: source.location_ids || [],
    location_names: source.location_names || [],
    platform_id: source.platform_id || "",
    platform_name: source.platform_name || "",
    platform_ids: source.platform_ids || [],
    platform_names: source.platform_names || [],
    team_ids: source.team_ids || [],
    team_names: source.team_names || [],
    lead_user_id: source.lead_user_id || "",
    lead_name: source.lead_name || "",
    tryout_fee: source.tryout_fee,
    max_capacity: source.max_capacity,
    required_documents: source.required_documents || [],
    start_date: startDate || "",
    end_date: startDate && lengthDays ? shiftDate(startDate, lengthDays) : "",
    status: "draft",
    notes: source.notes || "",
  };
}

/**
 * Sessions copied onto the duplicated plan: same times, field, capacity and
 * evaluators, with each date shifted so the run keeps the same shape inside
 * the new season's window. Counters and signup links start fresh.
 */
export function duplicateSessionPayloads(sourceSessions, newPlan, baseDate) {
  const delta = daysBetween(baseDate, newPlan.start_date);
  return sourceSessions.map((e) => ({
    tryout_plan_id: newPlan.id,
    club_id: newPlan.club_id,
    type: e.type,
    is_anchor: e.is_anchor === true,
    supplemental_index: e.supplemental_index,
    date: e.date ? shiftDate(e.date, delta) : "",
    start_time: e.start_time || "",
    end_time: e.end_time || "",
    location: e.location || "",
    branch_id: e.branch_id || (newPlan.location_ids || [])[0] || "",
    branch_name: e.branch_name || (newPlan.location_names || [])[0] || "",
    field_id: e.field_id || "",
    field_name: e.field_name || "",
    capacity: e.capacity,
    evaluator_ids: e.evaluator_ids || [],
    evaluator_names: e.evaluator_names || [],
    responsible_user_id: e.responsible_user_id || "",
    responsible_name: e.responsible_name || "",
    owner_user_id: e.owner_user_id || newPlan.lead_user_id || "",
    owner_name: e.owner_name || newPlan.lead_name || "",
    auto_registration: e.auto_registration !== false,
    registration_url: "",
    stage: "planned",
  }));
}