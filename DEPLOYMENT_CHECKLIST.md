# ✅ DEPLOYMENT CHECKLIST - CenPlus Multi-Tenant

**Proyecto:** CenPlus  
**Versión:** Production Ready  
**Fecha:** 2026-05-09

---

## FASE 1: Pre-Deployment (Local Testing)

**Estado General:** ⚪ No iniciado | 🟡 En progreso | ✅ Completado

### 1.1 Requisitos del Sistema
- [ ] Node.js v18+ instalado
  ```bash
  node --version  # v18+
  ```
- [ ] PostgreSQL 14+ instalado y corriendo
  ```bash
  psql --version
  psql -U postgres -c "SELECT version();"
  ```
- [ ] npm v9+ instalado
  ```bash
  npm --version  # 9+
  ```
- [ ] Git instalado
  ```bash
  git --version
  ```
- [ ] Memory RAM suficiente (4GB+ recomendado)
- [ ] Disco libre (20GB+ para BD + logs)

### 1.2 Configuración Local
- [ ] Clonar repo o descargar zip
  ```bash
  git clone <repo-url> cenplus
  cd cenplus
  ```
- [ ] Copiar `.env.example` a `.env.local`
  ```bash
  cp .env.example .env.local
  ```
- [ ] Editar `.env.local`:
  ```env
  DATABASE_URL=postgres://postgres:postgres@localhost:5432/cenplus_db
  JWT_SECRET=dev-secret-change-in-prod-123
  NODE_ENV=development
  ```
- [ ] Verificar permisos de archivo (~/.ssh/id_rsa si usa git via SSH)

### 1.3 Dependencias
- [ ] `npm install` ejecutado sin errores
  ```bash
  npm install
  # ✅ added XXX packages
  ```
- [ ] `npm run build` ejecutado sin errores
  ```bash
  npm run build
  # ✅ Compiled successfully
  ```
- [ ] Sin warnings de seguridad crítica
  ```bash
  npm audit  # Si hay, ejecutar: npm audit fix
  ```

### 1.4 Base de Datos Local
- [ ] PostgreSQL corriendo (psql conecta)
  ```bash
  psql -U postgres -c "SELECT 1;"
  ```
- [ ] Base de datos `cenplus_db` creada
  ```bash
  psql -U postgres -c "CREATE DATABASE cenplus_db;" 2>/dev/null || echo "Ya existe"
  ```
- [ ] Conectar a BD
  ```bash
  psql -U postgres -d cenplus_db -c "SELECT now();"
  ```

### 1.5 Tenant Local de Prueba
- [ ] Script `init-tenant.js` existe
  ```bash
  ls scripts/init-tenant.js
  ```
- [ ] Primer tenant creado
  ```bash
  node scripts/init-tenant.js test1
  # ✅ Esquema y datos inicializados para tenant: test1
  ```
- [ ] Verificar datos creados
  ```bash
  psql -U postgres -d cenplus_db -c "
    SET search_path TO test1, public;
    SELECT COUNT(*) as admin_count FROM admins;
  "
  # Debe retornar: 3
  ```
- [ ] Credenciales de test verificadas
  - [ ] admin@cenplus.com / admin123
  - [ ] estratega@cenplus.com / estratega123
  - [ ] lider@cenplus.com / lider123

### 1.6 Servidor Local
- [ ] Dev server inicia sin errores
  ```bash
  npm run dev
  # ✅ ready - started server on 0.0.0.0:3000
  ```
- [ ] Accesible en browser
  - [ ] http://localhost:3000 carga página
  - [ ] http://localhost:3000/api/auth/login es endpoint válido

### 1.7 Pruebas E2E Locales
- [ ] Login funciona
  ```bash
  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{
      "email":"admin@cenplus.com",
      "password":"admin123",
      "tenant":"test1"
    }'
  # ✅ Retorna token JWT
  ```
- [ ] JWT decodificable
  ```bash
  # Copiar token y verificar en https://jwt.io
  # Debe incluir claim: "tenant": "test1"
  ```
