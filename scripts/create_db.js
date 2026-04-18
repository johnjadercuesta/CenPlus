/**
 * create_db.js
 *
 * Crea la base de datos configurada en DB_NAME (por defecto `cenplus_db`).
 * Uso: node scripts/create_db.js
 */

const { Pool } = require('pg');

const config = {
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
  database: 'postgres',
};

const pool = new Pool(config);

(async () => {
  const client = await pool.connect();
  try {
    const dbName = process.env.DB_NAME || 'cenplus_db';
    console.log(`🔎 Comprobando existencia de la base de datos '${dbName}'...`);
    const res = await client.query('SELECT 1 FROM pg_database WHERE datname=$1', [dbName]);
    if (res.rowCount === 0) {
      console.log(`⚙️  Creando base de datos '${dbName}'...`);
      await client.query(`CREATE DATABASE ${dbName}`);
      console.log(`✅ Base de datos '${dbName}' creada`);
    } else {
      console.log(`ℹ️  Base de datos '${dbName}' ya existe`);
    }
  } catch (err) {
    console.error('❌ Error creando base de datos:', err.message || err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})();
