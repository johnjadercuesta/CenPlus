import { pool } from "@/lib/db";

export async function initTrendsScrapedTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS trends_scraped (
        id SERIAL PRIMARY KEY,
        platform VARCHAR(50) NOT NULL,
        platform_id VARCHAR(255),
        text TEXT NOT NULL,
        title TEXT,
        description TEXT,
        author VARCHAR(255),
        url TEXT,
        source VARCHAR(50) DEFAULT 'api',
        query_used VARCHAR(255),
        location_city VARCHAR(150),
        location_lat DOUBLE PRECISION,
        location_lng DOUBLE PRECISION,
        hashtags TEXT[] DEFAULT '{}',
        likes INT DEFAULT 0,
        shares INT DEFAULT 0,
        replies INT DEFAULT 0,
        views INT DEFAULT 0,
        sentiment_score DOUBLE PRECISION DEFAULT 0,
        sentiment_label VARCHAR(20) DEFAULT 'neutral',
        keywords TEXT[] DEFAULT '{}',
        heat_index DOUBLE PRECISION DEFAULT 0,
        scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        tenant VARCHAR(63),
        expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '7 days'
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_trends_scraped_platform ON trends_scraped(platform)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_trends_scraped_scraped_at ON trends_scraped(scraped_at DESC)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_trends_scraped_expires ON trends_scraped(expires_at)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_trends_scraped_platform_id ON trends_scraped(platform_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_trends_scraped_tenant ON trends_scraped(tenant)
    `);

    return { success: true };
  } catch (err) {
    console.error("[trends-scraped] Error creating table:", err);
    return { success: false, error: String(err) };
  }
}
