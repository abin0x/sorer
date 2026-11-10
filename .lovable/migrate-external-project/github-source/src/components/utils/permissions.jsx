/**
 * Role-based Access Control (RBAC) Permissions System
 * 
 * Defines granular permissions for different roles:
 * - Admin: Full access to everything
 * - Director: Access to everything except user role management
 * - Branch Director: Can only manage users and programs within their assigned branch
 * - Staff: Can only view/edit their own assigned programs and tasks
 */

export const ROLES = {
  ADMIN: "admin",
  DIRECTOR: "director",
  BRANCH_DIRECTOR: "branch_director",
  STAFF: "staff"
};

export const PERMISSIONS = {
  // Program Permissions
  PROGRAMS_VIEW_ALL: "programs:view:all",
  PROGRAMS_VIEW_BRANCH: "programs:view:branch",
  PROGRAMS_VIEW_OWN: "programs:view:own",
  PROGRAMS_CREATE: "programs:create",
  PROGRAMS_EDIT_ALL: "programs:edit:all",
  PROGRAMS_EDIT_BRANCH: "programs:edit:branch",
  PROGRAMS_EDIT_OWN: "programs:edit:own",
  PROGRAMS_DELETE_ALL: "programs:delete:all",
  PROGRAMS_DELETE_BRANCH: "programs:delete:branch",
  PROGRAMS_DELETE_OWN: "programs:delete:own",

  // Task Permissions
  TASKS_VIEW_ALL: "tasks:view:all",
  TASKS_VIEW_BRANCH: "tasks:view:branch",
  TASKS_VIEW_OWN: "tasks:view:own",
  TASKS_CREATE: "tasks:create",
  TASKS_EDIT_ALL: "tasks:edit:all",
  TASKS_EDIT_BRANCH: "tasks:edit:branch",
  TASKS_EDIT_OWN: "tasks:edit:own",
  TASKS_DELETE_ALL: "tasks:delete:all",
  TASKS_DELETE_BRANCH: "tasks:delete:branch",
  TASKS_DELETE_OWN: "tasks:delete:own",

  // Expense Permissions
  EXPENSES_VIEW_ALL: "expenses:view:all",
  EXPENSES_VIEW_BRANCH: "expenses:view:branch",
  EXPENSES_VIEW_OWN: "expenses:view:own",
  EXPENSES_CREATE: "expenses:create",
  EXPENSES_APPROVE: "expenses:approve",
  EXPENSES_EDIT_ALL: "expenses:edit:all",
  EXPENSES_EDIT_OWN: "expenses:edit:own",
  EXPENSES_DELETE_ALL: "expenses:delete:all",

  // User Management Permissions
  USERS_VIEW_ALL: "users:view:all",
  USERS_VIEW_BRANCH: "users:view:branch",
  USERS_CREATE: "users:create",
  USERS_EDIT_ALL: "users:edit:all",
  USERS_EDIT_BRANCH: "users:edit:branch",
  USERS_EDIT_ROLES: "users:edit:roles",
  USERS_DELETE: "users:delete",

  // Report Permissions
  REPORTS_VIEW_ALL: "reports:view:all",
  REPORTS_VIEW_BRANCH: "reports:view:branch",
  REPORTS_EXPORT: "reports:export"
};

