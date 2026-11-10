/**
 * Robust RBAC Permissions System
 * 
 * Hierarchy: CLUB > BRANCH > PROGRAM > TEAM > FAMILY > PLAYER
 * 
 * Permission model: module:action
 * - Modules: club, branch, program, team, family, player, recruiting, registration, finance, users, settings, reports
 * - Actions: view, create, edit, delete, approve, manage, invite
 * 
 * Roles:
 * - admin: Full system access (platform-level)
 * - club_director: Club-wide management (all branches, programs, teams)
 * - club_admin: Club-wide administration (users, settings, finance)
 * - branch_director: Branch-level management (own branch only)
 * - branch_admin: Branch-level administration (own branch only)
 * - bookkeeper: Financial focus (registration payments, expenses, reports)
 * - project_manager: Program/project focus (programs, tasks, teams)
 * - coach: Team & player focus (own teams, roster, evaluations)
 * - parent_guardian: Family focus (own children, registrations, payments)
 * - player: Self focus (own profile, team, schedule)
 */

// ============= SYSTEM ROLES (cross-tenant, span ALL clubs) =============
// Per the multi-tenant RBAC design: system roles are the exception, not the rule.
// They are granted independently of any club membership (user.system_role), and
// their permissions are NEVER merged with club-scoped custom_role permissions —
// a system role either grants full/partial cross-tenant access, or it grants nothing.
export const SYSTEM_ROLES = {
  SYSTEM_OWNER: "system_owner",
  SYSTEM_ADMIN: "system_admin",
  SYSTEM_SUPPORT: "system_support",
  SYSTEM_BILLING: "system_billing",
};

export const SYSTEM_ROLE_LABELS = {
  [SYSTEM_ROLES.SYSTEM_OWNER]: "System Owner",
  [SYSTEM_ROLES.SYSTEM_ADMIN]: "System Admin",
  [SYSTEM_ROLES.SYSTEM_SUPPORT]: "System Support",
  [SYSTEM_ROLES.SYSTEM_BILLING]: "System Billing",
};

export const SYSTEM_ROLE_DESCRIPTIONS = {
  [SYSTEM_ROLES.SYSTEM_OWNER]: "Full system access across all clubs — billing, feature flags, everything",
  [SYSTEM_ROLES.SYSTEM_ADMIN]: "Manage clubs and users across the platform, including audited impersonation",
  [SYSTEM_ROLES.SYSTEM_SUPPORT]: "Read-only cross-club access plus impersonation for troubleshooting",
  [SYSTEM_ROLES.SYSTEM_BILLING]: "Cross-club invoices, plans, and payments",
};

/** Get the current user's system role, or null if they don't have one. */
export function getSystemRole(user) {
  return user?.system_role || null;
}

/** True if the user holds ANY system-level role (spans all clubs). */
export function isSystemUser(user) {
  return !!getSystemRole(user);
}

/** True only for the top system role — full unrestricted cross-tenant access. */
export function isSystemOwner(user) {
  return getSystemRole(user) === SYSTEM_ROLES.SYSTEM_OWNER || user?.is_super_admin === true;
}

// ============= ROLES (club-scoped) =============
export const ROLES = {
  MASTER_ADMIN: "master_admin",
  ADMIN: "admin",
  CLUB_DIRECTOR: "club_director",
  CLUB_ADMIN: "club_admin",
  BRANCH_DIRECTOR: "branch_director",
  BRANCH_ADMIN: "branch_admin",
  BOOKKEEPER: "bookkeeper",
  PROJECT_MANAGER: "project_manager",
  COACH: "coach",
  TEAM_MANAGER: "team_manager",
  FACILITY_MANAGER: "facility_manager",
  PLATFORM_DIRECTOR: "platform_director",
  TRYOUT_LEAD: "tryout_lead",
  MARKETING_DIRECTOR: "marketing_director",
  AGE_GROUP_DIRECTOR: "age_group_director",
  PARENT_GUARDIAN: "parent_guardian",
  PLAYER: "player",
};

