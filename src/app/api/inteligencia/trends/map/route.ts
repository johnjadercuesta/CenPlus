import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET() {
  try {
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
      ORDER BY heat_index DESC NULLS LAST
      LIMIT 50
    `);

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
