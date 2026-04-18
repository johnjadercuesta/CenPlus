# Market Intelligence Module - SIP Analysis Report
**Date:** April 4, 2026  
**Status:** PARTIAL IMPLEMENTATION - MVP with significant gaps

---

## EXECUTIVE SUMMARY

The current "Inteligencia de Mercadeo" module has foundational infrastructure but **lacks the core SIP (Sistema de Inteligencia Poblacional) specification capabilities**. Core missing elements: real data extraction, demographic integration, keyword weighting system, and advanced analytical algorithms.

**Implementation Status:** ~35% complete (database + basic visualization only)

---

## 1. DATA EXTRACTION/SCRAPERS

### ❌ MISSING (Critical)

| Component | Required | Current |
|-----------|----------|---------|
| **Python Scrapers** | For Facebook groups, government sources, census data | NOT IMPLEMENTED |
| **Playwright Integration** | Headless browser automation | NOT IMPLEMENTED |
| **Scrapy Framework** | Distributed scraping pipeline | NOT IMPLEMENTED |
| **Meta API (Real)** | Ads Library API, Graph API (Groups/Pages) | MOCKED (MVP only) |
| **Google Trends API** | Keyword trending data | NOT IMPLEMENTED |
| **Census Data ETL** | Integration with DANE/demographic sources | NOT IMPLEMENTED |
| **Real-time Collection** | Active data ingestion from sources | NOT IMPLEMENTED |

### ✅ PARTIAL (Mock only)

- **Location:** `src/lib/metaIntegration.ts` (150 lines)
- **Status:** All functions return empty arrays (no real API calls)
- **Functions available but not functional:**
  - `fetchAdsLibrary(municipio, category)` - Returns `[]`
  - `fetchGroupPosts(group_id, municipio)` - Returns `[]`
  - `fetchLeaderProfiles(municipio, keywords)` - Returns `[]`
- **Auth Handling:** Stores credentials but never uses them
- **Error Handling:** Logs warnings, returns empty data

### 📋 Files Involved
- `src/lib/metaIntegration.ts` - Mock Meta integration
- `src/lib/metaIntegration.ts` - Mock credential storage
- `src/lib/nitterScraper.ts` - **Only functional scraper** (Twitter/X via Nitter)
- `scripts/seed-market-intelligence.js` - Demo data only

**Recommendation:** Priority implementation area. Cannot generate real intelligence without actual data sources.

---

## 2. DATABASE STRUCTURE

### ✅ IMPLEMENTED

**Tables Created (5 total):**

| Table | Purpose | Columns | Status |
|-------|---------|---------|--------|
| `market_intelligence` | Central metrics storage | municipio, departamento, interes_pagado, clima_organico, nivel_alerta, gap_score, volume_organic, volume_paid, avg_sentiment | ✅ Complete |
| `facebook_sentiment_tracks` | Time-series sentiment | municipio, keyword, frequency_count, frequency_trend, sentiment_avg, track_date | ✅ Complete |
| `trend_alerts` | Alert generation | municipio, keyword, frequency_change, alert_type, severity, is_active | ✅ Complete |
| `opinion_leaders_tracked` | Leader identification | municipio, name, engagement_score, posts_count, followers_estimate | ✅ Complete |
| `ads_library_extended` | Paid advertising data | municipio, ads_library_id, campaign_info, budget, impressions | ✅ Complete |

**Indices (8 total):**
- `idx_market_intel_mun` - Quick municipio lookup
- `idx_market_intel_dept` - Department filtering
- `idx_sentiment_tracks_keyword` - Keyword analysis
- `idx_trend_alerts_active` - Active alerts only
- Similar indices on others for optimization

### ❌ MISSING (Critical)

