const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function migrate() {
  console.log("🚀 Iniciando migración de base de datos...");
  
  if (!process.env.DATABASE_URL) {
    console.error("❌ Error: No se encontró DATABASE_URL en .env.local");
    return;
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const client = await pool.connect();
    console.log("📡 Conectado a la base de datos...");

    await client.query(`
      CREATE TABLE IF NOT EXISTS public.tenants_config (
        tenant VARCHAR(63) PRIMARY KEY,
        primary_color VARCHAR(7) DEFAULT '#3b82f6',
        secondary_color VARCHAR(7) DEFAULT '#6366f1',
        logo_url TEXT,
        config JSONB DEFAULT '{}',
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("✅ Tabla 'public.tenants_config' creada o ya existente.");

    await client.query(`
      CREATE TABLE IF NOT EXISTS public.user_tenants (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        tenant VARCHAR(63) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("✅ Tabla 'public.user_tenants' verificada.");

    client.release();
    console.log("✨ Migración completada con éxito.");
  } catch (err) {
    console.error("❌ Error durante la migración:", err.message);
  } finally {
    await pool.end();
  }
}

migrate();
