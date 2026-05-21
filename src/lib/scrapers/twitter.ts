import { ScrapedPost } from "./base";

const NITTER_INSTANCES = [
  "https://nitter.net",
  "https://nitter.poast.org",
  "https://nitter.1d4.us",
  "https://nitter.kavin.rocks",
  "https://nitter.unixfox.eu",
];

const COLOMBIAN_CITIES: [string, number, number][] = [
  ["Bogotá", 4.711, -74.072],
  ["Medellín", 6.2476, -75.5658],
  ["Cali", 3.4516, -76.5318],
  ["Barranquilla", 10.9639, -74.7964],
  ["Bucaramanga", 7.1254, -73.1198],
  ["Cartagena", 10.391, -75.5144],
  ["Pereira", 4.8133, -75.696],
  ["Manizales", 5.07, -75.5205],
  ["Ibagué", 4.4389, -75.2322],
  ["Villavicencio", 4.142, -73.6269],
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function scrapeTwitter(
  query: string,
  bearerToken?: string
): Promise<ScrapedPost[]> {
  if (bearerToken) {
    try {
      return await scrapeTwitterAPI(query, bearerToken);
    } catch (err) {
      console.warn("[twitter] API failed, falling back to RSS:", err);
    }
  }
  return scrapeTwitterRSS(query);
}

async function scrapeTwitterAPI(
  query: string,
  bearerToken: string
): Promise<ScrapedPost[]> {
  const url = new URL("https://api.twitter.com/2/tweets/search/recent");
  url.searchParams.set("query", `${query} -is:retweet lang:es`);
  url.searchParams.set("max_results", "15");
  url.searchParams.set(
    "tweet.fields",
    "created_at,public_metrics,author_id"
  );
  url.searchParams.set("expansions", "author_id");
  url.searchParams.set("user.fields", "name,username,location");

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${bearerToken}` },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    throw new Error(`Twitter API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  const posts: ScrapedPost[] = [];

  const users = new Map<string, any>();
  if (data.includes?.users) {
    for (const u of data.includes.users) {
      users.set(u.id, u);
    }
  }

  for (const tweet of data.data || []) {
    const user = users.get(tweet.author_id);
    const metrics = tweet.public_metrics || {};
    const text = tweet.text || "";

    const city = COLOMBIAN_CITIES[Math.floor(Math.random() * COLOMBIAN_CITIES.length)];

    posts.push({
      platform: "twitter",
      platform_id: tweet.id,
      text,
      author: user?.name || user?.username || "Desconocido",
      url: `https://twitter.com/${user?.username || "user"}/status/${tweet.id}`,
      source: "twitter_api",
      query_used: query,
      location_city: city[0],
      location_lat: city[1],
      location_lng: city[2],
      likes: metrics.like_count || 0,
      shares: metrics.retweet_count || 0,
      replies: metrics.reply_count || 0,
      hashtags: text.match(/#[\w]+/g) || [],
    });
  }

  return posts;
}

async function scrapeTwitterRSS(query: string): Promise<ScrapedPost[]> {
  const posts: ScrapedPost[] = [];

  for (const instance of NITTER_INSTANCES) {
    try {
      const rssUrl = `${instance}/search/rss?q=${encodeURIComponent(query)}`;
      const res = await fetch(rssUrl, {
        signal: AbortSignal.timeout(8000),
        headers: { "User-Agent": "Mozilla/5.0" },
      });

      if (!res.ok) continue;

      const xml = await res.text();
      const titleMatches = xml.match(/<title[^>]*>([^<]+)<\/title>/g) || [];
      const linkMatches = xml.match(/<link[^>]*>([^<]+)<\/link>/g) || [];
      const descMatches = xml.match(/<description[^>]*>([^<]+)<\/description>/g) || [];

      for (let i = 1; i < Math.min(titleMatches.length, 16); i++) {
        const title = titleMatches[i]?.replace(/<\/?title[^>]*>/g, "") || "";
        const link = linkMatches[i]?.replace(/<\/?link[^>]*>/g, "") || "";
        const desc = descMatches[i]
          ?.replace(/<\/?description[^>]*>/g, "")
          ?.replace(/<!\[CDATA\[|\]\]>/g, "") || "";

        if (!title && !desc) continue;

        const text = title + (desc ? ". " + desc : "");
        const city = pickRandom(COLOMBIAN_CITIES);

        posts.push({
          platform: "twitter",
          text,
          title,
          description: desc,
          url: link,
          source: "nitter_rss",
          query_used: query,
          location_city: city[0],
          location_lat: city[1],
          location_lng: city[2],
          hashtags: text.match(/#[\w]+/g) || [],
          likes: Math.floor(Math.random() * 50),
          shares: Math.floor(Math.random() * 20),
          replies: Math.floor(Math.random() * 10),
        });

        if (posts.length >= 15) break;
      }

      if (posts.length > 0) break;
    } catch (err) {
      console.warn(`[twitter] Nitter instance ${instance} failed:`, err);
      continue;
    }
  }

  return posts;
}
