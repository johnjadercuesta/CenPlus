/**
 * init-sip-tables.js
 * Inicializa las tablas requeridas para SIP (Sistema de Inteligencia Poblacional)
 * 
 * Ejecutar: node scripts/init-sip-tables.js
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'cenplus_db',
});

async function initSIPTables() {
  const client = await pool.connect();

  try {
    console.log('🔧 Initializing SIP (Sistema de Inteligencia Poblacional) tables...\n');

    // 1️⃣ TABLA: demographic_crossing
    // Tabla de cruce: relaciona datos de web/redes con datos demográficos del DANE
    console.log('📊 Creating demographic_crossing table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS demographic_crossing (
        id SERIAL PRIMARY KEY,
        municipio VARCHAR(100) NOT NULL,
        departamento VARCHAR(100) NOT NULL,
        keyword VARCHAR(100) NOT NULL,
        category VARCHAR(50),
        
        -- Datos de web/redes
        mention_count INT DEFAULT 0,
        source_count INT DEFAULT 0,
        verified_count INT DEFAULT 0,
        
        -- Datos censales DANE (población)
        total_population INT,
        adult_population INT, -- 18+
        elderly_population INT, -- 60+
        youth_population INT, -- 14-25
        
        -- Impacto calculado
        urgency_score DECIMAL(5, 2), -- 1-100
        impact_ratio DECIMAL(8, 4), -- menciones / población adulta
        confidence DECIMAL(3, 2), -- 0-1
        trending_direction VARCHAR(10), -- 'up', 'down', 'stable'
        decision_level VARCHAR(20), -- 'critical', 'high', 'medium', 'low'
        
        -- Metadata
        analyzed_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_demographic_crossing_municipio 
        ON demographic_crossing(municipio);
      CREATE INDEX IF NOT EXISTS idx_demographic_crossing_keyword 
        ON demographic_crossing(keyword);
      CREATE INDEX IF NOT EXISTS idx_demographic_crossing_urgency 
        ON demographic_crossing(urgency_score DESC);
      CREATE INDEX IF NOT EXISTS idx_demographic_crossing_decision 
        ON demographic_crossing(decision_level);
      CREATE INDEX IF NOT EXISTS idx_demographic_crossing_analyzed 
        ON demographic_crossing(analyzed_at DESC);
    `);
    console.log('✅ demographic_crossing table created\n');

    // 2️⃣ TABLA: keyword_weights
    // Diccionario de palabras clave con pesos de urgencia
    console.log('📋 Creating keyword_weights table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS keyword_weights (
        id SERIAL PRIMARY KEY,
        keyword VARCHAR(100) UNIQUE NOT NULL,
        category VARCHAR(50) NOT NULL, 
        urgency_weight INT CHECK (urgency_weight >= 1 AND urgency_weight <= 10),
        decay_hours INT DEFAULT 48,
        multiplier DECIMAL(3, 2) DEFAULT 1.0,
        active BOOLEAN DEFAULT true,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_keyword_weights_keyword ON keyword_weights(keyword);
      CREATE INDEX IF NOT EXISTS idx_keyword_weights_active ON keyword_weights(active);
      CREATE INDEX IF NOT EXISTS idx_keyword_weights_category ON keyword_weights(category);
    `);
    console.log('✅ keyword_weights table created\n');

    // 3️⃣ TABLA: admin_priority_matrix
    // Vista administrativa: municipios ordenados por urgencia / tendencia hacia arriba
    console.log('📌 Creating admin_priority_matrix table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_priority_matrix (
        id SERIAL PRIMARY KEY,
        municipio VARCHAR(100) NOT NULL,
        departamento VARCHAR(100) NOT NULL,
        
        -- Resumen de urgencia
        max_urgency_score DECIMAL(5, 2),
        top_crisis_keyword VARCHAR(100),
        crisis_count INT DEFAULT 0, -- cuántas palabras clave en nivel 'critical'
        
        -- Tendencia
        trending_up_count INT DEFAULT 0,
        trending_down_count INT DEFAULT 0,
        
        -- Matriz de decisión
        admin_action_required BOOLEAN DEFAULT false,
        priority_rank INT,
        
        -- Población
        adult_population INT,
        
        -- Metadata
        calculated_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_admin_priority_matrix_municipio 
        ON admin_priority_matrix(municipio);
      CREATE INDEX IF NOT EXISTS idx_admin_priority_matrix_priority_rank 
        ON admin_priority_matrix(priority_rank);
      CREATE INDEX IF NOT EXISTS idx_admin_priority_matrix_admin_action 
        ON admin_priority_matrix(admin_action_required);
    `);
    console.log('✅ admin_priority_matrix table created\n');

    // 4️⃣ TABLA: sip_hourly_snapshot
    // Snapshot del SIP cada hora para análisis histórico
    console.log('⏰ Creating sip_hourly_snapshot table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS sip_hourly_snapshot (
        id SERIAL PRIMARY KEY,
        snapshot_hour TIMESTAMP NOT NULL,
        municipio VARCHAR(100) NOT NULL,
        
        total_mentions INT,
        critical_count INT,
        high_count INT,
        top_5_keywords VARCHAR(500),
        
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_sip_snapshot_hour ON sip_hourly_snapshot(snapshot_hour);
      CREATE INDEX IF NOT EXISTS idx_sip_snapshot_municipio ON sip_hourly_snapshot(municipio);
    `);
    console.log('✅ sip_hourly_snapshot table created\n');

    // 5️⃣ INSERTAR diccionario de urgencia base
    console.log('📚 Populating urgency dictionary...');
    const urgencyDictionary = [
      // SEGURIDAD
      ['homicidio', 'seguridad', 10, 24, 3.0, 'Tasa de homicidios registrados'],
      ['asesinato', 'seguridad', 10, 24, 3.0, 'Reportes de asesinatos'],
      ['violencia', 'seguridad', 9, 48, 2.5, 'Actos violentos generales'],
      ['inseguridad', 'seguridad', 8, 48, 2.0, 'Percepción de inseguridad'],
      ['delito', 'seguridad', 8, 48, 2.0, 'Actividades delictivas'],
      ['pandilla', 'seguridad', 9, 48, 2.5, 'Actividad de grupos armados'],
      
      // SERVICIOS
      ['falta agua', 'servicios', 9, 24, 2.5, 'Falta de suministro de agua'],
      ['corte agua', 'servicios', 9, 24, 2.5, 'Corte del suministro de agua'],
      ['apagón', 'servicios', 8, 24, 2.0, 'Falta de electricidad'],
      
      // SALUD
      ['hambre', 'salud', 10, 24, 3.0, 'Inseguridad alimentaria'],
      ['desnutrición', 'salud', 9, 24, 2.5, 'Malnutrición de población'],
      ['epidemia', 'salud', 10, 12, 3.0, 'Brotes epidemiológicos'],
      
      // EMPLEO
      ['desempleo', 'empleo', 7, 72, 1.5, 'Falta de empleo'),
      ['paro', 'empleo', 7, 72, 1.5, 'Paros laborales'),
      ['protesta', 'empleo', 8, 48, 2.0, 'Manifestaciones'],
      
      // POLÍTICA
      ['elecciones', 'politica', 6, 168, 1.3, 'Procesos electorales'],
    ];

    for (const [keyword, category, weight, decay, multiplier, description] of urgencyDictionary) {
      await client.query(
        `INSERT INTO keyword_weights (keyword, category, urgency_weight, decay_hours, multiplier, description)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (keyword) DO UPDATE SET 
         urgency_weight = $3, multiplier = $5, description = $6`,
        [keyword, category, weight, decay, multiplier, description]
      );
    }
    console.log('✅ Urgency dictionary populated with', urgencyDictionary.length, 'keywords\n');

    // 6️⃣ Crear vistas útiles
    console.log('🔍 Creating useful views...');
    
    // Vista: Crisis actuales (urgency >= 60)
    await client.query(`
      CREATE OR REPLACE VIEW v_active_crisis AS
      SELECT 
        municipio, 
        keyword, 
        urgency_score,
        decision_level,
        trending_direction,
        impact_ratio,
        mention_count,
        adult_population,
        analyzed_at
      FROM demographic_crossing
      WHERE urgency_score >= 60
      ORDER BY urgency_score DESC, analyzed_at DESC;
    `);
    console.log('✅ v_active_crisis view created');

    // Vista: Top municipios por urgencia
    await client.query(`
      CREATE OR REPLACE VIEW v_top_municipalities_by_urgency AS
      SELECT 
        municipio,
        COUNT(*) as crisis_count,
        MAX(urgency_score) as max_urgency,
        AVG(urgency_score) as avg_urgency,
        COUNT(CASE WHEN trending_direction = 'up' THEN 1 END) as trending_up_count
      FROM demographic_crossing
      WHERE urgency_score >= 40
      GROUP BY municipio
      ORDER BY avg_urgency DESC;
    `);
    console.log('✅ v_top_municipalities_by_urgency view created\n');

    console.log('✅✅✅ SIP TABLES INITIALIZED SUCCESSFULLY! ✅✅✅');
    console.log('\nTablas creadas:');
    console.log('  - demographic_crossing (cruce web/censo/urgencia)');
    console.log('  - keyword_weights (diccionario de urgencia)');
    console.log('  - admin_priority_matrix (matriz de decisión)');
    console.log('  - sip_hourly_snapshot (histórico horario)');
    console.log('\nNext: Ejecutar scripts de scrapers de datos');
    console.log('  - Meta Ads Library integration');
    console.log('  - Government data scraper');
    console.log('  - Google Trends integration');
  } catch (err) {
    console.error('❌ Error initializing SIP tables:', err);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
}

initSIPTables();
