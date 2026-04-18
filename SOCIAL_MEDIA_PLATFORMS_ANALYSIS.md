# Social Media Platforms Analysis by Module

**Analysis Date:** April 4, 2026  
**Scope:** TrendsMap, Social Listening, Inteligencia de Mercado (Market Intelligence)

---

## 1. SOCIAL LISTENING MODULE

### Platforms Used
- **Facebook** (Primary - implemented with database tables)

### Database Tables
- `facebook_group_posts` - Stores Facebook community discussion posts
  - Columns: id, municipio, post_text, sentiment_score, sentiment_label, keywords, engagement_count, created_at
  - Location: [src/lib/socialListening.ts](src/lib/socialListening.ts)

- `ads_library_records` - Meta Ads Library data (Facebook/Instagram ads)
  - Columns: id, municipio, ad_text, concern_category, spend_usd, impressions, created_at
  - Location: [src/lib/socialListening.ts](src/lib/socialListening.ts)

- `opinion_leaders` - Social media influencers and opinion leaders
  - Columns: id, municipio, nombre, profile_name, relevancia_score, posts_count, engagement_total, created_at
  - Location: [src/lib/socialListening.ts](src/lib/socialListening.ts)

- `keywords_by_municipio` - Keywords extracted from social posts
  - Columns: id, municipio, keyword, frequency_count, created_at
  - Location: [src/lib/socialListening.ts](src/lib/socialListening.ts)

### API Routes
| Route | File | Status | Integration |
|-------|------|--------|-------------|
| `POST /api/social-listening/sync` | [src/app/api/social-listening/sync/route.ts](src/app/api/social-listening/sync/route.ts) | Database prep only | ⚠️ Awaiting real API integration |
| `POST /api/social-listening/sync-real` | [src/app/api/social-listening/sync-real/route.ts](src/app/api/social-listening/sync-real/route.ts) | Clean schema | ⚠️ Requires implementation |
| `GET /api/social-listening/municipios` | [src/app/api/social-listening/municipios/route.ts](src/app/api/social-listening/municipios/route.ts) | Active | Queries `facebook_group_posts` |

### Required Platform Integrations
1. **Facebook Groups API** - Collect actual group posts
   - Current Status: ❌ Not implemented
   - Required For: Real posts, engagement metrics, timestamps

2. **Meta Ads Library API** - Collect paid advertising campaigns
   - Current Status: ❌ Not implemented
   - Required For: Ad text, spend estimates, impressions

3. **Meta Credentials Management**
   - Location: [src/lib/metaIntegration.ts](src/lib/metaIntegration.ts)
   - Current Status: Empty credentials holder (MVP placeholder)
   - Required: App ID, API token, secret

### Query Code
```typescript
// Gets Facebook posts by municipality (socialListening.ts)
SELECT id::text, municipio, post_text, sentiment_score, sentiment_label, engagement_count 
FROM facebook_group_posts 
WHERE municipio ILIKE $1 
ORDER BY created_at DESC LIMIT 10

// Gets average sentiment from Facebook posts (7-day window)
SELECT AVG(sentiment_score) as avg_sent 
FROM facebook_group_posts 
WHERE municipio ILIKE $1 
AND created_at > NOW() - INTERVAL '7 days'
```

