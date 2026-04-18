/**
 * create_trendsmap_table.js
 *
 * Crea la tabla `trendsmap_entries` con columnas básicas y los índices necesarios.
 * Uso: node scripts/create_trendsmap_table.js
 */

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
    console.log('🔧 Creando tabla trendsmap_entries (si no existe)...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS trendsmap_entries (
        id SERIAL PRIMARY KEY,
        text TEXT NOT NULL,
        hashtags TEXT[] DEFAULT '{}',
        latitude DOUBLE PRECISION NOT NULL,
        longitude DOUBLE PRECISION NOT NULL,
        pais VARCHAR(100) DEFAULT 'Colombia',
        departamento VARCHAR(100),
        municipio VARCHAR(100),
        expires_at TIMESTAMP WITH TIME ZONE,
        verificado BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    await client.query(`CREATE INDEX IF NOT EXISTS idx_trendsmap_lat_lng ON trendsmap_entries(latitude, longitude);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_trendsmap_depto ON trendsmap_entries(departamento);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_trendsmap_municipio ON trendsmap_entries(municipio);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_trendsmap_created ON trendsmap_entries(created_at DESC);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_trendsmap_hashtags ON trendsmap_entries USING GIN(hashtags);`);

    console.log('✅ Tabla trendsmap_entries y índices creados/asegurados');
  } catch (err) {
    console.error('❌ Error creando tabla trendsmap_entries:', err.message || err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})();