export const ROLE_LABELS = {
  [ROLES.MASTER_ADMIN]: "Master Admin",
  [ROLES.ADMIN]: "Admin",
  [ROLES.CLUB_DIRECTOR]: "Club Director",
  [ROLES.CLUB_ADMIN]: "Club Admin",
  [ROLES.BRANCH_DIRECTOR]: "Branch Director",
  [ROLES.BRANCH_ADMIN]: "Branch Admin",
  [ROLES.BOOKKEEPER]: "Bookkeeper",
  [ROLES.PROJECT_MANAGER]: "Project Manager",
  [ROLES.COACH]: "Coach",
  [ROLES.TEAM_MANAGER]: "Team Manager",
  [ROLES.FACILITY_MANAGER]: "Facility Manager",
  [ROLES.PLATFORM_DIRECTOR]: "Platform Director",
  [ROLES.TRYOUT_LEAD]: "Tryout Lead",
  [ROLES.MARKETING_DIRECTOR]: "Marketing Director",
  [ROLES.AGE_GROUP_DIRECTOR]: "Age Group Director",
  [ROLES.PARENT_GUARDIAN]: "Parent/Guardian",
  [ROLES.PLAYER]: "Player",
};

export const ROLE_DESCRIPTIONS = {
  [ROLES.MASTER_ADMIN]: "Platform owner — full control including plugin activation/deactivation and all system settings",
  [ROLES.ADMIN]: "Full system access including user management and platform settings",
  [ROLES.CLUB_DIRECTOR]: "Club-wide management — all branches, programs, teams, and recruiting",
  [ROLES.CLUB_ADMIN]: "Club-wide administration — users, settings, finance, and reporting",
  [ROLES.BRANCH_DIRECTOR]: "Branch-level management — programs, teams, and recruiting within assigned branch",
  [ROLES.BRANCH_ADMIN]: "Branch-level administration — registrations, schedules, and operations within assigned branch",
  [ROLES.BOOKKEEPER]: "Financial focus — registration payments, expenses, and financial reports",
  [ROLES.PROJECT_MANAGER]: "Program focus — manage programs, tasks, timelines, and team assignments",
  [ROLES.COACH]: "Team focus — own teams, roster, evaluations, and tryout management",
  [ROLES.TEAM_MANAGER]: "Team operations focus — roster logistics, communication, and scheduling for assigned teams",
  [ROLES.FACILITY_MANAGER]: "Facility focus — manage facilities, fields, field bookings, and training schedules across all branches",
  [ROLES.PLATFORM_DIRECTOR]: "Platform-level oversight — visibility of an entire competitive platform (e.g. MLS-Next, Girls Academy) within a branch",
  [ROLES.TRYOUT_LEAD]: "Tryout Lead — owns tryout plans, events, staff assignment, and player communication",
  [ROLES.MARKETING_DIRECTOR]: "Marketing focus — event advertising, web & social promotion for tryouts and programs",
  [ROLES.AGE_GROUP_DIRECTOR]: "Age-group focus — oversees teams, tryouts, and rosters for one age group across the whole club",
  [ROLES.PARENT_GUARDIAN]: "Family focus — own children, registrations, payments, and schedules",
  [ROLES.PLAYER]: "Self focus — own profile, team info, schedule, and payment status",
};

export const ROLE_COLORS = {
  [ROLES.MASTER_ADMIN]: "bg-gradient-to-r from-rose-100 to-amber-100 text-rose-800 dark:from-rose-900 dark:to-amber-900 dark:text-rose-200 border border-rose-200",
  [ROLES.ADMIN]: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  [ROLES.CLUB_DIRECTOR]: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300",
  [ROLES.CLUB_ADMIN]: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  [ROLES.BRANCH_DIRECTOR]: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  [ROLES.BRANCH_ADMIN]: "bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300",
  [ROLES.BOOKKEEPER]: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  [ROLES.PROJECT_MANAGER]: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300",
  [ROLES.COACH]: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  [ROLES.TEAM_MANAGER]: "bg-lime-100 text-lime-700 dark:bg-lime-900 dark:text-lime-300",
  [ROLES.FACILITY_MANAGER]: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  [ROLES.PLATFORM_DIRECTOR]: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900 dark:text-fuchsia-300",
  [ROLES.TRYOUT_LEAD]: "bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300",
  [ROLES.MARKETING_DIRECTOR]: "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300",
  [ROLES.AGE_GROUP_DIRECTOR]: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  [ROLES.PARENT_GUARDIAN]: "bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300",
  [ROLES.PLAYER]: "bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300",
};

