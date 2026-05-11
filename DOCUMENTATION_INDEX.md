# 📖 CenPlus Documentation Index

**Tu mapa completo de documentación, scripts y recursos**

---

## 🎯 Empieza Aquí (Pick Your Path)

### 👤 Soy usuario / No técnico
1. Leer: [¿Qué es multi-tenancy?](MULTI_TENANCY_COMPLETE_GUIDE.md#qué-es-multi-tenancy-en-100-palabras)
2. Leer: [Modelo de negocios](QUICK_START.md#casos-de-uso-tu-negocio)
3. Contactar: `dev@cenplus.com`

### 👨‍💻 Soy desarrollador (quiero desplegar localmente)
1. Leer: [QUICK_START.md](QUICK_START.md) (5 min)
2. Ejecutar: `npm install && node scripts/init-tenant.js tenant1 && npm run dev`
3. Test: [API_REFERENCE.md](API_REFERENCE.md) para probar endpoints
4. Cuando funcione localmente → Pasar a "DevOps"

### 🚀 Soy DevOps / SysAdmin (quiero desplegar a producción)
1. Leer: [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) (40 min)
2. Usar: [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) para verificaciones
3. Elegir plataforma: AWS, Heroku, Vercel (ver QUICK_START.md)
4. Seguir paso a paso de DEPLOYMENT_GUIDE.md
5. Verificar en DEPLOYMENT_CHECKLIST.md

### 🏗️ Soy arquitecto / Lead (quiero entender el sistema)
1. Leer: [TECHNICAL_ARCHITECTURE.md](TECHNICAL_ARCHITECTURE.md) (20 min)
   - Data flow diagram
   - Schema design
   - Security model
   - Scaling strategies
2. Revisar: [src/lib/tenant.ts](src/lib/tenant.ts) (core logic)
3. Revisar: [src/lib/auth.ts](src/lib/auth.ts) (auth strategy)
4. Leer: [MULTI_TENANCY_COMPLETE_GUIDE.md](MULTI_TENANCY_COMPLETE_GUIDE.md#modelos-de-multi-tenancy) para comprender trade-offs

### 📱 Soy integrador / Frontend (quiero usar la API)
1. Consultar: [API_REFERENCE.md](API_REFERENCE.md)
   - Endpoints disponibles
   - Ejemplos de requests/responses
   - Códigos de error
2. Ejecutar ejemplos
3. Integrar con tu código

### 🔍 Tengo un problema (debugging)
1. Ver: [DEPLOYMENT_GUIDE.md#troubleshooting](DEPLOYMENT_GUIDE.md#troubleshooting)
2. Ver: [QUICK_START.md#troubleshooting](QUICK_START.md#troubleshooting)
3. Revisar logs: `pm2 logs cenplus-app`
4. Consultar: Sección de errores comunes en documentación

---

## 📚 Documentación Completa

### Conceptual (Entender el Sistema)

| Archivo | Propósito | Audiencia | Tiempo |
|---------|-----------|-----------|--------|
| [QUICK_START.md](QUICK_START.md) | Overview ejecutivo + comandos básicos | Todos | 5 min |
| [MULTI_TENANCY_COMPLETE_GUIDE.md](MULTI_TENANCY_COMPLETE_GUIDE.md) | Educación en multi-tenancy: qué es, modelos, pros/contras | Product Managers, Architects | 30 min |
| [TECHNICAL_ARCHITECTURE.md](TECHNICAL_ARCHITECTURE.md) | Arquitectura del sistema: data flow, seguridad, escalabilidad | Architects, Tech Leads | 20 min |

### Operacional (Hacer Cosas)

| Archivo | Propósito | Audiencia | Tiempo |
|---------|-----------|-----------|--------|
| [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) | Step-by-step para desplegar a producción | DevOps, SysAdmins | 60 min |
| [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) | Verificaciones exhaustivas antes de lanzar | DevOps, QA | 30 min |
| [API_REFERENCE.md](API_REFERENCE.md) | Documentación de endpoints, ejemplos, códigos de error | Developers, Integrators | 15 min |

### Referencia (Código)

| Archivo | Propósito |
|---------|-----------|
| [README.md](README.md) | Overview del proyecto + tech stack |
| [src/lib/tenant.ts](src/lib/tenant.ts) | **Core logic**: `queryWithTenant()`, `sanitizeTenant()` |
| [src/lib/auth.ts](src/lib/auth.ts) | JWT generation/validation, `tokenMatchesTenant()` |
| [middleware.ts](middleware.ts) | Tenant detection from subdomain |
| [scripts/init-tenant.js](scripts/init-tenant.js) | Script para crear tenants (desarrollo) |
| [scripts/create-tenant-prod.js](scripts/create-tenant-prod.js) | Script para crear tenants (producción) |

---

## 🔧 Scripts Disponibles

### Development
```bash
npm run dev              # Start dev server (localhost:3000)
npm run build            # Production build
npm run start            # Start production server
npm run lint             # Lint & format check
npm test                 # Run tests
```

### Tenant Management
```bash
# Create tenant (development)
node scripts/init-tenant.js my_tenant

# Create tenant (production)
DATABASE_URL=prod node scripts/create-tenant-prod.js \
  my_tenant \
  admin@mytenant.com \
  SecurePassword123! \
  "Admin User"

# Verify data integrity
node scripts/verify-data.js

# List tables in schema
node scripts/list-tables.js
```

### Monitoring (when running)
```bash
pm2 logs cenplus-app          # View live logs
pm2 monitor                    # View process health
pm2 save && pm2 startup        # Enable auto-restart
```

---

## 🌍 Deployment Options

### Quick Comparison

| Platform | Setup Time | Cost | Best For | Docs |
|----------|-----------|------|----------|------|
| **Heroku** | 10 min | $50-200/mo | MVP, < 100 tenants | DEPLOYMENT_GUIDE.md |
| **AWS** | 1 hour | $100-500/mo | Enterprise, scaling | DEPLOYMENT_GUIDE.md |
| **Vercel** | 30 min | $50-150/mo | Frontend-first, SSR | DEPLOYMENT_GUIDE.md |
| **VPS** | 1.5 hours | $50+/mo | Complete control, cheap | DEPLOYMENT_GUIDE.md |

**Recomendación**: Heroku para empezar, AWS cuando escales.

Ver [QUICK_START.md#quick-start-desplegar-a-producción](QUICK_START.md#quick-start-desplegar-a-producción) para instrucciones.

---

## 🔒 Security Checklist

**Before going live:**

- [ ] JWT_SECRET is 32+ chars random
- [ ] DATABASE_URL uses `sslmode=require`
- [ ] HTTPS/SSL certificate valid
- [ ] CORS restricted to known domains
- [ ] Rate limiting enabled
- [ ] Logs don't contain sensitive data
- [ ] Backups automated (daily)
- [ ] Monitoring setup (CloudWatch, DataDog, etc.)
- [ ] On-call team defined
- [ ] Disaster recovery plan documented

Ver: [DEPLOYMENT_CHECKLIST.md#fase-5-deployment-a-producción](DEPLOYMENT_CHECKLIST.md#fase-5-deployment-a-producción) completo

---

## 📊 Architecture at a Glance

### Request Flow
```
Browser (municipio1.cenplus.com)
    ↓ HTTPS
nginx (extract subdomain → X-Tenant header)
    ↓ X-Tenant: municipio1
Next.js API Route (/api/auth/login)
    ↓ queryWithTenant("municipio1", sql)
PostgreSQL (SET search_path TO "municipio1", public)
    ↓ Returns data only from municipio1 schema
API Response (JWT with tenant claim)
    ↓
Browser
```

### Data Isolation Model
```
Database: cenplus_db

Schema: municipio1
├── admins (3 users)
├── ciudadanos (50,000 records)
├── sectors (100 sectors)
└── trends (historical data)

Schema: municipio2
├── admins (2 users)
├── ciudadanos (30,000 records)
├── sectors (50 sectors)
└── trends (historical data)

Schema: public (shared, read-only)
├── system_config
└── constants
```

**Key Point**: Imposible que municipio1 vea datos de municipio2, incluso si SQL injection occurred.

---

## 💡 Common Questions

### ¿Cuántos tenants pueden correr en un servidor?
- 1 servidor: 100-500 tenants activos
- 2+ servidores (load balanced): 500-2000 tenants
- Kubernetes: 2000+ tenants
- Database scales separately (RDS can handle 1000+)

### ¿Cuánto cuesta por tenant?
- Infrastructure: $50-200/mes (shared across all tenants)
- Per-tenant cost: $1-5/mes (amortized over 100 tenants)
- If selling: $100-500/mes per customer = excellent margin

### ¿Puedo cambiar de un tenant a otro sin logout?
No (y eso es bueno por seguridad). Cada login es específico a un tenant.

### ¿Qué pasa si tengo N millones de ciudadanos?
- Partition tables by tenant (handled automatically)
- Add database replicas for read scaling
- Use Elasticsearch for full-text search
- Check [TECHNICAL_ARCHITECTURE.md#scaling](TECHNICAL_ARCHITECTURE.md#scaling)

### ¿Cómo hago backup de un tenant específico?
```bash
pg_dump -n municipio1 cenplus_db > municipio1_backup.sql
```

### ¿Cómo migro un tenant a otro servidor?
```bash
# Server A
pg_dump -n municipio1 cenplus_db | \
# Server B
psql cenplus_db
```

---

## 🚨 Emergency Procedures

### Server Down
1. Check PM2: `pm2 list`
2. Restart: `pm2 restart cenplus-app`
3. Check logs: `pm2 logs`
4. If DB issue: Verify connection string, check PG status

### Database Corruption
1. Restore from backup: `psql cenplus_db < latest_backup.sql`
2. Verify specific tenant: `psql -d cenplus_db -c "SET search_path TO tenant1, public; SELECT COUNT(*) FROM admins;"`

### Customer Data Leak
1. Check logs: `pm2 logs`
2. Identify tenant: X-Tenant header from request
3. Review JWT tokens: Verify expiry and tenant claim
4. Implement rate limiting if under attack

See [DEPLOYMENT_GUIDE.md#monitoring-and-alerting](DEPLOYMENT_GUIDE.md#monitoring-and-alerting)

---

## 📞 Support & Community

### Documentation
- All guides in this directory
- GitHub Issues for bugs
- GitHub Discussions for questions

### Internal Resources
- Team Slack: #cenplus-deployment
- Email: dev@cenplus.com
- Weekly standup: Thursdays 10am

### External Resources
- [PostgreSQL Schema docs](https://www.postgresql.org/docs/15/ddl-schemas.html)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [JWT.io Debugger](https://jwt.io)
- [AWS RDS Guide](https://docs.aws.amazon.com/rds/)

---

## 🎓 Learning Path

**For a new team member:**

1. **Day 1**: Read [QUICK_START.md](QUICK_START.md) + [README.md](README.md)
2. **Day 2**: Deploy locally, test with 2 tenants
3. **Day 3**: Read [MULTI_TENANCY_COMPLETE_GUIDE.md](MULTI_TENANCY_COMPLETE_GUIDE.md)
4. **Day 4**: Read [TECHNICAL_ARCHITECTURE.md](TECHNICAL_ARCHITECTURE.md)
5. **Day 5**: Deploy to staging, follow [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)

**By end of week**: Comfortable deploying and troubleshooting multi-tenant infrastructure.

---

## 📋 Deployment Readiness

| Item | Status | Owner |
|------|--------|-------|
| App tested locally | ✅ | Dev |
| DB schema verified | ✅ | DevOps |
| Multi-tenant isolation tested | ✅ | QA |
| SSL certificates ready | ⚪ | DevOps |
| DNS configured | ⚪ | DevOps |
| Monitoring setup | ⚪ | DevOps |
| On-call team ready | ⚪ | Team Lead |
| Customer communication sent | ⚪ | PM |
| Runbook documented | ✅ | DevOps |
| Disaster recovery tested | ⚪ | DevOps |

**Ready to deploy?** → Start with [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)

---

**Last Updated**: 2026-05-09  
**Status**: ✅ Production Ready  
**Questions?** Email dev@cenplus.com or check the FAQ in individual docs
