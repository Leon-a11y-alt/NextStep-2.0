// Admin moderation + dashboard statistics.
const { posts } = require("../data/posts");
const { habits } = require("../data/habits");
const { calendarTasks } = require("../data/calendar");
const { comments } = require("../data/comments");
const { users } = require("../data/users");
const { adminRequests, reports } = require("../data/adminRequests");

// GET /api/admin/pending-posts
function getPendingPosts(req, res) {
  res.json(posts.filter((p) => p.status === "pending"));
}

// PUT /api/admin/posts/:id/approve
function approvePost(req, res) {
  const post = posts.find((p) => p.id === Number(req.params.id));
  if (!post) return res.status(404).json({ error: "Post not found." });
  post.status = "approved";
  res.json(post);
}

// PUT /api/admin/posts/:id/reject
function rejectPost(req, res) {
  const post = posts.find((p) => p.id === Number(req.params.id));
  if (!post) return res.status(404).json({ error: "Post not found." });
  post.status = "rejected";
  res.json(post);
}

// GET /api/admin/reports
function getReports(req, res) {
  // Attach a little post context for each open report.
  const enriched = reports.map((r) => {
    const post = posts.find((p) => p.id === r.postId);
    return { ...r, postTitle: post ? post.title : "(deleted post)" };
  });
  res.json(enriched);
}

// PUT /api/admin/reports/:id/resolve
function resolveReport(req, res) {
  const report = reports.find((r) => r.id === Number(req.params.id));
  if (!report) return res.status(404).json({ error: "Report not found." });
  report.status = "resolved";
  res.json(report);
}

// GET /api/admin/requests
function getRequests(req, res) {
  res.json(adminRequests);
}

// PUT /api/admin/requests/:id/approve
function approveRequest(req, res) {
  const request = adminRequests.find((r) => r.id === Number(req.params.id));
  if (!request) return res.status(404).json({ error: "Request not found." });
  request.status = "approved";
  request.reviewedBy = "Admin Officer";
  request.reviewedAt = new Date().toISOString().slice(0, 10);

  // Promote the user to admin as well.
  const user = users.find((u) => u.id === request.userId);
  if (user) user.role = "admin";

  res.json(request);
}

// PUT /api/admin/requests/:id/reject
function rejectRequest(req, res) {
  const request = adminRequests.find((r) => r.id === Number(req.params.id));
  if (!request) return res.status(404).json({ error: "Request not found." });
  request.status = "rejected";
  request.reviewedBy = "Admin Officer";
  request.reviewedAt = new Date().toISOString().slice(0, 10);
  res.json(request);
}

// GET /api/admin/stats  — numbers for the admin dashboard widgets.
function getStats(req, res) {
  res.json({
    totalUsers: users.length,
    totalPosts: posts.length,
    approvedPosts: posts.filter((p) => p.status === "approved").length,
    pendingPosts: posts.filter((p) => p.status === "pending").length,
    totalComments: comments.length,
    totalHabits: habits.length,
    activeHabits: habits.filter((h) => h.status === "active").length,
    totalCalendarTasks: calendarTasks.length,
    openReports: reports.filter((r) => r.status === "open").length,
    pendingRequests: adminRequests.filter((r) => r.status === "pending").length,
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
};
