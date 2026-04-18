const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/postgres" });

async function migrate() {
  try {
    console.log("Adding zona column to sectores and ciudadanos...");
    await pool.query(`
      ALTER TABLE sectores ADD COLUMN IF NOT EXISTS zona VARCHAR(50) DEFAULT 'urbana';
      ALTER TABLE ciudadanos ADD COLUMN IF NOT EXISTS zona VARCHAR(50) DEFAULT 'urbana';
    `);
    console.log("Migration completed.");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    pool.end();
  }
}

migrate();
