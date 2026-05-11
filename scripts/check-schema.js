const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/postgres" });

function sanitizeTenant(raw) {
  if (!raw) return null;
  const t = String(raw).trim().toLowerCase();
  if (!/^[a-z0-9_]+$/.test(t)) return null;
  if (t.length === 0 || t.length > 63) return null;
  return t;
}

async function checkSchema() {
  const tenantArg = process.argv[2];
  const tenant = sanitizeTenant(tenantArg);
  if (tenant) {
    console.log(`Using tenant schema: ${tenant}`);
    await pool.query("SELECT pg_catalog.set_config('search_path', $1, false)", [tenant]);
  }

  const tables = ['global_trends', 'influencer_rankings', 'sentinel_alerts_history'];
  for (const t of tables) {
    const { rows } = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = $1
    `, [t]);
    console.log(`Table: ${t}`);
    console.table(rows);
  }
  pool.end();
}

checkSchema();
