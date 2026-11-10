/**
 * Shared pricing-calculator logic: default rate tables and the formula used
 * by both the public Pricing page and the SaaSAdmin Billing tab.
 *
 * Source of truth for public numbers: 3 tiers, 6 add-on modules.
 * Core platform (registration, tryouts, messaging, calendars, and club dues
 * payments) is included in every tier — the 6 modules below are add-ons.
 * The Storefront & Bookkeeping module (key: "payments") unlocks the marketplace,
 * events management, and spiritwear store on top of QuickBooks sync.
 *
 * Volume discount schedule (applied per module, most expensive first):
 *   1st module: 10% off · 2nd: 20% off · 3rd: 20% off · 4th-6th: 30% off
 * Then the tier's module_discount_percent is applied to the subtotal.
 */

export const FOUNDING_CLUB_TOTAL = 10;

/** Founding per-player rate lock. Founding clubs keep their rates through this date. */
export const FOUNDING_OFFER_ENDS = "January 1, 2029";

export const DEFAULT_PRICING_CONFIG = {
  tiers: [
    {
      key: "fairway",
      name: "Standard",
      best_for: "Single branch, under 400 players",
      setup_fee: 299,
      per_player_cost: 4.5,
      module_discount_percent: 0,
    },
    {
      key: "regatta",
      name: "Pro",
      best_for: "1-3 branches, up to 1,000 players",
      setup_fee: 199,
      per_player_cost: 3.75,
      module_discount_percent: 10,
    },
    {
      key: "flagship",
      name: "Flagship",
      best_for: "4+ branches or 1,000+ players",
      setup_fee: 149,
      per_player_cost: 2.95,
      module_discount_percent: 20,
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
  // 1st 10% off, 2nd 20% off, 3rd 20% off, 4th-6th 30% off.
  volume_multipliers: [0.9, 0.8, 0.8, 0.7, 0.7, 0.7],
};

/** What's included in every plan, regardless of tier. */
export const INCLUDED_IN_EVERY_PLAN = [
  "Registration & tryouts",
  "Messaging & channels",
  "Calendars & scheduling",
  "Club dues payments (your own Stripe, no transaction fees)",
  "Two-way QuickBooks Online sync",
];

/** Per-tier differentiators shown on the tier cards. */
export const TIER_FEATURES = {
  fairway: [
    "Everything in the core platform",
    "Email support",
    "Guided self-serve setup",
  ],
  regatta: [
    "Everything in Standard",
    "Priority support",
    "Live onboarding call",
    "Custom branding & colors",
  ],
  flagship: [
    "Everything in Pro",
    "Dedicated success manager",
    "Concierge migration",
    "SLA & staff training",
  ],
};

/** Volume discount schedule for add-on modules (matches volume_multipliers). */
export const VOLUME_SCHEDULE = [
  { label: "1st module", off: "10% off" },
  { label: "2nd module", off: "20% off" },
  { label: "3rd module", off: "20% off" },
  { label: "4th module", off: "30% off" },
  { label: "5th module", off: "30% off" },
  { label: "6th module", off: "30% off" },
];

/** Suggest a tier key based on branch + player counts, matching the tier rules:
 *  Standard  = single branch, <400 players
 *  Pro       = 1-3 branches, up to 1,000 players
 *  Flagship  = 4+ branches or 1,000+ players */
export function suggestTierKey(branches, players) {
  const b = Number(branches) || 0;
  const p = Number(players) || 0;
  if (b >= 4 || p > 1000) return "flagship";
  if (b >= 2 || p >= 400) return "regatta";
  return "fairway";
}

export function calculatePricing(config, { branches = 1, players = 0, tierKey, moduleKeys = [], waiveSetup = false }) {
  const tiers = config?.tiers?.length ? config.tiers : DEFAULT_PRICING_CONFIG.tiers;
  const modules = config?.modules?.length ? config.modules : DEFAULT_PRICING_CONFIG.modules;
  const multipliers = config?.volume_multipliers?.length ? config.volume_multipliers : DEFAULT_PRICING_CONFIG.volume_multipliers;

  const tier = tiers.find((t) => t.key === tierKey) || tiers[0];
  const setupTotalBeforeWaiver = (tier.setup_fee || 0) * (Number(branches) || 0);
  const setupTotal = waiveSetup ? 0 : setupTotalBeforeWaiver;
  const setupWaived = waiveSetup && setupTotalBeforeWaiver > 0;
  const playerTotal = (tier.per_player_cost || 0) * (Number(players) || 0);

  const selected = modules
    .filter((m) => moduleKeys.includes(m.key))
    .sort((a, b) => (b.list_price || 0) - (a.list_price || 0));

  let moduleListSubtotal = 0;
  const moduleBreakdown = selected.map((m, i) => {
    const multiplier = multipliers[Math.min(i, multipliers.length - 1)];
    const price = (m.list_price || 0) * multiplier;
    moduleListSubtotal += price;
    return { ...m, multiplier, price, discountPercent: Math.round((1 - multiplier) * 100) };
  });

  const discountPercent = tier.module_discount_percent || 0;
  const moduleTotal = moduleListSubtotal * (1 - discountPercent / 100);
  const tierDiscountAmount = moduleListSubtotal - moduleTotal;
  const volumeSavings = selected.reduce((sum, m, i) => {
    if (i === 0) return sum;
    const full = m.list_price || 0;
    const mult = multipliers[Math.min(i, multipliers.length - 1)];
    return sum + (full - full * mult);
  }, 0);
  const totalSavings = volumeSavings + tierDiscountAmount;

  const grandTotal = setupTotal + playerTotal + moduleTotal;
  const ongoingAnnual = playerTotal + moduleTotal;

  return { tier, setupTotal, setupTotalBeforeWaiver, setupWaived, playerTotal, moduleBreakdown, moduleListSubtotal, moduleTotal, discountPercent, tierDiscountAmount, volumeSavings, totalSavings, grandTotal, ongoingAnnual };
}