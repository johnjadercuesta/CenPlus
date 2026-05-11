# 📖 Multi-Tenancy Deployment Guide

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Pre-Deployment Checklist](#pre-deployment-checklist)
3. [Production Setup](#production-setup)
4. [Tenant Onboarding](#tenant-onboarding)
5. [Operations & Monitoring](#operations--monitoring)
6. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

### Multi-Tenancy Model: Schema-Per-Tenant

```
┌─────────────────────────────────────────────────────────┐
│                    PostgreSQL Database                  │
│                     (cenplus_db)                        │
├─────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ tenant1      │  │ tenant2      │  │ tenant3      │  │
│  │ (schema)     │  │ (schema)     │  │ (schema)     │  │
│  ├──────────────┤  ├──────────────┤  ├──────────────┤  │
│  │ admins       │  │ admins       │  │ admins       │  │
│  │ ciudadanos   │  │ ciudadanos   │  │ ciudadanos   │  │
│  │ comunas      │  │ comunas      │  │ comunas      │  │
│  │ ... tables   │  │ ... tables   │  │ ... tables   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Request Flow

```
1. Client Request:
   GET http://tenant1.yourdomain.com/api/ciudadanos

2. DNS Resolution:
   tenant1.yourdomain.com → reverse_proxy_ip

3. Reverse Proxy (nginx/CloudFlare):
   - Forward to: app:3000
   - Headers: Host: tenant1.yourdomain.com

4. Next.js Middleware:
   - Extract subdomain: tenant1
   - Validate tenant name
   - Set x-tenant header

5. API Route:
   - Detect tenant from header
   - Call: queryWithTenant(tenant, sql, params)

6. Database:
   - SET search_path TO "tenant1", public
   - Execute query in tenant1 schema
   - Return results

7. Response:
   Tenant-scoped data returned to client
```

---

## Pre-Deployment Checklist

### Infrastructure Requirements
- [ ] PostgreSQL 14+ (managed RDS/Cloud SQL recommended)
- [ ] Node.js 18+ runtime (AWS Lambda, Heroku, VPS, or K8s)
- [ ] Reverse proxy (nginx, CloudFlare, AWS ELB)
- [ ] DNS provider with wildcard support
- [ ] SSL certificate (Let's Encrypt or commercial CA)
- [ ] Monitoring/logging (CloudWatch, Datadog, New Relic)

### Configuration
- [ ] `.env.production` contains DATABASE_URL pointing to prod DB
- [ ] JWT_SECRET is strong and unique (min 32 chars)
- [ ] NODE_ENV=production
- [ ] PORT=3000 (or custom if needed)

### Database Preparation
- [ ] PostgreSQL database created: `cenplus_db`
- [ ] User created with proper permissions
- [ ] Backups configured (automated daily)
- [ ] Connection pooling configured (PgBouncer or similar)

### Security
- [ ] Firewall rules: DB accepts only from app server
- [ ] DB requires SSL connections
- [ ] App server behind VPC/security group
- [ ] Rate limiting configured on reverse proxy

---

## Production Setup

### Step 1: Database Configuration

#### On AWS RDS (Recommended)
```bash
# 1. Create RDS PostgreSQL instance
#    - Engine: PostgreSQL 15+
#    - Multi-AZ: Yes (production)
#    - Storage: Auto-scaling enabled
#    - Backup retention: 30 days

# 2. Create database and user
psql -h your-rds-endpoint.us-east-1.rds.amazonaws.com -U postgres
```

```sql
CREATE DATABASE cenplus_db;

CREATE USER cenplus_app WITH PASSWORD 'your_strong_password_here';

GRANT CONNECT ON DATABASE cenplus_db TO cenplus_app;

-- Switch to cenplus_db
\c cenplus_db

GRANT SCHEMA public TO cenplus_app;
GRANT ALL PRIVILEGES ON SCHEMA public TO cenplus_app;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO cenplus_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO cenplus_app;

-- Allow tenant schema creation
ALTER ROLE cenplus_app CREATEDB;
```

#### Connection String
```bash
postgresql://cenplus_app:your_strong_password_here@your-rds-endpoint.us-east-1.rds.amazonaws.com:5432/cenplus_db?sslmode=require
```

### Step 2: Application Deployment

#### On Heroku
```bash
# Clone repo
git clone https://github.com/your-org/cenplus.git
cd cenplus

# Create Heroku app
heroku create cenplus-app

# Set environment variables
heroku config:set DATABASE_URL="postgresql://..."
heroku config:set JWT_SECRET="your-jwt-secret-min-32-chars"
heroku config:set NODE_ENV="production"

# Deploy
git push heroku main
```

#### On AWS Lambda (Serverless)
```bash
# 1. Install serverless framework
npm install -g serverless

# 2. Deploy Next.js with serverless-next.js
serverless deploy

# 3. Configure Lambda environment
AWS_LAMBDA_FUNCTION_NAME=cenplus-api
aws lambda update-function-configuration \
  --function-name $AWS_LAMBDA_FUNCTION_NAME \
  --environment Variables='{DATABASE_URL=...,JWT_SECRET=...}'
```

#### On Docker/Kubernetes
```dockerfile
# Dockerfile already created
# Build image
docker build -t cenplus:latest .

# Push to registry
docker push your-registry/cenplus:latest

# Deploy to K8s
kubectl apply -f deployment.yaml
```

### Step 3: Reverse Proxy Configuration

#### nginx
```nginx
upstream app {
    server app:3000;
    keepalive 64;
}

# Wildcard SSL
server {
    listen 443 ssl http2;
    server_name *.yourdomain.com yourdomain.com;
    
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    location / {
        proxy_pass http://app;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name _;
    return 301 https://$host$request_uri;
}
```

#### CloudFlare
1. Go to DNS settings
2. Add wildcard: `*.yourdomain.com` CNAME `app.yourdomain.com`
3. Enable Full (strict) SSL
4. Add custom SSL cert for wildcard
5. Configure Page Rules for caching (if needed)

### Step 4: DNS Configuration

```dns
# Zone file for yourdomain.com

; Wildcard subdomain
*.yourdomain.com    3600  CNAME  app.yourdomain.com

; Main domain
yourdomain.com      3600  A      203.0.113.1
app.yourdomain.com  3600  A      203.0.113.1

; MX records (if needed)
yourdomain.com      3600  MX  10 mail.yourdomain.com
```

**Propagation Time**: 24-48 hours

---

## Tenant Onboarding

### Automated Tenant Creation Script

Create `scripts/create-tenant-prod.js`:

```javascript
#!/usr/bin/env node
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const args = process.argv.slice(2);
if (args.length < 4) {
  console.error('Usage: create-tenant-prod.js <tenantName> <adminEmail> <adminPassword> <adminName>');
  console.error('Example: create-tenant-prod.js acme_corp admin@acme.com secret123 "John Doe"');
  process.exit(1);
}

const [tenant, adminEmail, adminPassword, adminName] = args;

// Validate tenant name
if (!/^[a-z0-9_]+$/.test(tenant) || tenant.length > 63) {
  console.error('❌ Invalid tenant name. Use lowercase letters, numbers, underscores. Max 63 chars.');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function createTenant() {
  const client = await pool.connect();
  try {
    console.log(`\n🚀 Creating tenant: ${tenant}`);
    
    await client.query('BEGIN');

    // Create schema
    await client.query(`CREATE SCHEMA IF NOT EXISTS "${tenant}"`);
    await client.query(`SET search_path TO "${tenant}", public`);
    console.log('✅ Schema created');

    // Create tables (same as init-tenant.js)
    await client.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        nombre VARCHAR(255) NOT NULL DEFAULT '',
        role VARCHAR(50) NOT NULL CHECK (role IN ('administrador', 'estratega', 'lider')) DEFAULT 'lider',
        activo INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Tables created');

    // Create admin user
    const hash = bcrypt.hashSync(adminPassword, 10);
    await client.query(
      `INSERT INTO admins (email, password, nombre, role, activo) VALUES ($1, $2, $3, $4, 1)`,
      [adminEmail, hash, adminName, 'administrador']
    );
    console.log(`✅ Admin user created: ${adminEmail}`);

    // Create other required tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS ciudadanos (
        id SERIAL PRIMARY KEY,
        id_unico VARCHAR(50) NOT NULL UNIQUE,
        nombre_completo VARCHAR(255) NOT NULL,
        -- ... (see init-tenant.js for full schema)
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Additional tables created');

    await client.query('COMMIT');
    
    console.log(`\n✅ Tenant '${tenant}' created successfully!`);
    console.log(`\n📝 Next steps:`);
    console.log(`   1. Add DNS: ${tenant}.yourdomain.com CNAME app.yourdomain.com`);
    console.log(`   2. Login: ${tenant}.yourdomain.com/login`);
    console.log(`   3. Email: ${adminEmail}`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

createTenant();
```

### Usage

```bash
# Create new tenant
export DATABASE_URL="postgresql://user:pass@prod-db:5432/cenplus_db"
node scripts/create-tenant-prod.js acme_corp admin@acme.com MySecret123 "John Doe"

# Output:
# ✅ Tenant 'acme_corp' created successfully!
# 
# 📝 Next steps:
#    1. Add DNS: acme_corp.yourdomain.com CNAME app.yourdomain.com
#    2. Login: acme_corp.yourdomain.com/login
#    3. Email: admin@acme.com
```

### Manual Tenant Creation (if needed)

```bash
# 1. SSH to app server
ssh ubuntu@app.yourdomain.com

# 2. Run creation script
cd /app/cenplus
DATABASE_URL=postgresql://... node scripts/create-tenant-prod.js mycompany admin@mycompany.com MyPassword "Admin User"

# 3. Verify DNS is set
nslookup mycompany.yourdomain.com

# 4. Test login
curl -X POST https://mycompany.yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@mycompany.com","password":"MyPassword","tenant":"mycompany"}'
```

---

## Operations & Monitoring

### Health Checks

```bash
# Check app is running
curl -s http://localhost:3000/api/init | jq '.status'

# Check DB connection per tenant
curl -X GET https://tenant1.yourdomain.com/api/ciudadanos?limit=1 \
  -H "Authorization: Bearer <JWT>"
```

### Monitoring Setup

#### Datadog
```yaml
# datadog.yaml
api_key: <your-key>

# Enable PostgreSQL monitoring
postgres:
  enabled: true
  host: prod-db.rds.amazonaws.com
  port: 5432
  username: cenplus_app

# Enable APM
apm_enabled: true
apm_port: 8126

# Custom metrics
custom_metrics:
  - name: cenplus.tenant_query_time
    type: gauge
  - name: cenplus.login_attempts
    type: counter
```

#### CloudWatch (AWS)
```bash
# Log tenant queries
aws logs create-log-group --log-group-name /cenplus/tenant-queries

# Set up alarms
aws cloudwatch put-metric-alarm \
  --alarm-name cenplus-error-rate \
  --alarm-description "High error rate" \
  --metric-name ErrorCount \
  --threshold 100 \
  --comparison-operator GreaterThanThreshold
```

### Backup Strategy

```bash
# Daily automated backups (via RDS)
# Manual backup before major changes:
pg_dump --format=custom \
  "postgresql://user:pass@db:5432/cenplus_db" > backup_$(date +%Y%m%d).dump

# Restore from backup:
pg_restore --no-owner \
  -h new-db.rds.amazonaws.com \
  -U cenplus_app \
  -d cenplus_db \
  backup_20260508.dump
```

---

## Troubleshooting

### Common Issues & Solutions

#### "Relation does not exist"
**Problem**: `error: relation "admins" does not exist`

**Cause**: Tenant not found or schema not set

**Solution**:
```bash
# Check if tenant schema exists
psql -c "SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'tenant1'"

# If not, create it
node scripts/init-tenant.js tenant1

# Verify search_path is being set
psql -c "SET search_path TO tenant1; SELECT * FROM admins LIMIT 1"
```

#### "Token does not correspond to tenant"
**Problem**: `{ error: "Token no corresponde al tenant" }`

**Cause**: JWT tenant claim doesn't match request tenant

**Solution**:
```bash
# Re-login with correct tenant
curl -X POST https://tenant1.yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"...","tenant":"tenant1"}'

# Use returned JWT in Authorization header
```

#### "No schema for tenant"
**Problem**: 404 Not Found when accessing subdomain

**Cause**: DNS not propagated or tenant not created

**Solution**:
```bash
# 1. Verify DNS
nslookup tenant1.yourdomain.com

# 2. Verify tenant exists in DB
psql -l | grep tenant1

# 3. If not, create it
node scripts/create-tenant-prod.js tenant1 admin@tenant1.com password "Admin"
```

#### "Connection timeout"
**Problem**: Database connection fails

**Cause**: Network/firewall, DB down, connection pool exhausted

**Solution**:
```bash
# 1. Test DB connection
psql "postgresql://user:pass@db:5432/cenplus_db"

# 2. Check app logs
docker logs cenplus-app

# 3. Check connection pool
select count(*) from pg_stat_activity;

# 4. If pool is maxed, restart app
docker restart cenplus-app
```

### Debug Mode

Enable debug logging:

```bash
# Environment
DEBUG=cenplus:* npm run dev

# Or in code
console.log('[TENANT] Detected tenant:', tenant);
console.log('[QUERY] SQL:', sql, 'Params:', params);
```

### Performance Issues

Check slow queries:

```sql
-- Enable slow query log
SET log_min_duration_statement = 1000; -- 1 second

-- Find slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
WHERE mean_time > 1000 
ORDER BY mean_time DESC;

-- Create indexes if needed
CREATE INDEX idx_ciudadanos_barrio ON ciudadanos(barrio);
```

---

## Support & Escalation

For production issues:
1. Check health dashboard
2. Review logs in monitoring system
3. Follow troubleshooting guide above
4. If unresolved: create incident ticket with logs

---

**Last Updated**: May 8, 2026  
**Version**: 1.0 (Production Ready)