| Missing Component | SIP Requirement | Impact |
|------------------|-----------------|--------|
| **Demographics Table** | Census data (edad, genero, ingreso_nivel, educacion) | Cannot cross-analyze with population segments |
| **Keyword Weights Table** | Urgency scores (1-10), semantic categories | Cannot calculate weighted impact |
| **PostGIS Integration** | Geographic boundaries, heat maps, buffers | Cannot perform spatial analysis |
| **Census Integration** | DANE data for demographic context | Cannot correlate trends with demographics |
| **Temporal Tables** | Historical snapshots for trend tracking | Cannot show trend direction (rising/falling) |
| **Schema Constraints** | Foreign keys, referential integrity | Data quality issues possible |

**Specific Missing Columns:**

```sql
-- Missing in market_intelligence table:
urgency_weight INT (1-10 system)
demographic_segments JSONB (age, income groups affected)
population_context INT (target population size)
confidence_score FLOAT (0-100)
source_reliability FLOAT (credibility metric)

-- Missing entirely - demographics_crossing table:
demographic_segment_id
keyword_id
frequency_by_segment INT
sentiment_by_segment FLOAT
impact_score FLOAT

-- Missing entirely - keyword_weights table:
keyword VARCHAR(100) PRIMARY KEY
urgency_level INT (1-10)
semantic_category VARCHAR(50) (salud, seguridad, económico, etc.)
cross_theme_associations JSONB
minimum_alert_threshold INT
```

**File Location:** `scripts/init-market-intelligence.js` (migration script)

---

## 3. PROCESSING LOGIC - ALGORITHMS & WEIGHTING

### ❌ MISSING (Critical - Core SIP Logic)

#### A. Keyword Weighting System
**Current:** Static 1-10 scale in `nivel_alerta` based on volume gap
**Required (SIP):** Multi-dimensional weighting

```
Missing Implementation:
┌─────────────────────────────────────────┐
│ URGENCY CALCULATION (Not Implemented)    │
├─────────────────────────────────────────┤
│ Inputs:                                 │
│  • Base keyword urgency (1-10) ← NOT IN DB
│  • Frequency change % (currently used)   │
│  • Demographic multiplier ← NOT CALCULATED
│  • Geographic concentration ← NOT CALCULATED
│  • Temporal trend (rising/falling) ← NOT TRACKED
│  • Sentiment polarity ← BASIC ONLY
│  • Government response gap ← MISSING DATA
│                                         │
│ Formula: MISSING                        │
│  urgency = base_weight *                │
│           (1 + freq_change/100) *       │
│           demographic_impact *          │
│           geo_concentration *           │
│           sentiment_severity            │
│                                         │
│ Current Output: Simple 1-10 number      │
│ Required Output: Weighted score 0-100   │
└─────────────────────────────────────────┘
```

**Current Implementation Location:** `src/lib/marketIntelligence.ts:analyzeMarketIntelligence()`

```typescript
// CURRENT - Oversimplified
let nivel_alerta = 5;
if (gap > 20) nivel_alerta += 3;           // Only volume-based
if (avg_sentiment < -1) nivel_alerta += 2; // Only sentiment
if (volume_paid > volume_organic * 2) nivel_alerta += 1;
nivel_alerta = Math.min(10, Math.max(1, nivel_alerta));

// REQUIRED - Multi-factor
urgency_score = (
  keyword.urgency_weight * 
  (1 + frequency_change_pct / 100) * 
  demographic_multiplier * 
  geographic_concentration * 
  sentiment_severity_index
)
```

#### B. Demographic Crossing Algorithm
**Current:** NONE - No demographic data available  
**Required:** Cross-tabulation of trends × demographic segments

```typescript
// MISSING ALGORITHM
interface DemographicCrossing {
  keyword: string;
  age_group: string;          // 18-25, 26-40, 41-60, 60+
  income_level: string;        // bajo, medio_bajo, medio, alto
  education_level: string;     // primaria, secundaria, superior
  frequency: number;           // Mentions in this demographic
  sentiment_avg: number;       // Average sentiment for segment
  engagement_rate: number;     // Posts/reactions per capita
  urgency_multiplier: number;  // How urgent for THIS demographic
}

// MISSING OUTPUT
Administrative Priority Matrix would show:
┌────────────────────────────────┐
│ DEMOGRAPHIC × KEYWORD MATRIX   │
├───────────────┬────────────────┤
│ Segment       │ Keyword        │
│ (Age 18-25,   │ (Desempleo)    │
│  Income Bajo) │ 87% mentions   │
│               │ Sentiment: -2.1│
│               │ Urgency: 95/100│
└───────────────┴────────────────┘
```

