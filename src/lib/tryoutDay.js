import { base44 } from "@/api/base44Client";

// ===== Conflict detection (session builder) =====
function timeOverlap(a, b) {
  if (!a.start_time || !a.end_time || !b.start_time || !b.end_time) return true;
  return a.start_time < b.end_time && b.start_time < a.end_time;
}

const label = (t) => t.replace(/_/g, " ");

const sameField = (a, b) =>
  (a.field_id && b.field_id && a.field_id === b.field_id) ||
  (a.location && b.location && a.location.trim().toLowerCase() === b.location.trim().toLowerCase());

const fieldLabel = (a, b) => a.field_name || b.field_name || a.location || b.location || "Field";

const nameForEvaluator = (event, id) => {
  const ids = event.evaluator_ids || [];
  const names = event.evaluator_names || [];
  const idx = ids.indexOf(id);
  return (idx >= 0 && names[idx]) || "An assigned coach";
};

/**
 * Conflicts for one session being created or edited.
 * options.plan — the parent tryout plan (its max capacity caps a session)
 * options.evaluatorNames — id → name map, so evaluator clashes read clearly
 */
export function detectConflicts(events, formData, excludeId, options = {}) {
  const { plan, evaluatorNames = {} } = options;
  const conflicts = [];
  const sameDate = events.filter((e) => e.date === formData.date && e.id !== excludeId);
  const evaluatorIds = formData.evaluator_ids || [];

  for (const e of sameDate) {
    if (!timeOverlap(formData, e)) continue;
    if (sameField(formData, e)) {
      conflicts.push({ type: "field", event: e, message: `Field "${fieldLabel(formData, e)}" is already booked for ${label(e.type)} at ${e.start_time}` });
    }
    if (formData.responsible_user_id && e.responsible_user_id === formData.responsible_user_id) {
      conflicts.push({ type: "staff", event: e, message: `${e.responsible_name || "Staff"} is already running ${label(e.type)} at ${e.start_time}` });
    }
    for (const id of evaluatorIds.filter((id) => (e.evaluator_ids || []).includes(id))) {
      conflicts.push({ type: "evaluator", event: e, message: `${evaluatorNames[id] || nameForEvaluator(e, id)} is already evaluating ${label(e.type)} at ${e.start_time} on ${e.date}` });
    }
  }

  const capacity = Number(formData.capacity) || 0;
  if (plan?.max_capacity && capacity > plan.max_capacity) {
    conflicts.push({ type: "capacity", message: `Session capacity ${capacity} is more than the tryout's max capacity of ${plan.max_capacity}` });
  }
  const editing = excludeId ? events.find((e) => e.id === excludeId) : null;
  if (capacity && (editing?.registration_count || 0) > capacity) {
    conflicts.push({ type: "capacity", message: `${editing.registration_count} players are already registered — more than the new capacity of ${capacity}` });
  }
  return conflicts;
}

/**
 * Every conflict across a plan's sessions — used by the setup table so a
 * double-booked field, a coach in two sessions at once, or a session over
 * capacity is visible without opening each session.
 */
export function scanSessionConflicts(events = [], plan = null) {
  const conflicts = [];

  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const a = events[i];
      const b = events[j];
      if (a.date !== b.date || !timeOverlap(a, b)) continue;
      if (sameField(a, b)) {
        conflicts.push({ sessionId: a.id, type: "field", message: `"${fieldLabel(a, b)}" is double-booked on ${a.date} at ${a.start_time || ""}` });
      }
      const shared = (a.evaluator_ids || []).filter((id) => (b.evaluator_ids || []).includes(id));
      for (const id of shared) {
        conflicts.push({ sessionId: a.id, type: "evaluator", message: `${nameForEvaluator(a, id)} is evaluating two sessions at once on ${a.date} at ${a.start_time || ""}` });
      }
    }
  }

  events.forEach((e) => {
    if (e.capacity && (e.registration_count || 0) > e.capacity) {
      conflicts.push({ sessionId: e.id, type: "capacity", message: `${e.registration_count} players are registered for the ${e.date} session, over its capacity of ${e.capacity}` });
    }
    if (plan?.start_date && e.date && e.date < plan.start_date) {
      conflicts.push({ sessionId: e.id, type: "window", message: `Session on ${e.date} falls before the tryout window opens (${plan.start_date})` });
    }
    if (plan?.end_date && e.date && e.date > plan.end_date) {
      conflicts.push({ sessionId: e.id, type: "window", message: `Session on ${e.date} falls after the tryout window closes (${plan.end_date})` });
    }
  });

  return conflicts;
}