// ============= PERMISSION CATALOG =============
// Organized by module following the CLUB > BRANCH > PROGRAM > TEAM > FAMILY > PLAYER hierarchy

export const PERMISSION_MODULES = [
  {
    key: "club",
    label: "Club",
    description: "Club-wide settings and oversight",
    hierarchyLevel: 1,
    permissions: [
      { key: "club:view", label: "View Club Overview" },
      { key: "club:manage", label: "Manage Club Settings" },
    ],
  },
  {
    key: "branch",
    label: "Branch",
    description: "Branch locations and leadership",
    hierarchyLevel: 2,
    permissions: [
      { key: "branch:view", label: "View Branches" },
      { key: "branch:create", label: "Create Branches" },
      { key: "branch:edit", label: "Edit Branches" },
      { key: "branch:delete", label: "Delete Branches" },
    ],
  },
  {
    key: "program",
    label: "Program",
    description: "Programs, tasks, and project management",
    hierarchyLevel: 3,
    permissions: [
      { key: "program:view", label: "View Programs" },
      { key: "program:create", label: "Create Programs" },
      { key: "program:edit", label: "Edit Programs" },
      { key: "program:delete", label: "Delete Programs" },
      { key: "program:approve", label: "Approve Programs" },
    ],
  },
  {
    key: "team",
    label: "Team",
    description: "Teams, rosters, and coaching assignments",
    hierarchyLevel: 4,
    permissions: [
      { key: "team:view", label: "View Teams" },
      { key: "team:create", label: "Create Teams" },
      { key: "team:edit", label: "Edit Teams" },
      { key: "team:delete", label: "Delete Teams" },
    ],
  },
  {
    key: "family",
    label: "Family",
    description: "Guardians and family management",
    hierarchyLevel: 5,
    permissions: [
      { key: "family:view", label: "View Families" },
      { key: "family:edit", label: "Edit Family Info" },
    ],
  },
  {
    key: "player",
    label: "Player",
    description: "Player profiles and enrollment",
    hierarchyLevel: 6,
    permissions: [
      { key: "player:view", label: "View Players" },
      { key: "player:create", label: "Create Players" },
      { key: "player:edit", label: "Edit Players" },
      { key: "player:delete", label: "Delete Players" },
    ],
  },
  {
    key: "recruiting",
    label: "Player Recruitment",
    description: "Tryouts, evaluations, and offers",
    hierarchyLevel: 3,
    permissions: [
      { key: "recruiting:view", label: "View Recruiting" },
      { key: "recruiting:create", label: "Create Tryouts/Evaluations" },
      { key: "recruiting:edit", label: "Edit Recruiting" },
      { key: "recruiting:approve", label: "Approve Offers" },
    ],
  },
  {
    key: "registration",
    label: "Registration",
    description: "Player registrations and approvals",
    hierarchyLevel: 5,
    permissions: [
      { key: "registration:view", label: "View Registrations" },
      { key: "registration:edit", label: "Edit Registrations" },
      { key: "registration:approve", label: "Approve Registrations" },
    ],
  },
  {
    key: "finance",
    label: "Finance",
    description: "Payments, expenses, and financial reports",
    hierarchyLevel: 1,
    permissions: [
      { key: "finance:view", label: "View Finances" },
      { key: "finance:edit", label: "Edit Payments/Expenses" },
      { key: "finance:approve", label: "Approve Expenses" },
      { key: "finance:manage_processors", label: "Manage Payment Processors" },
    ],
  },
  {
    key: "users",
    label: "Users",
    description: "User management and invitations",
    hierarchyLevel: 1,
    permissions: [
      { key: "users:view", label: "View Users" },
      { key: "users:invite", label: "Invite Users" },
      { key: "users:edit", label: "Edit Users" },
      { key: "users:edit_roles", label: "Edit User Roles" },
      { key: "users:delete", label: "Delete Users" },
    ],
  },
  {
    key: "settings",
    label: "Settings",
    description: "System settings and configuration",
    hierarchyLevel: 1,
    permissions: [
      { key: "settings:view", label: "View Settings" },
      { key: "settings:edit", label: "Edit Settings" },
    ],
  },
  {
    key: "facility",
    label: "Facility Management",
    description: "Facilities, fields, and field bookings",
    hierarchyLevel: 2,
    permissions: [
      { key: "facility:view", label: "View Facilities" },
      { key: "facility:create", label: "Create Facilities/Fields" },
      { key: "facility:edit", label: "Edit Facilities/Fields" },
      { key: "facility:delete", label: "Delete Facilities/Fields" },
      { key: "facility:book", label: "Manage Field Bookings" },
    ],
  },
  {
    key: "reports",
    label: "Reports",
    description: "Analytics and reporting",
    hierarchyLevel: 1,
    permissions: [
      { key: "reports:view", label: "View Reports" },
      { key: "reports:export", label: "Export Reports" },
    ],
  },
];

