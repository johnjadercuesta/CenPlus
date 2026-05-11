const { Pool } = require('pg');
const Sentiment = require('sentiment');
const sentiment = new Sentiment();

const pool = new Pool({ connectionString: process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/postgres" });

function calculateHeatIndex(volume, velocity, sentimentScore) {
  const vScore = Math.min(volume / 8000, 1) * 30;
  const aScore = Math.min(velocity / 300, 1) * 50;
  const sScore = ((sentimentScore + 5) / 10) * 20;
  return parseFloat((vScore + aScore + sScore).toFixed(2));
}

async function processTenant(client, tenant) {
  try {
    await client.query(`SET search_path TO "${tenant}", public`);
  } catch (err) {
    console.error(`Error setting search_path for tenant ${tenant}:`, err.message || err);
    return;
  }

  // Ingest trends for this tenant/schema
  try {
    const trendResults = await client.query(`
      SELECT 
        sp.keyword as topic,
        'Real Data Source' as platform,
        COUNT(*) as volume,
        AVG(sp.sentiment_score) as sentimentScore,
        m.nombre as ciudad,
        d.nombre as departamento,
        m.latitud as lat,
        m.longitud as lng,
        d.nombre as region
      FROM social_posts sp
      LEFT JOIN municipios m ON sp.municipio_id = m.id
      LEFT JOIN departamentos d ON m.departamento_id = d.id
      WHERE sp.timestamp > NOW() - INTERVAL '24 hours'
      GROUP BY sp.keyword, m.id, d.id
      LIMIT 50
    `);

    for (const row of trendResults.rows) {
      if (!row.topic) continue;

      const volume = row.volume || 0;
      const sentimentScore = row.sentimentScore || 0;
      const velocity = Math.max(1, Math.floor(volume / 60));
      const heat = calculateHeatIndex(volume, velocity, sentimentScore);

      const metrics = {
        mentions: volume,
        growth_1h: velocity,
        reach: volume * 20,
        engagement_avg: (volume * 0.05).toFixed(2)
      };

      try {
        await client.query(`
          INSERT INTO global_trends (topic, platform, metrics, sentiment_score, heat_index, region, pais, departamento, ciudad, latitude, longitude)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (topic, platform) DO UPDATE SET 
            metrics = EXCLUDED.metrics,
            sentiment_score = EXCLUDED.sentiment_score,
            heat_index = EXCLUDED.heat_index,
            region = EXCLUDED.region,
            pais = EXCLUDED.pais,
            departamento = EXCLUDED.departamento,
            ciudad = EXCLUDED.ciudad,
            latitude = EXCLUDED.latitude,
            longitude = EXCLUDED.longitude,
            timestamp = NOW()
        `, [row.topic, row.platform, JSON.stringify(metrics), sentimentScore, heat, row.region, 'Colombia', row.departamento, row.ciudad, row.lat, row.lng]);
      } catch (err) {
        console.error(`Error inserting trend ${row.topic} (tenant=${tenant}):`, err.message || err);
      }
    }
  } catch (err) {
    console.error(`❌ Monitor Worker Error (tenant=${tenant}):`, err.message || err);
  }

  // Ingest influencers for this tenant/schema
  try {
    const influencerResults = await client.query(`
      SELECT DISTINCT
        nombre as name,
        COALESCE(profile_name, nombre) as handle,
        COALESCE(relevancia_score, 0) as impact_score
      FROM opinion_leaders
      WHERE nombre IS NOT NULL
      LIMIT 200
    `);

    for (const row of influencerResults.rows) {
      try {
        await client.query(`
          INSERT INTO influencer_rankings (name, platform, handle, impact_score, last_updated)
          VALUES ($1, $2, $3, $4, NOW())
          ON CONFLICT (handle) DO UPDATE SET 
            impact_score = EXCLUDED.impact_score,
            last_updated = NOW()
        `, [row.name, 'opinion_leaders', row.handle, row.impact_score || 0]);
      } catch (err) {
        console.error(`Error inserting influencer ${row.handle} (tenant=${tenant}):`, err.message || err);
      }
    }
  } catch (err) {
    console.error(`❌ Monitor Worker Influencer Sync Error (tenant=${tenant}):`, err.message || err);
  }
}

async function cycle() {
  const client = await pool.connect();
  try {
    // Obtener esquemas que podrían corresponder a tenants (excluir public y esquemas del sistema)
    const { rows: schemas } = await client.query(`
      SELECT schema_name FROM information_schema.schemata
      WHERE schema_name NOT IN ('public', 'information_schema')
        AND schema_name NOT LIKE 'pg_%'
    `);

    for (const s of schemas) {
      const tenant = s.schema_name;
      await processTenant(client, tenant);
    }
  } catch (err) {
    console.error('Error enumerating schemas for ingestion:', err.message || err);
  } finally {
    client.release();
  }
}

console.log("⚡ MONITOR v4.3 ACTIVE - Tenant-aware Real Data Mode");
cycle().catch(err => console.error('Initial cycle error:', err));
setInterval(() => cycle().catch(err => console.error('Cycle error:', err)), 15000);

