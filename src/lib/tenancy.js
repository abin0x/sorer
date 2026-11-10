import { base44 } from "@/api/base44Client";

/**
 * Multi-tenancy helpers. Every club-scoped record carries a `club_id` matching
 * the creating user's `club_id`; RLS enforces isolation server-side.
 */

// A SaaS super admin has built-in role "admin" OR the is_super_admin flag.
export function isSuperAdmin(user) {
  if (!user) return false;
  return user.is_super_admin === true || user.role === "admin";
}

export function getClubId(user) {
  if (!user) return null;
  return user.club_id || null;
}

export function hasClub(user) {
  return !!getClubId(user);
}

// Fetch the current user's club record (null for super admins / not yet onboarded).
export async function getCurrentClub(user) {
  const id = getClubId(user);
  if (!id) return null;
  try {
    return await base44.entities.Club.get(id);
  } catch {
    return null;
  }
}

// Stamp a record with the current user's club_id before creating it.
export function stampClubId(user, record = {}) {
  if (user?.club_id) record.club_id = user.club_id;
  return record;
}

// Whether a club is within its plan limits for a given resource count.
export function withinLimit(club, resource, currentCount) {
  if (!club) return true;
  const cap = club[`max_${resource}`];
  if (cap == null) return true;
  return currentCount < cap;
}