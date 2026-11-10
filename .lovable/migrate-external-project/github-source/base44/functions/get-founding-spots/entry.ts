import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Public lookup: returns how many founding-club spots remain.
// Founding total is the first 10 live clubs. A live club is one onboarded by
// the system owner (club_type "live") — trial clubs don't consume a spot.
// Returns only counts, so it's safe to expose without auth.
const FOUNDING_TOTAL = 10;

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const liveClubs = await base44.asServiceRole.entities.Club.filter({ club_type: "live" });
    const claimed = Array.isArray(liveClubs) ? liveClubs.length : 0;
    const spotsLeft = Math.max(0, FOUNDING_TOTAL - claimed);
    return Response.json({ total: FOUNDING_TOTAL, claimed, spots_left: spotsLeft });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}