// ===== Registration: duplicate merge + waitlist =====
export async function registerPlayer({ clubId, eventId, player, guardian, source = "outside", capacity }) {
  const existing = await base44.entities.TryoutRegistration.filter({ tryout_event_id: eventId, guardian_email: guardian.email }, null, 50);
  const dup = existing.find((r) => r.player_name.trim().toLowerCase() === `${player.first_name} ${player.last_name}`.trim().toLowerCase());
  if (dup) return { registration: dup, merged: true };

  const count = existing.length;
  const isWaitlist = capacity && count >= capacity;
  const code = Math.random().toString(36).slice(2, 8).toUpperCase();
  const reg = await base44.entities.TryoutRegistration.create({
    club_id: clubId, tryout_event_id: eventId, player_id: player.id || undefined,
    player_name: `${player.first_name} ${player.last_name}`,
    guardian_name: guardian.name, guardian_email: guardian.email, guardian_phone: guardian.phone || "",
    desired_age_group: player.age_group || "", registered_date: new Date().toISOString().split("T")[0],
    status: isWaitlist ? "waitlist" : "registered", check_in_code: code, source,
  });
  await base44.entities.TryoutEvent.update(eventId, { registration_count: count + 1 });
  return { registration: reg, merged: false, waitlisted: isWaitlist };
}

export async function addInsidePlayer({ clubId, eventId, player }) {
  const guardian = { name: player.guardian_name || "", email: "", phone: "" };
  return registerPlayer({ clubId, eventId, player, guardian, source: "inside" });
}

export async function promoteFromWaitlist(eventId, regId) {
  await base44.entities.TryoutRegistration.update(regId, { status: "registered" });
  return true;
}

// ===== Check-in =====
export async function checkInRegistration(regId) {
  return base44.entities.TryoutRegistration.update(regId, {
    checked_in: true, checked_in_at: new Date().toISOString(), attended: true, status: "checked_in",
  });
}

export async function checkInByCodeOrName(eventId, query) {
  const regs = await base44.entities.TryoutRegistration.filter({ tryout_event_id: eventId });
  const q = query.trim().toLowerCase();
  const reg = regs.find((r) => r.check_in_code?.toLowerCase() === q) ||
    regs.find((r) => r.player_name.trim().toLowerCase() === q);
  if (!reg) throw new Error("No registration found. Check the name or 6-character code.");
  if (reg.checked_in) throw new Error(`${reg.player_name} is already checked in.`);
  return checkInRegistration(reg.id);
}

export function qrCheckInUrl(eventId, code) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${window.location.origin}/TryoutSignup?id=${eventId}&checkin=${code}`)}`;
}

// ===== Quick evaluation =====
const SKILL_KEYS = {
  technical: ["first_touch", "passing", "dribbling_1v1", "finishing", "tackling_defending"],
  tactical: ["attacking_organized", "defending_organized", "pressing", "building_out"],
  mental: ["mindset", "effort", "leadership"],
};

export const SKILL_LABELS = {
  first_touch: "First Touch", passing: "Passing", dribbling_1v1: "Dribbling 1v1",
  finishing: "Finishing", tackling_defending: "Defending",
  attacking_organized: "Attacking", defending_organized: "Defending Org.",
  pressing: "Pressing", building_out: "Build-out",
  mindset: "Mindset", effort: "Effort", leadership: "Leadership",
};

export function computeOverall(scores) {
  const all = [...Object.values(scores.technical || {}), ...Object.values(scores.tactical || {}), ...Object.values(scores.mental || {})];
  return all.length ? Math.round((all.reduce((s, v) => s + v, 0) / all.length) * 10) / 10 : 0;
}

export async function saveEvaluation({ clubId, registration, scores, evaluatorEmail }) {
  const existing = await base44.entities.PlayerEvaluation.filter({ player_id: registration.player_id }, "-evaluation_date", 1).catch(() => []);
  const data = {
    club_id: clubId, player_id: registration.player_id, player_name: registration.player_name,
    evaluator_email: evaluatorEmail, evaluation_date: new Date().toISOString().split("T")[0],
    technical_scores: scores.technical || {}, tactical_scores: scores.tactical || {},
    mental_scores: scores.mental || {}, overall_score: computeOverall(scores), status: "completed",
  };
  const result = existing[0] ? await base44.entities.PlayerEvaluation.update(existing[0].id, data) : await base44.entities.PlayerEvaluation.create(data);
  await base44.entities.TryoutEvent.update(registration.tryout_event_id, {});
  return result;
}

