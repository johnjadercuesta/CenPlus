/**
 * migrate_trendsmap_ttl.js
 *
 * Añade la columna `expires_at` a `trendsmap_entries` si no existe
 * y poblala usando `created_at + INTERVAL '<TRENDS_TTL_DAYS> days'`.
 *
 * Ejecutar: node scripts/migrate_trendsmap_ttl.js
 */

const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'cenplus_db',
});

async function migrate() {
  const client = await pool.connect();
  try {
    const ttlDays = Number(process.env.TRENDS_TTL_DAYS || 30);
    console.log(`🔁 Migrando trendsmap_entries: expires_at, TTL=${ttlDays} days`);

    await client.query(`ALTER TABLE trendsmap_entries ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;`);

    console.log('✅ Columna expires_at asegurada');

    // Poblamos filas existentes que no tienen expires_at
    const res = await client.query(`
      UPDATE trendsmap_entries
      SET expires_at = COALESCE(created_at, NOW()) + ($1 || ' days')::INTERVAL
      WHERE expires_at IS NULL
      RETURNING id
    `, [ttlDays]);

    console.log(`✅ Filas actualizadas: ${res.rowCount}`);

    await client.query(`CREATE INDEX IF NOT EXISTS idx_trendsmap_expires ON trendsmap_entries(expires_at);`);
    console.log('✅ Índice idx_trendsmap_expires creado');

    console.log('🎉 Migración completada');
  } catch (err) {
    console.error('❌ Error durante migración:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
