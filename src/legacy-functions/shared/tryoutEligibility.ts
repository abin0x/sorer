// @ts-nocheck
// Shared tryout eligibility, capacity and fee rules.
//
// One source of truth for three callers so they can never disagree about who
// may register or what they owe:
//   · functions/tryout-registration  — the public parent flow
//   · functions/tryout-pool          — the season rollover player pool
//   · functions/club-stripe-webhook  — payment confirmation

export const todayIso = (): string => new Date().toISOString().slice(0, 10);

const shiftDays = (iso: string, days: number): string => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

/** Statuses that still occupy a session spot. `pooled` is not one of them —
 *  a pooled player has not picked a session yet. */
export const OCCUPYING_STATUSES = ['registered', 'waitlist', 'pending_payment', 'checked_in', 'no_show'];

export const countOccupying = (regs: any[]): number =>
  (regs || []).filter((r) => OCCUPYING_STATUSES.includes(r.status)).length;

export const sessionCapacity = (event: any): number =>
  Number(event?.capacity || event?.expected_attendance || 0);

/** Remaining spots for one session, plus whether it is full (waitlist). */
export function sessionSpots(event: any, regs: any[]) {
  const capacity = sessionCapacity(event);
  const taken = countOccupying(regs);
  return {
    capacity,
    taken,
    spots_left: capacity > 0 ? Math.max(0, capacity - taken) : null,
    waitlist: capacity > 0 && taken >= capacity,
  };
}

/** The season age-group row whose birth-date window contains this player. */
export function ageGroupFor(dateOfBirth: string, ageGroups: any[]) {
  if (!dateOfBirth) return null;
  return (ageGroups || []).find(
    (a) => (!a.birth_date_start || dateOfBirth >= a.birth_date_start)
      && (!a.birth_date_end || dateOfBirth <= a.birth_date_end),
  ) || null;
}

/** Eligibility of one player for one tryout, from their birth date and the
 *  season's age rules. Gender is only enforced when both sides state one. */
export function eligibilityFor(player: any, plan: any, ageGroups: any[]) {
  if (!player?.date_of_birth) return { eligible: false, reason: 'Date of birth is required' };
  // A season with no age rules configured cannot be checked — never block a
  // family on missing club setup; the season's rules take over once they exist.
  if (!ageGroups?.length) {
    return { eligible: true, age_group: plan?.age_group || '', reason: '', unverified: true };
  }
  const age = ageGroupFor(player.date_of_birth, ageGroups);
  if (!age) return { eligible: false, reason: 'No age group matches this date of birth for the season' };
  if (plan?.age_group && age.age_group !== plan.age_group) {
    return { eligible: false, reason: `${age.age_group} players are not eligible for the ${plan.age_group} tryout` };
  }
  if (plan?.gender && player.gender && plan.gender !== player.gender) {
    return { eligible: false, reason: `This tryout is ${plan.gender} only` };
  }
  return { eligible: true, age_group: age.age_group, reason: '' };
}

/** Whether families can still register, and why not when they can't. */
export function registrationWindow(plan: any, today = todayIso()) {
  if (!plan) return { open: false, reason: 'Tryout not found' };
  if (['archived', 'rosters_finalized', 'evaluation', 'offers_out'].includes(plan.status)) {
    return { open: false, reason: 'Registration for this tryout is closed' };
  }
  if (plan.registration_open_date && today < plan.registration_open_date) {
    return { open: false, reason: `Registration opens on ${plan.registration_open_date}` };
  }
  if (plan.registration_close_date && today > plan.registration_close_date) {
    return { open: false, reason: `Registration closed on ${plan.registration_close_date}` };
  }
  return { open: true, reason: '' };
}

/** How long a family may still reschedule or cancel a spot: the tryout's own
 *  change deadline when set, otherwise the day before their session. */
export function changeWindow(plan: any, session: any, today = todayIso()) {
  const deadline = plan?.change_deadline || (session?.date ? shiftDays(session.date, -1) : null);
  if (!deadline) return { allowed: true, deadline: null };
  return { allowed: today <= deadline, deadline };
}

const isPaid = (registration: any): boolean =>
  ['paid', 'refunded'].includes(registration?.payment_status) && Number(registration?.amount_paid || 0) > 0;

/** Refund due when a paid spot is cancelled inside the window. */
export function refundOnCancel(registration: any, plan: any, session: any, today = todayIso()) {
  const window = changeWindow(plan, session, today);
  const paid = Number(registration?.amount_paid || 0);
  if (!window.allowed) return { due: false, amount: 0, reason: 'The change window for this session has passed' };
  if (!isPaid(registration)) return { due: false, amount: 0, reason: 'No payment was collected for this spot' };
  return { due: true, amount: Math.max(0, paid - Number(registration?.refund_amount || 0)), reason: '' };
}

export const tryoutFee = (plan: any): number => Number(plan?.tryout_fee || 0);

/** A promo code is usable when it is active, in date, applies to tryouts and
 *  the subtotal clears its minimum. */
export function promoUsable(promo: any, subtotal: number, today = todayIso()) {
  if (!promo) return { valid: false, reason: 'Code not found' };
  if (promo.is_active === false) return { valid: false, reason: 'This code is no longer active' };
  if (!['tryout_event', 'all'].includes(promo.applies_to || 'all')) {
    return { valid: false, reason: 'This code cannot be used for tryouts' };
  }
  if (promo.valid_from && today < promo.valid_from) return { valid: false, reason: 'This code is not valid yet' };
  if (promo.valid_until && today > promo.valid_until) return { valid: false, reason: 'This code has expired' };
  if (promo.max_uses > 0 && Number(promo.used_count || 0) >= promo.max_uses) {
    return { valid: false, reason: 'This code has reached its limit' };
  }
  if (promo.min_amount > 0 && subtotal < promo.min_amount) {
    return { valid: false, reason: `Requires a subtotal of $${promo.min_amount}` };
  }
  return { valid: true, reason: '' };
}

/** Discount for a promo against a subtotal, never more than the subtotal. */
export function promoDiscount(promo: any, subtotal: number, today = todayIso()) {
  const check = promoUsable(promo, subtotal, today);
  if (!check.valid) return { discount: 0, error: check.reason };
  const value = Number(promo.discount_value || 0);
  const raw = promo.discount_type === 'fixed' ? value : (subtotal * value) / 100;
  return { discount: Math.min(Math.round(raw * 100) / 100, subtotal), error: '' };
}

export const money = (n: number): number => Math.round(Number(n || 0) * 100) / 100;

/** Splits a discount across registrations so each one carries its own share
 *  (and therefore its own amount in the payment ledger). */
export function splitDiscount(fees: number[], discount: number): number[] {
  const subtotal = fees.reduce((s, f) => s + f, 0);
  if (!discount || subtotal <= 0) return fees.map(() => 0);
  return fees.map((f) => money((discount * f) / subtotal));
}