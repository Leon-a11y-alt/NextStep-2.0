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