// All permission keys flattened for convenience
export const ALL_PERMISSIONS = PERMISSION_MODULES.flatMap((m) => m.permissions.map((p) => p.key));

// ============= DEFAULT ROLE PERMISSIONS =============

export const DEFAULT_ROLE_PERMISSIONS = {
  [ROLES.MASTER_ADMIN]: ALL_PERMISSIONS,

  [ROLES.ADMIN]: ALL_PERMISSIONS,

  [ROLES.CLUB_DIRECTOR]: [
    "club:view", "club:manage",
    "facility:view", "facility:create", "facility:edit", "facility:delete", "facility:book",
    "branch:view", "branch:create", "branch:edit", "branch:delete",
    "program:view", "program:create", "program:edit", "program:delete", "program:approve",
    "team:view", "team:create", "team:edit", "team:delete",
    "family:view", "family:edit",
    "player:view", "player:create", "player:edit", "player:delete",
    "recruiting:view", "recruiting:create", "recruiting:edit", "recruiting:approve",
    "registration:view", "registration:edit", "registration:approve",
    "finance:view", "finance:edit", "finance:approve", "finance:manage_processors",
    "users:view", "users:invite", "users:edit",
    "settings:view",
    "reports:view", "reports:export",
  ],

  [ROLES.CLUB_ADMIN]: [
    "club:view",
    "facility:view", "facility:create", "facility:edit", "facility:delete", "facility:book",
    "branch:view", "branch:create", "branch:edit",
    "program:view", "program:create", "program:edit", "program:approve",
    "team:view", "team:create", "team:edit",
    "family:view", "family:edit",
    "player:view", "player:create", "player:edit",
    "recruiting:view", "recruiting:create", "recruiting:edit", "recruiting:approve",
    "registration:view", "registration:edit", "registration:approve",
    "finance:view", "finance:edit", "finance:approve", "finance:manage_processors",
    "users:view", "users:invite", "users:edit", "users:edit_roles", "users:delete",
    "settings:view", "settings:edit",
    "reports:view", "reports:export",
  ],

  [ROLES.BRANCH_DIRECTOR]: [
    "branch:view",
    "facility:view", "facility:book",
    "program:view", "program:create", "program:edit", "program:approve",
    "team:view", "team:create", "team:edit",
    "family:view", "family:edit",
    "player:view", "player:create", "player:edit",
    "recruiting:view", "recruiting:create", "recruiting:edit", "recruiting:approve",
    "registration:view", "registration:edit", "registration:approve",
    "finance:view", "finance:edit",
    "users:view", "users:invite", "users:edit",
    "reports:view", "reports:export",
  ],

  [ROLES.BRANCH_ADMIN]: [
    "branch:view",
    "facility:view", "facility:book",
    "program:view", "program:edit",
    "team:view", "team:edit",
    "family:view", "family:edit",
    "player:view", "player:edit",
    "recruiting:view", "recruiting:edit",
    "registration:view", "registration:edit", "registration:approve",
    "finance:view",
    "users:view",
    "reports:view",
  ],

  [ROLES.BOOKKEEPER]: [
    "branch:view",
    "program:view",
    "team:view",
    "family:view",
    "player:view",
    "registration:view", "registration:edit",
    "finance:view", "finance:edit", "finance:approve",
    "reports:view", "reports:export",
  ],

  [ROLES.PROJECT_MANAGER]: [
    "branch:view",
    "program:view", "program:create", "program:edit", "program:delete", "program:approve",
    "team:view", "team:create", "team:edit",
    "player:view",
    "recruiting:view", "recruiting:create", "recruiting:edit",
    "registration:view",
    "reports:view", "reports:export",
  ],

  [ROLES.COACH]: [
    "branch:view",
    "program:view",
    "team:view", "team:edit",
    "family:view",
    "player:view", "player:edit",
    "recruiting:view", "recruiting:create", "recruiting:edit",
    "registration:view",
  ],

  [ROLES.TEAM_MANAGER]: [
    "branch:view",
    "program:view",
    "team:view", "team:edit",
    "family:view", "family:edit",
    "player:view", "player:edit",
    "recruiting:view", "recruiting:create", "recruiting:edit",
    "registration:view", "registration:edit",
  ],

  [ROLES.FACILITY_MANAGER]: [
    "branch:view",
    "facility:view", "facility:create", "facility:edit", "facility:delete", "facility:book",
    "team:view",
    "reports:view",
  ],

  [ROLES.PLATFORM_DIRECTOR]: [
    "branch:view",
    "program:view",
    "team:view", "team:edit",
    "family:view", "family:edit",
    "player:view", "player:edit",
    "recruiting:view", "recruiting:create", "recruiting:edit",
    "registration:view", "registration:edit",
    "finance:view",
    "reports:view",
  ],

  [ROLES.TRYOUT_LEAD]: [
    "branch:view",
    "program:view",
    "team:view",
    "player:view",
    "recruiting:view", "recruiting:create", "recruiting:edit",
    "registration:view",
  ],

  [ROLES.MARKETING_DIRECTOR]: [
    "branch:view",
    "program:view",
    "team:view",
    "recruiting:view",
    "registration:view",
  ],

  [ROLES.AGE_GROUP_DIRECTOR]: [
    "branch:view",
    "program:view",
    "team:view", "team:create", "team:edit",
    "family:view",
    "player:view", "player:create", "player:edit",
    "recruiting:view", "recruiting:create", "recruiting:edit", "recruiting:approve",
    "registration:view", "registration:edit", "registration:approve",
    "reports:view",
  ],

  [ROLES.PARENT_GUARDIAN]: [
    "branch:view",
    "program:view",
    "team:view",
    "family:view", "family:edit",
    "player:view",
    "registration:view", "registration:edit",
    "finance:view",
  ],

  [ROLES.PLAYER]: [
    "branch:view",
    "program:view",
    "team:view",
    "player:view",
    "registration:view",
    "finance:view",
  ],
};

