# Checklist: Credenciales y pasos para habilitar integraciones — SIP

Fecha: 2026-04-06

Propósito: lista accionable para obtener tokens/credenciales, configurar variables de entorno, dependencias y probar cada integración que alimenta SIP.

---

## Instrucciones generales
- Añadir credenciales en `.env.local` (en la raíz del repo). Reiniciar el servidor (`npm run dev` o `npm run start`) después de cambiar variables.
- Variables críticas: `DATABASE_URL`, `META_BUSINESS_TOKEN`, `FACEBOOK_ACCESS_TOKEN`, `TWITTER_BEARER_TOKEN`, `YOUTUBE_API_KEY`, `NITTER_INSTANCES`, `TRENDS_TTL_DAYS`.
- Instalar Playwright si usas scrapers que lo requieren:

```bash
npm install -D playwright
npx playwright install
```

En Windows (PowerShell):

```powershell
npm i -D playwright
npx playwright install
```

> Nota: Playwright necesita descargar binarios; en contenedores Linux puede requerir `npx playwright install --with-deps`.

---

## 1) Meta / Facebook Ads Library
- Env var: `META_BUSINESS_TOKEN` (token de acceso a la Marketing API / Ads Archive).
- Permisos/Scopes: acceso a Ads Library / Marketing API (p. ej. `ads_read` / permisos de Ads según Business Manager). Requiere App + Business verification y tokens de negocio.
- Pasos rápidos:
  1. Crear App en https://developers.facebook.com/ y asociarla a Business Manager.
  2. Solicitar permisos para Ads Library/Marketing API (App Review si es necesario).
  3. Generar access token con los permisos y copiar en `.env.local`:

```bash
# .env.local (ejemplo)
META_BUSINESS_TOKEN=yaEJEMPLO_TOKEN_META
DATABASE_URL=postgres://user:pass@host:5432/dbname
```

  4. Reiniciar servidor y probar scraping (ejecuta endpoint admin que inicia Phase2):

```bash
curl -X POST http://localhost:3001/api/intelligence/phase2-start -H "Authorization: Bearer <ADMIN_TOKEN>" -H "Content-Type: application/json" -d '{}'
```

- Verificación: revisar que se llenen filas en `ads_library_records` o `ads_library_extended`.

---

## 2) Facebook Groups (posts públicos)
- Env var sugerida: `FACEBOOK_ACCESS_TOKEN` (page/app token con permisos de lectura de grupos).
- Permisos/Scopes: `groups_access_member_info` / `pages_read_engagement` / accesos según Graph API y revisión de App.
- Pasos:
  1. En Facebook Developer, solicitar acceso a Group API y generar token (long-lived si es posible).
  2. Añadir a `.env.local`:

```bash
FACEBOOK_ACCESS_TOKEN=yaEJEMPLO_FACEBOOK_TOKEN
```

  3. Ejecutar una prueba directa contra Graph API (obtener posts de un grupo):

```bash
curl "https://graph.facebook.com/v18.0/<GROUP_ID>/feed?access_token=<FACEBOOK_ACCESS_TOKEN>&limit=5"
```

  4. Implementar/activar crawler que inserte resultados en `facebook_group_posts`. Actualmente `/api/social-listening/sync` sólo inicializa tablas; completar ingestión según permisos.

- Verificación: consultar `SELECT COUNT(*) FROM facebook_group_posts;` o usar `/api/social-listening/municipios`.

---

## 3) Twitter / X — Nitter (scraping alternativo)
- Env var: `NITTER_INSTANCES` (lista separada por comas; hay valores por defecto en código).
- Dependencias: Playwright.
- Pasos:
  1. Editar `.env.local` si quieres forzar instancias:

```bash
NITTER_INSTANCES=https://nitter.net,https://nitter.privacydev.net
```

  2. Instalar Playwright y descargar binarios (ver más arriba).
  3. Probar health/estado de instancias: ejecutar código `getScraperStatus()` dentro del entorno (o invocar endpoint que use `nitterScraper`).

- Verificación: logs del scraper; entradas en `social_posts` si tu flujo guarda tweets.

---