- [ ] GET /api/ciudadanos con token
  ```bash
  curl http://localhost:3000/api/ciudadanos \
    -H "Authorization: Bearer <token>" \
    -H "X-Tenant: test1"
  # ✅ Retorna { count: 0, data: {} }
  ```
- [ ] Aislamiento de tenant verificado
  ```bash
  # Tenant test1 no ve datos de test2
  node scripts/init-tenant.js test2
  # Login como test2 admin, verificar sin datos de test1
  ```

---

## FASE 2: Pre-Deployment (Producción Local)

**Estado General:** ⚪ No iniciado | 🟡 En progreso | ✅ Completado

### 2.1 Build Optimizado
- [ ] `npm run build` ejecutado
  ```bash
  npm run build
  # ✅ Compiled successfully
  ```
- [ ] Build folder validado
  ```bash
  ls -la .next/
  # ✅ Carpetas: static, server, image-optimizer
  ```
- [ ] Tiempo de build < 5 min

### 2.2 Preparación Datos
- [ ] BD de test limpiada (si necesario)
  ```bash
  psql -U postgres -c "DROP DATABASE IF EXISTS cenplus_db;"
  psql -U postgres -c "CREATE DATABASE cenplus_db;"
  ```
- [ ] Tenants principales creados
  - [ ] Tenant 1 (principal)
  - [ ] Tenant 2 (secondary para testing)
- [ ] Datos de seed agregados (si necesario)
- [ ] Backups de datos listos

### 2.3 Variables de Entorno
- [ ] `.env.production` creado (o usar .env.local para test)
  ```env
  DATABASE_URL=postgres://user:pass@localhost:5432/cenplus_db
  JWT_SECRET=random-secret-very-long-32chars-minimum
  NODE_ENV=production
  NEXTAUTH_SECRET=another-random-secret
  ```
- [ ] DATABASE_URL verificada correcta
  ```bash
  psql $DATABASE_URL -c "SELECT 1;"
  # ✅ Conexión exitosa
  ```
- [ ] JWT_SECRET es suficientemente fuerte (32+ chars, random)
- [ ] Variables de env no contienen hardcoded secrets

### 2.4 Seguridad Inicial
- [ ] Documentación de seguridad revisada (DEPLOYMENT_GUIDE.md)
- [ ] CORS habilitado solo para dominios conocidos
- [ ] Rate limiting configurado (si disponible)
- [ ] Logs configurados (stdout para logs)
- [ ] Error handling revisado (no exponer stack traces)

### 2.5 Performance Baseline
- [ ] Ab test login (100 requests, 10 concurrentes)
  ```bash
  ab -n 100 -c 10 -T "application/json" -p login.json http://localhost:3000/api/auth/login
  ```
- [ ] Resultado esperado: p95 < 200ms
- [ ] Memory usage monitoreado
- [ ] CPU usage bajo (< 50%)

### 2.6 Start Script
- [ ] `npm start` o `NODE_ENV=production node .next/standalone/server.js`
- [ ] App inicia sin errores
- [ ] Logs legibles y útiles
- [ ] Podría correr por 1 hora sin crash

---

## FASE 3: Selección de Plataforma

**Estado General:** ⚪ No decidido | 🟡 En progreso | ✅ Completado

### 3.1 Elegir Plataforma
**Opción elegida:** ⬜ AWS | ⬜ Heroku | ⬜ Vercel | ⬜ VPS | ⬜ Otra: ______

- [ ] Decisión documentada
  - [ ] Plataforma elegida: ________________
  - [ ] Razón: ________________
  - [ ] Presupuesto mensual estimado: $______
  - [ ] Esperado live en: __________ (fecha)

### 3.2 AWS Setup (si aplica)
- [ ] AWS account creado
- [ ] Credenciales configuradas localmente
- [ ] Región elegida (us-east-1, eu-west-1, etc.)
- [ ] RDS PostgreSQL creado
  - [ ] Multi-AZ habilitado
  - [ ] Backups automáticos habilitados
  - [ ] Connection string obtenido
