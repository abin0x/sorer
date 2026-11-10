/**
 * Shared pricing-calculator logic used by the public Pricing page, the
 * System Console pricing editor and the founding-spots counter.
 *
 * Model:
 *  - Base license per club per year, which includes the first N players.
 *  - Each player above N is billed at the tier's per-player rate.
 *  - One-time onboarding fee: first branch + each additional branch.
 *    Founding clubs get the onboarding fee waived (the only founding perk).
 *  - Six add-on modules with stacking volume discounts.
 */

export const FOUNDING_CLUB_TOTAL = 10;

export const DEFAULT_PRICING_CONFIG = {
  base_license_fee: 1995,
  base_players_included: 250,
  setup_fee_first_branch: 599,
  setup_fee_additional_branch: 199,
  founding_club_total: FOUNDING_CLUB_TOTAL,
  tiers: [
    {
      key: "fairway",
      name: "Standard",
      best_for: "Single branch, under 400 players",
      per_player_cost: 7.95,
      module_discount_percent: 0,
      features: ["Everything in the core platform", "Email support", "Guided onboarding & migration"],
    },
    {
      key: "regatta",
      name: "Pro",
      best_for: "1-3 branches, up to 1,000 players",
      per_player_cost: 6.95,
      module_discount_percent: 10,
      features: ["Everything in Standard", "Priority chat support", "Live onboarding call", "Custom branding & colors"],
    },
    {
      key: "flagship",
      name: "Flagship",
      best_for: "4+ branches or 1,000+ players",
      per_player_cost: 5.95,
      module_discount_percent: 20,
      features: ["Everything in Pro", "Dedicated success manager & phone support", "Concierge migration", "SLA & staff training"],
    },
  ],
  modules: [
    { key: "payments", name: "Storefront & Bookkeeping", list_price: 399, notes: "Unlocks the marketplace, events management, and spiritwear store, plus staff and vendor invoicing. Club dues payments and QuickBooks 2-way sync are included in every plan." },
    { key: "kanban", name: "Kanban & Project Management", list_price: 299, notes: "For internal club operations." },
    { key: "player_dev", name: "Player Development & Support", list_price: 399, notes: "Directly tied to player value." },
    { key: "facilities", name: "Facilities & Field Management", list_price: 199, notes: "For clubs with physical assets to manage." },
    { key: "tournaments", name: "Tournament Management", list_price: 299, notes: "Seasonal or periodic use case." },
    { key: "website", name: "Website & Marketing", list_price: 299, notes: "Entry-level add-on for visibility." },
  ],
  volume_multipliers: [0.9, 0.8, 0.8, 0.7, 0.7, 0.7],
};

/** Plain-language list of supported processors, used in public copy. */
export const PAYMENT_PROCESSORS_TEXT = "Stripe, Square, PayPal, Echelon or another gateway";

export const INCLUDED_IN_EVERY_PLAN = [
  "Registration & tryouts",
  "Messaging & channels",
  "Calendars & scheduling",
  "Club dues payments through your own processor (Stripe, Square, PayPal, Echelon and more), no transaction fees",
  "Two-way QuickBooks Online sync",
];

/** Kept for older imports; tier features now live on each tier in the config. */
export const TIER_FEATURES = Object.fromEntries(DEFAULT_PRICING_CONFIG.tiers.map((t) => [t.key, t.features]));

export function tierFeatures(tier) {
  if (Array.isArray(tier?.features) && tier.features.length) return tier.features;
  return TIER_FEATURES[tier?.key] || [];
}

export const VOLUME_SCHEDULE = [
  { label: "1st module", off: "10% off" },
  { label: "2nd module", off: "20% off" },
  { label: "3rd module", off: "20% off" },
  { label: "4th module", off: "30% off" },
  { label: "5th module", off: "30% off" },
  { label: "6th module", off: "30% off" },
];

const num = (v, d) => (v === null || v === undefined || v === "" || Number.isNaN(Number(v)) ? d : Number(v));