export async function getEvaluationsByEvent(eventId, registrations) {
  const playerIds = registrations.map((r) => r.player_id).filter(Boolean);
  if (!playerIds.length) return {};
  const evals = await base44.entities.PlayerEvaluation.filter({ player_id: { $in: playerIds } }, "-evaluation_date", 500);
  const byPlayer = {};
  evals.forEach((e) => { if (!byPlayer[e.player_id] || new Date(e.evaluation_date) > new Date(byPlayer[e.player_id].evaluation_date)) byPlayer[e.player_id] = e; });
  return byPlayer;
}

// ===== Offers + registration checklist =====
export async function sendOffers({ clubId, plan, team, players }) {
  const invites = players.map((p) => ({
    club_id: clubId, tryout_plan_id: plan.id, player_id: p.id,
    player_name: `${p.first_name} ${p.last_name}`, team_id: team.id, team_name: team.name,
    guardian_id: p.guardian_id, guardian_email: p.guardian_email || "",
    amount_due: team.cost || 0, status: "invited", invited_date: new Date().toISOString(),
  }));
  const created = await base44.entities.TryoutFinalRegistration.bulkCreate(invites);
  await base44.entities.Player.bulkUpdate(players.map((p) => ({ id: p.id, status: "active" })));
  const results = await Promise.all((created || []).map((inv) => emailFinalInvite(inv).then(() => true, () => false)));
  return { created, emailed: results.filter(Boolean).length, failed: results.filter((r) => !r).length };
}

/** Emails a family their personal final-registration link. Throws when it can't be sent. */
export async function emailFinalInvite(invite, { subject, body, guardianName } = {}) {
  if (!invite?.guardian_email) throw new Error(`No family email on file for ${invite?.player_name || "this player"}`);
  const link = `${window.location.origin}/FinalRegistration?invite=${invite.id}`;
  const fill = (t) => t
    .replaceAll("{{guardian_name}}", guardianName || "there")
    .replaceAll("{{player_name}}", invite.player_name || "your player")
    .replaceAll("{{team_name}}", invite.team_name || "the team")
    .replaceAll("{{portal_link}}", link);
  await base44.functions.invoke("sendEmail", {
    to: invite.guardian_email,
    subject: fill(subject || "{{player_name}} has been offered a spot on {{team_name}}"),
    body: fill(body || "Hi {{guardian_name}},\n\nGreat news — {{player_name}} has been offered a spot on {{team_name}}. Accept the offer, sign the waiver and choose how to pay here:\n\n{{portal_link}}\n\nSee you on the field!"),
  });
}

export function registrationChecklist(player, finalReg) {
  return [
    { key: "offer_sent", label: "Offer sent", done: !!finalReg?.invited_date },
    { key: "offer_accepted", label: "Offer accepted", done: ["submitted", "paid"].includes(finalReg?.status) },
    { key: "waiver", label: "Waiver signed", done: !!finalReg?.waiver_accepted },
    { key: "payment", label: "Payment received", done: finalReg?.status === "paid" },
    { key: "rostered", label: "On team roster", done: !!player?.team_id },
  ];
}

// ===== Team plan approval =====
export async function approveTeamPlan(plan, clubId) {
  await base44.entities.TeamPlan.update(plan.id, { status: "active" });
  if (plan.team_id) await base44.entities.Team.update(plan.team_id, { team_plan_id: plan.id, cost: plan.club_dues });
  await base44.entities.AuditLog.create({ club_id: clubId, action: "settings_changed", entity_type: "TeamPlan", entity_id: plan.id, metadata: { summary: `Approved team plan ${plan.team_name}` } }).catch(() => {});
}

export async function rejectTeamPlan(plan, reason, clubId) {
  await base44.entities.TeamPlan.update(plan.id, { status: "draft", notes: `${plan.notes || ""}\n\nRejected: ${reason}`.trim() });
  await base44.entities.AuditLog.create({ club_id: clubId, action: "settings_changed", entity_type: "TeamPlan", entity_id: plan.id, metadata: { summary: `Rejected team plan ${plan.team_name}: ${reason}` } }).catch(() => {});
}