import { pool } from "@/lib/db";
import { queryWithTenant } from "@/lib/tenant";
import Sentiment from "sentiment";

const sentiment = new Sentiment();

async function runQuery(sql: string, params: any[] = [], tenant?: string | null) {
  if (tenant) return await queryWithTenant(tenant, sql, params);
  return await pool.query(sql, params);
}

export async function initTables(tenant?: string | null) {
  try {
    // Crear tablas
    await runQuery(`
      CREATE TABLE IF NOT EXISTS facebook_group_posts (
        id SERIAL PRIMARY KEY,
        municipio VARCHAR(150),
        post_text TEXT,
        sentiment_score FLOAT,
        sentiment_label VARCHAR(50),
        keywords JSONB,
        engagement_count INT DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS ads_library_records (
        id SERIAL PRIMARY KEY,
        municipio VARCHAR(150),
        ad_text TEXT,
        concern_category VARCHAR(100),
        spend_usd FLOAT DEFAULT 0,
        impressions INT DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS opinion_leaders (
        id SERIAL PRIMARY KEY,
        municipio VARCHAR(150),
        nombre VARCHAR(200),
        relevancia_score FLOAT DEFAULT 0,
        posts_count INT DEFAULT 0,
        engagement_total INT DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS keywords_by_municipio (
        id SERIAL PRIMARY KEY,
        municipio VARCHAR(150),
        keyword VARCHAR(100),
        frequency_count INT DEFAULT 1,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_posts_mun ON facebook_group_posts(municipio);
      CREATE INDEX IF NOT EXISTS idx_ads_mun ON ads_library_records(municipio);
      CREATE INDEX IF NOT EXISTS idx_leaders_mun ON opinion_leaders(municipio);
      CREATE INDEX IF NOT EXISTS idx_keywords_mun ON keywords_by_municipio(municipio);
    `, [], tenant);

    // Agregar columna profile_name si no existe
    await runQuery(`
      ALTER TABLE opinion_leaders
      ADD COLUMN IF NOT EXISTS profile_name VARCHAR(200)
    `, [], tenant);

    console.log("[social-listening] Tablas inicializadas");
    return { success: true };
  } catch (err) {
    console.error("[social-listening] Error:", err);
    return { success: false, error: String(err) };
  }
}

export function analyzeSentiment(text: string): { score: number; label: string } {
  const result = sentiment.analyze(text);
  const score = result.score;
  let label = "neutral";
  
  if (text.match(/agua|luz|salud|hospital|escuela|transporte|servicio|acueducto|electricidad/i)) {
    label = "informacion_servicio";
  } else if (text.match(/venta|compra|precio|oferta|negocio|empleo|trabajo/i)) {
    label = "comercio";
  } else if (score < -1) {
    label = "queja_comunitaria";
  } else if (score < 0) {
    label = "insatisfaccion";
  } else if (score > 1) {
    label = "positivo";
  }
  
  return { score, label };
}

export function extractKeywords(text: string): string[] {
  const words = text.toLowerCase().match(/\b\w{4,}\b/g) || [];
  const stopwords = ["que", "para", "como", "esto", "pero", "este", "hace", "sido", "sido", "esta", "muy"];
  return words.filter(w => !stopwords.includes(w)).slice(0, 5);
}

export async function insertPost(municipio: string, postText: string, tenant?: string | null) {
  const sent = analyzeSentiment(postText);
  const kw = extractKeywords(postText);
  
  try {
    // REFACTORED: Removed synthetic engagement generation
    // Previous: engagement_count = Math.floor(Math.random() * 50) + 5
    // Now:      engagement_count should come from actual social media APIs
    // Until real data available, using NULL to prevent synthetic metrics
    const engagementCount = null; // Real engagement data required
    
    const { rows } = await runQuery(
      `INSERT INTO facebook_group_posts (municipio, post_text, sentiment_score, sentiment_label, keywords, engagement_count) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [municipio, postText, sent.score, sent.label, JSON.stringify(kw), engagementCount],
      tenant
    );
    
    // Insert keywords into keywords_by_municipio table
    for (const keyword of kw) {
      try {
        // Try to update first
        const { rowCount } = await runQuery(
          `UPDATE keywords_by_municipio SET frequency_count = frequency_count + 1 
           WHERE municipio = $1 AND keyword = $2`,
          [municipio, keyword],
          tenant
        );
        
        // If no rows updated, insert new one
        if (rowCount === 0) {
          await runQuery(
            `INSERT INTO keywords_by_municipio (municipio, keyword, frequency_count) 
             VALUES ($1, $2, 1)`,
            [municipio, keyword],
            tenant
          );
        }
      } catch (kwErr) {
        console.warn("[social-listening] Warning inserting keyword:", kwErr);
      }
    }
    
    return rows[0];
  } catch (err) {
    console.error("[social-listening] Error inserting post:", err);
  }
}

export async function insertAd(municipio: string, adText: string, concern: string, spend: number = 50, tenant?: string | null) {
  try {
    // REFACTORED: Removed synthetic impression generation
    // Previous: impressions = Math.floor(Math.random() * 10000) + 1000
    // Now:      impressions should come from Meta Ads Library API
    // Until real data available, using NULL to indicate "unknown"
    const impressions = null; // Real data required
    
    const { rows } = await runQuery(
      `INSERT INTO ads_library_records (municipio, ad_text, concern_category, spend_usd, impressions) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [municipio, adText, concern, spend, impressions],
      tenant
    );
    return rows[0];
  } catch (err) {
    console.error("[social-listening] Error inserting ad:", err);
  }
}

