// Calendar tasks data-access layer (PostgreSQL on Supabase).
// camelCase columns are double-quoted — Postgres lowercases unquoted names.
const { pool } = require("../config/db");

async function find(userId) {
  let rows;
  if (userId === undefined || userId === null || userId === "") {
    [rows] = await pool.query("SELECT * FROM calendar_tasks ORDER BY id");
  } else {
    [rows] = await pool.query(
      'SELECT * FROM calendar_tasks WHERE "userId" = ? ORDER BY id',
      [Number(userId)]
    );
  }
  return rows;
}

async function findById(id) {
  const [rows] = await pool.query("SELECT * FROM calendar_tasks WHERE id = ? LIMIT 1", [id]);
  return rows[0] || null;
}

async function create(data) {
  const [rows] = await pool.query(
    `INSERT INTO calendar_tasks ("userId", "habitId", "planId", title, date, time, completed)
     VALUES (?, ?, ?, ?, ?, ?, FALSE) RETURNING id`,
    [data.userId, data.habitId, data.planId, data.title, data.date, data.time]
  );
  return findById(rows[0].id);
}

async function update(id, fields) {
  const sets = [];
  const params = [];
  if (fields.completed !== undefined) {
    sets.push("completed = ?");
    params.push(fields.completed ? true : false); // Postgres has real booleans
  }
  for (const key of ["title", "date", "time"]) {
    if (fields[key] !== undefined) {
      sets.push(`"${key}" = ?`);
      params.push(fields[key]);
    }
  }
  if (sets.length) {
    params.push(id);
    await pool.query(`UPDATE calendar_tasks SET ${sets.join(", ")} WHERE id = ?`, params);
  }
  return findById(id);
}

async function remove(id) {
  const task = await findById(id);
  if (!task) return null;
  await pool.query("DELETE FROM calendar_tasks WHERE id = ?", [id]);
  return task;
}

async function count() {
  const [rows] = await pool.query("SELECT COUNT(*)::int AS n FROM calendar_tasks");
  return rows[0].n;
}

module.exports = { find, findById, create, update, remove, count };
