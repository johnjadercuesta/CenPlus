import { scrapeTwitter } from "./twitter";
import { scrapeYouTube } from "./youtube";
import { scrapeGoogle } from "./google";
import { scrapeInstagram, scrapeFacebook } from "./social";

export const scrapers = {
  twitter: scrapeTwitter,
  youtube: scrapeYouTube,
  google: (query: string) => scrapeGoogle(query, "web"),
  google_news: (query: string) => scrapeGoogle(query, "news"),
  instagram: scrapeInstagram,
  facebook: scrapeFacebook,
};

export type ScraperPlatform = keyof typeof scrapers;

export async function scrapePlatform(
  platform: string,
  query: string,
  apiConfig: Record<string, string>
): Promise<{ platform: string; count: number }> {
  try {
    let posts: any[] = [];

    switch (platform) {
      case "twitter":
        posts = await scrapeTwitter(query, apiConfig.twitter_bearer_token);
        break;
      case "youtube":
        posts = await scrapeYouTube(query, apiConfig.youtube_api_key);
        break;
      case "google":
        posts = await scrapeGoogle(query, "web", apiConfig.custom_search_key, apiConfig.custom_search_id);
        break;
      case "google_news":
        posts = await scrapeGoogle(query, "news", apiConfig.custom_search_key, apiConfig.custom_search_id);
        break;
      case "instagram":
        posts = await scrapeInstagram(query);
        break;
      case "facebook":
        posts = await scrapeFacebook(query);
        break;
    }

    return { platform, count: posts.length };
  } catch (err) {
    console.error(`[scrapers/${platform}] Error:`, err);
    return { platform, count: 0 };
  }
}
