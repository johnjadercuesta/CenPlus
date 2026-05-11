import { pool } from "@/lib/db";
import { queryWithTenant } from "@/lib/tenant";

type InsertData = {
  text: string;
  hashtags: string[];
  latitude: number;
  longitude: number;
  pais?: string;
  departamento?: string;
  municipio?: string;
  expires_at?: Date | string | null;
  barrio?: string | null;
  comuna?: string | null;
  mentioned_profiles?: string[];
  mentioned_sites?: string[];
};

async function runQuery(sql: string, params: any[] = [], tenant?: string | null) {
  if (tenant) {
    return await queryWithTenant(tenant, sql, params);
  }
  return await pool.query(sql, params);
}

export async function initTrendsmapTable(tenant?: string | null) {
  try {
    await runQuery(`
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
      );
    `, [], tenant);

    await runQuery(`ALTER TABLE trendsmap_entries ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;`, [], tenant);
    await runQuery(`ALTER TABLE trendsmap_entries ADD COLUMN IF NOT EXISTS barrio VARCHAR(200);`, [], tenant);
    await runQuery(`ALTER TABLE trendsmap_entries ADD COLUMN IF NOT EXISTS comuna VARCHAR(100);`, [], tenant);
    await runQuery(`ALTER TABLE trendsmap_entries ADD COLUMN IF NOT EXISTS mentioned_profiles TEXT[] DEFAULT '{}'::text[];`, [], tenant);
    await runQuery(`ALTER TABLE trendsmap_entries ADD COLUMN IF NOT EXISTS mentioned_sites TEXT[] DEFAULT '{}'::text[];`, [], tenant);

    // Índices
    await runQuery(`CREATE INDEX IF NOT EXISTS idx_trendsmap_lat_lng ON trendsmap_entries(latitude, longitude);`, [], tenant);
    await runQuery(`CREATE INDEX IF NOT EXISTS idx_trendsmap_depto ON trendsmap_entries(departamento);`, [], tenant);
    await runQuery(`CREATE INDEX IF NOT EXISTS idx_trendsmap_municipio ON trendsmap_entries(municipio);`, [], tenant);
    await runQuery(`CREATE INDEX IF NOT EXISTS idx_trendsmap_created ON trendsmap_entries(created_at DESC);`, [], tenant);
    await runQuery(`CREATE INDEX IF NOT EXISTS idx_trendsmap_hashtags ON trendsmap_entries USING GIN(hashtags);`, [], tenant);
    await runQuery(`CREATE INDEX IF NOT EXISTS idx_trendsmap_expires ON trendsmap_entries(expires_at);`, [], tenant);
    await runQuery(`CREATE INDEX IF NOT EXISTS idx_trendsmap_mentioned_profiles ON trendsmap_entries USING GIN(mentioned_profiles);`, [], tenant);
    await runQuery(`CREATE INDEX IF NOT EXISTS idx_trendsmap_mentioned_sites ON trendsmap_entries USING GIN(mentioned_sites);`, [], tenant);
    await runQuery(`CREATE INDEX IF NOT EXISTS idx_trendsmap_text_tsv ON trendsmap_entries USING GIN (to_tsvector('spanish', coalesce(text,'')));`, [], tenant);

    console.log("[trendsmap] Tabla inicializada correctamente (migraciones aseguradas)");
  } catch (err) {
    console.error("[trendsmap] Error inicializando tabla:", err);
  }
}

export async function insertEntry(data: InsertData, tenant?: string | null) {
  const ttlDays = Number(process.env.TRENDS_TTL_DAYS || 30);
  const expiresAt = data.expires_at
    ? new Date(data.expires_at)
    : new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

  const res = await runQuery(
    `INSERT INTO trendsmap_entries (text, hashtags, latitude, longitude, pais, departamento, municipio, expires_at, barrio, comuna, mentioned_profiles, mentioned_sites)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING *`,
    [
      data.text,
      data.hashtags,
      data.latitude,
      data.longitude,
      data.pais || "Colombia",
      data.departamento || null,
      data.municipio || null,
      expiresAt,
      data.barrio || null,
      data.comuna || null,
      data.mentioned_profiles || [],
      data.mentioned_sites || [],
    ],
    tenant
  );
  return res.rows[0];
}

export async function getEntriesByRadius(lat: number, lng: number, radiusKm: number = 50, limit: number = 100, tenant?: string | null) {
  const res = await runQuery(
    `SELECT *,
       (6371 * acos(
         cos(radians($1)) * cos(radians(latitude)) *
         cos(radians(longitude) - radians($2)) +
         sin(radians($1)) * sin(radians(latitude))
       )) AS distance_km
     FROM trendsmap_entries
     WHERE (6371 * acos(
       cos(radians($1)) * cos(radians(latitude)) *
       cos(radians(longitude) - radians($2)) +
       sin(radians($1)) * sin(radians(latitude))
     )) <= $3
     ORDER BY created_at DESC
     LIMIT $4`,
    [lat, lng, radiusKm, limit],
    tenant
  );
  return res.rows;
}

export async function getTrendsByRegion(region: "pais" | "departamento" | "municipio", value: string, hours: number = 24, tenant?: string | null) {
  const col = region;
  const res = await runQuery(
    `SELECT 
       ${col} as region,
       COUNT(*) as entry_count,
       (SELECT ARRAY_AGG(DISTINCT h) FROM unnest(ARRAY_AGG(hashtags)::text[]) h) as all_hashtags,
       MAX(created_at) as latest,
       MIN(created_at) as earliest,
       AVG(latitude) as center_lat,
       AVG(longitude) as center_lng
     FROM trendsmap_entries
     WHERE ${col} ILIKE $1
       AND created_at > NOW() - ($2 || ' hours')::interval
     GROUP BY ${col}
     ORDER BY entry_count DESC`,
    [value, hours],
    tenant
  );
  return res.rows;
}