/** Fill any missing settings with defaults so older saved configs still work. */
export function normalizePricingConfig(raw) {
  const d = DEFAULT_PRICING_CONFIG;
  const r = raw || {};
  return {
    ...(r.id ? { id: r.id } : {}),
    base_license_fee: num(r.base_license_fee, d.base_license_fee),
    base_players_included: num(r.base_players_included, d.base_players_included),
    setup_fee_first_branch: num(r.setup_fee_first_branch, d.setup_fee_first_branch),
    setup_fee_additional_branch: num(r.setup_fee_additional_branch, d.setup_fee_additional_branch),
    founding_club_total: Math.max(0, Math.round(num(r.founding_club_total, d.founding_club_total))),
    tiers: (r.tiers?.length ? r.tiers : d.tiers).map((t) => ({ ...t, features: tierFeatures(t) })),
    modules: r.modules?.length ? r.modules : d.modules,
    volume_multipliers: r.volume_multipliers?.length ? r.volume_multipliers : d.volume_multipliers,
  };
}

/** One-time onboarding fee: first branch + each additional branch. */
export function setupFeeFor(config, branches) {
  const c = normalizePricingConfig(config);
  const b = Math.max(0, Math.floor(Number(branches) || 0));
  if (b === 0) return 0;
  return c.setup_fee_first_branch + (b - 1) * c.setup_fee_additional_branch;
}

export function suggestTierKey(branches, players) {
  const b = Number(branches) || 0;
  const p = Number(players) || 0;
  if (b >= 4 || p > 1000) return "flagship";
  if (b >= 2 || p >= 400) return "regatta";
  return "fairway";
}

export function calculatePricing(config, { branches = 1, players = 0, tierKey, moduleKeys = [], waiveSetup = false }) {
  const c = normalizePricingConfig(config);
  const tier = c.tiers.find((t) => t.key === tierKey) || c.tiers[0];

  const setupTotalBeforeWaiver = setupFeeFor(c, branches);
  const setupTotal = waiveSetup ? 0 : setupTotalBeforeWaiver;
  const setupWaived = waiveSetup && setupTotalBeforeWaiver > 0;

  const playerCount = Math.max(0, Number(players) || 0);
  const baseLicense = c.base_license_fee;
  const includedPlayers = c.base_players_included;
  const extraPlayers = Math.max(0, playerCount - includedPlayers);
  const playerTotal = extraPlayers * (Number(tier.per_player_cost) || 0);

  const selected = c.modules
    .filter((m) => moduleKeys.includes(m.key))
    .sort((a, b) => (b.list_price || 0) - (a.list_price || 0));
  const mult = c.volume_multipliers;

  let moduleListSubtotal = 0;
  const moduleBreakdown = selected.map((m, i) => {
    const multiplier = mult[Math.min(i, mult.length - 1)];
    const price = (m.list_price || 0) * multiplier;
    moduleListSubtotal += price;
    return { ...m, multiplier, price, discountPercent: Math.round((1 - multiplier) * 100) };
  });

  const discountPercent = Number(tier.module_discount_percent) || 0;
  const moduleTotal = moduleListSubtotal * (1 - discountPercent / 100);
  const tierDiscountAmount = moduleListSubtotal - moduleTotal;
  const volumeSavings = selected.reduce((sum, m, i) => {
    if (i === 0) return sum;
    const full = m.list_price || 0;
    return sum + (full - full * mult[Math.min(i, mult.length - 1)]);
  }, 0);
  const totalSavings = volumeSavings + tierDiscountAmount;

  const ongoingAnnual = baseLicense + playerTotal + moduleTotal;
  const grandTotal = setupTotal + ongoingAnnual;

  return { tier, baseLicense, includedPlayers, extraPlayers, setupTotal, setupTotalBeforeWaiver, setupWaived, playerTotal, moduleBreakdown, moduleListSubtotal, moduleTotal, discountPercent, tierDiscountAmount, volumeSavings, totalSavings, grandTotal, ongoingAnnual };
}
