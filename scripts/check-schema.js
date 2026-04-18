const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/postgres" });

async function checkSchema() {
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
