const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/postgres" });

async function migrate() {
  try {
    console.log("Adding coordinate columns to global_trends...");
    await pool.query(`
      ALTER TABLE global_trends 
      ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
    `);
    console.log("Migration completed.");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    pool.end();
  }
}

migrate();
