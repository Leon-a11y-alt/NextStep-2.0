// Central role/permission rules so every controller agrees on what each
// role can do. Roles: "user" < "moderator" < "admin".
//
// Moderator = trusted content helper. Can moderate content (posts, comments)
// and view the admin dashboard + user list, but CANNOT manage users
// (no promote / demote / ban / delete) and can never grant any role.
// Only a full admin can change roles.

const ROLES = { USER: "user", MODERATOR: "moderator", ADMIN: "admin" };
const VALID_ROLES = new Set(Object.values(ROLES));

function isAdmin(role) {
  return role === ROLES.ADMIN;
}

// Anyone who can act on other people's content / see the moderation screens.
function isStaff(role) {
  return role === ROLES.ADMIN || role === ROLES.MODERATOR;
}

// Can this role remove/edit content it doesn't own? (posts, comments)
function canModerateContent(role) {
  return isStaff(role);
}

// Can this role open the admin panel and read stats + the user list?
function canViewAdminPanel(role) {
  return isStaff(role);
}

// Can this role manage users (promote, demote, ban, delete)? Admin only.
function canManageUsers(role) {
  return isAdmin(role);
}

module.exports = {
  ROLES,
  VALID_ROLES,
  isAdmin,
  isStaff,
  canModerateContent,
  canViewAdminPanel,
  canManageUsers,
};
