# Inventario de Fuentes y APIs — SIP

Fecha: 2026-04-06

Resumen: listado de orígenes de datos, puntos de ingesta, tablas afectadas, variables de entorno/credenciales necesarias y estado actual.

---

## 1) Meta / Facebook Ads Library
- Propósito: obtener anuncios pagados y metadatos (alcance, gasto, demografía, regiones).
- Implementación (código): [src/lib/metaScraper.ts](src/lib/metaScraper.ts)
- Endpoints/UI que lo usan: `phase2-start` inicia scrapers ([src/app/api/intelligence/phase2-start/route.ts](src/app/api/intelligence/phase2-start/route.ts)).
- Tablas BD: `ads_library_records`, `ads_library_extended`, `social_media_raw` (almacenamiento de ads/mentions).
- Credenciales / env: `META_BUSINESS_TOKEN` (Graph API). Requiere permisos de Ads Library.
- Estado actual: soportado con fallback a datos mock si `META_BUSINESS_TOKEN` no está configurado.
- Notas / siguientes pasos: configurar token, revisar límites de la API y programar colección periódica.

## 2) Facebook Groups (posts públicos)
- Propósito: recoger posts locales de grupos para análisis de sentimiento, keywords y volumen orgánico.
- Implementación (código): [src/lib/socialListening.ts](src/lib/socialListening.ts), sincronización en [src/app/api/social-listening/sync/route.ts](src/app/api/social-listening/sync/route.ts).
- Tablas BD: `facebook_group_posts`, `keywords_by_municipio`, `facebook_sentiment_tracks`.
- Credenciales / env: Graph API app token / permisos de lectura de grupos (no definido por nombre específico en el repo).
- Estado actual: tablas y helpers implementados; endpoint `/api/social-listening/sync` prepara/limpia la BD pero la integración de ingestión no está implementada (falta integración FB Groups).
- Notas: requiere implementación de crawler/uso de Graph API con permisos adecuados.

## 3) Twitter / X (Nitter + scraping directo)
- Propósito: extraer tweets por geolocalización o búsqueda de keywords cuando no hay acceso a API.
- Implementación (código): [src/lib/nitterScraper.ts](src/lib/nitterScraper.ts) — usa Playwright y lista de instancias Nitter.
- Tablas BD: `social_posts` (consumido por `trendCollector` y `viralWorker`).
- Credenciales / env: `NITTER_INSTANCES` (lista de instancias públicas); alternativa: Twitter API v2 (requiere `TWITTER_BEARER_TOKEN` si se implementa).
- Estado actual: scraper Playwright implementado con fallback a scraping X directo; requiere Playwright en runtime.
- Notas: manejo de disponibilidad/health de instancias Nitter y límites de scraping.

## 4) Twitter API (opcional / autoridades locales)
- Propósito: obtener comunicados oficiales (alcaldías, gobernaciones) vía API en lugar de scraping.
- Implementación (referencias): [src/lib/governmentScraper.ts](src/lib/governmentScraper.ts) (menciona Twitter API v2 como opción).
- Credenciales / env: `TWITTER_BEARER_TOKEN` (no definido explícitamente en código).
- Estado actual: ejemplo/placeholder; no hay cliente v2 plenamente implementado.

## 5) Google Trends
- Propósito: detectar búsquedas y tendencias en un municipio (palabras clave relevantes para SIP).
- Implementación (código): [src/lib/googleTrendsScraper.ts](src/lib/googleTrendsScraper.ts) — Playwright o `google-trends-api` como opción.
- Tablas BD: `google_trends_raw` (almacena trends por keyword/municipio).
- Credenciales / env: no requiere token; requiere Playwright o librería y cuidado con captchas / JS.
- Estado actual: scraping + store implementado; fallback a mock si falla Playwright.

## 6) Fuentes gubernamentales (DANE, MinSalud, boletines locales)
- Propósito: indicadores oficiales (economía, salud, alertas) para gap-analysis y verificación.
- Implementación (código): [src/lib/governmentScraper.ts](src/lib/governmentScraper.ts)
- Tablas BD: `government_data` (almacena reportes/alertas).
- Credenciales / env: depende de las APIs (DANE / MinSalud) — normalmente públicas o con keys institucionales.
- Estado actual: parsers + mocks presentes; integraciones reales dependen de endpoints y credenciales.

