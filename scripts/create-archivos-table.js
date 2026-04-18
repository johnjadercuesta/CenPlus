/**
 * create-archivos-table.js
 *
 * Crea la tabla `archivos_electorales` para almacenar snapshots de épocas electorales.
 * Uso: node scripts/create-archivos-table.js
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres@localhost:5432/postgres',
});

(async () => {
  const client = await pool.connect();
  try {
    console.log('Creando tabla archivos_electorales...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS archivos_electorales (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        descripcion TEXT,
        fecha_corte DATE NOT NULL,
        fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        total_ciudadanos INT DEFAULT 0,
        total_lideres INT DEFAULT 0,
        total_sectores INT DEFAULT 0,
        snapshot JSONB NOT NULL,
        creado_por INT REFERENCES admins(id)
      );
    `);

    await client.query(`CREATE INDEX IF NOT EXISTS idx_archivos_fecha ON archivos_electorales(fecha_corte DESC);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_archivos_creado_por ON archivos_electorales(creado_por);`);

    console.log('Tabla archivos_electorales creada exitosamente');
  } catch (err) {
    console.error('Error creando tabla archivos_electorales:', err.message || err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})();