#### C. Impact Calculation Formula
**Current:** Gap score only = `volume_paid / volume_organic`  
**Required:** Multi-factor impact analysis

```
Missing Formula:
impact_score = (
  urgency_weight *                    // ← Missing (1-10 per keyword)
  frequency_trend_multiplier *        // ← Missing (historical)
  demographic_coverage *              // ← Missing (% of population affected)
  government_response_gap *           // ← Missing (no gov data)
  social_amplification_factor *       // ← Partial (only gap_score)
  time_decay_factor                   // ← Missing (older = less urgent)
)

Current: impact ≈ nivel_alerta (1-10 only)
Required: impact ∈ [0-1000] (composite score)
```

**Files Affected:**
- `src/lib/marketIntelligence.ts` - Where algorithms live
- Missing: `src/lib/algorithmEngine.ts` - Where they SHOULD live
- Missing: `src/lib/demographicAnalysis.ts` - For crossing
- Missing: `src/lib/impactCalculator.ts` - For scoring

### ❌ MISSING (Important)

1. **Historical Trend Analysis** - Only last 24h tracked
   - Missing: Weekly/monthly trends
   - Missing: Trend direction (RISING/FALLING/STABLE)
   - Missing: Velocity analysis (accelerating/decelerating)

2. **Sentiment Nuance** - Current: Simple -1 to +1 scale
   - Missing: Emotional tone (anger, fear, hope, frustration)
   - Missing: Semantic polarity (what aspect is positive/negative)
   - Missing: Sarcasm detection

3. **Correlation Analysis** - Currently none
   - Missing: Co-occurrence of keywords (salud + seguridad = healthcare security)
   - Missing: Geographic clustering (hotspots)
   - Missing: Temporal correlation (trends that follow each other)

---

## 4. OUTPUT REPORTS

### ❌ MISSING (All 3 Critical Reports)

#### A. Administrative Priority Matrix (MISSING)

**Purpose:** Rank neighborhoods/municipalities by crisis urgency for government resource allocation

**SIP Requirement:**
```
╔════════════════════════════════════════════════════════╗
║ ADMINISTRATIVE PRIORITY MATRIX (NOT IMPLEMENTED)       ║
╠═══════════╦═════════════╦════════════╦═════════════════╣
║ Ranking   ║ Municipio   ║ Crisis Type║ Urgency Score   ║
╠═══════════╬═════════════╬════════════╬═════════════════╣
║ 🔴 1      ║ Medellín    ║ Seguridad  ║ 94/100 (↗ +25%)║
║           ║ Afectados   ║ Desempleo  ║ 87/100 (↗ +18%)║
╠═══════════╬═════════════╬════════════╬═════════════════╣
║ 🟠 2      ║ Cali        ║ Violencia  ║ 81/100 (→ +2%) ║
║           ║ Drogas      ║ Migración  ║ 76/100 (↘ -8%) ║
╠═══════════╬═════════════╬════════════╬═════════════════╣
║ 🟡 3      ║ Bogotá      ║ Educación  ║ 68/100 (→ ±3%) ║
║           ║ Salud       ║ Agua       ║ 64/100 (↘ -12%)║
╚═══════════╩═════════════╩════════════╩═════════════════╝

Shows:
- Ranking based on composite urgency
- Top crisis themes per municipality
- Trend direction (arrows)
- Supporting demographic data
```

**Current Implementation:** NONE  
**Why Missing:** Requires:
- Keyword urgency weights (not in DB)
- Demographic data (not collected)
- Government response tracking (no data source)
- Temporal trending (not calculated)

