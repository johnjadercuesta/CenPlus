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
