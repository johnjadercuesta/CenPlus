import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const platforms = body.platforms || [
      "twitter", "youtube", "google", "google_news", "instagram", "facebook"
    ];
    const query = body.query || "Colombia";

    const result = await pool.query(`
      INSERT INTO trendsmap_entries (text, hashtags, latitude, longitude, pais, departamento, municipio)
      SELECT 
        topic,
        ARRAY(SELECT jsonb_array_elements_text(COALESCE(metrics->'keywords', '[]'::jsonb))),
        COALESCE(latitude, 4.711),
        COALESCE(longitude, -74.072),
        COALESCE(pais, 'Colombia'),
        COALESCE(departamento, ''),
        COALESCE(ciudad, '')
      FROM global_trends
      WHERE timestamp > NOW() - INTERVAL '24 hours'
        AND (topic ILIKE $1 OR $1 = '')
      ON CONFLICT DO NOTHING
    `, [`%${query}%`]);

    return NextResponse.json({
      success: true,
      message: `Sincronización completada`,
      inserted: result.rowCount || 0,
    });
  } catch (err) {
    console.error("[inteligencia/scrape/run] Error:", err);
    return NextResponse.json(
      { error: "Error al ejecutar scraping", message: String(err) },
      { status: 500 }
    );
  }
}