#### B. Political Gap Analysis (MISSING)

**Purpose:** Compare social media search interests vs government official communication

**SIP Requirement:**
```
╔═══════════════════════════════════════════════════════╗
║ POLITICAL GAP ANALYSIS (NOT IMPLEMENTED)              ║
╠════════════════════════════════════════════════════════╣
║ KEYWORD: "Desempleo" [Unemployment]                   ║
├────────────────────────────────────────────────────────┤
║                                                        ║
║  Social Interest:  ████████████████░░ 82% (8,234 posts)║
║                                                        ║
║  Gov Content:      ███░░░░░░░░░░░░░░ 15% (89 releases)║
║                                                        ║
║  GAP ANALYSIS (↑67%):                                 ║
║  - People talking 5.6x more than government         ║
║  - Last gov mention: 23 days ago                     ║
║  - Sentiment gap: Public (-1.8) vs Gov (+0.3)       ║
║  - Recommendation: Increase transparency              ║
║                                                        ║
╚════════════════════════════════════════════════════════╝

Shows by municipality:
- Search volume × Government response volume
- Gap percentage
- Trust sentiment delta
- Content recency
```

**Current Implementation:** NONE  
**Why Missing:** Requires:
- Government official messaging integration (no data source)
- Press release tracking (not scraped)
- Content timestamp correlation (not calculated)
- Trust/credibility metrics (not defined)

#### C. Geo-Social Heat Map (PARTIAL - Basic version only)

**Current:** Bubble visualization (2D scatter: organic × paid)

**Location:** `src/components/MarketIntelligenceBubbles.tsx`

**What Works:**
```typescript
✅ Two bubble sizes (organic volume vs paid volume)
✅ Color coding by sentiment (green/neutral/red)
✅ Alert level indicators (1-10)
✅ Municipal grouping
✅ Department filtering
```

**Missing - True Heat Map:**
```
Required (SIP):
- PostGIS spatial analysis (heat density, hotspots)
- Geographic boundaries (barrios, comunas, not just municipios)
- Multi-layered visualization:
  Layer 1: Crisis urgency heat (0-100 gradient)
  Layer 2: Population density overlay
  Layer 3: Government presence markers
  Layer 4: Resource allocation gaps
  
- Interactive drill-down (zoom to neighborhood level)
- Time-slider for temporal animation
- Comparison between expected vs actual urgency

Current: Single flat bubble chart
Required: Cartographic heat with PostGIS queries
```

**Database Missing:** PostGIS not configured
```sql
-- MISSING: PostGIS schema
ALTER TABLE municipios ADD COLUMN geom geometry(Point, 4326);
ALTER TABLE barrios ADD COLUMN geom geometry(Polygon, 4326);

-- MISSING: Heat map queries
SELECT 
  st_heatmaprenderer(geom, urgency_score) 
FROM market_intelligence 
WHERE municipio = $1;
```

**Files Affected:**
- `src/components/MarketIntelligenceBubbles.tsx` - Only basic version
- Missing: `src/components/GeoSocialHeatMap.tsx` - PostGIS version
- Missing: `src/app/dashboard/inteligencia/heat-map/page.tsx` - Heat map page

---

## FILES & MODIFICATION MAP

### Existing Files (Status)

| File | Purpose | Status | Changes Needed |
|------|---------|--------|-----------------|
| `src/lib/marketIntelligence.ts` | Core analysis | ✅ Exists | Add algorithms, weighting, demographic crossing |
| `src/lib/metaIntegration.ts` | Meta API | ⚠️ Mocked | Implement real API calls |
| `src/lib/jobs.ts` | Scheduler | ✅ Works | Keep as-is (scheduler ready) |
| `src/app/api/intelligence/*` | 6 endpoints | ✅ Exist | Update to use new algorithms |
| `src/app/dashboard/inteligencia/page.tsx` | Dashboard | ✅ Works | Add new report pages |
| `src/components/MarketIntelligenceBubbles.tsx` | Visualization | ⚠️ Basic | Extend with heat maps |
| `scripts/init-market-intelligence.js` | DB migration | ✅ Exists | Extend with new tables |
| `package.json` | Dependencies | ⚠️ Missing | Add: postgis, playwright, python-shell |

