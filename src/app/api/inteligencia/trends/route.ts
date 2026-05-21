import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get("platform") || "";
    const limit = parseInt(searchParams.get("limit") || "15");
    const timeRange = searchParams.get("time_range") || "24h";

    let hours = 24;
    if (timeRange === "1h") hours = 1;
    else if (timeRange === "7d") hours = 168;

    let whereClause = `WHERE timestamp > NOW() - INTERVAL '${hours} hours'`;
    const params: any[] = [];

    if (platform) {
      whereClause += ` AND platform ILIKE $1`;
      params.push(`%${platform}%`);
    }

    const paramIdx = params.length + 1;

    const { rows } = await pool.query(`
      SELECT 
        topic AS keyword,
        platform,
        COALESCE(heat_index, 50) AS frequency_score,
        COALESCE(sentiment_score, 0) AS sentiment,
        COALESCE((metrics->>'growth_1h')::numeric, 0) AS growth_rate,
        ciudad AS city,
        latitude,
        longitude,
        timestamp
      FROM global_trends
      ${whereClause}
      ORDER BY heat_index DESC NULLS LAST
      LIMIT $${paramIdx}
    `, [...params, limit]);

    if (rows.length === 0) {
      const { rows: fallback } = await pool.query(`
        SELECT 
          topic AS keyword,
          platform,
          COALESCE(heat_index, 50) AS frequency_score,
          COALESCE(sentiment_score, 0) AS sentiment,
          COALESCE((metrics->>'growth_1h')::numeric, 0) AS growth_rate,
          ciudad AS city,
          latitude,
          longitude,
          timestamp
        FROM global_trends
        ${platform ? `WHERE platform ILIKE $1` : ""}
        ORDER BY heat_index DESC NULLS LAST
        LIMIT $${platform ? 2 : 1}
      `, platform ? [`%${platform}%`, limit] : [limit]);

      const data = (fallback || []).map((r: any) => ({
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
    }

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
    console.error("[inteligencia/trends] Error:", err);
    return NextResponse.json({ data: [] });
  }
}