// ============= HELPER FUNCTIONS =============

/**
 * Get permissions for a role, merging custom DB config with defaults
 * @param {string} role - The role key
 * @param {Array} customConfigs - RBACConfig records from database
 * @returns {Array} Array of permission strings
 */
export function getRolePermissions(role, customConfigs = null) {
  if (!role) return [];

  // Check for custom config first
  if (customConfigs && Array.isArray(customConfigs)) {
    const custom = customConfigs.find((c) => c.role === role && c.is_active);
    if (custom && custom.permissions) {
      return custom.permissions;
    }
  }

  // Fall back to defaults
  return DEFAULT_ROLE_PERMISSIONS[role] || [];
}

/**
 * Check if a user has a specific permission
 * @param {Object} user - The user object with custom_role property
 * @param {string} permission - The permission string (e.g. "program:edit")
 * @param {Array} customConfigs - Optional custom RBAC configurations from database
 * @returns {boolean}
 */
export function hasPermission(user, permission, customConfigs = null) {
  if (!user) return false;

  // System roles are evaluated first and independently of club membership.
  const systemRole = getSystemRole(user);
  if (systemRole === SYSTEM_ROLES.SYSTEM_OWNER || user.is_super_admin === true) return true;
  if (systemRole === SYSTEM_ROLES.SYSTEM_ADMIN) return true;
  if (systemRole === SYSTEM_ROLES.SYSTEM_SUPPORT) {
    // Read-only cross-club access
    return permission.endsWith(":view");
  }
  if (systemRole === SYSTEM_ROLES.SYSTEM_BILLING) {
    return permission.startsWith("finance:");
  }

  const role = user.custom_role || user.role;
  if (!role) return false;

  // Master Admin and Admin always have all permissions
  if (role === ROLES.MASTER_ADMIN || role === ROLES.ADMIN) return true;

  const perms = getRolePermissions(role, customConfigs);
  return perms.includes(permission);
}