### Missing Files (Need to Create)

| File | Purpose | Type | Complexity |
|------|---------|------|------------|
| `src/lib/algorithmEngine.ts` | Urgency + impact calculation | Algorithm | HIGH |
| `src/lib/demographicAnalysis.ts` | Demographic crossing | Algorithm | HIGH |
| `src/lib/impactCalculator.ts` | Multi-factor impact scoring | Algorithm | MEDIUM |
| `src/lib/scrapers/metaScraper.ts` | Real Meta API integration | Scraper | MEDIUM |
| `src/lib/scrapers/governmentScraper.ts` | Gov data collection | Scraper | MEDIUM |
| `src/lib/scrapers/googleTrendsScraper.ts` | Google Trends integration | Scraper | MEDIUM |
| `python/demographic_analysis.py` | DANE census processing | Python | MEDIUM |
| `src/app/api/intelligence/reports/matrix/route.ts` | Priority matrix endpoint | API | MEDIUM |
| `src/app/api/intelligence/reports/gap-analysis/route.ts` | Gap analysis endpoint | API | MEDIUM |
| `src/components/AdminPriorityMatrix.tsx` | Matrix visualization | Component | MEDIUM |
| `src/components/PoliticalGapAnalysis.tsx` | Gap analysis charts | Component | MEDIUM |
| `src/components/GeoSocialHeatMap.tsx` | PostGIS heat map | Component | HIGH |
| `scripts/setup-postgis.sql` | PostGIS initialization | SQL | LOW |
| `scripts/init-demographics.js` | Demographics table setup | Data | MEDIUM |

---

## PRIORITY IMPLEMENTATION ORDER

### Phase 1: Foundation (Weeks 1-2) - CRITICAL
**Goal:** Enable real data collection and basic analysis

1. **Implement Real Meta Integration** (~8-10 hours)
   - Replace mock functions in `src/lib/metaIntegration.ts`
   - Implement Ads Library API calls
   - Implement Graph API for group posts
   - Add error handling + retry logic
   - **Files:** metaIntegration.ts
   - **Complexity:** MEDIUM
   - **Blocker:** Requires Meta API credentials setup

2. **Create Database Schema Extensions** (~4-6 hours)
   - Add `keyword_weights` table with urgency system
   - Add `demographics_crossing` table
   - Add `government_messaging` table
   - Add temporal tracking columns
   - **Files:** new migration script
   - **Complexity:** LOW
   - **Output:** Extended schema

3. **Implement Keyword Weighting System** (~6-8 hours)
   - Create `src/lib/algorithmEngine.ts`
   - Implement urgency calculation (multi-factor)
   - Add frequency trend tracking
   - Seed initial keyword weights
   - **Files:** New algorithmEngine.ts
   - **Complexity:** MEDIUM
   - **Dependencies:** Phase 1.2

### Phase 2: Core Intelligence (Weeks 3-4) - HIGH
**Goal:** Advance analysis algorithms and demographic integration

4. **Implement Demographic Crossing** (~12-16 hours)
   - Create `src/lib/demographicAnalysis.ts`
   - Build demographic × keyword matrix
   - Implement correlation algorithms
   - Add demographic segmentation
   - **Files:** New demographicAnalysis.ts
   - **Complexity:** HIGH
   - **Dependencies:** Phase 1.2, Phase 1.3
   - **Data Requirements:** Census data (DANE integration)

5. **Build Government Data Integration** (~8-10 hours)
   - Create `src/lib/scrapers/governmentScraper.ts`
   - Scrape official government statements
   - Track government response timing
   - Calculate response lag metrics
   - **Files:** New scraper
   - **Complexity:** MEDIUM
   - **Data Source:** Government websites/APIs

