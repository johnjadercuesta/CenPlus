// scripts/init-tenant.js
// Crea un esquema para un tenant y ejecuta las migraciones/seeds dentro de ese esquema.
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const connectionString = process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/postgres";
const tenant = process.argv[2] || process.env.TENANT;

if (!tenant) {
  console.error('Uso: node scripts/init-tenant.js <tenantName>  (o exportar TENANT)');
  process.exit(1);
}

// Validar nombre simple para evitar inyección
if (!/^[a-zA-Z0-9_\-]+$/.test(tenant)) {
  console.error('Nombre de tenant inválido. Use solo letras, números, guiones o guion_bajo.');
  process.exit(1);
}

const pool = new Pool({ connectionString });

async function initTenant() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Crear esquema y usarlo
    await client.query(`CREATE SCHEMA IF NOT EXISTS "${tenant}"`);
    await client.query(`SET search_path TO "${tenant}", public`);

    // Copiar las mismas creaciones de tablas que init-db.js pero dentro del esquema
    await client.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        identificacion VARCHAR(50),
        password VARCHAR(255) NOT NULL,
        nombre VARCHAR(255) NOT NULL DEFAULT '',
        role VARCHAR(50) NOT NULL CHECK (role IN ('administrador', 'estratega', 'lider')) DEFAULT 'lider',
        activo INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS ciudadanos (
        id SERIAL PRIMARY KEY,
        id_unico VARCHAR(50) NOT NULL UNIQUE,
        nombre_completo VARCHAR(255) NOT NULL,
        telefono VARCHAR(50),
        sexo VARCHAR(20) CHECK (sexo IN ('Masculino', 'Femenino', 'Otro')),
        edad INTEGER CHECK (edad > 0 AND edad < 150),
        nivel_estudios VARCHAR(100) CHECK (nivel_estudios IN (
                          'Ninguno', 'Primaria', 'Secundaria',
                          'Técnico', 'Universitario', 'Posgrado')),
        ocupacion VARCHAR(255),
        regimen_salud VARCHAR(100) CHECK (regimen_salud IN ('Subsidiado', 'Contributivo', 'Ninguno', 'Otro')),
        puesto_votacion VARCHAR(255),
        problematica_principal VARCHAR(255),
        id_comuna INTEGER,
        id_barrio INTEGER,
        barrio VARCHAR(255) NOT NULL,
        corregimiento VARCHAR(255) NOT NULL,
        vereda VARCHAR(255),
        es_lider INTEGER DEFAULT 0,
        nombre_lider VARCHAR(255),
        lider_id INTEGER REFERENCES admins(id),
        latitud DOUBLE PRECISION,
        longitud DOUBLE PRECISION,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`CREATE INDEX IF NOT EXISTS idx_ced ON ciudadanos(id_unico);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_barrio ON ciudadanos(barrio);`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS diccionario_keywords (
        id SERIAL PRIMARY KEY,
        palabra VARCHAR(100) NOT NULL UNIQUE,
        categoria VARCHAR(100) NOT NULL,
        peso INTEGER DEFAULT 1
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS comunas (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL UNIQUE
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS barrios (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        comuna_id INTEGER NOT NULL REFERENCES comunas(id) ON DELETE CASCADE,
        UNIQUE(nombre, comuna_id)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS problematicas_sociales (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL UNIQUE
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS puestos_votacion (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        comuna_id INTEGER REFERENCES comunas(id) ON DELETE SET NULL,
        votos_historicos INTEGER DEFAULT 0
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS sectores (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        comuna_id INTEGER REFERENCES comunas(id) ON DELETE SET NULL,
        barrio_id INTEGER REFERENCES barrios(id) ON DELETE SET NULL,
        votos_historicos INTEGER DEFAULT 0,
        meta INTEGER NOT NULL DEFAULT 100,
        latitud DOUBLE PRECISION NOT NULL,
        longitud DOUBLE PRECISION NOT NULL,
        radio DOUBLE PRECISION NOT NULL DEFAULT 2000,
        poligono TEXT,
        color VARCHAR(50) NOT NULL DEFAULT '#3b82f6',
        activo INTEGER NOT NULL DEFAULT 1,
        descripcion TEXT,
        zona VARCHAR(50) DEFAULT 'urbana',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS global_trends (
        id SERIAL PRIMARY KEY,
        topic VARCHAR(255) NOT NULL,
        platform VARCHAR(50) NOT NULL,
        metrics JSONB DEFAULT '{}',
        sentiment_score DOUBLE PRECISION DEFAULT 0,
        heat_index DOUBLE PRECISION DEFAULT 0,
        region VARCHAR(100) DEFAULT 'Colombia/Antioquia',
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_trends_metrics ON global_trends USING GIN (metrics);`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS influencer_rankings (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        platform VARCHAR(50) NOT NULL,
        handle VARCHAR(100),
        engagement_rate DOUBLE PRECISION DEFAULT 0,
        impact_score DOUBLE PRECISION DEFAULT 0,
        replication_ratio DOUBLE PRECISION DEFAULT 1.0,
        trending_topic_id INTEGER REFERENCES global_trends(id) ON DELETE SET NULL,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_influencer_impact ON influencer_rankings (impact_score DESC);`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS sentinel_alerts_history (
        id SERIAL PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        platform_id VARCHAR(50) NOT NULL,
        platform_name VARCHAR(255) NOT NULL,
        topic VARCHAR(255) NOT NULL,
        intensity DOUBLE PRECISION NOT NULL,
        location VARCHAR(255) DEFAULT 'Colombia',
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_alert_timestamp ON sentinel_alerts_history (timestamp DESC);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_alert_platform ON sentinel_alerts_history (platform_id);`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS config (
        clave VARCHAR(100) PRIMARY KEY,
        valor TEXT NOT NULL
      );
    `);

    // Seeds: admin users
    const hashAdmin = bcrypt.hashSync("admin123", 10);
    const hashEstratega = bcrypt.hashSync("estratega123", 10);
    const hashLider = bcrypt.hashSync("lider123", 10);

    await client.query(`
      INSERT INTO admins (email, identificacion, password, nombre, role) 
      VALUES ($1, $2, $3, $4, $5) 
      ON CONFLICT (email) DO NOTHING
    `, ["admin@cenplus.com", "admin@cenplus.com", hashAdmin, "Administrador Sistema", "administrador"]);

    await client.query(`
      INSERT INTO admins (email, identificacion, password, nombre, role) 
      VALUES ($1, $2, $3, $4, $5) 
      ON CONFLICT (email) DO NOTHING
    `, ["estratega@cenplus.com", "estratega@cenplus.com", hashEstratega, "Analista Principal", "estratega"]);

    await client.query(`
      INSERT INTO admins (email, identificacion, password, nombre, role) 
      VALUES ($1, $2, $3, $4, $5) 
      ON CONFLICT (email) DO NOTHING
    `, ["lider@cenplus.com", "lider@cenplus.com", hashLider, "Líder de Zona", "lider"]);

    await client.query(`
      INSERT INTO config (clave, valor) 
      VALUES ('meta_global', '1000') 
      ON CONFLICT (clave) DO NOTHING
    `);

    // Seed simple comunas/barrios
    const comunasSeed = [
      { nombre: "Comuna 1 - Popular", barrios: ["Santo Domingo", "Popular", "Granizal"] },
      { nombre: "Comuna 2 - Santa Cruz", barrios: ["Santa Cruz", "La Isla", "Playón de los Comuneros"] }
    ];

    for (const c of comunasSeed) {
      const { rows: cRow } = await client.query(
        "INSERT INTO comunas (nombre) VALUES ($1) ON CONFLICT (nombre) DO UPDATE SET nombre = EXCLUDED.nombre RETURNING id",
        [c.nombre]
      );
      const cId = cRow[0].id;
      for (const b of c.barrios) {
        await client.query(
          "INSERT INTO barrios (nombre, comuna_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
          [b, cId]
        );
      }
    }

    await client.query('COMMIT');
    console.log(`✅ Esquema y datos inicializados para tenant: ${tenant}`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("❌ Error inicializando tenant:", error.message || error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

initTenant();
