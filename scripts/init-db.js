// scripts/init-db.js
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const connectionString = process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/postgres";

const pool = new Pool({
  connectionString,
});

async function initDB() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Extension PostGIS remota (ignorado para entorno local sin binarios)
    // await client.query(`CREATE EXTENSION IF NOT EXISTS postgis;`);

    // Crear tabla administrators
    await client.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        nombre VARCHAR(255) NOT NULL DEFAULT '',
        role VARCHAR(50) NOT NULL CHECK (role IN ('administrador', 'estratega', 'lider')) DEFAULT 'lider',
        activo INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Crear tabla ciudadanos (modificada para Inteligencia Territorial)
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
    
    // Índice espacial requiere PostGIS - Omitido localmente
    // await client.query(`CREATE INDEX IF NOT EXISTS ciudadanos_geom_idx ON ciudadanos USING GIST (ubicacion_geom);`);

    // Crear tabla Diccionario Keywords
    await client.query(`
      CREATE TABLE IF NOT EXISTS diccionario_keywords (
        id SERIAL PRIMARY KEY,
        palabra VARCHAR(100) NOT NULL UNIQUE,
        categoria VARCHAR(100) NOT NULL,
        peso INTEGER DEFAULT 1
      );
    `);

    // --- NUEVAS TABLAS DE REFERENCIA TERRITORIAL ---

    // Tabla de Comunas
    await client.query(`
      CREATE TABLE IF NOT EXISTS comunas (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL UNIQUE
      );
    `);

    // Tabla de Barrios
    await client.query(`
      CREATE TABLE IF NOT EXISTS barrios (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        comuna_id INTEGER NOT NULL REFERENCES comunas(id) ON DELETE CASCADE,
        UNIQUE(nombre, comuna_id)
      );
    `);

    // Tabla de Problemáticas Sociales (Lista maestra para el formulario)
    await client.query(`
      CREATE TABLE IF NOT EXISTS problematicas_sociales (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL UNIQUE
      );
    `);

    // Modificar Puestos de Votación para incluir relación con Comuna
    await client.query(`
      CREATE TABLE IF NOT EXISTS puestos_votacion (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        comuna_id INTEGER REFERENCES comunas(id) ON DELETE SET NULL,
        votos_historicos INTEGER DEFAULT 0
      );
    `);

    // Tabla sectores (vincular a Comuna y Barrio)
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // --- SENTINEL: INTELIGENCIA VIRAL ---
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

    // Tabla de configuracion
    await client.query(`
      CREATE TABLE IF NOT EXISTS config (
        clave VARCHAR(100) PRIMARY KEY,
        valor TEXT NOT NULL
      );
    `);

    // Semillas
    const hashAdmin = bcrypt.hashSync("admin123", 10);
    const hashEstratega = bcrypt.hashSync("estratega123", 10);
    const hashLider = bcrypt.hashSync("lider123", 10);
    
    await client.query(`
      INSERT INTO admins (email, password, nombre, role) 
      VALUES ($1, $2, $3, $4) 
      ON CONFLICT (email) DO NOTHING
    `, ["admin@cenplus.com", hashAdmin, "Administrador Sistema", "administrador"]);

    await client.query(`
      INSERT INTO admins (email, password, nombre, role) 
      VALUES ($1, $2, $3, $4) 
      ON CONFLICT (email) DO NOTHING
    `, ["estratega@cenplus.com", hashEstratega, "Analista Principal", "estratega"]);

    await client.query(`
      INSERT INTO admins (email, password, nombre, role) 
      VALUES ($1, $2, $3, $4) 
      ON CONFLICT (email) DO NOTHING
    `, ["lider@cenplus.com", hashLider, "Líder de Zona", "lider"]);

    // Semillas config
    await client.query(`
      INSERT INTO config (clave, valor) 
      VALUES ('meta_global', '1000') 
      ON CONFLICT (clave) DO NOTHING
    `);

    // Semillas de Comunas y Barrios (extraídas de geoData.ts)
    const comunasSeed = [
      { nombre: "Comuna 1 - Popular", barrios: ["Santo Domingo", "Popular", "Granizal"] },
      { nombre: "Comuna 2 - Santa Cruz", barrios: ["Santa Cruz", "La Isla", "Playón de los Comuneros"] },
      { nombre: "Comuna 3 - Manrique", barrios: ["Manrique Central", "El Raizal", "Versalles"] },
      { nombre: "Comuna 4 - Aranjuez", barrios: ["Aranjuez", "Berlín", "San Cayetano"] },
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

    // Semillas de Problemáticas Sociales
    const problematicasSeed = [
      "Falta de Iluminación",
      "Inseguridad / Robos",
      "Estado de Vías",
      "Recolección de Basuras",
      "Desempleo",
      "Acceso a Salud",
      "Drogadicción"
    ];

    for (const p of problematicasSeed) {
      await client.query("INSERT INTO problematicas_sociales (nombre) VALUES ($1) ON CONFLICT DO NOTHING", [p]);
    }

    // Semillas de Puestos de Votación
    const puestosSeed = [
      "Institución Educativa Técnica",
      "Parroquia San Judas",
      "Polideportivo Municipal",
      "Cárcel de Mujeres",
      "Casa de la Cultura"
    ];

    for (const p of puestosSeed) {
      await client.query("INSERT INTO puestos_votacion (nombre) VALUES ($1) ON CONFLICT DO NOTHING", [p]);
    }

    await client.query('COMMIT');
    console.log("🚀 Base de datos PostgreSQL inicializada con Estructura Territorial Dinámica.");
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("❌ Error inicializando DB:", error);
  } finally {
    client.release();
    pool.end();
  }
}

initDB();