6. **Implement Impact Calculator** (~8-10 hours)
   - Create `src/lib/impactCalculator.ts`
   - Build composite impact formula
   - Add confidence scoring
   - Implement time-decay factors
   - **Files:** New impactCalculator.ts
   - **Complexity:** MEDIUM
   - **Dependencies:** Phase 2.4, Phase 1.3

### Phase 3: Reporting (Weeks 5-6) - HIGH
**Goal:** Build the three critical reports

7. **Administrative Priority Matrix** (~10-12 hours)
   - Create API endpoint: `/api/intelligence/reports/matrix`
   - Create component: `AdminPriorityMatrix.tsx`
   - Implement sorting + filtering
   - Add export functionality (JSON/CSV)
   - **Files:** New route + component
   - **Complexity:** MEDIUM
   - **Dependencies:** Phase 2.4, Phase 2.6

8. **Political Gap Analysis** (~10-12 hours)
   - Create API endpoint: `/api/intelligence/reports/gap-analysis`
   - Create component: `PoliticalGapAnalysis.tsx`
   - Build comparison visualizations
   - Add trust sentiment analysis
   - **Files:** New route + component
   - **Complexity:** MEDIUM
   - **Dependencies:** Phase 2.5, Phase 2.6

9. **Geo-Social Heat Map with PostGIS** (~14-18 hours)
   - Setup PostGIS in PostgreSQL
   - Create geographic analysis functions
   - Build heat map visualization
   - Add cluster detection
   - **Files:** New heat map component, SQL setup
   - **Complexity:** HIGH
   - **Dependencies:** PostGIS setup, Phase 2.4

### Phase 4: Real-time & Scaling (Weeks 7-8) - MEDIUM
**Goal:** Production-ready system with continuous updates

10. **Google Trends Integration** (~6-8 hours)
   - Create `src/lib/scrapers/googleTrendsScraper.ts`
   - Implement trend collection
   - Add keyword comparison
   - **Files:** New scraper
   - **Complexity:** MEDIUM

11. **Playwright Scraping Framework** (~12-16 hours)
   - Create `src/lib/scrapers/playwrightScraper.ts`
   - Implement headless browser automation
   - Add multiple source support
   - **Files:** New scraper infrastructure
   - **Complexity:** HIGH

12. **Performance Optimization** (~8-10 hours)
   - Database query optimization
   - Caching layer (Redis)
   - Incremental data updates
   - **Files:** Various optimization updates
   - **Complexity:** MEDIUM

---

## COMPLEXITY RATINGS

| Task | Complexity | Est. Hours | Dependencies |
|------|------------|-----------|--------------|
| Real Meta API Integration | 🟠 MEDIUM | 8-10 | Meta credentials |
| Keyword Weighting System | 🟠 MEDIUM | 6-8 | DB schema |
| Demographic Crossing | 🔴 HIGH | 12-16 | Census data, demographic tables |
| Impact Calculation | 🟠 MEDIUM | 8-10 | Weighting + demographics |
| Admin Priority Matrix | 🟠 MEDIUM | 10-12 | Impact + demographics |
| Political Gap Analysis | 🟠 MEDIUM | 10-12 | Gov scraper + matrix |
| PostGIS Heat Map | 🔴 HIGH | 14-18 | PostGIS setup |
| Google Trends Scraper | 🟠 MEDIUM | 6-8 | API key |
| Playwright Framework | 🔴 HIGH | 12-16 | Browser automation |
| Full System Optimization | 🟠 MEDIUM | 8-10 | All components |

**Legend:**  
🟢 LOW: 1-3 hours, obvious implementation  
🟠 MEDIUM: 4-12 hours, some research needed  
🔴 HIGH: 13+ hours, complex algorithms or new infrastructure

---

## DATA DEPENDENCIES & MISSING SOURCES

### External Data Needed (BLOCKING)

