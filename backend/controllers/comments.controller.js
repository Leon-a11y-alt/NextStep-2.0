// Comments under forum posts. Backed by the MySQL comments table.
const commentsRepo = require("../repositories/comments.repo");

// GET /api/comments?postId=
async function getComments(req, res) {
  const { postId } = req.query;
  const result = await commentsRepo.find(postId);
  res.json(result);
}

// POST /api/comments
async function createComment(req, res) {
  const { postId, userId, author, authorYear, text } = req.body;
  if (!postId || !text) {
    return res.status(400).json({ error: "postId and text are required." });
  }

  const newComment = await commentsRepo.create({
    postId: Number(postId),
    userId: userId || null,
    author: author || "Anonymous",
    authorYear: authorYear || "Year 1",
    text,
    createdAt: new Date().toISOString().slice(0, 10),
  });
  res.status(201).json(newComment);
}

// PUT /api/comments/:id
async function updateComment(req, res) {
  const id = Number(req.params.id);
  const existing = await commentsRepo.findById(id);
  if (!existing) return res.status(404).json({ error: "Comment not found." });

  const requesterId = req.body?.userId ?? req.query?.userId;
  const requesterRole = req.body?.role ?? req.query?.role;
  if (requesterRole !== "admin" && existing.userId && requesterId !== undefined && Number(requesterId) !== Number(existing.userId)) {
    return res.status(403).json({ error: "You can only edit your own comments." });
  }

  const { text } = req.body;
  const updated = await commentsRepo.update(id, { text });
  res.json(updated);
}

// DELETE /api/comments/:id
async function deleteComment(req, res) {
  const id = Number(req.params.id);
  const existing = await commentsRepo.findById(id);
  if (!existing) return res.status(404).json({ error: "Comment not found." });

  const requesterId = req.body?.userId ?? req.query?.userId;
  if (existing.userId && requesterId !== undefined && Number(requesterId) !== Number(existing.userId)) {
    return res.status(403).json({ error: "You can only delete your own comments." });
  }

  const removed = await commentsRepo.remove(id);
  res.json({ message: "Comment deleted.", comment: removed });
}

// POST /api/comments/:id/like  — 👍 a piece of advice. (Done by Andrea Ho)
async function likeComment(req, res) {
  const updated = await commentsRepo.vote(Number(req.params.id), "likes");
  if (!updated) return res.status(404).json({ error: "Comment not found." });
  res.json(updated);
}

// POST /api/comments/:id/dislike  — 👎 a piece of advice.
async function dislikeComment(req, res) {
  const updated = await commentsRepo.vote(Number(req.params.id), "dislikes");
  if (!updated) return res.status(404).json({ error: "Comment not found." });
  res.json(updated);
}

module.exports = { getComments, createComment, updateComment, deleteComment, likeComment, dislikeComment };
