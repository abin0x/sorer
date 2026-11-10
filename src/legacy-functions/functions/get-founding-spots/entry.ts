// @ts-nocheck
import { createClientFromRequest } from '@/legacy-functions/_sdk';

// Public lookup: returns how many founding-club spots remain.
// The total is set by the app owner in System Console → Billing → Pricing.
// A live club is one onboarded by the system owner (club_type "live").
// Returns only counts, so it's safe to expose without auth.
const DEFAULT_TOTAL = 10;

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const configs = await base44.asServiceRole.entities.PricingConfig.list().catch(() => []);
    const raw = Array.isArray(configs) ? configs[0]?.founding_club_total : undefined;
    const total = Number.isFinite(Number(raw)) && raw !== null ? Math.max(0, Math.round(Number(raw))) : DEFAULT_TOTAL;
    const liveClubs = await base44.asServiceRole.entities.Club.filter({ club_type: "live" });
    const claimed = Array.isArray(liveClubs) ? liveClubs.length : 0;
    return Response.json({ total, claimed, spots_left: Math.max(0, total - claimed) });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