| Source | Data Type | Purpose | Status | Alternative |
|--------|-----------|---------|--------|------------|
| Meta API (Ads Library) | Advertising spend, targeting | Political gap analysis | ⚠️ Requires |  Placeholder data |
| Google Trends | Keyword search interest | Urgency weighting | ❌ Missing | Synthetic data |
| DANE Census | Demographics by barrio | Demographic crossing | ❌ Missing | Synthetic persona data |
| Government websites | Press releases, statements | Gap analysis | ❌ Missing | Twitter/news scraping |
| Twitter/X API | Real-time social data | Trend collection | ⚠️ Limited | Nitter scraper existing |

### Current Data Sources

- ✅ Twitter/X (via Nitter scraper)
- ✅ Mock Facebook group posts (database seeded)
- ✅ Mock opinion leaders (database seeded)
- ✅ PostgreSQL municipality coordinates
- ❌ Real government messaging

---

## RECOMMENDATIONS

### Immediate Actions (Next Sprint)

1. **Activate Meta API Integration** (Priority: CRITICAL)
   - Get API access credentials
   - Implement real Ads Library calls in `metaIntegration.ts`
   - Test with 10-20 municipalities
   - Replace mock functions

2. **Set Up Keyword Weighting** (Priority: HIGH)
   - Define urgency scale (1-10) for key crisis topics:
     - Seguridad/violencia: 8-10
     - Desempleo: 7-9
     - Educación: 5-7
     - Salud: 6-9
   - Create seed data script
   - Implement weighting in algorithms

3. **Integrate DANE Demographics** (Priority: HIGH)
   - Establish DANE data feed
   - Create demographic segmentation
   - Build crossing algorithm

4. **Government Data Collection** (Priority: MEDIUM)
   - Define gov data sources
   - Build scraper for official statements
   - Track response times

### Architecture Decisions Needed

1. **Where should Python run?**
   - Option A: Separate Python microservice (recommend)
   - Option B: Node.js shell-exec (not ideal)
   - Option C: Move analysis to direct SQL (complex)

2. **Which heat map library?**
   - Option A: PostGIS + Leaflet.heat (recommended)
   - Option B: Mapbox with custom layers
   - Option C: D3.js + raw geo data

3. **Real-time vs Batch?**
   - Current: Batch every 24h (scheduler)
   - Recommended: Batch 6h, real-time alerts sub-hourly

### Testing Before Deployment

```typescript
// Priority test cases
Before releasing to production, validate:

□ Real Meta API returns non-zero results
□ Demographic crossing shows 484+ municipios × 3+ segments
□ Urgency calculation produces 0-100 scores (not 1-10)
□ Admin matrix ranks Medellín + Cali as high-urgency
□ Gap analysis shows political gap > 50% for ≥5 keywords
□ Heat map renders correct geographic distribution
□ All reports export to JSON/CSV without errors
□ Performance: <2s query time for 484 municipios
□ Scheduler runs exactly every 6h (when enabled)
```

---

## SUMMARY TABLE

| Aspect | Status | Coverage | Priority | Est. Labor |
|--------|--------|----------|----------|-----------|
| **Data Extraction** | ❌ Missing | 10% (Nitter only) | 🔴 CRITICAL | 40-50h |
| **Database** | ⚠️ Partial | 60% (schema exists, missing connections) | 🟠 HIGH | 15-20h |
| **Algorithms** | ❌ Missing | 5% (basic math only) | 🔴 CRITICAL | 40-50h |
| **Admin Matrix** | ❌ Missing | 0% | 🟠 HIGH | 15-20h |
| **Gap Analysis** | ❌ Missing | 0% | 🟠 HIGH | 15-20h |
| **Heat Map** | ⚠️ Partial | 30% (basic bubbles) | 🔴 CRITICAL | 20-25h |
| **TOTAL** | **35%** | **~165-195 hours** | — | — |

**Timeline if resources allocated full-time:** 4-5 weeks to full SIP compliance
