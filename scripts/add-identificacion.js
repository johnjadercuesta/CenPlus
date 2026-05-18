const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Cargar .env.local manualmente
const envPath = path.join(__dirname, '../.env.local');
let databaseUrl = process.env.DATABASE_URL;

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const lines = envContent.split('\n');
  for (const line of lines) {
    if (line.startsWith('DATABASE_URL=')) {
      databaseUrl = line.split('=')[1].trim().replace(/^"|"$/g, '');
      break;
    }
  }
}

if (!databaseUrl) {
  console.error("Error: DATABASE_URL no encontrada en el entorno ni en .env.local");
  process.exit(1);
}

const pool = new Pool({
  connectionString: databaseUrl,
});

async function run() {
  const client = await pool.connect();
  try {
    // 1. Crear o actualizar tabla global public.user_tenants
    console.log("Verificando public.user_tenants...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.user_tenants (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        tenant VARCHAR(63) NOT NULL,
        identificacion VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Si ya existía, intentar añadir la columna por si acaso
    try {
      await client.query(`
        ALTER TABLE public.user_tenants 
        ADD COLUMN IF NOT EXISTS identificacion VARCHAR(50)
      `);
    } catch (e) {
      // Ignorar si ya existe o falla por otra razón
    }
    
    await client.query(`
      UPDATE public.user_tenants 
      SET identificacion = email 
      WHERE identificacion IS NULL
    `);
    
    console.log("✅ public.user_tenants lista.");

    // 2. Obtener todos los esquemas (tenants)
    const { rows: schemas } = await client.query(`
      SELECT schema_name FROM information_schema.schemata
      WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast', 'public') AND schema_name NOT LIKE 'pg_%'
    `);

    console.log(`Encontrados ${schemas.length} esquemas.`);

    for (const schema of schemas) {
      const schemaName = schema.schema_name;
      console.log(`Procesando esquema: ${schemaName}`);

      await client.query(`
        ALTER TABLE "${schemaName}".admins 
        ADD COLUMN IF NOT EXISTS identificacion VARCHAR(50) UNIQUE
      `);
      
      await client.query(`
        UPDATE "${schemaName}".admins 
        SET identificacion = email 
        WHERE identificacion IS NULL
      `);

      console.log(`✅ Columna identificacion añadida y poblada en ${schemaName}.admins`);
    }

    console.log("Proceso completado con éxito.");
  } catch (error) {
    console.error("Error ejecutando migración:", error);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
