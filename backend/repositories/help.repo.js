// Study Help data-access layer (PostgreSQL on Supabase).
// Done by Khaing Khant Zaw.
const { pool } = require("../config/db");

// All NetAcad courses in our catalogue.
async function listCourses() {
  const [rows] = await pool.query("SELECT * FROM netacad_courses ORDER BY id");
  return rows;
}

// Have we answered this exact question before? (case-insensitive)
async function findCached(query) {
  const [rows] = await pool.query(
    "SELECT * FROM recommendations WHERE LOWER(query) = LOWER(?) LIMIT 1",
    [query]
  );
  return rows[0] || null;
}

// Save an answer so the next same question is instant.
async function saveCache(query, results) {
  await pool.query(
    'INSERT INTO recommendations (query, results, "createdAt") VALUES (?, ?, ?)',
    [query, JSON.stringify(results), new Date().toISOString().slice(0, 10)]
  );
}

module.exports = { listCourses, findCached, saveCache };