## 4) Twitter API (opcional, oficial)
- Env var: `TWITTER_BEARER_TOKEN`.
- Pasos:
  1. Registrar cuenta de desarrollador en https://developer.twitter.com/ y crear App.
  2. Obtener `Bearer Token` (App-level) o claves OAuth2 y añadir a `.env.local`.

```bash
TWITTER_BEARER_TOKEN=yaEJEMPLO_TWITTER_BEARER
```

  3. Probar con API v2:

```bash
curl -H "Authorization: Bearer <TWITTER_BEARER_TOKEN>" "https://api.twitter.com/2/tweets/search/recent?query=bogota&max_results=10"
```

- Verificación: ingestar resultados en `social_posts` o usar collector.

---

## 5) Google Trends
- No requiere token API si usas scraping con Playwright; también existe `google-trends-api` (npm).
- Dependencias: Playwright.
- Pasos:
  1. Asegurar Playwright instalado.
  2. Probar `scrapeGoogleTrends()` invocando el endpoint `phase2-start` o script de prueba.

- Verificación: revisar `google_trends_raw`.

---

## 6) Fuentes gubernamentales (DANE, MinSalud)
- Credenciales: normalmente públicas; revisar la documentación de cada API.
- Pasos:
  1. Revisar endpoints oficiales de DANE y MinSalud.
  2. Añadir tokens/keys si la API lo requiere (ej. `DANE_API_KEY`, `MINSALUD_API_KEY`).
  3. Probar con `curl` y verificar `government_data`.

---

## 7) YouTube / TikTok / Instagram (opcional / recomendadas oficiales)
- YouTube: `YOUTUBE_API_KEY` (Google Cloud Console → enable YouTube Data API).
- TikTok: credenciales developer (`TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`) si se usa la API oficial.
- Instagram: utiliza el mismo ecosistema Meta (Instagram Graph API) — puede compartir permisos con `META_BUSINESS_TOKEN`.
- Verificación: probar endpoints oficiales y mapear a tablas (`global_trends`, `trendsmap_entries`).

---

## 8) Base de datos
- Env var: `DATABASE_URL` (p. ej. `postgres://user:pass@localhost:5432/cenplus`).
- Pasos:
  1. Asegurar Postgres accesible y ejecutar migraciones/initializers (varios módulos llaman `init*` al arrancar).
  2. Probar conexión:

```bash
# Check simple connection using psql
psql "<DATABASE_URL>" -c "SELECT 1;"
```

---

## 9) Pruebas rápidas locales (PowerShell)
1. Crear `.env.local` con las variables necesarias.
2. Construir/arrancar:

```powershell
# Build (opcional)
npm run build
# Start (producción)
$env:PORT=3001; npm run start

# o en desarrollo
npm run dev
```

3. Obtener token admin (credenciales por defecto usadas en diagnosticos):

```powershell
$login = Invoke-WebRequest -Uri "http://localhost:3001/api/auth/login" -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"email":"admin@cenplus.com","password":"admin123"}' -UseBasicParsing
$token = (ConvertFrom-Json $login.Content).token
```

4. Llamar endpoints de prueba:

```powershell
Invoke-WebRequest -Uri "http://localhost:3001/api/social-listening/sync" -Method POST -Headers @{"Authorization" = "Bearer $token"; "Content-Type" = "application/json"} -UseBasicParsing

Invoke-WebRequest -Uri "http://localhost:3001/api/intelligence/phase2-start" -Method POST -Headers @{"Authorization" = "Bearer $token"; "Content-Type" = "application/json"} -Body '{}' -UseBasicParsing
```

---

## 10) Notas operativas y limites
- Muchas integraciones requieren App Review y pruebas con tokens long-lived.
- Preferir APIs oficiales (Twitter/YouTube/Meta) en producción; usar scrapers (Playwright/Nitter) como fallback temporal.
- Monitorizar rate limits y errores; añadir retry/backoff en scrapers.

---

Si quieres, puedo:
- Generar un `scripts/enable_integrations.md` con los pasos exactos para cada proveedor (screenshots/links a consola de developers).
- Preparar PR que añada ejemplos de `.env.local` con placeholders y scripts de test (`scripts/test_meta.js`, `scripts/test_nitter.js`).

