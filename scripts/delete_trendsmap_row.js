const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
  database: process.env.DB_NAME || 'cenplus_db',
});

(async () => {
  const client = await pool.connect();
  try {
    const id = process.argv[2] ? Number(process.argv[2]) : 4511;
    console.log('Deleting id', id);
    const res = await client.query('DELETE FROM trendsmap_entries WHERE id = $1 RETURNING id', [id]);
    console.log('DELETED_ROWS:', res.rows);
    const check = await client.query('SELECT id FROM trendsmap_entries WHERE id = $1', [id]);
    console.log('AFTER_SELECT:', check.rows);
    process.exit(0);
  } catch (err) {
    console.error('ERR', err.message || err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
})();
