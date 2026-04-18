// scripts/init-market-intelligence.js
// Initialize Market Intelligence tables
// Run: node scripts/init-market-intelligence.js

const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/cenplus";

const pool = new Pool({
  connectionString,
});

async function initMarketIntelligence() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('[Market Intelligence Migration] Starting...');

    // Table 1: market_intelligence
    await client.query(`
      CREATE TABLE IF NOT EXISTS market_intelligence (
        id SERIAL PRIMARY KEY,
        municipio VARCHAR(150) UNIQUE NOT NULL,
        departamento VARCHAR(150),
        interes_pagado VARCHAR(100),
        clima_organico VARCHAR(50),
        nivel_alerta INT DEFAULT 5 CHECK (nivel_alerta >= 1 AND nivel_alerta <= 10),
        gap_score FLOAT DEFAULT 0,
        volume_organic INT DEFAULT 0,
        volume_paid INT DEFAULT 0,
        avg_sentiment FLOAT DEFAULT 0,
        last_analyzed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log('✓ Table market_intelligence created');

    // Table 2: facebook_sentiment_tracks
    await client.query(`
      CREATE TABLE IF NOT EXISTS facebook_sentiment_tracks (
        id SERIAL PRIMARY KEY,
        municipio VARCHAR(150) NOT NULL,
        keyword VARCHAR(100) NOT NULL,
        frequency_count INT DEFAULT 0,
        frequency_trend FLOAT DEFAULT 0,
        last_frequency INT DEFAULT 0,
        sentiment_avg FLOAT DEFAULT 0,
        track_date DATE DEFAULT CURRENT_DATE,
        source VARCHAR(50) DEFAULT 'facebook',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log('✓ Table facebook_sentiment_tracks created');

    // Table 3: trend_alerts
    await client.query(`
      CREATE TABLE IF NOT EXISTS trend_alerts (
        id SERIAL PRIMARY KEY,
        municipio VARCHAR(150) NOT NULL,
        keyword VARCHAR(100) NOT NULL,
        frequency_change FLOAT NOT NULL,
        alert_type VARCHAR(50) NOT NULL,
        severity INT DEFAULT 5 CHECK (severity >= 1 AND severity <= 10),
        description TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        resolved_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log('✓ Table trend_alerts created');

    // Table 4: opinion_leaders_tracked
    await client.query(`
      CREATE TABLE IF NOT EXISTS opinion_leaders_tracked (
        id SERIAL PRIMARY KEY,
        municipio VARCHAR(150) NOT NULL,
        name VARCHAR(200) NOT NULL,
        profile_url VARCHAR(500),
        engagement_score FLOAT DEFAULT 0,
        posts_count INT DEFAULT 0,
        followers_estimate INT DEFAULT 0,
        influence_category VARCHAR(50),
        source VARCHAR(50) DEFAULT 'facebook',
        external_id VARCHAR(200),
        last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log('✓ Table opinion_leaders_tracked created');

    // Table 5: ads_library_extended
    await client.query(`
      CREATE TABLE IF NOT EXISTS ads_library_extended (
        id SERIAL PRIMARY KEY,
        municipio VARCHAR(150) NOT NULL,
        ads_library_id VARCHAR(200) UNIQUE,
        ad_text TEXT,
        concern_category VARCHAR(100),
        budget_estimate FLOAT DEFAULT 0,
        impressions_estimate INT DEFAULT 0,
        active_from DATE,
        active_until DATE,
        targeting_info JSONB,
        advertiser_name VARCHAR(200),
        advertiser_type VARCHAR(50),
        last_checked TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log('✓ Table ads_library_extended created');

    // Create indices for performance
    await client.query(`CREATE INDEX IF NOT EXISTS idx_market_intel_mun ON market_intelligence(municipio);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_market_intel_dept ON market_intelligence(departamento);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_market_intel_alerta ON market_intelligence(nivel_alerta DESC);`);
    
    await client.query(`CREATE INDEX IF NOT EXISTS idx_sentiment_tracks_mun ON facebook_sentiment_tracks(municipio);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_sentiment_tracks_keyword ON facebook_sentiment_tracks(keyword);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_sentiment_tracks_date ON facebook_sentiment_tracks(track_date DESC);`);
    
    await client.query(`CREATE INDEX IF NOT EXISTS idx_trend_alerts_mun ON trend_alerts(municipio);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_trend_alerts_active ON trend_alerts(is_active DESC);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_trend_alerts_severity ON trend_alerts(severity DESC);`);
    
    await client.query(`CREATE INDEX IF NOT EXISTS idx_opinion_leaders_mun ON opinion_leaders_tracked(municipio);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_opinion_leaders_engagement ON opinion_leaders_tracked(engagement_score DESC);`);
    
    await client.query(`CREATE INDEX IF NOT EXISTS idx_ads_extended_mun ON ads_library_extended(municipio);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_ads_extended_concern ON ads_library_extended(concern_category);`);

    console.log('✓ All indices created');

    await client.query('COMMIT');
    console.log('[Market Intelligence Migration] ✓ SUCCESS - All tables initialized');
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Market Intelligence Migration] ✗ ERROR:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

initMarketIntelligence().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
