// Comments data-access layer (PostgreSQL on Supabase).
// camelCase columns are double-quoted — Postgres lowercases unquoted names.
const { pool } = require("../config/db");

const inMemoryLikes = new Map();
const inMemoryDislikes = new Map();

function getLikeSet(commentId) {
  if (!inMemoryLikes.has(commentId)) {
    inMemoryLikes.set(commentId, new Set());
  }
  return inMemoryLikes.get(commentId);
}

function getDislikeSet(commentId) {
  if (!inMemoryDislikes.has(commentId)) {
    inMemoryDislikes.set(commentId, new Set());
  }
  return inMemoryDislikes.get(commentId);
}

function isCommentLikedByUser(commentId, userId) {
  return Boolean(userId && getLikeSet(commentId).has(Number(userId)));
}

function isCommentDislikedByUser(commentId, userId) {
  return Boolean(userId && getDislikeSet(commentId).has(Number(userId)));
}

// All comments, or just those for a given post when postId is provided.
async function find(postId) {
  if (postId === undefined || postId === null || postId === "") {
    const [rows] = await pool.query("SELECT * FROM comments ORDER BY id");
    return rows;
  }
  const [rows] = await pool.query(
    'SELECT * FROM comments WHERE "postId" = ? ORDER BY id',
    [Number(postId)]
  );
  return rows;
}

async function findById(id) {
  const [rows] = await pool.query("SELECT * FROM comments WHERE id = ? LIMIT 1", [id]);
  return rows[0] || null;
}

async function create(data) {
  const [rows] = await pool.query(
    `INSERT INTO comments ("postId", "userId", author, "authorYear", text, "createdAt")
     VALUES (?, ?, ?, ?, ?, ?) RETURNING id`,
    [data.postId, data.userId, data.author, data.authorYear, data.text, data.createdAt]
  );
  return findById(rows[0].id);
}

async function update(id, fields) {
  const allowed = ["text"];
  const sets = [];
  const params = [];
  for (const key of allowed) {
    if (fields[key] !== undefined) {
      sets.push(`${key} = ?`);
      params.push(fields[key]);
    }
  }
  if (sets.length) {
    params.push(id);
    await pool.query(`UPDATE comments SET ${sets.join(", ")} WHERE id = ?`, params);
  }
  return findById(id);
}

async function remove(id) {
  const comment = await findById(id);
  if (!comment) return null;
  await pool.query("DELETE FROM comments WHERE id = ?", [id]);
  return comment;
}

// NOTE on column names: the vote rows live in comment_upvotes /
// comment_downvotes, but the running totals on the `comments` table are called
// `likes` and `dislikes` (posts use `upvotes`/`downvotes` — comments never
// did). Keep the two apart, or every vote throws
// `column "upvotes" of relation "comments" does not exist`.
async function toggleLike(id, userId) {
  const comment = await findById(id);
  if (!comment) return null;

  try {
    const [upvote] = await pool.query(
      "SELECT * FROM comment_upvotes WHERE commentId = ? AND userId = ? LIMIT 1",
      [id, userId]
    );

    if (upvote.length) {
      await pool.query("DELETE FROM comment_upvotes WHERE commentId = ? AND userId = ?", [id, userId]);
      await pool.query("UPDATE comments SET likes = GREATEST(likes - 1, 0) WHERE id = ?", [id]);
      getLikeSet(id).delete(Number(userId));
    } else {
      const [downvote] = await pool.query(
        "SELECT * FROM comment_downvotes WHERE commentId = ? AND userId = ? LIMIT 1",
        [id, userId]
      );
      if (downvote.length) {
        await pool.query("DELETE FROM comment_downvotes WHERE commentId = ? AND userId = ?", [id, userId]);
        await pool.query("UPDATE comments SET dislikes = GREATEST(dislikes - 1, 0) WHERE id = ?", [id]);
        getDislikeSet(id).delete(Number(userId));
      }
      await pool.query("INSERT INTO comment_upvotes (commentId, userId) VALUES (?, ?)", [id, userId]);
      await pool.query("UPDATE comments SET likes = likes + 1 WHERE id = ?", [id]);
      getLikeSet(id).add(Number(userId));
    }
  } catch (err) {
    const currentVotes = Number(comment.likes || 0);
    const hasVote = isCommentLikedByUser(id, userId);
    const nextVotes = hasVote ? Math.max(currentVotes - 1, 0) : currentVotes + 1;
    const voteSet = getLikeSet(id);
    if (hasVote) voteSet.delete(Number(userId));
    else voteSet.add(Number(userId));
    await pool.query("UPDATE comments SET likes = ? WHERE id = ?", [nextVotes, id]);
  }

  return findById(id);
}

async function toggleDislike(id, userId) {
  const comment = await findById(id);
  if (!comment) return null;

  try {
    const [downvote] = await pool.query(
      "SELECT * FROM comment_downvotes WHERE commentId = ? AND userId = ? LIMIT 1",
      [id, userId]
    );

    if (downvote.length) {
      await pool.query("DELETE FROM comment_downvotes WHERE commentId = ? AND userId = ?", [id, userId]);
      await pool.query("UPDATE comments SET dislikes = GREATEST(dislikes - 1, 0) WHERE id = ?", [id]);
      getDislikeSet(id).delete(Number(userId));
    } else {
      const [upvote] = await pool.query(
        "SELECT * FROM comment_upvotes WHERE commentId = ? AND userId = ? LIMIT 1",
        [id, userId]
      );
      if (upvote.length) {
        await pool.query("DELETE FROM comment_upvotes WHERE commentId = ? AND userId = ?", [id, userId]);
        await pool.query("UPDATE comments SET likes = GREATEST(likes - 1, 0) WHERE id = ?", [id]);
        getLikeSet(id).delete(Number(userId));
      }
      await pool.query("INSERT INTO comment_downvotes (commentId, userId) VALUES (?, ?)", [id, userId]);
      await pool.query("UPDATE comments SET dislikes = dislikes + 1 WHERE id = ?", [id]);
      getDislikeSet(id).add(Number(userId));
    }
  } catch (err) {
    const currentVotes = Number(comment.dislikes || 0);
    const hasVote = isCommentDislikedByUser(id, userId);
    const nextVotes = hasVote ? Math.max(currentVotes - 1, 0) : currentVotes + 1;
    const voteSet = getDislikeSet(id);
    if (hasVote) voteSet.delete(Number(userId));
    else voteSet.add(Number(userId));
    await pool.query("UPDATE comments SET dislikes = ? WHERE id = ?", [nextVotes, id]);
  }

  return findById(id);
}

async function count() {
  const [rows] = await pool.query("SELECT COUNT(*)::int AS n FROM comments");
  return rows[0].n;
}

module.exports = { find, findById, create, update, remove, toggleLike, toggleDislike, count };