// Role to Permissions mapping
export const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: [
    // Admin has ALL permissions
    ...Object.values(PERMISSIONS)
  ],
  
  [ROLES.DIRECTOR]: [
    // Director has everything except editing user roles
    PERMISSIONS.PROGRAMS_VIEW_ALL,
    PERMISSIONS.PROGRAMS_CREATE,
    PERMISSIONS.PROGRAMS_EDIT_ALL,
    PERMISSIONS.PROGRAMS_DELETE_ALL,
    PERMISSIONS.TASKS_VIEW_ALL,
    PERMISSIONS.TASKS_CREATE,
    PERMISSIONS.TASKS_EDIT_ALL,
    PERMISSIONS.TASKS_DELETE_ALL,
    PERMISSIONS.EXPENSES_VIEW_ALL,
    PERMISSIONS.EXPENSES_CREATE,
    PERMISSIONS.EXPENSES_APPROVE,
    PERMISSIONS.EXPENSES_EDIT_ALL,
    PERMISSIONS.EXPENSES_DELETE_ALL,
    PERMISSIONS.USERS_VIEW_ALL,
    PERMISSIONS.USERS_CREATE,
    PERMISSIONS.USERS_EDIT_ALL,
    // Note: Directors CANNOT edit user roles (no USERS_EDIT_ROLES)
    PERMISSIONS.USERS_DELETE,
    PERMISSIONS.REPORTS_VIEW_ALL,
    PERMISSIONS.REPORTS_EXPORT
  ],
  
  [ROLES.BRANCH_DIRECTOR]: [
    // Branch Director can only manage their branch
    PERMISSIONS.PROGRAMS_VIEW_BRANCH,
    PERMISSIONS.PROGRAMS_CREATE,
    PERMISSIONS.PROGRAMS_EDIT_BRANCH,
    PERMISSIONS.PROGRAMS_DELETE_BRANCH,
    PERMISSIONS.TASKS_VIEW_BRANCH,
    PERMISSIONS.TASKS_CREATE,
    PERMISSIONS.TASKS_EDIT_BRANCH,
    PERMISSIONS.TASKS_DELETE_BRANCH,
    PERMISSIONS.EXPENSES_VIEW_BRANCH,
    PERMISSIONS.EXPENSES_CREATE,
    PERMISSIONS.EXPENSES_APPROVE,
    PERMISSIONS.EXPENSES_EDIT_OWN,
    PERMISSIONS.USERS_VIEW_BRANCH,
    PERMISSIONS.USERS_CREATE,
    PERMISSIONS.USERS_EDIT_BRANCH,
    PERMISSIONS.REPORTS_VIEW_BRANCH,
    PERMISSIONS.REPORTS_EXPORT
  ],
  
  [ROLES.STAFF]: [
    // Staff can only view/edit their own items
    PERMISSIONS.PROGRAMS_VIEW_OWN,
    PERMISSIONS.PROGRAMS_EDIT_OWN,
    PERMISSIONS.TASKS_VIEW_OWN,
    PERMISSIONS.TASKS_CREATE,
    PERMISSIONS.TASKS_EDIT_OWN,
    PERMISSIONS.EXPENSES_VIEW_OWN,
    PERMISSIONS.EXPENSES_CREATE,
    PERMISSIONS.EXPENSES_EDIT_OWN
  ]
};

/**
 * Check if a user has a specific permission
 * Uses custom RBAC config from database if available, otherwise falls back to defaults
 * @param {Object} user - The user object with role property
 * @param {string} permission - The permission to check
 * @param {Array} customConfigs - Optional custom RBAC configurations from database
 * @returns {boolean}
 */
export function hasPermission(user, permission, customConfigs = null) {
  if (!user || !user.role) return false;
  
  // Try to get custom config for this role
  if (customConfigs && Array.isArray(customConfigs)) {
    const customConfig = customConfigs.find(c => c.role === user.role && c.is_active);
    if (customConfig && customConfig.permissions) {
      return customConfig.permissions.includes(permission);
    }
  }
  
  // Fall back to default permissions
  const userPermissions = ROLE_PERMISSIONS[user.role] || [];
  return userPermissions.includes(permission);
}

/**
 * Check if a user can view a program
 * @param {Object} user - The user object
 * @param {Object} program - The program object
 * @returns {boolean}
 */
export function canViewProgram(user, program) {
  if (!user || !program) return false;
  
  if (hasPermission(user, PERMISSIONS.PROGRAMS_VIEW_ALL)) return true;
  
  if (hasPermission(user, PERMISSIONS.PROGRAMS_VIEW_BRANCH)) {
    return program.branch === user.branch;
  }
  
  if (hasPermission(user, PERMISSIONS.PROGRAMS_VIEW_OWN)) {
    return program.assignee === user.email || program.created_by_email === user.email;
  }
  
  return false;
}

/**
 * Check if a user can edit a program
 * @param {Object} user - The user object
 * @param {Object} program - The program object
 * @returns {boolean}
 */