export async function insertOpinionLeader(municipio: string, nombre: string, relevancia: number, profileName?: string, tenant?: string | null) {
  try {
    // REFACTORED: Removed synthetic metric generation
    // Previous: 
    //   posts_count = Math.floor(Math.random() * 50) + 10
    //   engagement_total = Math.floor(Math.random() * 500) + 100
    // Now:     Using NULL for synthetic values pending real social media data
    const postsCount = null; // Real data from social media APIs required
    const engagementTotal = null; // Real data from social media APIs required
    
    await runQuery(
      `INSERT INTO opinion_leaders (municipio, nombre, profile_name, relevancia_score, posts_count, engagement_total) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [municipio, nombre, profileName || `@${nombre.toLowerCase().replace(/\s+/g, '')}`, relevancia, postsCount, engagementTotal],
      tenant
    );
  } catch (err) {
    console.error("[social-listening] Error inserting leader:", err);
  }
}

export async function getAnalysisByMunicipio(municipio: string, tenant?: string | null) {
  try {
    const { rows: posts } = await runQuery(
      `SELECT id::text, municipio, post_text, sentiment_score, sentiment_label, engagement_count FROM facebook_group_posts WHERE municipio ILIKE $1 ORDER BY created_at DESC LIMIT 10`,
      [municipio],
      tenant
    );

    const { rows: ads } = await runQuery(
      `SELECT id::text, municipio, ad_text, concern_category, spend_usd as spend_estimate FROM ads_library_records WHERE municipio ILIKE $1 ORDER BY created_at DESC LIMIT 10`,
      [municipio],
      tenant
    );

    const { rows: leaders } = await runQuery(
      `SELECT id::text, municipio, nombre, profile_name, relevancia_score FROM opinion_leaders WHERE municipio ILIKE $1 ORDER BY relevancia_score DESC LIMIT 5`,
      [municipio],
      tenant
    );

    const { rows: keywords } = await runQuery(
      `SELECT id::text, municipio, keyword, frequency_count as frequency FROM keywords_by_municipio WHERE municipio ILIKE $1 ORDER BY frequency_count DESC LIMIT 8`,
      [municipio],
      tenant
    );

    const { rows: sentiment_data } = await runQuery(
      `SELECT AVG(sentiment_score) as avg_sent FROM facebook_group_posts WHERE municipio ILIKE $1 AND created_at > NOW() - INTERVAL '7 days'`,
      [municipio],
      tenant
    );

    const avgSent = sentiment_data[0]?.avg_sent || 0;
    const climaOrgánico = avgSent < -0.5 ? "negativo" : avgSent > 0.5 ? "positivo" : "neutral";

    const { rows: concern_data } = await runQuery(
      `SELECT concern_category, COUNT(*) as cnt FROM ads_library_records WHERE municipio ILIKE $1 GROUP BY concern_category ORDER BY cnt DESC LIMIT 1`,
      [municipio],
      tenant
    );

    const interésPagado = concern_data[0]?.concern_category || "no_especificado";
    const gap = Math.abs(posts.length - ads.length);
    let nivelAlerta = 5 + (gap > 10 ? 3 : 0) + (Math.abs(avgSent) > 1 ? 2 : 0);
    nivelAlerta = Math.min(10, nivelAlerta);

    return {
      municipio,
      posts: posts.map(p => ({ ...p, id: String(p.id) })),
      ads: ads.map(a => ({ ...a, id: String(a.id) })),
      leaders: leaders.map(l => ({ ...l, id: String(l.id) })),
      keywords: keywords.map(k => ({ ...k, id: String(k.id) })),
      clima_organico: climaOrgánico,
      interes_pagado: interésPagado,
      nivel_alerta: nivelAlerta,
      volume_organic: posts.length,
      volume_paid: ads.length,
      gap: gap,
      avg_sentiment: avgSent,
    };
  } catch (err) {
    console.error("[social-listening] Error in getAnalysisByMunicipio:", err);
    return null;
  }
}

export async function getAllMunicipiosSummary(tenant?: string | null) {
  try {
    const { rows: municipios } = await runQuery(
      `SELECT DISTINCT municipio FROM facebook_group_posts 
       UNION 
       SELECT DISTINCT municipio FROM ads_library_records 
       ORDER BY municipio`,
      [],
      tenant
    );

    const results = [];
    for (const m of municipios) {
      const analysis = await getAnalysisByMunicipio(m.municipio, tenant);
      if (analysis) {
        results.push({
          municipio: analysis.municipio,
          interes_pagado: analysis.interes_pagado,
          clima_organico: analysis.clima_organico,
          nivel_alerta: analysis.nivel_alerta,
          volume_organic: analysis.volume_organic,
          volume_paid: analysis.volume_paid,
        });
      }
    }

    return results;
  } catch (err) {
    console.error("[social-listening] Error in getAllMunicipiosSummary:", err);
    return [];
  }
}

export async function deleteAllData(tenant?: string | null) {
  try {
    await runQuery(`DELETE FROM facebook_group_posts`, [], tenant);
    await runQuery(`DELETE FROM ads_library_records`, [], tenant);
    await runQuery(`DELETE FROM opinion_leaders`, [], tenant);
    await runQuery(`DELETE FROM keywords_by_municipio`, [], tenant);
    return { success: true };
  } catch (err) {
    console.error("[social-listening] Error deleting data:", err);
    return { success: false };
  }
}
