import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getTokenFromRequest, tokenMatchesTenant } from "@/lib/auth";
import { getTenantFromRequest, queryWithTenant } from "@/lib/tenant";

export async function POST(request: NextRequest) {
  try {
    console.log("[API] POST /api/trendsmap/seed called");
    const token = getTokenFromRequest(request);
    if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    if (!tokenMatchesTenant(token, request)) return NextResponse.json({ error: "Acceso no autorizado para esta organizacion" }, { status: 403 });

    const tenant = getTenantFromRequest(request);
    const run = (sql: string, params: any[] = []) => (tenant ? queryWithTenant(tenant, sql, params) : pool.query(sql, params));

    await run(`
      CREATE TABLE IF NOT EXISTS trendsmap_entries (
        id SERIAL PRIMARY KEY,
        text TEXT NOT NULL,
        hashtags TEXT[] DEFAULT '{}',
        latitude DOUBLE PRECISION NOT NULL,
        longitude DOUBLE PRECISION NOT NULL,
        pais VARCHAR(100) DEFAULT 'Colombia',
        departamento VARCHAR(100),
        municipio VARCHAR(100),
        verificado BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    await run(`CREATE INDEX IF NOT EXISTS idx_trendsmap_lat_lng ON trendsmap_entries(latitude, longitude)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_trendsmap_depto ON trendsmap_entries(departamento)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_trendsmap_municipio ON trendsmap_entries(municipio)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_trendsmap_created ON trendsmap_entries(created_at DESC)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_trendsmap_hashtags ON trendsmap_entries USING GIN(hashtags)`);

    const globalRes = await pool.query(`
      SELECT DISTINCT ON (topic, latitude, longitude)
        id,
        topic,
        platform,
        pais,
        departamento,
        ciudad,
        latitude,
        longitude,
        timestamp,
        metrics,
        heat_index,
        sentiment_score
      FROM global_trends
      WHERE 
        timestamp > NOW() - INTERVAL '7 days'
        AND latitude IS NOT NULL 
        AND longitude IS NOT NULL
        AND ciudad IS NOT NULL
        AND (tenant = $1 OR tenant IS NULL)
      ORDER BY topic, latitude, longitude, heat_index DESC, timestamp DESC
      LIMIT 500
    `, [tenant]);
    const globalTrends = globalRes.rows;
    console.log(`[trendsmap/seed] Encontradas ${globalTrends.length} tendencias para sincronizar`);

    let inserted = 0;
    
    if (globalTrends.length === 0) {
      console.log("[trendsmap/seed] Sin datos en global_trends, agregando tendencias de prueba...");
      const testData = [
        { text: "Movilidad critica en avenida septima por protesta", hashtags: ["Bogota", "Movilidad"], lat: 4.7124, lng: -74.0055, depto: "Cundinamarca", municipio: "Bogota" },
        { text: "Festival cultural en la candelaria - entrada libre", hashtags: ["Bogota", "Cultura", "Eventos"], lat: 4.5971, lng: -74.0766, depto: "Cundinamarca", municipio: "Bogota" },
        { text: "Nuevas ciclovias inauguradas en el norte", hashtags: ["Bogota", "Transporte", "Sostenible"], lat: 4.8233, lng: -74.0206, depto: "Cundinamarca", municipio: "Bogota" },
        { text: "Comercio reactiva con nueva zona retail en Medellin", hashtags: ["Medellin", "Economia", "Comercio"], lat: 6.2476, lng: -75.5658, depto: "Antioquia", municipio: "Medellin" },
        { text: "Carnaval de Barranquilla 2026 - preparativos finales", hashtags: ["Barranquilla", "Carnaval", "Fiesta"], lat: 10.9685, lng: -74.7813, depto: "Atlantico", municipio: "Barranquilla" },
        { text: "Cali reporta aumento en empleo de temporada", hashtags: ["Cali", "Economia", "Empleo"], lat: 3.4516, lng: -76.532, depto: "Valle del Cauca", municipio: "Cali" },
      ];
      
      for (const entry of testData) {
        await run(
          `INSERT INTO trendsmap_entries (text, hashtags, latitude, longitude, departamento, municipio, pais, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
           ON CONFLICT DO NOTHING`,
          [entry.text, entry.hashtags, entry.lat, entry.lng, entry.depto, entry.municipio, "Colombia"]
        );
        inserted++;
      }
      
      return NextResponse.json({
        success: true,
        message: `Agregadas ${inserted} tendencias de prueba (datos iniciales)`,
        count: inserted,
        isTestData: true,
      });
    }

    await run(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'trendsmap_unique_entry'
        ) THEN
          ALTER TABLE trendsmap_entries
          ADD CONSTRAINT trendsmap_unique_entry UNIQUE (text, latitude, longitude);
        END IF;
      END $$;
    `);

    for (const trend of globalTrends) {
      try {
        const hashtags: string[] = [];
        if (trend.metrics && trend.metrics.keywords) {
          hashtags.push(...trend.metrics.keywords.slice(0, 5));
        }
        if (trend.topic) {
          const hashtagMatches = trend.topic.match(/#[\w]+/g) || [];
          hashtags.push(...hashtagMatches);
        }

        await run(
          `INSERT INTO trendsmap_entries (text, hashtags, latitude, longitude, departamento, municipio, pais, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (text, latitude, longitude) DO UPDATE SET updated_at = NOW()`,
          [
            trend.topic || `Tendencia: ${trend.platform}`,
            hashtags.slice(0, 10),
            trend.latitude,
            trend.longitude,
            trend.departamento,
            trend.ciudad,
            trend.pais || "Colombia",
            trend.timestamp,
          ]
        );
        inserted++;
      } catch (err) {
        console.warn(`[trendsmap/seed] Error insertando tendencia:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sincronizadas ${inserted} tendencias reales desde global_trends`,
      count: inserted,
      total: globalTrends.length,
    });
  } catch (err: any) {
    console.error("[trendsmap/seed] Error:", err);
    return NextResponse.json(
      { error: err.message || "Error al sincronizar datos" },
      { status: 500 }
    );
  }
}