- [ ] EC2 instance creado (o Elastic Beanstalk)
  - [ ] OS: Ubuntu 22.04 LTS
  - [ ] Type: t3.medium o superior
  - [ ] Security group configurado

### 3.3 Heroku Setup (si aplica)
- [ ] Heroku account creado
- [ ] Heroku CLI instalado
- [ ] `heroku login` ejecutado
- [ ] `heroku create cenplus-app` ejecutado
- [ ] PostgreSQL addon agregado

### 3.4 Vercel Setup (si aplica)
- [ ] Vercel account creado
- [ ] GitHub repo conectado
- [ ] Supabase PostgreSQL creado
- [ ] Environment variables configuradas

### 3.5 VPS Setup (si aplica)
- [ ] Server rentado (DigitalOcean, Linode, etc.)
- [ ] Acceso SSH configurado
- [ ] Firewall habilitado
- [ ] Monitoreo básico setup

---

## FASE 4: Deployment a Staging

**Estado General:** ⚪ No iniciado | 🟡 En progreso | ✅ Completado

### 4.1 DNS Staging (si aplica)
- [ ] Subdomain creado: `staging.yourdomain.com` o similar
  ```
  A record: staging.yourdomain.com → 203.0.113.1
  ```
- [ ] DNS propagado (verificar: `nslookup staging.yourdomain.com`)

