import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { scrapers } from "@/lib/scrapers";
import { saveScrapedPosts, getStoredApiConfig, cleanupExpiredTrends } from "@/lib/scrapers/base";
import { initTrendsScrapedTable } from "@/lib/scrapers/init";

const PLATFORM_MAP: Record<string, keyof typeof scrapers> = {
  twitter: "twitter",
  youtube: "youtube",
  google: "google",
  google_news: "google_news",
  instagram: "instagram",
  facebook: "facebook",
};

export async function POST(request: NextRequest) {
  try {
    await initTrendsScrapedTable();

    const body = await request.json().catch(() => ({}));
    const platforms: string[] = body.platforms || [
      "twitter", "youtube", "google", "google_news", "instagram", "facebook",
    ];
    const query = body.query || "Colombia";
    const maxResults = body.max_results || 15;

    const apiConfig = await getStoredApiConfig();
    const results: { platform: string; status: string; count: number; error?: string }[] = [];

    for (const platform of platforms) {
      const scraperKey = PLATFORM_MAP[platform];
      if (!scraperKey) {
        results.push({ platform, status: "error", count: 0, error: "Plataforma no soportada" });
        continue;
      }

      try {
        const scraperFn = scrapers[scraperKey];
        let posts: any[] = [];

        switch (platform) {
          case "twitter":
            posts = await (scraperFn as Function)(query, apiConfig.twitter_bearer_token);
            break;
          case "youtube":
            posts = await (scraperFn as Function)(query, apiConfig.youtube_api_key);
            break;
          case "google":
            posts = await (scraperFn as Function)(query, "web", apiConfig.custom_search_key, apiConfig.custom_search_id);
            break;
          case "google_news":
            posts = await (scraperFn as Function)(query, "news", apiConfig.custom_search_key, apiConfig.custom_search_id);
            break;
          case "instagram":
            posts = await (scraperFn as Function)(query);
            break;
          case "facebook":
            posts = await (scraperFn as Function)(query);
            break;
        }

        if (posts.length > 0) {
          const saved = await saveScrapedPosts(posts.slice(0, maxResults));
          results.push({ platform, status: "ok", count: saved });
        } else {
          results.push({ platform, status: "ok", count: 0 });
        }
      } catch (err: any) {
        results.push({ platform, status: "error", count: 0, error: err.message });
      }
    }

    await cleanupExpiredTrends();

    const totalSaved = results.reduce((sum, r) => sum + r.count, 0);

    return NextResponse.json({
      success: true,
      message: `Scraping completado. ${totalSaved} publicaciones guardadas.`,
      results,
    });
  } catch (err: any) {
    console.error("[inteligencia/scrape/run] Error:", err);
    return NextResponse.json(
      { error: "Error al ejecutar scraping", message: err.message },
      { status: 500 }
    );
  }
}
