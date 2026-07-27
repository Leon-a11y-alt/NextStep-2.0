<<<<<<< HEAD
const { pool } = require("../config/db");

async function find(userId) {
  let rows;

  if (!userId) {
    [rows] = await pool.query(
      "SELECT * FROM focus_sessions ORDER BY date DESC, id DESC"
    );
  } else {
    [rows] = await pool.query(
      "SELECT * FROM focus_sessions WHERE userId = ? ORDER BY date DESC, id DESC",
      [Number(userId)]
    );
  }

  return rows;
}

async function create(data) {
  const [result] = await pool.query(
    `INSERT INTO focus_sessions
      (userId, habitId, habitName, minutes, date)
     VALUES (?, ?, ?, ?, ?)`,
    [
      data.userId,
      data.habitId,
      data.habitName,
      data.minutes,
      data.date,
    ]
  );

  return findById(result.insertId);
}

async function findById(id) {
  const [rows] = await pool.query(
    "SELECT * FROM focus_sessions WHERE id = ? LIMIT 1",
    [id]
  );

  return rows[0] || null;
}

module.exports = {
  find,
  create,
  findById,
};
=======
// Focus sessions data-access layer (PostgreSQL on Supabase).
// camelCase columns are double-quoted — Postgres lowercases unquoted names.
const { pool } = require("../config/db");

// A user's sessions, newest first.
async function findByUser(userId) {
  const [rows] = await pool.query(
    'SELECT * FROM focus_sessions WHERE "userId" = ? ORDER BY id DESC',
    [Number(userId)]
  );
  return rows;
}

async function create({ userId, habitId, habitName, minutes, date }) {
  const [rows] = await pool.query(
    `INSERT INTO focus_sessions ("userId", "habitId", "habitName", minutes, date)
     VALUES (?, ?, ?, ?, ?) RETURNING id`,
    [userId, habitId, habitName, minutes, date]
  );
  const [s] = await pool.query("SELECT * FROM focus_sessions WHERE id = ?", [rows[0].id]);
  return s[0];
}

module.exports = { findByUser, create };
>>>>>>> 189b85227e2c974ee0574a4a4bc4b50171a4a331
