import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

export async function GET(request: NextRequest) {
  try {
    const tenant = getTenantFromRequest(request);
    if (!tenant) {
      return NextResponse.json({ error: "No se pudo detectar la organizacion" }, { status: 400 });
    }

    // Try fresh scraped data first
    const { rows: fresh } = await pool.query(`
      SELECT DISTINCT ON (location_city)
        location_city AS city,
        location_lat AS latitude,
        location_lng AS longitude,
        keywords[1] AS keyword,
        heat_index AS intensity,
        sentiment_score AS sentiment,
        scraped_at
      FROM trends_scraped
      WHERE location_lat IS NOT NULL
        AND location_lng IS NOT NULL
        AND location_city IS NOT NULL
        AND tenant = $1
      ORDER BY location_city, heat_index DESC
      LIMIT 50
    `, [tenant]);

    if (fresh.length > 0) {
      const features = fresh.map((r: any) => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [parseFloat(r.longitude), parseFloat(r.latitude)],
        },
        properties: {
          keyword: r.keyword || "Tendencia",
          intensity: Math.round(r.intensity) || 50,
          sentiment: parseFloat(r.sentiment) || 0,
          city: r.city || "Colombia",
        },
      }));

      return NextResponse.json({ features });
    }

    // Fallback to global_trends historical data
    const { rows } = await pool.query(`
      SELECT 
        topic AS keyword,
        COALESCE(heat_index, 50) AS intensity,
        COALESCE(sentiment_score, 0) AS sentiment,
        ciudad AS city,
        latitude,
        longitude
      FROM global_trends
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL
        AND ciudad IS NOT NULL
        AND (tenant = $1 OR tenant IS NULL)
      ORDER BY heat_index DESC NULLS LAST
      LIMIT 50
    `, [tenant]);

    const features = rows.map((r: any) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [parseFloat(r.longitude), parseFloat(r.latitude)],
      },
      properties: {
        keyword: r.keyword,
        intensity: Math.round(r.intensity),
        sentiment: parseFloat(r.sentiment),
        city: r.city || "Colombia",
      },
    }));

    return NextResponse.json({ features });
  } catch (err) {
    console.error("[inteligencia/trends/map] Error:", err);
    return NextResponse.json({ features: [] });
  }
}
