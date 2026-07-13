// PostgreSQL connection pool (pg) — the database lives on Supabase.
// Every repository imports { pool } from here and runs parameterised queries.
//
// The connection string comes from DATABASE_URL in backend/.env
// (Supabase dashboard → Project Settings → Database → Connection string).
require("dotenv").config();
const { Pool, types } = require("pg");

// Return DATE columns as plain "YYYY-MM-DD" strings instead of JS Date
// objects, so the JSON the API sends stays simple (1082 = the DATE type).
types.setTypeParser(1082, (value) => value);

const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Supabase requires SSL; this keeps it simple for the prototype.
  ssl: { rejectUnauthorized: false },
});

// Small helper so the repositories can keep the same style they used before:
//   const [rows] = await pool.query("SELECT ... WHERE id = ?", [id])
// It converts each "?" into Postgres-style $1, $2, ... automatically.
async function query(sql, params = []) {
  let n = 0;
  const converted = sql.replace(/\?/g, () => "$" + ++n);
  const result = await pgPool.query(converted, params);
  return [result.rows, result];
}

const pool = { query, end: () => pgPool.end() };

module.exports = { pool };