### Sentiment Analysis
- Implementation: JavaScript `sentiment` library with custom classification
- Categories: positive, negative, neutral, queja_comunitaria, insatisfaccion, comercio, informacion_servicio
- Location: [src/lib/socialListening.ts](src/lib/socialListening.ts#L66-L84)

---

## 2. TRENDSMAP MODULE

### Platforms Used
- **Platform-agnostic** - Collects hashtags and entries without platform attribution

### Database Tables
- `trendsmap_entries` - Geolocated trend entries
  - Columns: id, text, hashtags, latitude, longitude, pais, departamento, municipio, verificado, created_at, updated_at
  - Location: [src/lib/trendsmap.ts](src/lib/trendsmap.ts)
  - Indexes: lat/lng, departamento, municipio, created_at, GIN(hashtags)

### API Routes
| Route | File | Status |
|-------|------|--------|
| `GET /api/trendsmap/query` | [src/app/api/trendsmap/query/route.ts](src/app/api/trendsmap/query/route.ts) | Active |
| `POST /api/trendsmap/submit` | [src/app/api/trendsmap/submit/route.ts](src/app/api/trendsmap/submit/route.ts) | Active |
| `POST /api/trendsmap/seed` | [src/app/api/trendsmap/seed/route.ts](src/app/api/trendsmap/seed/route.ts) | Active |
| `GET /api/trendsmap/hotspots` | [src/app/api/trendsmap/hotspots/route.ts](src/app/api/trendsmap/hotspots/route.ts) | Active |
| `POST /api/trendsmap/cleanup` | [src/app/api/trendsmap/cleanup/route.ts](src/app/api/trendsmap/cleanup/route.ts) | Active |

### Query Code
```typescript
// Geographic radius query (trendsmap entries within N km)
SELECT *,
  (6371 * acos(
    cos(radians($1)) * cos(radians(latitude)) *
    cos(radians(longitude) - radians($2)) +
    sin(radians($1)) * sin(radians(latitude))
  )) AS distance_km
FROM trendsmap_entries
WHERE (6371 * acos(...)) <= $3
ORDER BY created_at DESC
LIMIT $4

// Get trends by region (pais, departamento, municipio)
SELECT 
  ${region} as region,
  COUNT(*) as entry_count,
  ARRAY_AGG(DISTINCT unnest(hashtags)) as all_hashtags,
  MAX(created_at) as latest,
  AVG(latitude) as center_lat,
  AVG(longitude) as center_lng
FROM trendsmap_entries
WHERE ${region} ILIKE $1
AND created_at > NOW() - INTERVAL '${hours} hours'
GROUP BY ${region}
```

### Data Integration
- **Source**: Trend entries submitted via API (generic text and hashtags)
- **No Platform Attribution**: Doesn't track which platform trend originated from
- **Use Case**: Geographic heat mapping of trends without platform-specific filtering

---

## 3. INTELIGENCIA DE MERCADO (MARKET INTELLIGENCE) MODULE

### Platforms Used
- **Facebook** (Primary)
- **Meta Platforms** (Instagram - via Meta Ads Library)

### Database Tables
- `market_intelligence` - Aggregated analysis by municipality
  - Columns: id, municipio, departamento, interes_pagado, clima_organico, nivel_alerta, gap_score, volume_organic, volume_paid, avg_sentiment, last_analyzed, created_at, updated_at
  - Location: [src/lib/marketIntelligence.ts](src/lib/marketIntelligence.ts)

- `facebook_sentiment_tracks` - Facebook sentiment trends over time
  - Columns: id, municipio, keyword, frequency_count, frequency_trend, last_frequency, sentiment_avg, track_date, source (DEFAULT: 'facebook'), created_at
  - Location: [src/lib/marketIntelligence.ts](src/lib/marketIntelligence.ts#L69-L86)

- `trend_alerts` - Critical trend detection
  - Columns: id, municipio, keyword, frequency_change, alert_type, severity, description, is_active, resolved_at, created_at
  - Location: [src/lib/marketIntelligence.ts](src/lib/marketIntelligence.ts#L88-L104)

- `opinion_leaders_tracked` - Identified social media influencers
  - Columns: id, municipio, name, profile_url, engagement_score, posts_count, followers_estimate, influence_category, source (DEFAULT: 'facebook'), external_id, last_updated, created_at
  - Location: [src/lib/marketIntelligence.ts](src/lib/marketIntelligence.ts#L106-L121)

- `ads_library_extended` - Extended ads library data
  - Columns: id, municipio, ads_library_id, ad_text, concern_category, budget_estimate, impressions_estimate, active_from, active_until, targeting_info (JSONB), advertiser_name, advertiser_type, last_checked, created_at
  - Location: [src/lib/marketIntelligence.ts](src/lib/marketIntelligence.ts#L123-L143)

- Related: `facebook_group_posts` and `ads_library_records` from Social Listening module

### API Routes
| Route | File | Status | Description |
|-------|------|--------|-------------|
| `GET /api/intelligence/bubbles-data` | [src/app/api/intelligence/bubbles-data/route.ts](src/app/api/intelligence/bubbles-data/route.ts) | Active | Returns bubble chart data for municipalities |
| `POST /api/intelligence/sync-meta-data` | [src/app/api/intelligence/sync-meta-data/route.ts](src/app/api/intelligence/sync-meta-data/route.ts) | Initialized only | ⚠️ TODO: Meta API integration call |
| `GET /api/intelligence/leaders` | [src/app/api/intelligence/leaders/route.ts](src/app/api/intelligence/leaders/route.ts) | Active | Returns opinion leaders by municipality |
| `GET /api/intelligence/status` | [src/app/api/intelligence/status/route.ts](src/app/api/intelligence/status/route.ts) | Active | Returns analysis status |
| `GET /api/intelligence/alerts` | [src/app/api/intelligence/alerts/route.ts](src/app/api/intelligence/alerts/route.ts) | Active | Returns trend alerts |
| `GET /api/intelligence/departamentos` | [src/app/api/intelligence/departamentos/route.ts](src/app/api/intelligence/departamentos/route.ts) | Active | Returns departamento-level analysis |

### Query Code
```typescript
// Analyze market intelligence for municipality
SELECT COUNT(*) as count, AVG(sentiment_score) as avg_sentiment, sentiment_label
FROM facebook_group_posts 
WHERE municipio ILIKE $1 
GROUP BY sentiment_label

// Get ads data by category
SELECT COUNT(*) as count, concern_category, SUM(spend_usd) as total_spend
FROM ads_library_records
WHERE municipio ILIKE $1
GROUP BY concern_category

// Detect critical trends (100%+ frequency increase)
SELECT frequency_count FROM facebook_sentiment_tracks
WHERE municipio ILIKE $1 AND keyword = $2 AND track_date = CURRENT_DATE - INTERVAL '1 day'

// Identify opinion leaders by relevance
SELECT id, nombre, profile_name, relevancia_score, posts_count, engagement_total
FROM opinion_leaders
WHERE municipio ILIKE $1
ORDER BY relevancia_score DESC, posts_count DESC
LIMIT $2
```

### Analysis Metrics Computed
- **clima_organico** (Organic Climate): negative/positive/neutral based on avg sentiment
- **interes_pagado** (Paid Interest): most mentioned concern category from ads
- **nivel_alerta** (Alert Level): 1-10 based on volume gap, sentiment extremes, paid/organic ratio
- **gap_score**: volume_paid / volume_organic ratio
- **volume_organic**: Count of Facebook posts by municipality
- **volume_paid**: Count of Meta ads by municipality

### Required Platform Integrations
1. **Meta API** (Facebook/Instagram unified)
   - Current Status: ❌ Not implemented (TODO in sync-meta-data route)
   - Required For: Ads Library data, targeting info, budget estimates

---

## 4. GLOBAL TRENDS (Supporting Infrastructure)

### Platforms Supported
Seven platforms configured across the system:

| Platform | ID | Color | Metric Type | Location in Code |
|----------|----|----|------------|------------------|
| X (Twitter) | `x` | #14171A | Velocity of Retweets | [src/types/trends.ts](src/types/trends.ts#L2) |
| TikTok | `tiktok` | #00f2fe | Sound & Filter adoption | [src/types/trends.ts](src/types/trends.ts#L3) |
| Instagram | `instagram` | #E1306C | Save & Share rate | [src/types/trends.ts](src/types/trends.ts#L4) |
| YouTube | `youtube` | #FF0000 | View velocity per hour | [src/types/trends.ts](src/types/trends.ts#L5) |
| Facebook | `facebook` | #1877F2 | Reactions & Shares | [src/types/trends.ts](src/types/trends.ts#L6) |
| LinkedIn | `linkedin` | #0A66C2 | Comment depth | [src/types/trends.ts](src/types/trends.ts#L7) |
| Google Trends | `gtrends` | #F4B400 | Search Volume Growth | [src/types/trends.ts](src/types/trends.ts#L8) |

### Supporting Tables
- `global_trends` - Topic trends across platforms
  - Columns: id, topic, platform, metrics (JSONB), sentiment_score, heat_index, region, timestamp
  - Location: [scripts/init-db.js](scripts/init-db.js#L140)

- `influencer_rankings` - Influencer scores by platform
  - Columns: id, name, platform, handle, engagement_rate, impact_score, replication_ratio, trending_topic_id, last_updated
  - Location: [scripts/init-db.js](scripts/init-db.js#L154)

- `sentinel_alerts_history` - Platform-specific alert tracking
  - Columns: id, type, platform_id, platform_name, topic, intensity, location, timestamp
  - Location: [scripts/init-db.js](scripts/init-db.js#L169)

### API Routes (Multi-Platform)
| Route | File | Platforms |
|-------|------|-----------|
| `GET /api/trends/by-platform` | [src/app/api/trends/by-platform/route.ts](src/app/api/trends/by-platform/route.ts) | All 7 platforms |
| `GET /api/sentinel/stream` | [src/app/api/sentinel/stream/route.ts](src/app/api/sentinel/stream/route.ts) | All 7 platforms |

---

## 5. TWITTER/X INTEGRATION (Special Case)

### Implementation
- **Nitter Scraper**: Alternative to official Twitter API
  - Location: [src/lib/nitterScraper.ts](src/lib/nitterScraper.ts)
  - Nitter Instances: 
    - https://nitter.net
    - https://nitter.privacydev.net
    - https://nitter.poast.org
    - https://nitter.1d4.us
    - https://nitter.kavin.rocks

### Data Collection
- Uses Playwright browser automation for scraping
- Geographic location-based tweet collection
- Keywords-based tweet search
- Health checking for instance availability

### Query Code
```typescript
// Scrape tweets from geographic coordinates
export async function scrapeTweetsFromCoords(
  lat: number,
  lng: number,
  radiusKm: number = 15,
  maxTweets: number = MAX_TWEETS_PER_REQUEST
): Promise<ScrapedTweet[]>

// Fallback mechanism if Nitter unavailable
const scrapedTweets = await scrapeTweetsFromCoords(lat, lng, radiusKm, maxTweets);
if (allTweets.length < minRequired) {
  // Try X API direct access as fallback
}
```

---

## 6. REAL DATA VS SYNTHETIC STATUS

### Current Implementation Status

| Module | Primary Table | Real Data | Synthetic | Status |
|--------|---------------|-----------|-----------|--------|
| Social Listening | `facebook_group_posts` | ❌ No | ⚠️ Removed | Database prep only |
| Social Listening | `ads_library_records` | ❌ No | ⚠️ Removed | Database prep only |
| Market Intelligence | `facebook_sentiment_tracks` | ❌ No | ⚠️ Removed | Database prep only |
| Market Intelligence | `opinion_leaders_tracked` | ❌ No | ⚠️ Removed | Database prep only |
| TrendsMap | `trendsmap_entries` | ✅ Via API | Not applicable | Active/collecting |
| Trends | `global_trends` | ❌ No | ⚠️ Removed | Planning phase |

### Critical Note
**All synthetic data generation has been removed as of the latest refactoring.** The application is currently configured for real data collection but awaiting implementation of:
1. Facebook Groups API integration
2. Meta Ads Library API integration  
3. Twitter/X API or alternative scraping
4. Opinion leader detection algorithms
5. Real sentiment analysis models

---

## 7. SUMMARY TABLE: PLATFORM COVERAGE BY MODULE

| Platform | Social Listening | TrendsMap | Market Intelligence | Global Trends |
|----------|------------------|-----------|-------------------|---------------|
| Facebook | ✅ Primary | ⚠️ Generic | ✅ Primary | ✅ Supported |
| Instagram | ⚠️ Via Meta | ⚠️ Generic | ✅ Via Ads | ✅ Supported |
| Twitter/X | ❌ No | ⚠️ Generic | ❌ No | ✅ Supported (Nitter) |
| TikTok | ❌ No | ⚠️ Generic | ❌ No | ✅ Supported |
| YouTube | ❌ No | ⚠️ Generic | ❌ No | ✅ Supported |
| LinkedIn | ❌ No | ⚠️ Generic | ❌ No | ✅ Supported |
| Google Trends | ❌ No | ⚠️ Generic | ❌ No | ✅ Supported |
| WhatsApp | ❌ No | ❌ No | ❌ No | ❌ No |
| Telegram | ❌ No | ❌ No | ❌ No | ❌ No |
| Reddit | ❌ No | ❌ No | ❌ No | ❌ No |
| Pinterest | ❌ No | ❌ No | ❌ No | ❌ No |

**Legend:**  
✅ = Implemented and active  
⚠️ = Partially supported (generic/not platform-specific)  
❌ = Not implemented  

---

## 8. CONFIGURATION & ENVIRONMENT REQUIREMENTS

### Required Environment Variables
See [SYNTHETIC_DATA_REMOVAL_COMPLETE.md](SYNTHETIC_DATA_REMOVAL_COMPLETE.md#L132-L135):

```
# Meta Platform Credentials (Facebook/Instagram)
META_APP_ID=<facebook-app-id>
META_APP_SECRET=<facebook-app-secret>
META_ACCESS_TOKEN=<facebook-access-token>

# Twitter/X Credentials (if direct API used)
TWITTER_API_KEY=<twitter-api-key>
TWITTER_API_SECRET=<twitter-api-secret>
TWITTER_BEARER_TOKEN=<twitter-bearer-token>

# Optional: Alternative Nitter instances
NITTER_INSTANCES=<comma-separated-urls>

# TikTok, Instagram, YouTube API keys (if using those platforms)
TIKTOK_API_KEY=<tiktok-key>
YOUTUBE_API_KEY=<youtube-key>

# Google Trends API key (if using trends data)
GOOGLE_TRENDS_API_KEY=<google-key>
```

---

## 9. RECOMMENDATIONS

### High Priority
1. ✅ Complete Facebook Groups API integration (Social Listening)
2. ✅ Complete Meta Ads Library API integration (Market Intelligence)
3. ✅ Implement real sentiment analysis model (not regex-based)
4. ✅ Set up opinion leader detection algorithm

### Medium Priority
5. Integrate Twitter/X API (if credentials available) as primary source over Nitter
6. Add Instagram API integration (separate from Meta Ads)
7. Implement Google Trends integration for comparison analytics
8. Create data validation and quality monitoring

### Low Priority (Future)
9. TikTok API integration (if business need exists)
10. YouTube API integration (for news/media monitoring)
11. LinkedIn API integration (for professional network analysis)
12. Support for WhatsApp/Telegram business APIs (if applicable)

---

## 10. KEY FILES REFERENCE

### Core Module Files
- [src/lib/socialListening.ts](src/lib/socialListening.ts) - Social Listening logic
- [src/lib/marketIntelligence.ts](src/lib/marketIntelligence.ts) - Market Intelligence analysis
- [src/lib/trendsmap.ts](src/lib/trendsmap.ts) - TrendsMap geolocation queries
- [src/lib/nitterScraper.ts](src/lib/nitterScraper.ts) - Twitter/X scraping via Nitter
- [src/lib/metaIntegration.ts](src/lib/metaIntegration.ts) - Meta credentials management
- [src/types/trends.ts](src/types/trends.ts) - Platform definitions

### Database Schema
- [scripts/init-db.js](scripts/init-db.js) - Core tables (global_trends, influencer_rankings)
- [scripts/init-market-intelligence.js](scripts/init-market-intelligence.js) - Market Intelligence tables

### API Routes by Module
- **Social Listening**: [src/app/api/social-listening/](src/app/api/social-listening/)
- **TrendsMap**: [src/app/api/trendsmap/](src/app/api/trendsmap/)
- **Market Intelligence**: [src/app/api/intelligence/](src/app/api/intelligence/)
- **Global Trends**: [src/app/api/trends/](src/app/api/trends/) and [src/app/api/sentinel/](src/app/api/sentinel/)

---

**End of Analysis**
