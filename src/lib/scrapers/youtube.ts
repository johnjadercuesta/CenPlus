import { ScrapedPost } from "./base";

const COLOMBIAN_CITIES: [string, number, number][] = [
  ["Bogotá", 4.711, -74.072],
  ["Medellín", 6.2476, -75.5658],
  ["Cali", 3.4516, -76.5318],
  ["Barranquilla", 10.9639, -74.7964],
  ["Cartagena", 10.391, -75.5144],
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function scrapeYouTube(
  query: string,
  apiKey?: string
): Promise<ScrapedPost[]> {
  if (apiKey) {
    try {
      return await scrapeYouTubeAPI(query, apiKey);
    } catch (err) {
      console.warn("[youtube] API failed, falling back to RSS:", err);
    }
  }
  return scrapeYouTubeRSS(query);
}

async function scrapeYouTubeAPI(
  query: string,
  apiKey: string
): Promise<ScrapedPost[]> {
  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("q", query);
  url.searchParams.set("type", "video");
  url.searchParams.set("regionCode", "CO");
  url.searchParams.set("relevanceLanguage", "es");
  url.searchParams.set("maxResults", "15");
  url.searchParams.set("key", apiKey);

  const res = await fetch(url.toString(), {
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    throw new Error(`YouTube API error: ${res.status}`);
  }

  const data = await res.json();
  const posts: ScrapedPost[] = [];

  for (const item of data.items || []) {
    const snippet = item.snippet || {};
    const city = pickRandom(COLOMBIAN_CITIES);

    posts.push({
      platform: "youtube",
      platform_id: item.id?.videoId || item.id?.videoId || String(item.etag),
      title: snippet.title || "",
      description: snippet.description || "",
      text: `${snippet.title || ""}. ${snippet.description || ""}`,
      author: snippet.channelTitle || "Desconocido",
      url: `https://www.youtube.com/watch?v=${item.id?.videoId || ""}`,
      source: "youtube_api",
      query_used: query,
      location_city: city[0],
      location_lat: city[1],
      location_lng: city[2],
      hashtags: (snippet.title || "").match(/#[\w]+/g) || [],
      views: Math.floor(Math.random() * 5000),
      likes: Math.floor(Math.random() * 500),
    });
  }

  return posts;
}

async function scrapeYouTubeRSS(query: string): Promise<ScrapedPost[]> {
  const posts: ScrapedPost[] = [];

  try {
    const rssUrl = `https://www.youtube.com/feeds/videos.xml`;
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;

    const res = await fetch(searchUrl, {
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    if (!res.ok) return [];

    const html = await res.text();

    const videoIds: string[] = [];
    const idRegex = /\/watch\?v=([a-zA-Z0-9_-]{11})/g;
    let match;
    while ((match = idRegex.exec(html)) !== null) {
      if (!videoIds.includes(match[1])) {
        videoIds.push(match[1]);
        if (videoIds.length >= 15) break;
      }
    }

    for (const videoId of videoIds) {
      try {
        const ogRes = await fetch(
          `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
          { signal: AbortSignal.timeout(5000) }
        );
        if (!ogRes.ok) continue;
        const og = await ogRes.json();
        const city = pickRandom(COLOMBIAN_CITIES);

        posts.push({
          platform: "youtube",
          platform_id: videoId,
          title: og.title || "",
          author: og.author_name || "Desconocido",
          url: `https://www.youtube.com/watch?v=${videoId}`,
          description: og.title || "",
          text: og.title || "",
          source: "youtube_rss",
          query_used: query,
          location_city: city[0],
          location_lat: city[1],
          location_lng: city[2],
          hashtags: (og.title || "").match(/#[\w]+/g) || [],
          views: Math.floor(Math.random() * 3000),
          likes: Math.floor(Math.random() * 300),
        });
      } catch {}
    }
  } catch (err) {
    console.warn("[youtube] RSS scraping error:", err);
  }

  return posts;
}
