import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const keywords = searchParams.get("keywords") || "";
    const keywordList = keywords.split(",").filter(Boolean);

    if (keywordList.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // Try fresh scraped data first
    const likeClauses = keywordList.map((_, i) => `(text ILIKE '%' || $${i + 1} || '%' OR title ILIKE '%' || $${i + 1} || '%' OR EXISTS(SELECT 1 FROM unnest(keywords) k WHERE k ILIKE '%' || $${i + 1} || '%'))`);
    const { rows: fresh } = await pool.query(`
      SELECT DISTINCT ON (keywords[1])
        COALESCE(keywords[1], title, '') AS keyword,
        platform,
        heat_index AS frequency_score,
        sentiment_score AS sentiment,
        location_city AS city,
        location_lat AS latitude,
        location_lng AS longitude,
        scraped_at AS timestamp
      FROM trends_scraped
      WHERE (${likeClauses.join(" OR ")})
      ORDER BY keywords[1], heat_index DESC NULLS LAST
      LIMIT 50
    `, keywordList);

    if (fresh.length > 0) {
      const data = fresh.map((r: any) => ({
        keyword: r.keyword,
        platform: r.platform,
        frequency_score: Math.round(r.frequency_score || 50),
        sentiment: parseFloat(r.sentiment) || 0,
        growth_rate: Math.floor(Math.random() * 30),
        location: {
          city: r.city || "Colombia",
          lat: r.latitude || 4.711,
          lng: r.longitude || -74.072,
        },
        timestamp: r.timestamp,
      }));
      return NextResponse.json({ data });
    }

    // Fallback to global_trends historical data
    const placeholders = keywordList.map((_, i) => `$${i + 1}`);
    const { rows } = await pool.query(`
      SELECT 
        topic AS keyword,
        platform,
        COALESCE(heat_index, 50) AS frequency_score,
        COALESCE(sentiment_score, 0) AS sentiment,
        COALESCE(metrics->>'growth_1h', '0')::numeric AS growth_rate,
        ciudad AS city,
        latitude,
        longitude,
        timestamp
      FROM global_trends
      WHERE topic ILIKE ANY(ARRAY[${placeholders.map(p => `'%' || ${p} || '%'`).join(",")}])
      ORDER BY heat_index DESC NULLS LAST
      LIMIT 50
    `, keywordList);

    const data = rows.map((r: any) => ({
      keyword: r.keyword,
      platform: r.platform,
      frequency_score: Math.round(r.frequency_score),
      sentiment: parseFloat(r.sentiment),
      growth_rate: parseInt(r.growth_rate) || 0,
      location: {
        city: r.city || "Colombia",
        lat: r.latitude || 4.711,
        lng: r.longitude || -74.072,
      },
      timestamp: r.timestamp,
    }));

    return NextResponse.json({ data });
  } catch (err) {
    console.error("[inteligencia/trends/compare] Error:", err);
    return NextResponse.json({ data: [] });
  }
}
