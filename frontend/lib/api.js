// Tiny fetch wrapper used by every page to talk to the Express backend.
// Base URL comes from an env var so it is easy to change for deployment.
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

async function request(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  // Try to read JSON either way so we can surface backend error messages.
  let data = null;
  try { data = await res.json(); } catch (e) { /* empty body is fine */ }

  if (!res.ok) {
    const message = (data && data.error) || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: "POST", body: JSON.stringify(body) }),
  put: (path, body) => request(path, { method: "PUT", body: JSON.stringify(body || {}) }),
  del: (path) => request(path, { method: "DELETE" }),
  baseUrl: API_URL,
};

// ---- Feature helpers (keep pages clean & readable) ----
export const AuthAPI = {
  login: (email, password) => api.post("/api/auth/login", { email, password }),
  register: (payload) => api.post("/api/auth/register", payload),
};

export const PostsAPI = {
  list: (category, search) => {
    const params = new URLSearchParams();
    if (category && category !== "All") params.set("category", category);
    if (search) params.set("search", search);
    const q = params.toString();
    return api.get(`/api/posts${q ? "?" + q : ""}`);
  },
  create: (payload) => api.post("/api/posts", payload),
  upvote: (id) => api.post(`/api/posts/${id}/upvote`, {}),
};

export const CommentsAPI = {
  list: (postId) => api.get(`/api/comments?postId=${postId}`),
  create: (payload) => api.post("/api/comments", payload),
};

export const HabitsAPI = {
  list: (userId) => api.get(`/api/habits?userId=${userId}`),
  create: (payload) => api.post("/api/habits", payload),
  update: (id, payload) => api.put(`/api/habits/${id}`, payload),
  remove: (id) => api.del(`/api/habits/${id}`),
};

export const CalendarAPI = {
  list: (userId) => api.get(`/api/calendar?userId=${userId}`),
  create: (payload) => api.post("/api/calendar", payload),
  update: (id, payload) => api.put(`/api/calendar/${id}`, payload),
  remove: (id) => api.del(`/api/calendar/${id}`),
};

export const AdminAPI = {
  pendingPosts: () => api.get("/api/admin/pending-posts"),
  approvePost: (id) => api.put(`/api/admin/posts/${id}/approve`),
  rejectPost: (id) => api.put(`/api/admin/posts/${id}/reject`),
  reports: () => api.get("/api/admin/reports"),
  resolveReport: (id) => api.put(`/api/admin/reports/${id}/resolve`),
  requests: () => api.get("/api/admin/requests"),
  approveRequest: (id) => api.put(`/api/admin/requests/${id}/approve`),
  rejectRequest: (id) => api.put(`/api/admin/requests/${id}/reject`),
  stats: () => api.get("/api/admin/stats"),
};
