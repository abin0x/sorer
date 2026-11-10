import { ROLES } from "@/lib/rbac";

// Roles that require a dedicated data-collection onboarding step after accepting an invite.
// Roles not listed here become active immediately on acceptance (no extra step needed).
export const ONBOARDING_ROLES = [
  ROLES.PARENT_GUARDIAN,
  ROLES.COACH,
  ROLES.BRANCH_DIRECTOR,
  ROLES.CLUB_ADMIN,
  ROLES.CLUB_DIRECTOR,
  ROLES.BOOKKEEPER,
  ROLES.PLATFORM_DIRECTOR,
];

export const ROLE_ONBOARD_PATH = {
  [ROLES.PARENT_GUARDIAN]: "/onboard/parent",
  [ROLES.COACH]: "/onboard/coach",
  [ROLES.BRANCH_DIRECTOR]: "/onboard/branch-director",
  [ROLES.CLUB_ADMIN]: "/onboard/club-admin",
  [ROLES.CLUB_DIRECTOR]: "/onboard/club-director",
  [ROLES.BOOKKEEPER]: "/onboard/bookkeeper",
  [ROLES.PLATFORM_DIRECTOR]: "/onboard/platform-director",
};

export function needsOnboarding(role) {
  return ONBOARDING_ROLES.includes(role);
}