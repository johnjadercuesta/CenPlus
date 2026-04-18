const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/postgres" });

async function migrate() {
  try {
    console.log("Adding comuna_id and barrio_id to sectores...");
    await pool.query(`
      ALTER TABLE sectores ADD COLUMN IF NOT EXISTS comuna_id INTEGER REFERENCES comunas(id) ON DELETE SET NULL;
      ALTER TABLE sectores ADD COLUMN IF NOT EXISTS barrio_id INTEGER REFERENCES barrios(id) ON DELETE SET NULL;
    `);
    console.log("Migration completed.");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    pool.end();
  }
}

migrate();
