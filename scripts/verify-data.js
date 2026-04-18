const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/postgres" });

async function check() {
  try {
    const { rows } = await pool.query('SELECT count(*) FROM global_trends');
    console.log('Trends count:', rows[0].count);
    const { rows: sample } = await pool.query('SELECT * FROM global_trends LIMIT 20');
    console.log('Sample topics:', sample.map(r => `${r.topic} (${r.platform}) - ${r.pais}`));
  } catch (err) {
    console.error('Check failed:', err);
  } finally {
    pool.end();
  }
}

check();
