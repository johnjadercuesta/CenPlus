/**
 * cleanup_trendsmap_expired.js
 *
 * Script para eliminar entradas expiradas de `trendsmap_entries`.
 * Ejecutar periódicamente con cron/task scheduler.
 *
 * node scripts/cleanup_trendsmap_expired.js
 */

const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'cenplus_db',
});

async function cleanup() {
  const client = await pool.connect();
  try {
    const res = await client.query(`DELETE FROM trendsmap_entries WHERE expires_at IS NOT NULL AND expires_at < NOW() RETURNING id`);
    console.log(`Deleted expired trends: ${res.rowCount}`);
  } catch (err) {
    console.error('Error cleaning expired trends:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

cleanup();
