// Users data-access layer (PostgreSQL on Supabase).
// camelCase columns are double-quoted — Postgres lowercases unquoted names.
const { pool } = require("../config/db");

async function findByEmail(email) {
  const [rows] = await pool.query(
    "SELECT * FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1",
    [email]
  );
  return rows[0] || null;
}

async function findById(id) {
  const [rows] = await pool.query("SELECT * FROM users WHERE id = ? LIMIT 1", [id]);
  return rows[0] || null;
}

async function listAll() {
  const [rows] = await pool.query("SELECT * FROM users ORDER BY id");
  return rows;
}

async function create({ name, email, password, yearLevel, diploma, role, createdAt }) {
  const [rows] = await pool.query(
    `INSERT INTO users (name, email, password, "yearLevel", diploma, role, "createdAt")
     VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id`,
    [name, email, password, yearLevel, diploma, role, createdAt]
  );
  return findById(rows[0].id);
}

async function updateRole(id, role) {
  await pool.query("UPDATE users SET role = ? WHERE id = ?", [role, id]);
  return findById(id);
}

async function count() {
  const [rows] = await pool.query("SELECT COUNT(*)::int AS n FROM users");
  return rows[0].n;
}

module.exports = { findByEmail, findById, listAll, create, updateRole, count };