### 4.2 SSL/TLS Staging
- [ ] SSL certificado obtenido (Let's Encrypt, AWS ACM, etc.)
  ```bash
  # AWS ACM o Let's Encrypt
  certbot certonly --manual -d staging.yourdomain.com
  ```
- [ ] Certificado instalado en reverse proxy/load balancer
- [ ] HTTPS funciona: https://staging.yourdomain.com

### 4.3 Reverse Proxy Setup (nginx ejemplo)
- [ ] nginx instalado
- [ ] Configuración tenant-aware creada
  ```nginx
  server {
    server_name ~^(?<tenant>\w+)\.yourdomain\.com$ staging.yourdomain.com;
    
    location / {
      proxy_pass http://127.0.0.1:3000;
      proxy_set_header X-Tenant $tenant;
      proxy_set_header Host $host;
    }
  }
  ```
- [ ] Testear subdomain routing:
  ```bash
  curl -H "Host: test1.yourdomain.com" http://staging.yourdomain.com
  ```

### 4.4 Deploy App
- [ ] Código pusheado a repo (main branch)
- [ ] CI/CD ejecutado (si automatizado)
- [ ] O deployment manual:
  ```bash
  ssh user@staging-server
  cd /app/cenplus
  git pull
  npm install
  npm run build
  pm2 restart cenplus-app
  ```
- [ ] App corriendo:
  ```bash
  pm2 list
  # ✅ cenplus-app online
  ```

### 4.5 Tenants de Staging
- [ ] Primer tenant creado en BD de staging
  ```bash
  DATABASE_URL=postgres://... node scripts/init-tenant.js staging1
  ```
- [ ] Segundo tenant creado (para testing aislamiento)
  ```bash
  DATABASE_URL=postgres://... node scripts/init-tenant.js staging2
  ```

### 4.6 Testing Staging
- [ ] Login en staging1 funciona
  ```bash
  curl -X POST https://staging.yourdomain.com/api/auth/login \
    -H "Content-Type: application/json" \
    -H "X-Tenant: staging1" \
    -d '{"email":"admin@cenplus.com","password":"admin123"}'
  ```
- [ ] Subdomain routing funciona
  ```bash
  curl https://staging1.yourdomain.com/api/auth/login
  # Debe funcionar (tenant auto-detectado de subdomain)
  ```
- [ ] Aislamiento verificado (staging1 no ve datos de staging2)
- [ ] 1000 requests stress test
  ```bash
  for i in {1..1000}; do
    curl -s https://staging.yourdomain.com/api/auth/check > /dev/null
  done
  echo "Done"
  ```

### 4.7 Monitoreo Staging
- [ ] Logs monitoreados
  ```bash
  pm2 logs cenplus-app
  ```
- [ ] Error rates < 0.1%
- [ ] Response times p95 < 500ms
- [ ] Memory stable (no memory leaks)

---

## FASE 5: Deployment a Producción

**Estado General:** ⚪ No iniciado | 🟡 En progreso | ✅ Completado

### 5.1 Pre-Prod Verification
- [ ] ✅ Staging funcionando 24+ horas sin issues
- [ ] ✅ Load testing pasó
- [ ] ✅ Security review completado
- [ ] ✅ Documentación actualizada
- [ ] ✅ Runbook de troubleshooting listo

### 5.2 Production Database
- [ ] RDS/Managed DB creado (Multi-AZ)
  ```bash
  # AWS RDS ejemplo
  RDS endpoint: cenplus-prod.c9akciq32.us-east-1.rds.amazonaws.com
  ```
- [ ] Backups configurados (diarios, 30 días retention)
- [ ] Connection string obtenida
- [ ] Access verificado desde app server
  ```bash
  psql $PROD_DATABASE_URL -c "SELECT 1;"
  ```
- [ ] Schemas de tenants existentes inicializados (si migrating)

### 5.3 Production DNS
- [ ] Dominio principal registrado
  - [ ] yourdomain.com → LoadBalancer/App IP
  - [ ] *.yourdomain.com → LoadBalancer/App IP (wildcard)
- [ ] DNS propagado (puede tomar 24-48 horas)
  ```bash
  nslookup yourdomain.com
  nslookup api.yourdomain.com
  nslookup tenant1.yourdomain.com
  ```

### 5.4 Production SSL
- [ ] Wildcard SSL certificate obtenido
  ```bash
  # Let's Encrypt + auto-renewal
  certbot certonly --manual -d yourdomain.com -d "*.yourdomain.com"
  ```
- [ ] Auto-renewal configurado
  ```bash
  certbot renew --dry-run  # Verificar
  ```
- [ ] Certificado instalado en load balancer

### 5.5 Production App Deployment
- [ ] App server setup (EC2/App Engine/etc.)
- [ ] Dependencies instaladas
  ```bash
  curl -fsSL https://deb.nodesource.com/setup_18.x | sudo bash
  sudo apt install -y nodejs
  npm install -g pm2
  ```
- [ ] App deployada
  ```bash
  git clone https://github.com/org/cenplus.git
  cd cenplus
  npm install --production
  npm run build
  ```
- [ ] `.env.production` configurado con secrets
  ```env
  DATABASE_URL=<PROD_DB_URL>
  JWT_SECRET=<RANDOM_VERY_LONG_SECRET>
  NODE_ENV=production
  NEXTAUTH_SECRET=<ANOTHER_SECRET>
  ```
- [ ] PM2 startup configurado
  ```bash
  pm2 start npm --name "cenplus-app" -- start
  pm2 save
  sudo pm2 startup
  ```

### 5.6 Production Tenants
- [ ] Tenants principales creados
  ```bash
  DATABASE_URL=$PROD_DB node scripts/create-tenant-prod.js \
    tenant1 \
    admin@tenant1.com \
    SecurePassword123! \
    "Admin User"
  ```
- [ ] Datos iniciales loaded (si necesario)

### 5.7 Production Verification
- [ ] App accesible
  ```bash
  curl https://yourdomain.com
  # ✅ 200 OK
  ```
- [ ] Login funciona
  ```bash
  curl -X POST https://yourdomain.com/api/auth/login \
    -d '{"email":"admin@tenant1.com","password":"SecurePassword123!"}'
  # ✅ JWT token returned
  ```
- [ ] HTTPS redirection activo
  ```bash
  curl -L http://yourdomain.com/api/auth/login
  # ✅ Redirige a https://
  ```
- [ ] Subdomain routing funciona
  ```bash
  curl https://tenant1.yourdomain.com/api/ciudadanos \
    -H "Authorization: Bearer <token>"
  # ✅ 200 OK
  ```
- [ ] Security headers presentes
  ```bash
  curl -I https://yourdomain.com
  # ✅ Strict-Transport-Security, X-Content-Type-Options, etc.
  ```

### 5.8 Monitoring Production
- [ ] Logs centralizados
  - [ ] CloudWatch (AWS)
  - [ ] DataDog
  - [ ] ELK Stack
- [ ] Alertas configuradas
  - [ ] Error rate > 1%
  - [ ] Response time p95 > 1s
  - [ ] CPU > 80%
  - [ ] Memory > 90%
- [ ] Uptime monitoring
  - [ ] Ping every 5min
  - [ ] Alert si down > 5min

### 5.9 Backup Strategy
- [ ] DB backups automáticos (diarios)
- [ ] Prueba restore (simulate disaster)
- [ ] App code versioned en git
- [ ] Docker image tagged (si aplica)
- [ ] Runbook para restore documentado

### 5.10 Go-Live Activities
- [ ] Customer communication enviado
- [ ] On-call team disponible (24hrs)
- [ ] Deployment log creado con timestamp
  ```
  [2026-05-09 14:00:00] Deployment iniciado
  [2026-05-09 14:05:00] DB prepared
  [2026-05-09 14:10:00] App deployed
  [2026-05-09 14:15:00] Tests passed
  [2026-05-09 14:20:00] Go-live
  ```
- [ ] First 1 hour monitoreo intenso
- [ ] Issues log creado
- [ ] Success verified

---

## FASE 6: Post-Deployment

**Estado General:** ⚪ No iniciado | 🟡 En progreso | ✅ Completado

### 6.1 First Week Monitoring
- [ ] Sistema estable (no crashes)
- [ ] Performance baseline: p95 < 500ms
- [ ] Error rate < 0.1%
- [ ] Logs monitoreados activamente
- [ ] Customer feedback solicitado

### 6.2 Documentation Updates
- [ ] Runbook actual finalizado
- [ ] Troubleshooting guide completado
- [ ] Customer FAQs creado
- [ ] Disaster recovery plan escrito

### 6.3 Training & Knowledge Transfer
- [ ] Team entrenado en:
  - [ ] Tenant management
  - [ ] Debugging
  - [ ] Deployment
  - [ ] Monitoring
- [ ] Documentation compartida

### 6.4 Optimizations
- [ ] Database indexes revisados
- [ ] Query performance tuned (si needed)
- [ ] Caching strategy implementada
- [ ] CDN setup (si aplica)

### 6.5 Scaling Plan
- [ ] Auto-scaling rules configuradas
- [ ] Load testing (1000+ concurrent users)
- [ ] Capacity planning (3, 6, 12 months)

---

## Resumen de Status

| Fase | Status | Notas |
|------|--------|-------|
| 1: Local Testing | 🟡 En progreso | Completar todos los checks |
| 2: Production Local | ⚪ Pending | Iniciar cuando Fase 1 = ✅ |
| 3: Plataforma Selection | ⚪ Pending | Decidir antes de Fase 4 |
| 4: Staging | ⚪ Pending | Completar después de seleccionar plataforma |
| 5: Production | ⚪ Pending | Solo después de ✅ Staging |
| 6: Post-Deploy | ⚪ Pending | After ✅ Production 24hrs |

---

## Recursos Rápidos

### Documentación
- [QUICK_START.md](QUICK_START.md) — 5-minute overview
- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) — Detailed steps
- [API_REFERENCE.md](API_REFERENCE.md) — Endpoint docs
- [TECHNICAL_ARCHITECTURE.md](TECHNICAL_ARCHITECTURE.md) — Architecture

### Scripts Útiles
```bash
# Testing
npm test
npm run build
npm run dev

# Database
node scripts/init-tenant.js <tenant-name>
node scripts/create-tenant-prod.js <tenant> <email> <password> <name>

# Deployment (example)
pm2 start npm --name "cenplus-app" -- start
pm2 save
pm2 logs
pm2 restart cenplus-app
```

### Contacto & Soporte
- GitHub Issues: [link to repo]
- Email: dev@cenplus.com
- Slack: #cenplus-deployment

---

**Versión:** 1.0  
**Última actualización:** 2026-05-09  
**Siguiente review:** 2026-05-16