## 7) Ingesta canónica y sincronización de tendencias
- Propósito: consolidar menciones/volumen en `global_trends` y sincronizar con `trendsmap_entries`.
- Implementación (código): [src/lib/trendCollector.ts](src/lib/trendCollector.ts), [src/services/viralWorker.js](src/services/viralWorker.js), [src/lib/trendsmap.ts](src/lib/trendsmap.ts)
- Tablas BD: `social_posts`, `global_trends`, `trendsmap_entries`.
- Credenciales / env: `DATABASE_URL` para conexión PG; scraping/ingesta dependen de otras integraciones.
- Estado actual: collector & worker implementados para datos reales (consumen `social_posts`), sincronización a `trendsmap_entries` disponible.

## 8) Opinion leaders / Influencers
- Propósito: detectar y sincronizar líderes locales (agitación / influenciadores) en `influencer_rankings`.
- Implementación (código): `opinion_leaders` helpers en [src/lib/socialListening.ts](src/lib/socialListening.ts), sincronización en [src/services/viralWorker.js](src/services/viralWorker.js) y admin `monitor/run` endpoint.
- Tablas BD: `opinion_leaders`, `influencer_rankings`.
- Estado actual: tablas y sync logic presentes; detección automática de líderes requiere datos reales de APIs/scrapers.

## 9) TrendsMap (entradas manuales y hotspots)
- Propósito: recolección georreferenciada (manual o desde global_trends) y análisis territorial (hotspots, barrios, comunas).
- Implementación (código): [src/app/api/trendsmap/submit/route.ts](src/app/api/trendsmap/submit/route.ts), [src/lib/trendsmap.ts](src/lib/trendsmap.ts), reverse-geocode en [src/lib/reverseGeocode.ts](src/lib/reverseGeocode.ts).
- Tablas BD: `trendsmap_entries`.
- Estado actual: insert/consulta y TTL/índices implementados; reverse-geocoding usa GeoJSON público (GitHub raw links).

## 10) Market Intelligence / Ads extended
- Implementación (código): [src/lib/marketIntelligence.ts](src/lib/marketIntelligence.ts)
- Tablas BD: `facebook_sentiment_tracks`, `ads_library_extended`, `ads_library_records`.
- Estado actual: análisis y tablas presentes; ingest real depende de Meta Ads Library y Facebook Groups ingestion.

## 11) Geo / Reverse Geocoding
- Implementación (código): [src/lib/reverseGeocode.ts](src/lib/reverseGeocode.ts)
- Fuentes: GeoJSON públicos en GitHub (`gcorac/colombia-geojson`).
- Estado actual: implementado y cached (TTL en memoria).

## 12) Variables de entorno y dependencias clave
- `META_BUSINESS_TOKEN` — Meta Ads Library (obligatorio para datos reales).
- `NITTER_INSTANCES` — lista separada por comas de instancias Nitter.
- `DATABASE_URL` — conexión PostgreSQL (used across services).
- Playwright — requerido para varios scrapers (`nitterScraper`, `googleTrendsScraper`).
- `TRENDS_TTL_DAYS` — TTL para `trendsmap_entries`.

---

## Recomendaciones prioritarias
- Activar `META_BUSINESS_TOKEN` y programar ingestion periódica para `ads_library_records`.
- Implementar la integración de Facebook Groups (Graph API) para poblar `facebook_group_posts`.
- Asegurar Playwright en entorno de producción si se va a usar `nitterScraper` y `googleTrendsScraper`.
- Considerar usar APIs oficiales (Twitter/YouTube/TikTok) con credenciales institucionales donde sea posible para mejorar fiabilidad.

---

Archivos clave para revisar rápidamente:
- [src/lib/metaScraper.ts](src/lib/metaScraper.ts)
- [src/lib/nitterScraper.ts](src/lib/nitterScraper.ts)
- [src/lib/googleTrendsScraper.ts](src/lib/googleTrendsScraper.ts)
- [src/lib/governmentScraper.ts](src/lib/governmentScraper.ts)
- [src/lib/socialListening.ts](src/lib/socialListening.ts)
- [src/services/viralWorker.js](src/services/viralWorker.js)
- [src/lib/trendCollector.ts](src/lib/trendCollector.ts)
- [src/lib/trendsmap.ts](src/lib/trendsmap.ts)
- [src/app/api/trendsmap/submit/route.ts](src/app/api/trendsmap/submit/route.ts)
- [src/lib/reverseGeocode.ts](src/lib/reverseGeocode.ts)

---

Si quieres, puedo:
- Generar un checklist por fuente con credenciales exactas y endpoints requeridos.
- Preparar PR que documente los pasos para habilitar cada integración (tokens, permisos, infraestructura Playwright).