export function canEditProgram(user, program) {
  if (!user || !program) return false;
  
  if (hasPermission(user, PERMISSIONS.PROGRAMS_EDIT_ALL)) return true;
  
  if (hasPermission(user, PERMISSIONS.PROGRAMS_EDIT_BRANCH)) {
    return program.branch === user.branch;
  }
  
  if (hasPermission(user, PERMISSIONS.PROGRAMS_EDIT_OWN)) {
    return program.assignee === user.email || program.created_by_email === user.email;
  }
  
  return false;
}

/**
 * Check if a user can delete a program
 * @param {Object} user - The user object
 * @param {Object} program - The program object
 * @returns {boolean}
 */
export function canDeleteProgram(user, program) {
  if (!user || !program) return false;
  
  if (hasPermission(user, PERMISSIONS.PROGRAMS_DELETE_ALL)) return true;
  
  if (hasPermission(user, PERMISSIONS.PROGRAMS_DELETE_BRANCH)) {
    return program.branch === user.branch;
  }
  
  if (hasPermission(user, PERMISSIONS.PROGRAMS_DELETE_OWN)) {
    return program.assignee === user.email || program.created_by_email === user.email;
  }
  
  return false;
}

/**
 * Check if a user can approve expenses
 * @param {Object} user - The user object
 * @returns {boolean}
 */
export function canApproveExpenses(user) {
  return hasPermission(user, PERMISSIONS.EXPENSES_APPROVE);
}

/**
 * Check if a user can edit user roles
 * @param {Object} user - The user object
 * @returns {boolean}
 */
export function canEditUserRoles(user) {
  return hasPermission(user, PERMISSIONS.USERS_EDIT_ROLES);
}

/**
 * Check if a user can manage a specific user profile
 * @param {Object} currentUser - The current logged-in user
 * @param {Object} targetUser - The user profile to manage
 * @returns {boolean}
 */
export function canManageUser(currentUser, targetUser) {
  if (!currentUser || !targetUser) return false;
  
  // Users can always edit their own profile
  if (currentUser.email === targetUser.email) return true;
  
  if (hasPermission(currentUser, PERMISSIONS.USERS_EDIT_ALL)) return true;
  
  if (hasPermission(currentUser, PERMISSIONS.USERS_EDIT_BRANCH)) {
    return targetUser.branch === currentUser.branch;
  }
  
  return false;
}

/**
 * Filter programs based on user permissions
 * @param {Array} programs - Array of program objects
 * @param {Object} user - The user object
 * @returns {Array} Filtered programs
 */
export function filterProgramsByPermissions(programs, user) {
  if (!user) return [];
  
  if (hasPermission(user, PERMISSIONS.PROGRAMS_VIEW_ALL)) {
    return programs;
  }
  
  if (hasPermission(user, PERMISSIONS.PROGRAMS_VIEW_BRANCH)) {
    return programs.filter(p => p.branch === user.branch);
  }
  
  if (hasPermission(user, PERMISSIONS.PROGRAMS_VIEW_OWN)) {
    return programs.filter(p => 
      p.assignee === user.email || p.created_by_email === user.email
    );
  }
  
  return [];
}

/**
 * Filter tasks based on user permissions
 * @param {Array} tasks - Array of task objects
 * @param {Array} programs - Array of program objects (to check branch access)
 * @param {Object} user - The user object
 * @returns {Array} Filtered tasks
 */
export function filterTasksByPermissions(tasks, programs, user) {
  if (!user) return [];
  
  if (hasPermission(user, PERMISSIONS.TASKS_VIEW_ALL)) {
    return tasks;
  }
  
  if (hasPermission(user, PERMISSIONS.TASKS_VIEW_BRANCH)) {
    const branchProgramIds = programs
      .filter(p => p.branch === user.branch)
      .map(p => p.id);
    return tasks.filter(t => branchProgramIds.includes(t.program_id));
  }
  
  if (hasPermission(user, PERMISSIONS.TASKS_VIEW_OWN)) {
    return tasks.filter(t => 
      t.assignee === user.email || t.created_by === user.email
    );
  }
  
  return [];
}

export default {
  ROLES,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  hasPermission,
  canViewProgram,
  canEditProgram,
  canDeleteProgram,
  canApproveExpenses,
  canEditUserRoles,
  canManageUser,
  filterProgramsByPermissions,
  filterTasksByPermissions
};