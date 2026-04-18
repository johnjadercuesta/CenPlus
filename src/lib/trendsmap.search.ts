import { pool } from "@/lib/db";

export type SearchOptions = {
  q?: string;
  hashtags?: string[];
  lat?: number;
  lng?: number;
  radiusKm?: number;
  days?: number;
  limit?: number;
};

export async function searchEntries(opts: SearchOptions) {
  const { q, hashtags, lat, lng, radiusKm = 50, days = 30, limit = 100 } = opts || {};
  const daysInt = Math.min(Math.max(1, Number(days || 30)), 365);
  const limitInt = Math.min(Math.max(1, Number(limit || 100)), 1000);

  const whereParts: string[] = [];
  const params: any[] = [];
  let idx = 1;

  if (Array.isArray(hashtags) && hashtags.length > 0) {
    const normalized = hashtags.map(h => h.startsWith("#") ? h.toLowerCase() : `#${h.toLowerCase()}`);
    whereParts.push(`hashtags && $${idx}::text[]`);
    params.push(normalized);
    idx++;
  }

  let qParamIndex: number | null = null;
  if (q && q.toString().trim().length > 0) {
    qParamIndex = idx;
    whereParts.push(`(to_tsvector('spanish', coalesce(text,'')) @@ plainto_tsquery('spanish', $${qParamIndex}) OR text ILIKE $${qParamIndex+1})`);
    params.push(q);
    params.push(`%${q}%`);
    idx += 2;
  }

  whereParts.push(`created_at > NOW() - INTERVAL '${daysInt} days'`);

  let select = `SELECT *, `;
  if (typeof lat === "number" && typeof lng === "number") {
    select += `(6371 * acos(cos(radians($${idx})) * cos(radians(latitude)) * cos(radians(longitude) - radians($${idx+1})) + sin(radians($${idx})) * sin(radians(latitude)))) AS distance_km`;
    params.push(lat, lng);
    idx += 2;
  } else {
    select += `NULL AS distance_km`;
  }

  const whereSQL = whereParts.length ? ' WHERE ' + whereParts.join(' AND ') : '';
  let orderBy = ` ORDER BY created_at DESC `;
  if (qParamIndex) {
    orderBy = ` ORDER BY ts_rank(to_tsvector('spanish', coalesce(text,'')), plainto_tsquery('spanish', $${qParamIndex})) DESC, created_at DESC `;
  } else if (typeof lat === "number" && typeof lng === "number") {
    orderBy = ` ORDER BY distance_km ASC, created_at DESC `;
  }

  const sql = `${select} FROM trendsmap_entries ${whereSQL} ${orderBy} LIMIT $${idx}`;
  params.push(limitInt);

  const { rows } = await pool.query(sql, params);
  return rows;
}

export async function searchByHashtag(hashtag: string, days?: number, limit?: number) {
  const h = hashtag.startsWith("#") ? hashtag.toLowerCase() : `#${hashtag.toLowerCase()}`;
  return searchEntries({ hashtags: [h], days, limit });
}

export async function searchByKeyword(keyword: string, days?: number, limit?: number) {
  return searchEntries({ q: keyword, days, limit });
}
