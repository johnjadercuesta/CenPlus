import { pool } from "@/lib/db";
import { analyzeSpanishSentiment, extractKeywords, calculateHeatIndex } from "./nlp";

export interface ScrapedPost {
  platform: string;
  platform_id?: string;
  text: string;
  title?: string;
  description?: string;
  author?: string;
  url?: string;
  source?: string;
  query_used?: string;
  location_city?: string;
  location_lat?: number;
  location_lng?: number;
  hashtags?: string[];
  likes?: number;
  shares?: number;
  replies?: number;
  views?: number;
}

export async function saveScrapedPosts(posts: ScrapedPost[]): Promise<number> {
  if (posts.length === 0) return 0;

  let saved = 0;
  for (const post of posts) {
    try {
      const textToAnalyze = post.text || post.title || post.description || "";
      const sentiment = analyzeSpanishSentiment(textToAnalyze);
      const keywords = extractKeywords(textToAnalyze);
      const heatIndex = calculateHeatIndex(
        sentiment.score,
        keywords.length * 10,
        0
      );

      await pool.query(`
        INSERT INTO trends_scraped (
          platform, platform_id, text, title, description,
          author, url, source, query_used,
          location_city, location_lat, location_lng,
          hashtags, likes, shares, replies, views,
          sentiment_score, sentiment_label, keywords,
          heat_index
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9,
          $10, $11, $12,
          $13, $14, $15, $16, $17,
          $18, $19, $20,
          $21
        ) ON CONFLICT DO NOTHING
      `, [
        post.platform,
        post.platform_id || null,
        post.text,
        post.title || null,
        post.description || null,
        post.author || null,
        post.url || null,
        post.source || "api",
        post.query_used || null,
        post.location_city || null,
        post.location_lat || null,
        post.location_lng || null,
        post.hashtags || [],
        post.likes || 0,
        post.shares || 0,
        post.replies || 0,
        post.views || 0,
        sentiment.score,
        sentiment.label,
        keywords,
        heatIndex,
      ]);
      saved++;
    } catch (err) {
      console.warn(`[scrapers/save] Error guardando post:`, err);
    }
  }

  return saved;
}

export async function getStoredConfig(key: string): Promise<string | null> {
  try {
    const { rows } = await pool.query(
      "SELECT valor FROM config WHERE clave = $1",
      [key]
    );
    return rows[0]?.valor || null;
  } catch {
    return null;
  }
}

export async function getStoredApiConfig(): Promise<Record<string, string>> {
  try {
    const raw = await getStoredConfig("inteligencia_api_config");
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

export async function getFreshTrends(
  platform?: string,
  limit: number = 15,
  hours: number = 24
) {
  let whereClause = `WHERE scraped_at > NOW() - ($1 || ' hours')::interval`;
  const params: any[] = [hours];

  if (platform) {
    whereClause += ` AND platform ILIKE $2`;
    params.push(`%${platform}%`);
  }

  const { rows } = await pool.query(`
    SELECT 
      platform,
      text,
      title,
      description,
      location_city,
      location_lat,
      location_lng,
      sentiment_score,
      sentiment_label,
      keywords,
      heat_index,
      scraped_at,
      hashtags,
      likes,
      shares,
      replies,
      views
    FROM trends_scraped
    ${whereClause}
    ORDER BY heat_index DESC NULLS LAST, scraped_at DESC
    LIMIT $${params.length + 1}
  `, [...params, limit]);

  return rows;
}

export async function cleanupExpiredTrends(): Promise<number> {
  const { rowCount } = await pool.query(
    "DELETE FROM trends_scraped WHERE expires_at < NOW()"
  );
  return rowCount || 0;
}