/**
 * Check if a user has any of the given permissions
 */
export function hasAnyPermission(user, permissions, customConfigs = null) {
  return permissions.some((p) => hasPermission(user, p, customConfigs));
}

/**
 * Check if a user has all of the given permissions
 */
export function hasAllPermissions(user, permissions, customConfigs = null) {
  return permissions.every((p) => hasPermission(user, p, customConfigs));
}

/**
 * Get all permissions for the current user's role
 */
export function getUserPermissions(user, customConfigs = null) {
  if (!user) return [];
  const role = user.custom_role || user.role;
  return getRolePermissions(role, customConfigs);
}

/**
 * Check if user can access a specific module at all
 */
export function canAccessModule(user, moduleKey, customConfigs = null) {
  return hasAnyPermission(
    user,
    PERMISSION_MODULES.find((m) => m.key === moduleKey)?.permissions.map((p) => p.key) || [],
    customConfigs
  );
}

/**
 * Get the hierarchy level for a role (1 = club-wide, 2 = branch, etc.)
 */
export function getRoleLevel(role) {
  const levels = {
    [ROLES.MASTER_ADMIN]: -1,
    [ROLES.ADMIN]: 0,
    [ROLES.CLUB_DIRECTOR]: 0,
    [ROLES.CLUB_ADMIN]: 0,
    [ROLES.BRANCH_DIRECTOR]: 1,
    [ROLES.BRANCH_ADMIN]: 1,
    [ROLES.BOOKKEEPER]: 0,
    [ROLES.PROJECT_MANAGER]: 0,
    [ROLES.FACILITY_MANAGER]: 0,
    [ROLES.COACH]: 2,
    [ROLES.TEAM_MANAGER]: 2,
    [ROLES.PLATFORM_DIRECTOR]: 1,
    [ROLES.TRYOUT_LEAD]: 2,
    [ROLES.MARKETING_DIRECTOR]: 2,
    [ROLES.AGE_GROUP_DIRECTOR]: 1,
    [ROLES.PARENT_GUARDIAN]: 3,
    [ROLES.PLAYER]: 4,
  };
  return levels[role] ?? 99;
}

/**
 * Check if a role is club-wide (not branch-scoped)
 */
export function isClubWideRole(role) {
  return [ROLES.MASTER_ADMIN, ROLES.ADMIN, ROLES.CLUB_DIRECTOR, ROLES.CLUB_ADMIN, ROLES.BOOKKEEPER, ROLES.PROJECT_MANAGER, ROLES.FACILITY_MANAGER].includes(role);
}

/**
 * Check if a user is the platform master admin (can toggle plugins)
 */
export function isMasterAdmin(user) {
  if (!user) return false;
  const role = user.custom_role || user.role;
  return role === ROLES.MASTER_ADMIN;
}

/**
 * Check if a role is branch-scoped
 */
export function isBranchScopedRole(role) {
  return [ROLES.BRANCH_DIRECTOR, ROLES.BRANCH_ADMIN, ROLES.PLATFORM_DIRECTOR, ROLES.COACH, ROLES.TEAM_MANAGER].includes(role);
}

export default {
  SYSTEM_ROLES,
  SYSTEM_ROLE_LABELS,
  SYSTEM_ROLE_DESCRIPTIONS,
  getSystemRole,
  isSystemUser,
  isSystemOwner,
  ROLES,
  ROLE_LABELS,
  ROLE_DESCRIPTIONS,
  ROLE_COLORS,
  PERMISSION_MODULES,
  ALL_PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
  getRolePermissions,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getUserPermissions,
  canAccessModule,
  getRoleLevel,
  isClubWideRole,
  isBranchScopedRole,
  isMasterAdmin,
};