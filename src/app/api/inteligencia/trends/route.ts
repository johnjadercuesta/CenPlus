import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";
import { getFreshTrends } from "@/lib/scrapers/base";

export async function GET(request: NextRequest) {
  try {
    const tenant = getTenantFromRequest(request);
    if (!tenant) {
      return NextResponse.json({ error: "No se pudo detectar la organizacion" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const platform = searchParams.get("platform") || "";
    const limit = parseInt(searchParams.get("limit") || "15");
    const timeRange = searchParams.get("time_range") || "24h";

    let hours = 24;
    if (timeRange === "1h") hours = 1;
    else if (timeRange === "7d") hours = 168;

    // First try to get fresh scraped data
    const freshData = await getFreshTrends(platform, limit, hours, tenant);

    if (freshData.length > 0) {
      const data = freshData.map((r: any) => ({
        keyword: r.keywords?.[0] || r.title || r.text?.substring(0, 50) || "Tendencia",
        platform: r.platform,
        frequency_score: Math.round(r.heat_index || r.keywords?.length * 10 || 50),
        sentiment: parseFloat(r.sentiment_score) || 0,
        growth_rate: Math.floor(Math.random() * 30),
        location: {
          city: r.location_city || "Colombia",
          lat: r.location_lat || 4.711,
          lng: r.location_lng || -74.072,
        },
        timestamp: r.scraped_at,
      }));
      return NextResponse.json({ data });
    }

    // Fallback to global_trends historical data
    let whereClause = "WHERE (tenant = $1 OR tenant IS NULL)";
    const params: any[] = [tenant];

    if (platform) {
      whereClause += ` AND platform ILIKE $${params.length + 1}`;
      params.push(`%${platform}%`);
    }

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
      LIMIT $${params.length + 1}
    `, [...params, limit]);

    const data = (rows || []).map((r: any) => ({
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
