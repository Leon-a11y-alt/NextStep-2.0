// One-off setup script: creates the tables and seed data on Supabase by
// running schema.sql. Safe to re-run (it recreates the tables each time).
//
// Usage:  npm run db:init   (from the backend folder)
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is missing. Copy it from the Supabase dashboard " +
      "(Project Settings → Database → Connection string) into backend/.env"
    );
  }

  const sql = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }, // Supabase requires SSL
  });

  console.log("Connecting to Supabase ...");
  await client.connect();
  console.log("Running schema.sql ...");
  await client.query(sql); // pg runs the whole multi-statement file in one go
  await client.end();
  console.log("Database ready: tables created and seed data inserted.");
}

main().catch((err) => {
  console.error("db:init failed:", err.message);
  process.exit(1);
});
