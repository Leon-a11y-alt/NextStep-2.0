// Admin moderation + dashboard statistics. Backed by MySQL.
const postsRepo = require("../repositories/posts.repo");
const habitsRepo = require("../repositories/habits.repo");
const calendarRepo = require("../repositories/calendar.repo");
const commentsRepo = require("../repositories/comments.repo");
const usersRepo = require("../repositories/users.repo");
const adminRepo = require("../repositories/admin.repo");
const { VALID_ROLES, canManageUsers } = require("../lib/permissions");

// GET /api/admin/users?requesterId=
// requesterId (optional) marks the caller's own row with isSelf: true, so
// the frontend can hide "manage yourself" buttons on it.
async function getUsers(req, res) {
  const users = await usersRepo.listAll();
  const requesterId = req.query?.requesterId;
  res.json(
    users.map(({ password, ...u }) => ({
      ...u,
      ...(requesterId !== undefined ? { isSelf: Number(u.id) === Number(requesterId) } : {}),
    }))
  );
}

// PATCH /api/admin/users/:id/role   body: { role, requesterId, requesterRole }
// [added for mod role] Only a full admin may change roles, and an admin can
// never change their own role (that would risk locking everyone else out).
async function setUserRole(req, res) {
  const id = Number(req.params.id);
  const { role, requesterId, requesterRole } = req.body || {};

  if (!canManageUsers(requesterRole)) {
    return res.status(403).json({ error: "Only an admin can change user roles." });
  }
  if (requesterId !== undefined && Number(requesterId) === id) {
    return res.status(403).json({ error: "You can't change your own role." });
  }
  if (!VALID_ROLES.has(role)) {
    return res.status(400).json({ error: `Role must be one of: ${[...VALID_ROLES].join(", ")}.` });
  }

  const target = await usersRepo.findById(id);
  if (!target) return res.status(404).json({ error: "User not found." });

  const updated = await usersRepo.updateRole(id, role);
  const { password, ...safeUser } = updated;
  res.json(safeUser);
}

// POST /api/admin/users/:id/ban   body: { requesterId, requesterRole }
// [added for mod role follow-up] Toggles isBanned. Admin-only, and you
// can't ban yourself. Banning here only flips the flag — auth.controller's
// login also checks it, so a banned user is actually blocked from signing
// back in, not just labeled in the admin panel.
async function toggleBan(req, res) {
  const id = Number(req.params.id);
  const { requesterId, requesterRole } = req.body || {};

  if (!canManageUsers(requesterRole)) {
    return res.status(403).json({ error: "Only an admin can ban or unban users." });
  }
  if (requesterId !== undefined && Number(requesterId) === id) {
    return res.status(403).json({ error: "You can't ban yourself." });
  }

  const target = await usersRepo.findById(id);
  if (!target) return res.status(404).json({ error: "User not found." });

  const updated = await usersRepo.setBanned(id, !target.isBanned);
  const { password, ...safeUser } = updated;
  res.json(safeUser);
}

// DELETE /api/admin/users/:id   body: { requesterId, requesterRole }
// [added for mod role follow-up] Admin-only, and you can't delete yourself.
async function deleteUser(req, res) {
  const id = Number(req.params.id);
  const { requesterId, requesterRole } = req.body || {};

  if (!canManageUsers(requesterRole)) {
    return res.status(403).json({ error: "Only an admin can delete users." });
  }
  if (requesterId !== undefined && Number(requesterId) === id) {
    return res.status(403).json({ error: "You can't delete your own account." });
  }

  const removed = await usersRepo.remove(id);
  if (!removed) return res.status(404).json({ error: "User not found." });

  const { password, ...safeUser } = removed;
  res.json({ message: "User deleted.", user: safeUser });
}

// GET /api/admin/pending-posts
async function getPendingPosts(req, res) {
  const pending = await postsRepo.findByStatus("pending");
  res.json(pending);
}

// PUT /api/admin/posts/:id/approve
async function approvePost(req, res) {
  const id = Number(req.params.id);
  const post = await postsRepo.findById(id);
  if (!post) return res.status(404).json({ error: "Post not found." });
  const updated = await postsRepo.update(id, { status: "approved" });
  res.json(updated);
}

// PUT /api/admin/posts/:id/reject
async function rejectPost(req, res) {
  const id = Number(req.params.id);
  const post = await postsRepo.findById(id);
  if (!post) return res.status(404).json({ error: "Post not found." });
  const updated = await postsRepo.update(id, { status: "rejected" });
  res.json(updated);
}

// GET /api/admin/reports
async function getReports(req, res) {
  // Attach a little post context for each report (JOIN handles this).
  const rows = await adminRepo.findReportsWithPostTitle();
  const enriched = rows.map((r) => ({
    ...r,
    postTitle: r.postTitle || "(deleted post)",
  }));
  res.json(enriched);
}

// PUT /api/admin/reports/:id/resolve
async function resolveReport(req, res) {
  const id = Number(req.params.id);
  const report = await adminRepo.findReportById(id);
  if (!report) return res.status(404).json({ error: "Report not found." });
  const updated = await adminRepo.updateReport(id, { status: "resolved" });
  res.json(updated);
}

// GET /api/admin/requests
async function getRequests(req, res) {
  const requests = await adminRepo.findRequests();
  res.json(requests);
}

// PUT /api/admin/requests/:id/approve
async function approveRequest(req, res) {
  const id = Number(req.params.id);
  const request = await adminRepo.findRequestById(id);
  if (!request) return res.status(404).json({ error: "Request not found." });

  const updated = await adminRepo.updateRequest(id, {
    status: "approved",
    reviewedBy: "Admin Officer",
    reviewedAt: new Date().toISOString().slice(0, 10),
  });

  // Promote the user to admin as well.
  if (request.userId) await usersRepo.updateRole(request.userId, "admin");

  res.json(updated);
}

// PUT /api/admin/requests/:id/reject
async function rejectRequest(req, res) {
  const id = Number(req.params.id);
  const request = await adminRepo.findRequestById(id);
  if (!request) return res.status(404).json({ error: "Request not found." });

  const updated = await adminRepo.updateRequest(id, {
    status: "rejected",
    reviewedBy: "Admin Officer",
    reviewedAt: new Date().toISOString().slice(0, 10),
  });
  res.json(updated);
}

// GET /api/admin/stats  — numbers for the admin dashboard widgets.
async function getStats(req, res) {
  const [
    totalUsers,
    totalPosts,
    approvedPosts,
    pendingPosts,
    totalComments,
    totalHabits,
    activeHabits,
    totalCalendarTasks,
    openReports,
    pendingRequests,
  ] = await Promise.all([
    usersRepo.count(),
    postsRepo.count(),
    postsRepo.countByStatus("approved"),
    postsRepo.countByStatus("pending"),
    commentsRepo.count(),
    habitsRepo.count(),
    habitsRepo.countByStatus("active"),
    calendarRepo.count(),
    adminRepo.countOpenReports(),
    adminRepo.countPendingRequests(),
  ]);

  res.json({
    totalUsers,
    totalPosts,
    approvedPosts,
    pendingPosts,
    totalComments,
    totalHabits,
    activeHabits,
    totalCalendarTasks,
    openReports,
    pendingRequests,
  });
}

module.exports = {
  getPendingPosts,
  approvePost,
  rejectPost,
  getReports,
  resolveReport,
  getRequests,
  approveRequest,
  rejectRequest,
  getStats,
  getUsers,
  setUserRole,
  toggleBan,
  deleteUser,
};
