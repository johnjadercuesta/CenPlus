# 🏗️ Technical Architecture Guide

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Client Layer                                 │
│                                                                       │
│  Web Browser (React App)  |  Mobile App  |  Third-party API Client  │
└──────────────────┬──────────────────────┬──────────────────────────┘
                   │                      │
                   └──────────────────────┘
                           │ HTTPS
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Network Layer                                   │
│                                                                       │
│  DNS (*.yourdomain.com)  →  CDN/CloudFlare  →  Load Balancer        │
└──────────────────┬──────────────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Reverse Proxy Layer                               │
│                                                                       │
│  nginx / AWS ELB / CloudFlare                                        │
│  - SSL/TLS termination                                              │
│  - Request routing                                                   │
│  - Header forwarding (Host, X-Forwarded-*)                          │
└──────────────────┬──────────────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   Application Layer                                  │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Next.js 14 Server (Node.js runtime)                         │   │
│  │                                                               │   │
│  │  ┌─────────────────────────────────────────────────────┐    │   │
│  │  │ middleware.ts (Tenant Detection)                    │    │   │
│  │  │ - Extract subdomain from Host header               │    │   │
│  │  │ - Sanitize tenant name                             │    │   │
│  │  │ - Set x-tenant header for downstream               │    │   │
│  │  └─────────────────────────────────────────────────────┘    │   │
│  │                        │                                     │   │
│  │                        ▼                                     │   │
│  │  ┌─────────────────────────────────────────────────────┐    │   │
│  │  │ API Routes (/api/*)                                │    │   │
│  │  │ - GET /auth/login → JWT (+ tenant claim)          │    │   │
│  │  │ - GET /ciudadanos → List (tenant-scoped)          │    │   │
│  │  │ - POST /ciudadanos → Create (tenant-scoped)       │    │   │
│  │  │ - ... (30+ endpoints)                              │    │   │
│  │  │                                                      │    │   │
│  │  │ Each route:                                         │    │   │
│  │  │   1. Extract tenant from request                   │    │   │
│  │  │   2. Create run() helper                           │    │   │
│  │  │   3. Call: run(sql, params)                        │    │   │
│  │  └─────────────────────────────────────────────────────┘    │   │
│  │                        │                                     │   │
│  │                        ▼                                     │   │
│  │  ┌─────────────────────────────────────────────────────┐    │   │
│  │  │ Tenant Library (src/lib/tenant.ts)                 │    │   │
│  │  │ - getTenantFromRequest(req)                        │    │   │
│  │  │ - sanitizeTenantValue(raw)                         │    │   │
│  │  │ - queryWithTenant(tenant, sql, params)             │    │   │
│  │  │                                                      │    │   │
│  │  │ queryWithTenant:                                    │    │   │
│  │  │   1. Validate tenant name                          │    │   │
│  │  │   2. Get client from pool                          │    │   │
│  │  │   3. SET search_path TO \"tenant\", public        │    │   │
│  │  │   4. Execute query                                 │    │   │
│  │  │   5. Release client                                │    │   │
│  │  └─────────────────────────────────────────────────────┘    │   │
│  │                        │                                     │   │
│  │                        ▼                                     │   │
│  │  ┌─────────────────────────────────────────────────────┐    │   │
│  │  │ Authentication (src/lib/auth.ts)                   │    │   │
│  │  │ - signToken(payload)                               │    │   │
│  │  │ - verifyToken(token)                               │    │   │
│  │  │ - tokenMatchesTenant(token, request)               │    │   │
│  │  │                                                      │    │   │
│  │  │ JWT Payload:                                        │    │   │
│  │  │ {                                                   │    │   │
│  │  │   userId, email, nombre, role, tenant, exp, iat    │    │   │
│  │  │ }                                                   │    │   │
│  │  └─────────────────────────────────────────────────────┘    │   │
│  │                        │                                     │   │
│  └────────────────────────┼─────────────────────────────────────┘   │
│                           │                                         │
│  ┌───────────────────────┴────────────────────────────────────┐   │
│  │ Connection Pool (pg library)                              │   │
│  │ - Max connections: 20 (configurable)                      │   │
│  │ - Idle timeout: 30s                                       │   │
│  │ - Pool size auto-scales                                   │   │
│  └───────────────────────┬─────────────────────────────────────┘   │
│                          │                                         │
└──────────────────────────┼─────────────────────────────────────────┘
                           │ TCP/5432
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Database Layer                                    │
│                                                                       │
│  PostgreSQL 15+ (RDS / Cloud SQL / On-premises)                     │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ cenplus_db (Database)                                        │   │
│  │                                                              │   │
│  │  ┌──────────────────┐  ┌──────────────────┐                 │   │
│  │  │ public (schema)   │  │ tenant1 (schema) │  ... tenantN    │   │
│  │  │                   │  │                  │                 │   │
│  │  │ - pg_extensions  │  │ - admins         │                 │   │
│  │  │ - enum types     │  │ - ciudadanos     │                 │   │
│  │  │                   │  │ - comunas        │                 │   │
│  │  │                   │  │ - trendsmap_entries                │   │
│  │  │                   │  │ - ... (20+ tables)                 │   │
│  │  │                   │  │                  │                 │   │
│  │  │ Indexes:          │  │ Indexes:         │                 │   │
│  │  │ (shared)          │  │ - idx_ced        │                 │   │
│  │  │                   │  │ - idx_barrio     │                 │   │
│  │  │                   │  │ - idx_trendsmap_*                  │   │
│  │  └──────────────────┘  └──────────────────┘                 │   │
│  │                                                              │   │
│  │ Roles & Privileges:                                         │   │
│  │ - cenplus_app: Can CREATEDB (for new tenant schemas)       │   │
│  │ - Grants per schema: All privileges                         │   │
│  │                                                              │   │
│  │ Replication:                                                │   │
│  │ - Multi-AZ enabled (RDS)                                   │   │
│  │ - Backups: daily automated + point-in-time                │   │
│  │ - WAL archiving enabled                                    │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow: Example Request

```
1. CLIENT REQUEST
   GET https://tenant1.yourdomain.com/api/ciudadanos?page=1
   Headers: Authorization: Bearer <JWT>, x-tenant: tenant1

2. DNS RESOLUTION
   tenant1.yourdomain.com → 203.0.113.1 (proxy IP)

3. REVERSE PROXY
   nginx receives request
   - Validates SSL cert
   - Forwards to app:3000
   - Preserves Host: tenant1.yourdomain.com

4. NEXT.JS MIDDLEWARE (middleware.ts)
   - Extract host: tenant1.yourdomain.com
   - Parse subdomain: tenant1
   - Validate: /^[a-z0-9_]+$/ ✓
   - Set response header: x-tenant: tenant1

5. ROUTE HANDLER (/api/ciudadanos)
   - Receive request with x-tenant header
   - Call getTenantFromRequest(request) → "tenant1"
   - Create: run = (sql, params) => queryWithTenant("tenant1", sql, params)
   - Call: run("SELECT * FROM ciudadanos LIMIT 50", [])

6. TENANT LIBRARY (src/lib/tenant.ts)
   queryWithTenant("tenant1", sql, params):
     a. Validate tenant: /^[a-z0-9_]+$/ ✓
     b. Get new client from pool
     c. Execute: SET search_path TO "tenant1", public
     d. Execute: SELECT * FROM ciudadanos LIMIT 50
     e. Return results
     f. Release client

7. DATABASE
   Connection established to "tenant1" schema
   Query executes in tenant1 context
   Returns: [{ id: 1, nombre: "Juan", ... }, ...]

8. API RESPONSE
   app/api/ciudadanos returns:
   {
     "data": [...],
     "count": 150,
     "page": 1
   }

9. CLIENT RECEIVES
   Status: 200 OK
   Body: JSON with tenant1's data only
   ✓ No cross-tenant leak
```

---

## Database Schema Design

### Public Schema
```sql
-- Shared across all tenants
CREATE SCHEMA public;

-- Extensions (installed once)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For full-text search

-- Public functions (optional)
CREATE OR REPLACE FUNCTION get_app_version()
RETURNS VARCHAR AS 'SELECT ''1.0.0''::varchar;'
LANGUAGE SQL;
```

### Tenant Schema (Example: tenant1)
```sql
CREATE SCHEMA tenant1;
SET search_path TO tenant1, public;

-- Tables
CREATE TABLE admins (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  nombre VARCHAR(255),
  role VARCHAR(50) DEFAULT 'lider',
  activo INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE ciudadanos (
  id SERIAL PRIMARY KEY,
  id_unico VARCHAR(50) NOT NULL UNIQUE,
  nombre_completo VARCHAR(255) NOT NULL,
  lider_id INTEGER REFERENCES admins(id),
  barrio VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes (per-tenant)
CREATE INDEX idx_ciudadanos_lider_id ON ciudadanos(lider_id);
CREATE INDEX idx_ciudadanos_barrio ON ciudadanos(barrio);

-- Row-Level Security (optional future enhancement)
-- CREATE POLICY ... ON ciudadanos
-- USING (lider_id = current_user_id);
```

---

## Performance Considerations

### Connection Pooling

**Configuration** (`src/lib/db.ts`):
```typescript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,                    // Max connections
  min: 5,                     // Min idle connections
  idleTimeoutMillis: 30000,   // 30 seconds
  connectionTimeoutMillis: 2000,  // Connection timeout
});
```

**Optimization Tips**:
- Increase `max` for high concurrency
- Use PgBouncer in transaction pooling mode for many tenants
- Monitor pool usage: `SELECT count(*) FROM pg_stat_activity`

### Query Optimization

**Indexes per tenant**:
```sql
-- Create after data load
CREATE INDEX CONCURRENTLY idx_ciudadanos_search 
ON ciudadanos(LOWER(nombre_completo));

-- Analyze for query planner
ANALYZE ciudadanos;
```

**Avoid N+1 Queries**:
```typescript
// Bad:
const ciudadanos = await run("SELECT * FROM ciudadanos");
for (const c of ciudadanos) {
  const lider = await run("SELECT * FROM admins WHERE id = $1", [c.lider_id]);
}

// Good:
const result = await run(`
  SELECT c.*, a.nombre as lider_nombre
  FROM ciudadanos c
  LEFT JOIN admins a ON c.lider_id = a.id
`);
```

### Schema Size

```bash
# Check schema size
psql -c "SELECT 
  pg_size_pretty(pg_total_relation_size(schemaname))
FROM pg_tables
WHERE schemaname = 'tenant1'
GROUP BY schemaname;"
```

Typical single-tenant schema: 10-100 MB

---

## Security Architecture

### Authentication Flow

```
┌─────────────────────────────────────────────────────┐
│ 1. Client sends credentials                         │
│    POST /api/auth/login                             │
│    { email, password, tenant }                      │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│ 2. Server validates tenant name                     │
│    /^[a-z0-9_]+$/ and length <= 63                 │
│    Returns: 400 if invalid                          │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│ 3. Query DB in tenant schema                        │
│    SET search_path TO "tenant", public              │
│    SELECT * FROM admins WHERE email = $1            │
│    (parameterized to prevent injection)             │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│ 4. Verify password (bcrypt)                         │
│    bcrypt.compareSync(password, storedHash)         │
│    Returns: 401 if invalid                          │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│ 5. Generate JWT with tenant claim                   │
│    signToken({ userId, email, tenant, role, exp })│
│    Returns: token (signed with JWT_SECRET)          │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│ 6. Client stores JWT (httpOnly cookie)              │
│    Subsequent requests include: Authorization header│
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│ 7. Server validates JWT and tenant match            │
│    verifyToken(jwt)                                 │
│    tokenMatchesTenant(payload, request)             │
│    Returns: 403 if mismatch                         │
└─────────────────────────────────────────────────────┘
```

### Tenant Isolation

**Data Isolation**:
- Each tenant is a separate PostgreSQL schema
- Query cannot cross schemas without explicit schema name
- `SET search_path TO "tenant", public` ensures queries stay in tenant schema

**Code Isolation**:
- Tenant validation happens at every entry point
- `sanitizeTenantValue()` prevents injection
- No raw user input in SQL queries (all parameterized)

**Example Attack Scenarios (ALL BLOCKED)**:
```typescript
// Attack 1: SQL Injection
const tenant = "tenant1'; DROP TABLE admins; --";
// ✓ Blocked: sanitizeTenantValue() returns null
// Result: "Tenant no especificado"

// Attack 2: Cross-tenant query
const tenant = "tenant1";
const token = { tenant: "tenant2" };
// ✓ Blocked: tokenMatchesTenant() fails
// Result: 403 Forbidden

// Attack 3: Schema traversal
const tenant = "public";
// ✓ Blocked: /^[a-z0-9_]+$/ doesn't include digits-only names
// Result: 400 Bad Request
```

---

## Deployment Patterns

### Single Server

```
App Server (1 instance)
  └─ Node.js + Next.js
  └─ PostgreSQL (managed RDS)
  └─ Nginx (reverse proxy)

Cost: $$/mo
Availability: ~99.0% (single point of failure)
```

### Highly Available (Recommended)

```
┌─────────────────────────────────┐
│        Route 53 / DNS           │
│  *.yourdomain.com → ELB         │
└────────────────┬────────────────┘
                 │
        ┌────────┴─────────┐
        ▼                  ▼
    ┌────────┐         ┌────────┐
    │ App 1  │         │ App 2  │
    │(Node)  │         │(Node)  │
    └────┬───┘         └───┬────┘
         │                 │
         └────────┬────────┘
                  │
         ┌────────▼────────┐
         │   RDS Aurora    │
         │  (Multi-AZ)     │
         │  - Primary      │
         │  - Standby      │
         └─────────────────┘

Cost: $$$$/mo
Availability: ~99.95%
Scaling: Auto-scaling group
```

### Global Deployment (Advanced)

```
CDN (CloudFlare)
  ├─ Region 1 (US)     ├─ Region 2 (EU)    ├─ Region 3 (LATAM)
  │  App LB             │  App LB             │  App LB
  │  - App 1            │  - App 3            │  - App 5
  │  - App 2            │  - App 4            │  - App 6
  │  DB Read Replica    │  DB Read Replica    │  DB Read Replica
  │                     │                     │
  └─────────────────────┴─────────────────────┴────────────────
         Primary DB (Global Write)
         - Failover to any region
         - Continuous replication
```

---

## Monitoring & Observability

### Key Metrics

```
Application:
- Request latency (p50, p95, p99)
- Error rate by endpoint
- Active connections
- Tenant distribution

Database:
- Query execution time
- Lock contention
- Cache hit ratio
- Connections per tenant
- Schema size growth

Infrastructure:
- CPU/Memory usage
- Disk I/O
- Network bandwidth
- SSL certificate expiry
```

### Logging Pattern

```typescript
// Every endpoint should log:
console.log({
  method: 'GET',
  path: '/api/ciudadanos',
  tenant: 'tenant1',
  user: 'admin@example.com',
  timestamp: '2026-05-08T15:30:00Z',
  duration_ms: 45,
  status: 200,
  records: 50
});
```

---

**Last Updated**: May 8, 2026  
**Architecture Version**: 1.0