export async function getHotspots(hours: number = 24, minEntries: number = 3, tenant?: string | null) {
  const res = await runQuery(
    `WITH base AS (
       SELECT 
         departamento,
         municipio,
         COUNT(*) as entry_count,
         AVG(latitude) as center_lat,
         AVG(longitude) as center_lng,
         MAX(created_at) as latest,
         ARRAY_AGG(hashtags) as all_hashtag_arrays
       FROM trendsmap_entries
       WHERE created_at > NOW() - ($2 || ' hours')::interval
       GROUP BY departamento, municipio
       HAVING COUNT(*) >= $1
     ),
     recent AS (
       SELECT DISTINCT ON (te.departamento, te.municipio)
         te.departamento,
         te.municipio,
         ARRAY(
           SELECT t.text FROM trendsmap_entries t
           WHERE t.departamento = te.departamento AND t.municipio = te.municipio
           ORDER BY t.created_at DESC LIMIT 5
         ) as recent_texts
       FROM trendsmap_entries te
       INNER JOIN base b ON b.departamento = te.departamento AND b.municipio = te.municipio
     )
     SELECT 
       b.departamento,
       b.municipio,
       b.entry_count,
       r.recent_texts,
       b.all_hashtag_arrays as top_hashtags,
       b.center_lat,
       b.center_lng,
       b.latest
     FROM base b
     LEFT JOIN recent r ON r.departamento = b.departamento AND r.municipio = b.municipio
     ORDER BY b.entry_count DESC`,
    [minEntries, hours],
    tenant
  );
  return res.rows;
}

export async function getTrendGrowth(hours: number = 24, tenant?: string | null) {
  const currRes = await runQuery(
    `SELECT departamento, municipio, COUNT(*) as count
     FROM trendsmap_entries
     WHERE created_at > NOW() - ($1 || ' hours')::interval
     GROUP BY departamento, municipio`,
    [hours],
    tenant
  );

  const prevRes = await runQuery(
    `SELECT departamento, municipio, COUNT(*) as count
     FROM trendsmap_entries
     WHERE created_at BETWEEN NOW() - ($1 || ' hours')::interval AND NOW() - ($2 || ' hours')::interval
     GROUP BY departamento, municipio`,
    [hours * 2, hours],
    tenant
  );

  const previous = prevRes.rows;
  const current = currRes.rows;

  const prevMap = new Map<string, number>();
  previous.forEach((r: any) => prevMap.set(`${r.departamento}-${r.municipio}`, parseInt(r.count)));

  const growth = current
    .map((r: any) => {
      const key = `${r.departamento}-${r.municipio}`;
      const prev = prevMap.get(key) || 0;
      const curr = parseInt(r.count);
      return {
        departamento: r.departamento,
        municipio: r.municipio,
        currentCount: curr,
        previousCount: prev,
        growth: prev > 0 ? ((curr - prev) / prev) * 100 : curr > 0 ? 100 : 0,
      };
    })
    .filter((r) => r.growth > 0)
    .sort((a, b) => b.growth - a.growth);

  return growth;
}

export async function syncFromGlobalTrends(tenant?: string | null) {
  try {
    const globalRes = await runQuery(
      `SELECT 
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
      ORDER BY timestamp DESC
      LIMIT 1000`,
      [],
      tenant
    );

    const globalTrends = globalRes.rows;
    if (globalTrends.length === 0) return 0;

    let inserted = 0;
    for (const trend of globalTrends) {
      try {
        const hashtags: string[] = [];
        if (trend.metrics && trend.metrics.keywords) {
          hashtags.push(...(Array.isArray(trend.metrics.keywords) ? trend.metrics.keywords : []).slice(0, 5));
        }
        if (trend.topic) {
          const hashtagMatches = trend.topic.match(/#[\w]+/g) || [];
          hashtags.push(...hashtagMatches);
        }

        const ttlDays = Number(process.env.TRENDS_TTL_DAYS || 30);
        const createdAt = trend.timestamp ? new Date(trend.timestamp) : new Date();
        const expiresAt = new Date(createdAt.getTime() + ttlDays * 24 * 60 * 60 * 1000);

        const res = await runQuery(
          `INSERT INTO trendsmap_entries (text, hashtags, latitude, longitude, departamento, municipio, pais, created_at, expires_at, barrio, comuna, mentioned_profiles, mentioned_sites)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
           ON CONFLICT DO NOTHING
           RETURNING id`,
          [
            trend.topic || `Tendencia: ${trend.platform}`,
            hashtags.slice(0, 10),
            trend.latitude,
            trend.longitude,
            trend.departamento,
            trend.ciudad,
            trend.pais || "Colombia",
            createdAt,
            expiresAt,
            null,
            null,
            [],
            [],
          ],
          tenant
        );
        if (res.rows.length > 0) inserted++;
      } catch (err) {
        // Silenciar conflictos de duplicados
      }
    }

    console.log(`[trendsmap] Sincronizadas ${inserted} tendencias desde global_trends (tenant=${tenant||'public'})`);
    return inserted;
  } catch (err) {
    console.error("[trendsmap] Error sincronizando:", err);
    return 0;
  }
}
