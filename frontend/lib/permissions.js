// Frontend mirror of backend/lib/permissions.js. Keep the two in sync.
// Roles: "user" < "moderator" < "admin".
// Moderator = content helper: can moderate posts/comments and view the
// admin panel, but CANNOT manage users (promote / demote / ban / delete).

export const ROLES = { USER: "user", MODERATOR: "moderator", ADMIN: "admin" };

export const isAdmin = (role) => role === ROLES.ADMIN;

// admin OR moderator
export const isStaff = (role) => role === ROLES.ADMIN || role === ROLES.MODERATOR;

// Delete/edit other people's posts & comments.
export const canModerateContent = (role) => isStaff(role);

// Open the admin panel, read stats + the user list.
export const canViewAdminPanel = (role) => isStaff(role);

// Promote / demote / ban / delete users. Admin only.
export const canManageUsers = (role) => isAdmin(role);

// Human-friendly label for a role badge.
export const roleLabel = (role) =>
  role === ROLES.ADMIN ? "Admin" : role === ROLES.MODERATOR ? "Moderator" : "User";
