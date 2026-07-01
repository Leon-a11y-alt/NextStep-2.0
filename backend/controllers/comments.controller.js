// Comments under forum posts.
const { comments, getNextCommentId } = require("../data/comments");

// GET /api/comments?postId=
function getComments(req, res) {
  const { postId } = req.query;
  let result = comments;
  if (postId) {
    result = comments.filter((c) => c.postId === Number(postId));
  }
  res.json(result);
}

// POST /api/comments
function createComment(req, res) {
  const { postId, userId, author, authorYear, text } = req.body;
  if (!postId || !text) {
    return res.status(400).json({ error: "postId and text are required." });
  }

  const newComment = {
    id: getNextCommentId(),
    postId: Number(postId),
    userId: userId || null,
    author: author || "Anonymous",
    authorYear: authorYear || "Year 1",
    text,
    createdAt: new Date().toISOString().slice(0, 10),
  };
  comments.push(newComment);
  res.status(201).json(newComment);
}

module.exports = { getComments, createComment };
