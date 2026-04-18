/**
 * init-phase2-4-tables.js - FASE 2, 3, 4
 * 
 * Inicializa todas las tablas necesarias para:
 * - FASE 2: Integraciones reales (Meta, Google, Gov)
 * - FASE 3: Geointeligencia (PostGIS)
 * - FASE 4: Automatización (Alerts, Webhooks)
 * 
 * Ejecutar: node scripts/init-phase2-4-tables.js
 */

const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'cenplus_db',
});

async function initPhase2_4_Tables() {
  const client = await pool.connect();

  try {
    console.log('🔧 INICIALIZANDO TABLAS PARA FASES 2, 3, 4...\n');

    // ========== FASE 2: INTEGRACIONES REALES ==========
    console.log('📡 FASE 2: Creando tablas de integraciones reales...\n');

    // 1. Tabla: social_media_raw (Meta, Twitter, Instagram raw data)
    console.log('  1. Tabla: social_media_raw (datos crudos de redes)');
    await client.query(`
      CREATE TABLE IF NOT EXISTS social_media_raw (
        id SERIAL PRIMARY KEY,
        municipio VARCHAR(100) NOT NULL,
        departamento VARCHAR(100),
        keyword VARCHAR(200),
        source VARCHAR(50), -- 'meta', 'twitter', 'instagram', 'tiktok'
        mention_count INT DEFAULT 0,
        reach INT DEFAULT 0,
        engagement INT DEFAULT 0,
        demographic_breakdown JSONB, -- {"18-24_M": 15, "25-34_F": 20...}
        geographic_breakdown JSONB, -- {"Bogotá": 35, "Medellín": 25...}
        sentiment VARCHAR(20), -- 'positive', 'negative', 'neutral'
        verified BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(municipio, keyword, source)
      );

      CREATE INDEX IF NOT EXISTS idx_social_media_municipio ON social_media_raw(municipio);
      CREATE INDEX IF NOT EXISTS idx_social_media_source ON social_media_raw(source);
      CREATE INDEX IF NOT EXISTS idx_social_media_sentiment ON social_media_raw(sentiment);
      CREATE INDEX IF NOT EXISTS idx_social_media_created ON social_media_raw(created_at DESC);
    `);
    console.log('     ✅ social_media_raw creada\n');

    // 2. Tabla: google_trends_raw (Google Trends interest levels)
    console.log('  2. Tabla: google_trends_raw (datos de Google Trends)');
    await client.query(`
      CREATE TABLE IF NOT EXISTS google_trends_raw (
        id SERIAL PRIMARY KEY,
        keyword VARCHAR(200) NOT NULL,
        municipio VARCHAR(100) NOT NULL,
        interest_level INT CHECK (interest_level >= 0 AND interest_level <= 100),
        trend_direction VARCHAR(20), -- 'up', 'down', 'stable'
        related_keywords JSONB,
        discovered_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(keyword, municipio)
      );

      CREATE INDEX IF NOT EXISTS idx_google_trends_interest ON google_trends_raw(interest_level DESC);
      CREATE INDEX IF NOT EXISTS idx_google_trends_municipio ON google_trends_raw(municipio);
    `);
    console.log('     ✅ google_trends_raw creada\n');

    // 3. Tabla: government_data (DANE, MinSalud, Alcaldías)
    console.log('  3. Tabla: government_data (datos gubernamentales)');
    await client.query(`
      CREATE TABLE IF NOT EXISTS government_data (
        id SERIAL PRIMARY KEY,
        source VARCHAR(50), -- 'dane', 'minsalud', 'alcaldia', 'gobernacion'
        municipio VARCHAR(100),
        departamento VARCHAR(100),
        type VARCHAR(50), -- 'report', 'alert', 'statement', 'policy'
        content TEXT,
        topic VARCHAR(100),
        relevance_to_sip DECIMAL(3,2), -- 0-1
        published_date TIMESTAMP,
        url VARCHAR(500),
        verified BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_gov_data_municipio ON government_data(municipio);
      CREATE INDEX IF NOT EXISTS idx_gov_data_source ON government_data(source);
      CREATE INDEX IF NOT EXISTS idx_gov_data_relevance ON government_data(relevance_to_sip DESC);
    `);
    console.log('     ✅ government_data creada\n');

    // 4. Tabla: consolidated_intelligence (datos fusionados de todas las fuentes)
    console.log('  4. Tabla: consolidated_intelligence (datos fusionados)');
    await client.query(`
      CREATE TABLE IF NOT EXISTS consolidated_intelligence (
        id SERIAL PRIMARY KEY,
        municipio VARCHAR(100) NOT NULL,
        departamento VARCHAR(100),
        keyword VARCHAR(200),
        category VARCHAR(50),
        
        -- Datos consolidados de todas las fuentes
        meta_mentions INT DEFAULT 0,
        google_interest INT DEFAULT 0,
        gov_relevance DECIMAL(3,2) DEFAULT 0,
        twitter_volume INT DEFAULT 0,
        
        -- Cálculos combinados
        combined_urgency_score DECIMAL(5,2), -- 0-100 (versión mejorada)
        demographic_concentration DECIMAL(3,2), -- qué tan concentrado en grupos
        geographic_concentration DECIMAL(3,2), -- qué tan concentrado en regiones
        gap_score DECIMAL(3,2), -- gobierno vs web
        
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(municipio, keyword)
      );

      CREATE INDEX IF NOT EXISTS idx_consolidated_emergencia ON consolidated_intelligence(combined_urgency_score DESC);
      CREATE INDEX IF NOT EXISTS idx_consolidated_gap ON consolidated_intelligence(gap_score DESC);
    `);
    console.log('     ✅ consolidated_intelligence creada\n');

    // ========== FASE 3: GEOINTELIGENCIA ==========
    console.log('🗺️  FASE 3: Creando tablas de geointeligencia...\n');

    // 5. Tabla: crisis_heatmap (datos geo-espaciales con PostGIS)
    console.log('  5. Tabla: crisis_heatmap (datos geo para heat maps)');
    await client.query(`
      CREATE TABLE IF NOT EXISTS crisis_heatmap (
        id SERIAL PRIMARY KEY,
        municipio VARCHAR(100),
        keyword VARCHAR(200),
        
        -- PostGIS geometry (requiere extensión installed)
        -- location GEOMETRY(POINT, 4326), -- lat,lon para municipio
        -- heat_radius INT, -- radio de influencia en km
        
        intensity DECIMAL(5,2), -- concentración de crisis (0-100)
        population_affected INT,
        population_percentage DECIMAL(5,2), -- % de población afectada
        
        crisis_start_date TIMESTAMP,
        last_mention TIMESTAMP,
        
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_heatmap_intensity ON crisis_heatmap(intensity DESC);
    `);
    console.log('     ✅ crisis_heatmap creada\n');

    // 6. Tabla: political_gap_analysis (brecha entre web y gobierno)
    console.log('  6. Tabla: political_gap_analysis (análisis de brecha política)');
    await client.query(`
      CREATE TABLE IF NOT EXISTS political_gap_analysis (
        id SERIAL PRIMARY KEY,
        municipio VARCHAR(100) NOT NULL,
        keyword VARCHAR(200),
        
        -- Lado "web": lo que la gente dice
        web_mentions INT,
        web_sentiment VARCHAR(20),
        web_trend VARCHAR(20),
        
        -- Lado "gobierno": lo que el gobierno publica
        gov_communications INT,
        gov_response_count INT,
        gov_response_days_avg INT, -- promedio de días para responder
        
        -- Gap: diferencia
        gap_mentions INT, -- menciones web - menciones gobierno
        gap_score DECIMAL(5,2), -- 0-100 (brecha, donde 100 = máxima)
        response_adequate BOOLEAN,
        
        analyzed_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(municipio, keyword)
      );

      CREATE INDEX IF NOT EXISTS idx_gap_analysis_gap ON political_gap_analysis(gap_score DESC);
    `);
    console.log('     ✅ political_gap_analysis creada\n');

    // ========== FASE 4: AUTOMATIZACIÓN ==========
    console.log('🤖 FASE 4: Creando tablas de automatización...\n');

    // 7. Tabla: admin_alerts (alertas automáticas para administradores)
    console.log('  7. Tabla: admin_alerts (sistema de alertas)');
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_alerts (
        id SERIAL PRIMARY KEY,
        municipio VARCHAR(100) NOT NULL,
        keyword VARCHAR(200),
        alert_type VARCHAR(50), -- 'critical', 'emergency', 'urgent', 'info'
        severity INT CHECK (severity >= 1 AND severity <= 10),
        
        message TEXT,
        
        admin_id INT REFERENCES usuarios(id),
        admin_email VARCHAR(200),
        admin_phone VARCHAR(20), -- para SMS
        
        status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'read', 'acknowledged'
        sent_via VARCHAR(50), -- 'email', 'sms', 'push', 'webhook'
        sent_at TIMESTAMP,
        read_at TIMESTAMP,
        acknowledged_at TIMESTAMP,
        
        action_taken VARCHAR(200),
        action_taken_at TIMESTAMP,
        
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_alerts_status ON admin_alerts(status);
      CREATE INDEX IF NOT EXISTS idx_alerts_severity ON admin_alerts(severity DESC);
      CREATE INDEX IF NOT EXISTS idx_alerts_admin ON admin_alerts(admin_id);
    `);
    console.log('     ✅ admin_alerts creada\n');

    // 8. Tabla: webhook_subscriptions (webhooks para integraciones externas)
    console.log('  8. Tabla: webhook_subscriptions (webhooks externos)');
    await client.query(`
      CREATE TABLE IF NOT EXISTS webhook_subscriptions (
        id SERIAL PRIMARY KEY,
        
        -- Cliente externo
        client_name VARCHAR(200) NOT NULL,
        client_id VARCHAR(100) UNIQUE,
        webhook_url VARCHAR(500) NOT NULL,
        
        -- Qué eventos enviar
        events JSONB, -- ["critical_alert", "new_trend", "gap_analysis"]
        keywords_filter JSONB, -- filtrar por palabras clave específicas
        municipios_filter JSONB, -- filtrar por municipios
        
        -- Seguridad
        api_key VARCHAR(100) UNIQUE,
        is_active BOOLEAN DEFAULT true,
        
        -- Stats
        total_deliveries INT DEFAULT 0,
        failed_deliveries INT DEFAULT 0,
        last_delivery TIMESTAMP,
        
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_webhooks_active ON webhook_subscriptions(is_active);
    `);
    console.log('     ✅ webhook_subscriptions creada\n');

    // 9. Tabla: webhook_logs (log de entregas de webhooks)
    console.log('  9. Tabla: webhook_logs (log de webhooks)');
    await client.query(`
      CREATE TABLE IF NOT EXISTS webhook_logs (
        id SERIAL PRIMARY KEY,
        subscription_id INT REFERENCES webhook_subscriptions(id),
        
        event_type VARCHAR(100),
        payload JSONB,
        
        status_code INT,
        response TEXT,
        
        retry_count INT DEFAULT 0,
        last_retry TIMESTAMP,
        
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_webhook_logs_subscription ON webhook_logs(subscription_id);
      CREATE INDEX IF NOT EXISTS idx_webhook_logs_status ON webhook_logs(status_code);
    `);
    console.log('     ✅ webhook_logs creada\n');

    // 10. Tabla: realtime_websocket_clients (conexiones WebSocket)
    console.log('  10. Tabla: realtime_websocket_clients (clientes WebSocket)');
    await client.query(`
      CREATE TABLE IF NOT EXISTS realtime_websocket_clients (
        id SERIAL PRIMARY KEY,
        
        user_id INT REFERENCES usuarios(id),
        session_id VARCHAR(100) UNIQUE,
        
        connected_at TIMESTAMP DEFAULT NOW(),
        last_heartbeat TIMESTAMP DEFAULT NOW(),
        disconnected_at TIMESTAMP,
        
        municipios_subscribed JSONB, -- municipios que monitorea
        event_types JSONB, -- tipos de eventos que quiere
        
        is_active BOOLEAN DEFAULT true
      );

      CREATE INDEX IF NOT EXISTS idx_ws_active ON realtime_websocket_clients(is_active);
      CREATE INDEX IF NOT EXISTS idx_ws_user ON realtime_websocket_clients(user_id);
    `);
    console.log('     ✅ realtime_websocket_clients creada\n');

    // 11. Tabla: sms_deliveries (Log de SMS enviados)
    console.log('  11. Tabla: sms_deliveries (log de SMS)');
    await client.query(`
      CREATE TABLE IF NOT EXISTS sms_deliveries (
        id SERIAL PRIMARY KEY,
        
        recipient_phone VARCHAR(20),
        recipient_name VARCHAR(200),
        alert_id INT REFERENCES admin_alerts(id),
        
        message_text TEXT,
        message_status VARCHAR(50), -- 'pending', 'sent', 'delivered', 'failed'
        
        provider VARCHAR(50), -- 'twilio', 'aws-sns', 'local'
        provider_message_id VARCHAR(200),
        
        sent_at TIMESTAMP,
        delivered_at TIMESTAMP,
        
        error_message TEXT,
        retry_count INT DEFAULT 0
      );

      CREATE INDEX IF NOT EXISTS idx_sms_status ON sms_deliveries(message_status);
    `);
    console.log('     ✅ sms_deliveries creada\n');

    // ========== VISTAS SQL ÚTILES ==========
    console.log('🔍 Creando vistas SQL útiles...\n');

    await client.query(`
      CREATE OR REPLACE VIEW v_realtime_crisis_summary AS
      SELECT 
        municipio,
        COUNT(DISTINCT keyword) as crisis_count,
        MAX(combined_urgency_score) as max_urgency,
        AVG(combined_urgency_score) as avg_urgency,
        COUNT(CASE WHEN combined_urgency_score >= 80 THEN 1 END) as critical_count
      FROM consolidated_intelligence
      WHERE updated_at > NOW() - INTERVAL '24 hours'
      GROUP BY municipio
      ORDER BY max_urgency DESC;
    `);
    console.log('     ✅ v_realtime_crisis_summary\n');

    await client.query(`
      CREATE OR REPLACE VIEW v_pending_alerts AS
      SELECT 
        id, municipio, keyword, severity,
        alert_type, message,
        admin_email, admin_phone,
        created_at
      FROM admin_alerts
      WHERE status IN ('pending', 'sent')
      ORDER BY severity DESC, created_at ASC;
    `);
    console.log('     ✅ v_pending_alerts\n');

    // ========== RESUMEN FINAL ==========
    console.log('\n✅✅✅ TODAS LAS TABLAS INICIALIZADAS SUCCESSFULLY! ✅✅✅\n');
    console.log('Tablas creadas:');
    console.log('  FASE 2 (Integraciones):');
    console.log('    ✓ social_media_raw');
    console.log('    ✓ google_trends_raw');
    console.log('    ✓ government_data');
    console.log('    ✓ consolidated_intelligence');
    console.log('  FASE 3 (Geointeligencia):');
    console.log('    ✓ crisis_heatmap');
    console.log('    ✓ political_gap_analysis');
    console.log('  FASE 4 (Automatización):');
    console.log('    ✓ admin_alerts');
    console.log('    ✓ webhook_subscriptions');
    console.log('    ✓ webhook_logs');
    console.log('    ✓ realtime_websocket_clients');
    console.log('    ✓ sms_deliveries');
    console.log('\nVistas SQL:');
    console.log('    ✓ v_realtime_crisis_summary');
    console.log('    ✓ v_pending_alerts');
    console.log('\nPróximos pasos:');
    console.log('  1. Configurar META_BUSINESS_TOKEN en .env.local');
    console.log('  2. Configurar TWILIO_ACCOUNT_SID y TWILIO_AUTH_TOKEN para SMS');
    console.log('  3. Ejecutar: npm run dev');
    console.log('  4. Inicializar con: POST /api/intelligence/start-phase2');

  } catch (err) {
    console.error('❌ Error inicializando tablas:', err);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
}

initPhase2_4_Tables();
