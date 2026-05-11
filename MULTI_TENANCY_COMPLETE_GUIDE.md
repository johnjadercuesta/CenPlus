# 📚 Multi-Tenancy: Guía Completa

## Índice
1. [¿Qué es Multi-Tenancy?](#qué-es-multi-tenancy)
2. [Modelos de Multi-Tenancy](#modelos-de-multi-tenancy)
3. [Cómo Funciona en CenPlus](#cómo-funciona-en-cenplus)
4. [Paso a Paso: Despliegue a Producción](#paso-a-paso-despliegue-a-producción)
5. [Casos de Uso](#casos-de-uso)
6. [Costos Estimados](#costos-estimados)

---

## ¿Qué es Multi-Tenancy?

### Concepto Simple

Imagina un edificio de apartamentos:
- **Single-Tenancy** (una vivienda por servidor): Cada familia tiene su propia casa separada
- **Multi-Tenancy** (muchos apartamentos en 1 edificio): Muchas familias comparten un edificio pero cada una tiene su apartamento privado

En software:
- **Single-Tenancy**: Un cliente = 1 base de datos completa + 1 servidor + 1 app
- **Multi-Tenancy**: Muchos clientes = 1 base de datos (con aislamientos) + 1 servidor + 1 app

### Ventajas de Multi-Tenancy

✅ **Economía de Escala**
- Un servidor sirve a 100 clientes
- Costo por cliente: ~1% del single-tenancy
- Ejemplo: $10,000/mes en infraestructura ÷ 100 clientes = $100/cliente/mes

✅ **Escalabilidad Horizontal**
- Agregar más clientes no requiere más servidores (hasta cierto límite)
- Un servidor maneja 100-1000 clientes depende de uso

✅ **Mantenimiento Centralizado**
- 1 versión de código, 1 BD, 1 servidor
- Actualizaciones se despliegan una sola vez
- Bugs se arreglan en 1 lugar

✅ **Aislamiento de Datos**
- Los datos de cliente A nunca se mezclan con cliente B
- Cada cliente ve solo sus datos

### Desventajas

❌ **Complejidad**
- Código más complejo (detectar tenant, aislar datos)
- Testing más difícil (probar con múltiples tenants)

❌ **Rendimiento Compartido**
- Si un cliente usa mucho, afecta a otros
- Necesitas limitadores de recursos

❌ **Compliance/Regulación**
- GDPR exige aislamientos más fuertes
- Auditorías más complejas

❌ **Menor Flexibilidad**
- Todos los clientes usan la misma versión
- Customizaciones por cliente son difíciles

---

## Modelos de Multi-Tenancy

### Modelo 1: Shared Database, Shared Schema (Básico, No Recomendado)

```
┌─────────────────────────────────────────────┐
│ 1 PostgreSQL Database                       │
│ ┌───────────────────────────────────────┐   │
│ │ 1 Schema (public)                     │   │
│ │                                        │   │
│ │ Tabla: ciudadanos                     │   │
│ │ - id  | tenant_id | nombre             │   │
│ │ - 1   | tenant1   | Juan               │   │
│ │ - 2   | tenant1   | María              │   │
│ │ - 3   | tenant2   | Pedro              │   │
│ │                                        │   │
│ │ (todos en 1 tabla)                    │   │
│ └───────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

**Ventajas:**
- Simple de implementar
- No require cambios de schema

**Desventajas:**
- ⚠️ Alto riesgo: Bug en query = fuga de datos de otros tenants
- Lento: Queries de todos los clientes juntas
- Difícil de backupear un tenant solo

**Ejemplo Vulnerable:**
```sql
-- BUG: Falta WHERE clause
SELECT * FROM ciudadanos;
-- Retorna datos de TODOS los tenants
```

---

### Modelo 2: Shared Database, Separate Schema (RECOMENDADO - Lo que CenPlus usa)

```
┌──────────────────────────────────────────────┐
│ 1 PostgreSQL Database (cenplus_db)           │
│                                              │
│ ┌─────────────┐  ┌─────────────┐            │
│ │ tenant1     │  │ tenant2     │            │
│ │ (schema)    │  │ (schema)    │            │
│ ├─────────────┤  ├─────────────┤            │
│ │ciudadanos   │  │ciudadanos   │            │
│ │admins       │  │admins       │            │
│ │comunas      │  │comunas      │            │
│ └─────────────┘  └─────────────┘            │
│                                              │
│ ┌─────────────────────────────────────┐    │
│ │ public (schema compartido)          │    │
│ │ - extensiones PostgreSQL            │    │
│ └─────────────────────────────────────┘    │
└──────────────────────────────────────────────┘
```

**Ventajas:**
- ✅ Aislamiento fuerte a nivel BD
- ✅ Fácil de backupear por tenant
- ✅ Escalable
- ✅ Seguro (imposible fuga accidental)

**Desventajas:**
- Ligeramente más complejo

---

### Modelo 3: Separate Database (Máximo Aislamiento)

```
┌─────────────────┐  ┌─────────────────┐
│ PostgreSQL 1    │  │ PostgreSQL 2    │
│ (tenant1_db)    │  │ (tenant2_db)    │
│                 │  │                 │
│ - ciudadanos    │  │ - ciudadanos    │
│ - admins        │  │ - admins        │
└─────────────────┘  └─────────────────┘
```

**Ventajas:**
- ✅ Máxima seguridad
- ✅ Máximo aislamiento

**Desventajas:**
- ❌ Muy caro (1 BD por cliente)
- ❌ Complejidad operativa
- ❌ Difícil de escalar

**Caso de Uso**: Clientes enterprise que pagan mucho dinero

---

## Cómo Funciona en CenPlus

### Arquitectura General

```
Cliente accede a: acme.yourdomain.com
                          ↓
                 nginx (reverse proxy)
                          ↓
                    Next.js Server
                          ↓
                    middleware.ts
              ┌─────────────────────────────┐
              │ Detecta: acme (tenant)      │
              │ Valida: /^[a-z0-9_]+$/      │
              │ Propaga: x-tenant header    │
              └─────────────────────────────┘
                          ↓
                    API Routes
              ┌─────────────────────────────┐
              │ getTenantFromRequest()      │
              │ "acme" ← de header          │
              └─────────────────────────────┘
                          ↓
                  queryWithTenant()
              ┌─────────────────────────────┐
              │ 1. Valida tenant            │
              │ 2. Obtiene cliente DB       │
              │ 3. SET search_path TO "acme"│
              │ 4. Ejecuta query            │
              │ 5. Retorna resultados       │
              └─────────────────────────────┘
                          ↓
                    PostgreSQL
              ┌─────────────────────────────┐
              │ cenplus_db                  │
              │                             │
              │ Esquema "acme"              │
              │ - ciudadanos (solo acme)    │
              │ - admins (solo acme)        │
              │ - ... (todo aislado)        │
              └─────────────────────────────┘
```

### Flujo Seguridad

```
Request llega: https://acme.yourdomain.com/api/ciudadanos

1. ¿Quién eres? (Validación de subdomain)
   - Extrae: "acme" de host
   - Valida: /^[a-z0-9_]+$/ ✓
   - Resultado: tenant = "acme"

2. ¿Tienes permiso? (Validación de JWT)
   - Extrae JWT de Authorization header
   - Decodifica: { userId: 1, tenant: "acme", role: "admin" }
   - Verifica: JWT.tenant == request.tenant?
   - Resultado: ✓ Autorizado

3. ¿A dónde vas? (Routing de BD)
   - Crea query: "SELECT * FROM ciudadanos"
   - Antes de ejecutar: SET search_path TO "acme", public
   - PostgreSQL: Solo ve tabla ciudadanos en esquema "acme"
   - Resultado: Datos solo de acme

4. ¿Qué traes? (Encriptación de respuesta)
   - Retorna datos vía HTTPS
   - Browser valida SSL cert
   - Solo cliente acme ve datos
```

### Ejemplo Código

**Request:**
```bash
curl -X GET https://acme.yourdomain.com/api/ciudadanos \
  -H "Authorization: Bearer eyJ..." \
  -H "x-tenant: acme"
```

**Código de Ruta** (`/api/ciudadanos`):
```typescript
export async function GET(request: NextRequest) {
  // 1. Verificar autenticación
  const token = getTokenFromRequest(request);
  if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  
  // 2. Detectar tenant
  const tenant = getTenantFromRequest(request);
  if (!tenant) return NextResponse.json({ error: "Tenant no especificado" }, { status: 400 });
  
  // 3. Verificar que JWT matches tenant
  if (!tokenMatchesTenant(token, request)) {
    return NextResponse.json({ error: "Token no corresponde al tenant" }, { status: 403 });
  }
  
  // 4. Crear helper para queries
  const run = (sql: string, params: any[]) => 
    queryWithTenant(tenant, sql, params);
  
  // 5. Ejecutar query (se ejecuta en schema del tenant)
  const { rows } = await run("SELECT * FROM ciudadanos LIMIT 50", []);
  
  return NextResponse.json({ data: rows });
}
```

**En Base de Datos:**
```
PostgreSQL recibe:
  SET search_path TO "acme", public;
  SELECT * FROM ciudadanos LIMIT 50;

PostgreSQL busca ciudadanos:
  1. Primero en esquema "acme" ✓ (encontrado)
  2. Retorna ciudadanos del esquema "acme" solo

Si intenta acceder a otro schema:
  SELECT * FROM tenant2.ciudadanos; // Error: sin permiso
```

---

## Paso a Paso: Despliegue a Producción

### Fase 0: Pre-Requisitos

**Software Necesario:**
- [ ] PostgreSQL 14+ (AWS RDS recomendado)
- [ ] Node.js 18+ runtime
- [ ] nginx o CloudFlare (reverse proxy)
- [ ] Dominio con soporte wildcard
- [ ] Certificado SSL wildcard

**Costos Estimados (AWS):**
- RDS PostgreSQL: $100-300/mes
- EC2 (app): $50-200/mes
- CloudFlare (DNS + SSL): $20/mes
- Route 53 (DNS): $1/mes
- **Total**: ~$170-500/mes para 100 clientes

### Fase 1: Preparar Base de Datos (AWS RDS)

#### 1.1 Crear RDS Instance
```bash
# En AWS Console:
1. Click: RDS → Databases → Create Database
2. Engine: PostgreSQL 15
3. Template: Production
4. Multi-AZ: Yes (importante para uptime)
5. Storage: 100 GB gp3 (auto-scaling enabled)
6. Backup: 30 days retention
7. Click: Create

Esperar ~10 minutos a que levante...
```

#### 1.2 Configurar Seguridad
```bash
# En AWS Console:
1. RDS Instance → Security Groups
2. Edit Inbound Rules:
   - Type: PostgreSQL
   - Protocol: TCP
   - Port: 5432
   - Source: IP de app server solo (ej: 10.0.1.0/24)
   
# Esto asegura que solo tu app acceda a BD
```

#### 1.3 Crear Base de Datos y Usuario
```bash
# Conectar a RDS
psql -h cenplus-prod.abc123.us-east-1.rds.amazonaws.com \
     -U postgres \
     -d postgres

# Dentro de psql:
CREATE DATABASE cenplus_db;

CREATE USER cenplus_app WITH PASSWORD 'GenerateStrongPassword123!@#';

\c cenplus_db

GRANT CONNECT ON DATABASE cenplus_db TO cenplus_app;
GRANT SCHEMA public TO cenplus_app;
GRANT ALL PRIVILEGES ON SCHEMA public TO cenplus_app;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO cenplus_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO cenplus_app;

ALTER ROLE cenplus_app CREATEDB;

\q
```

#### 1.4 Obtener Connection String
```
postgresql://cenplus_app:GenerateStrongPassword123!@#@cenplus-prod.abc123.us-east-1.rds.amazonaws.com:5432/cenplus_db?sslmode=require
```

---

### Fase 2: Desplegar Aplicación (AWS EC2)

#### 2.1 Crear EC2 Instance
```bash
# En AWS Console:
1. EC2 → Instances → Launch Instance
2. Name: cenplus-app
3. Image: Ubuntu 22.04 LTS (free tier eligible)
4. Instance Type: t3.medium (2vCPU, 4GB RAM)
5. Security Group: 
   - Inbound HTTP (80) from anywhere
   - Inbound HTTPS (443) from anywhere
   - Inbound SSH (22) from your IP only
6. Key Pair: Crear o usar existente
7. Launch Instance
```

#### 2.2 Conectar y Preparar Servidor
```bash
# SSH al servidor
ssh -i your-key.pem ubuntu@ec2-instance-ip

# Actualizar paquetes
sudo apt update
sudo apt upgrade -y

# Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Instalar nginx
sudo apt install -y nginx

# Instalar git
sudo apt install -y git

# Instalar PM2 (process manager)
sudo npm install -g pm2
```

#### 2.3 Descargar Código
```bash
cd /home/ubuntu

# Clone repositorio
git clone https://github.com/your-org/cenplus.git
cd cenplus

# Instalar dependencias
npm install --production

# Build
npm run build
```

#### 2.4 Crear .env.production
```bash
cat > .env.production << 'EOF'
# Database
DATABASE_URL="postgresql://cenplus_app:GenerateStrongPassword123!@#@cenplus-prod.abc123.us-east-1.rds.amazonaws.com:5432/cenplus_db?sslmode=require"

# Security
JWT_SECRET="generate-a-strong-random-string-min-32-chars-ABCDefgh1234567890"

# App
NODE_ENV=production
PORT=3000

# Optional: Observability
SENTRY_DSN="https://..." # Si usas Sentry
EOF

chmod 600 .env.production
```

#### 2.5 Configurar PM2
```bash
# Crear archivo pm2.config.js
cat > pm2.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'cenplus-api',
      script: 'npm',
      args: 'run start',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production'
      },
      error_file: '/var/log/cenplus-error.log',
      out_file: '/var/log/cenplus-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};
EOF

# Iniciar con PM2
sudo pm2 start pm2.config.js

# Guardar configuración
sudo pm2 save
sudo pm2 startup systemd -u ubuntu --hp /home/ubuntu

# Verificar que está corriendo
sudo pm2 status
```

---

### Fase 3: Configurar nginx (Reverse Proxy)

#### 3.1 Crear configuración nginx
```bash
# Crear archivo de configuración
sudo cat > /etc/nginx/sites-available/cenplus << 'EOF'
# Upstream al app
upstream cenplus_app {
    server 127.0.0.1:3000;
    keepalive 64;
}

# Redirigir HTTP → HTTPS
server {
    listen 80;
    server_name *.yourdomain.com yourdomain.com;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS principal
server {
    listen 443 ssl http2;
    server_name *.yourdomain.com yourdomain.com;
    
    # Certificados SSL
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    # Configuración SSL segura
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Seguridad headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Logging
    access_log /var/log/nginx/cenplus-access.log;
    error_log /var/log/nginx/cenplus-error.log;
    
    # Proxy a app
    location / {
        proxy_pass http://cenplus_app;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
EOF

# Habilitar configuración
sudo ln -s /etc/nginx/sites-available/cenplus /etc/nginx/sites-enabled/

# Remover default
sudo rm /etc/nginx/sites-enabled/default

# Probar configuración
sudo nginx -t

# Recargar nginx
sudo systemctl reload nginx
```

#### 3.2 Configurar SSL con Let's Encrypt
```bash
# Instalar certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtener certificado wildcard
sudo certbot certonly --manual \
  --preferred-challenges=dns \
  -d yourdomain.com \
  -d "*.yourdomain.com"

# Sigue instrucciones:
# 1. Agrega record TXT a DNS
# 2. Espera propagación
# 3. Presiona Enter

# Auto-renew
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

---

### Fase 4: Configurar DNS

#### 4.1 Apuntar Dominio
En tu proveedor DNS (GoDaddy, Namecheap, Route 53, etc.):

```dns
Registros A:
  yourdomain.com        → 203.0.113.1 (IP de EC2)
  *.yourdomain.com      → 203.0.113.1 (wildcard)

Registros MX (opcional):
  yourdomain.com        → mail.yourdomain.com
```

**Propagación**: 24-48 horas típicamente

#### 4.2 Verificar DNS
```bash
# En terminal local:
nslookup tenant1.yourdomain.com
# Debería retornar: 203.0.113.1

dig tenant1.yourdomain.com
# Debería mostrar: A record pointing to IP
```

---

### Fase 5: Crear Primer Tenant

#### 5.1 Ejecutar Script de Inicialización
```bash
cd /home/ubuntu/cenplus

# Crear tenant1
DATABASE_URL="postgresql://..." \
node scripts/init-tenant.js tenant1

# Output:
# ✅ Esquema y datos inicializados para tenant: tenant1
```

#### 5.2 Verificar en BD
```bash
# Conectar a RDS
psql -h cenplus-prod.abc123.us-east-1.rds.amazonaws.com \
     -U cenplus_app \
     -d cenplus_db

# Ver esquemas
\dn

# Conectar a tenant1
SET search_path TO tenant1, public;

# Ver tablas
\dt

# Ver admins
SELECT email, nombre, role FROM admins;

# Output:
#      email       |  nombre      |    role
# -----------------+--------------+---------------
#  admin@cenplus.com | Administrador | administrador
```

---

### Fase 6: Pruebas

#### 6.1 Test de Acceso
```bash
# Desde tu máquina local:

# Test 1: GET home
curl https://tenant1.yourdomain.com/
# Debería retornar: página login

# Test 2: Login
curl -X POST https://tenant1.yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@cenplus.com",
    "password": "admin123",
    "tenant": "tenant1"
  }'
# Debería retornar: JWT token

# Test 3: Get ciudadanos
TOKEN="eyJ..." # Del test anterior
curl -X GET https://tenant1.yourdomain.com/api/ciudadanos \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant: tenant1"
# Debería retornar: { data: [], count: 0 }
```

#### 6.2 Test de Aislamiento
```bash
# Crear 2 tenants
DATABASE_URL="..." node scripts/init-tenant.js tenant1
DATABASE_URL="..." node scripts/init-tenant.js tenant2

# Agregar datos diferentes
# (Por UI o script)

# Probar:
# - Login como tenant1 → ver datos tenant1
# - Login como tenant2 → ver datos tenant2
# - Intentar acceder a tenant1.url con JWT de tenant2 → 403 Forbidden
```

---

## Casos de Uso

### 1. SaaS de Gestión Municipal
**Escenario:** Diferentes municipios usan CenPlus

```
medellín.cenplus.com      → Datos de Medellín
bogotá.cenplus.com        → Datos de Bogotá
cali.cenplus.com          → Datos de Cali
...
```

**Beneficio:** 1 codebase, 100 ciudades, 1 servidor

---

### 2. Aplicación para Organizaciones
**Escenario:** Diferentes ONG usan tu app

```
ong-a.myapp.com           → Datos ONG-A
ong-b.myapp.com           → Datos ONG-B
```

**Beneficio:** Escalable, bajo costo

---

### 3. Plataforma de Encuestas
**Escenario:** Clientes corporativos hacen encuestas

```
cliente1.encuestas.com    → Encuestas cliente 1
cliente2.encuestas.com    → Encuestas cliente 2
```

**Beneficio:** Cada cliente ve solo sus datos

---

## Costos Estimados

### Por Número de Clientes

| Clientes | BD (RDS) | App (EC2) | DNS | Total/mes | Costo/cliente |
|----------|----------|----------|-----|-----------|---------------|
| 10       | $100     | $150     | $10 | $260      | $26/mes       |
| 50       | $150     | $200     | $10 | $360      | $7/mes        |
| 100      | $200     | $300     | $10 | $510      | $5/mes        |
| 500      | $300     | $500     | $10 | $810      | $1.60/mes     |
| 1000     | $500     | $1000    | $10 | $1510     | $1.50/mes     |

### Desglose de Costos

```
AWS RDS PostgreSQL:
- Pequeño (t3.small):     ~$50/mes
- Mediano (t3.medium):    ~$150/mes
- Largo (t3.large):       ~$300/mes
- Producción (multi-AZ):  +50% cost

AWS EC2 (App):
- t3.micro:              ~$10/mes
- t3.small:              ~$25/mes
- t3.medium:             ~$50/mes
- t3.large:              ~$100/mes
- Escalado automático:   +100 instancias = +$3000/mes

Otros:
- CloudFlare (CDN):      $20-200/mes
- Route 53 (DNS):        $1/mes
- Monitoring (Datadog):  $15-100/mes
- Backups S3:            ~$1/mes
```

### Pricing de Clientes

Sugerencias de monetización:

```
Modelo Freemium:
- Gratis: 100 ciudadanos/mes
- Pro: $50/mes → 10,000 ciudadanos
- Enterprise: Custom

ROI en 100 clientes:
- Ingresos: 50 Pro × $50 = $2500/mes
- Costos: ~$500/mes
- Ganancia: $2000/mes (75% margen)
```

---

## Resumen: Checklist Final

### Antes de Lanzar
- [ ] BD está en RDS multi-AZ
- [ ] App está en EC2 con nginx + PM2
- [ ] SSL certificado (Let's Encrypt wildcard)
- [ ] DNS apuntando a app
- [ ] Primer tenant creado y testeado
- [ ] Backups configurados (automated)
- [ ] Monitoring activo (CPU, BD, errores)
- [ ] Logs centralizados
- [ ] Rate limiting configurado
- [ ] Documentación hecha

### Maintenance Diaria
- [ ] Revisar logs de errores
- [ ] Monitorear uptime
- [ ] Revisar uso de recursos

### Maintenance Semanal
- [ ] Revisar backups (restaurar test)
- [ ] Revisar métricas performance

### Maintenance Mensual
- [ ] Actualizar dependencias security
- [ ] Revisar query performance
- [ ] Limpiar logs viejos

---

**¡Listo para producción!** 🚀

Para soporte: <support@cenplus.com>

Última actualización: 9 mayo 2026
