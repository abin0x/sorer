// Shared promo-code validation. Used by create-club-checkout (to apply the
// discount at Stripe Checkout) and validate-promo-code (to preview the
// discount in the UI before checkout). Returns a normalized result so both
// callers can act on the same truth.
//
// sourceType values: "registration" | "tryout_event" | "club_event"
export async function validatePromoCode(base44, clubId, code, sourceType, baseAmount) {
  if (!clubId || !code) return { valid: false, error: "Missing code" };
  const svc = base44.asServiceRole;
  const normalized = String(code).trim().toUpperCase();
  const matches = await svc.entities.PromoCode.filter({ club_id: clubId, code: normalized });
  const promo = matches?.[0];
  if (!promo) return { valid: false, error: "That code wasn't found." };
  if (!promo.is_active) return { valid: false, error: "That code is no longer active." };

  const today = new Date().toISOString().split("T")[0];
  if (promo.valid_from && today < promo.valid_from) return { valid: false, error: "That code isn't available yet." };
  if (promo.valid_until && today > promo.valid_until) return { valid: false, error: "That code has expired." };
  if (promo.max_uses > 0 && (promo.used_count || 0) >= promo.max_uses) return { valid: false, error: "That code has reached its usage limit." };
  if (promo.applies_to !== "all" && promo.applies_to !== sourceType) return { valid: false, error: "That code doesn't apply to this purchase." };
  if (promo.min_amount > 0 && (baseAmount || 0) < promo.min_amount) return { valid: false, error: `This code requires a minimum of $${promo.min_amount}.` };

  let discount = 0;
  if (promo.discount_type === "percent") {
    discount = Math.round(((baseAmount || 0) * (promo.discount_value || 0)) / 100 * 100) / 100;
  } else {
    discount = Math.min(promo.discount_value || 0, baseAmount || 0);
  }
  const newAmount = Math.max(0, (baseAmount || 0) - discount);
  return {
    valid: true,
    promo_id: promo.id,
    code: promo.code,
    discount_type: promo.discount_type,
    discount_value: promo.discount_value,
    discount_amount: discount,
    new_amount: newAmount,
  };
}

// Increment a promo code's used_count (called after a successful checkout
// session is created). Best-effort — a failed increment shouldn't block checkout.
export async function incrementPromoUsage(base44, promoId) {
  if (!promoId) return;
  try {
    const svc = base44.asServiceRole;
    const promo = await svc.entities.PromoCode.get(promoId);
    if (promo) {
      await svc.entities.PromoCode.update(promoId, { used_count: (promo.used_count || 0) + 1 });
    }
  } catch (e) {
    console.error("incrementPromoUsage error:", e);
  }
}