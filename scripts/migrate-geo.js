const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/postgres" });

async function migrate() {
  try {
    console.log("Migrating tables for multilevel geography...");
    
    // Add columns to global_trends if they don't exist
    await pool.query(`
      ALTER TABLE global_trends 
      ADD COLUMN IF NOT EXISTS pais VARCHAR(100) DEFAULT 'Colombia',
      ADD COLUMN IF NOT EXISTS departamento VARCHAR(100),
      ADD COLUMN IF NOT EXISTS ciudad VARCHAR(100);
    `);

    // Add columns to sentinel_alerts_history
    await pool.query(`
      ALTER TABLE sentinel_alerts_history 
      ADD COLUMN IF NOT EXISTS pais VARCHAR(100) DEFAULT 'Colombia',
      ADD COLUMN IF NOT EXISTS departamento VARCHAR(100),
      ADD COLUMN IF NOT EXISTS ciudad VARCHAR(100);
    `);

    console.log("Migration completed successfully.");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    pool.end();
  }
}

migrate();
