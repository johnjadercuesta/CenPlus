# ✅ CHECKLIST: PRÓXIMOS PASOS PARA EJECUTAR

## 🎯 PRIORIDAD ALTA (Ejecutar Hoy)

### 1. ✋ Inicializar Base de Datos
**Estado:** ⏳ PENDIENTE  
**Comando:**
```bash
node scripts/init-phase2-4-tables.js
```
**Verifica:**
- [ ] 11 tablas creadas
- [ ] 2 vistas SQL creadas
- [ ] Índices en lugar
- [ ] Output: "Database schema initialized successfully"

**Por qué:** Sin esto, los scrapers NO pueden almacenar datos.

---

### 2. ✋ Configurar Variables de Entorno
**Estado:** ⏳ PENDIENTE  
**Archivo:** `.env.local`  
**Agregar:**
```env
# Meta Ads Library (FASE 2)
META_BUSINESS_TOKEN=tu_business_token_aqui
META_BUSINESS_ACCOUNT_ID=tu_account_id_aqui

# SendGrid (FASE 4 - Emails)
SENDGRID_API_KEY=SG.xxxxxxxx
SENDGRID_FROM_EMAIL=noreply@miorg.com

# Twilio (FASE 4 - SMS)
TWILIO_ACCOUNT_SID=ACxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890

# WebSocket (FASE 4 - Tiempo Real)
NEXT_PUBLIC_WS_URL=ws://localhost:3000

# Firebase (FASE 4 - Push)
FIREBASE_PROJECT_ID=project_id
FIREBASE_MESSAGING_KEY=xxxxxxxx
```

**Nota:** Usa mock data si no tienes credenciales reales aún.

---

### 3. ✋ Probar Endpoint phase2-start
**Estado:** ⏳ PENDIENTE  
**Método:** POST  
**URL:** `http://localhost:3000/api/intelligence/phase2-start`  
**Header:**
```
Authorization: Bearer YOUR_ADMIN_JWT_TOKEN
Content-Type: application/json
```
**Body:**
```json
{
  "municipios": ["Bogotá", "Medellín"],
  "keywords": ["homicidio", "desempleo"],
  "use_mock": true
}
```

**Resultado Esperado:**
```json
{
  "status": "success",
  "data_collected": {
    "meta": 45,
    "google_trends": 20,
    "government": 30,
    "total": 95
  },
  "municipalities_processed": 2,
  "consolidated_records": 8,
  "new_gaps_identified": 3
}
```

---

### 4. ✋ Crear Dashboard Pages para Componentes
**Estado:** ⏳ PENDIENTE

#### Página 1: Gap Analysis Dashboard
**Archivo:** `src/app/dashboard/analisis-brecha/page.tsx`
```tsx
'use client';
import GapAnalysisReport from '@/components/GapAnalysisReport';

export default function GapAnalysisDashboard() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Análisis de Brecha Política</h1>
      <GapAnalysisReport />
    </div>
  );
}
```

#### Agregar a Sidebar
**Archivo:** `src/components/Sidebar.tsx`  
**Agregar línea:**
```tsx
<NavItem href="/dashboard/analisis-brecha" icon="📊" label="Brecha Política" adminOnly />
```

---

## 🎯 PRIORIDAD MEDIA (Esta Semana)

### 5. ✋ Habilitar PostGIS
**Estado:** ⏳ PENDIENTE  
**Por qué:** Heat maps necesitan funciones geográficas

**Comandos SQL:**
```sql
-- Conectar a BD
\c cenplus_db

-- Crear extensión
CREATE EXTENSION postgis;

-- Verificar
SELECT PostGIS_version();

-- Convertir column location en GEOMETRY
ALTER TABLE crisis_heatmap 
  ADD COLUMN location GEOMETRY(POINT, 4326);

-- Crear índice geo
CREATE INDEX idx_crisis_heatmap_location 
  ON crisis_heatmap USING GIST(location);
```

---

### 6. ✋ Integrar Alertas en phase2-start
**Estado:** ⏳ PENDIENTE  
**Archivo:** `src/app/api/intelligence/phase2-start/route.ts`  
**Cambios:**
```typescript
import { createAndSendAlert } from '@/lib/alertingService';

// Al final del orchestration, agregar:
if (consolidatedData.urgency_score >= 80) {
  const alertId = await createAndSendAlert({
    municipio: municipio,
    keyword: keyword,
    urgency_score: consolidatedData.urgency_score,
    recommendation: generateRecommendation(consolidatedData),
    channels: ['email', 'sms'] // Alertas a admin
  });
  
  alerts.push(alertId);
}

// Retornar info de alertas
response.alerts_created = alerts.length;
```

---

### 7. ✋ Crear Admin Panel para Alertas
**Estado:** ⏳ PENDIENTE  
**Archivo:** `src/app/dashboard/alertas/page.tsx`
```tsx
'use client';
import { useEffect, useState } from 'react';

export default function AlertasPanel() {
  const [alerts, setAlerts] = useState([]);
  
  useEffect(() => {
    fetch('/api/intelligence/alerts?status=pending')
      .then(r => r.json())
      .then(d => setAlerts(d))
      .catch(e => console.error('Error loading alerts:', e));
  }, []);
  
  return (
    <div className="p-6">
      <h1>Alertas Pendientes ({alerts.length})</h1>
      <table className="w-full">
        <thead>
          <tr>
            <th>Municipio</th>
            <th>Palabla Clave</th>
            <th>Urgencia</th>
            <th>Canal</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
          {alerts.map(a => (
            <tr key={a.id} className="border-b">
              <td>{a.municipio}</td>
              <td>{a.keyword}</td>
              <td>{a.urgency_score}/100</td>
              <td>{a.sent_via}</td>
              <td>
                <button onClick={() => handleAcknowledge(a.id)}>
                  ✓ Reconocer
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

### 8. ✋ Crear Panel de Webhooks
**Estado:** ⏳ PENDIENTE  
**Archivo:** `src/app/dashboard/webhooks/page.tsx`
```tsx
'use client';

export default function WebhooksPanel() {
  // Listar webhooks activos
  // Crear nuevo webhook
  // Ver log de entregas
  // Revisar fallos y reintentos
}
```

---

## 🎯 PRIORIDAD BAJA (Próximas 2 Semanas)

### 9. ✋ Optimizar Scrapers
**Estado:** ⏳ NO INICIADO

- [ ] Agregar paralelización en El (Promise.all)
- [ ] Caché Redis para Google Trends
- [ ] Rate limiting en Meta API
- [ ] Fallback graceful si APIs caen
- [ ] Logging detallado de errores

---

### 10. ✋ Agregar Validaciones de Seguridad
**Estado:** ⏳ NO INICIADO

- [ ] Rate limiting global (100 req/min)
- [ ] Validación de JWT en todos los endpoints
- [ ] CORS restrictivo
- [ ] Sanitización de inputs
- [ ] Cifrado de números de teléfono en SMS log

---

### 11. ✋ Crear Tests
**Estado:** ⏳ NO INICIADO
```bash
# Unit tests para scrapers
npm test -- src/lib/metaScraper.test.ts
npm test -- src/lib/googleTrendsScraper.test.ts

# Integration tests
npm test -- src/app/api/intelligence/

# E2E con Playwright
npx playwright test
```

---

### 12. ✋ Documentación para Usuarios
**Estado:** ⏳ NO INICIADO

- [ ] Crear FAQ sobre cómo usar Gap Analysis
- [ ] Documentar cómo configurar webhooks
- [ ] Video tutorial para admin
- [ ] Guía de troubleshooting de alertas

---

## 📊 MATRIZ DE DEPENDENCIAS

```
1. Init BD ────────┐
                   ├─→ 3. Test phase2-start ──┐
2. .env.local ─────┤                           ├─→ 6. Integrar Alertas ──┐
                   ├─→ 5. PostGIS enable ─────┤                         ├─→ PRODUCCIÓN
4. Create Pages ───┤                           └─→ 7. Admin Alertas ─────┤
                   │                                                      ├─→ TESTING
                   └─→ 8. Webhooks Panel ─────────────────────────────┘

Bloqueadores:
- (1) bloquea a (3, 5, 6)
- (2) bloquea a (3)
- (4) bloquea a UI
```

---

## 🔄 CICLO DE VALIDACIÓN

### Paso 1: BD Inicializada ✅
```bash
psql -c "\dt" | grep admin_alerts
# Output: admin_alerts, webhook_subscriptions, etc.
```

### Paso 2: Endpoint Funciona ✅
```bash
curl -X POST http://localhost:3000/api/intelligence/phase2-start \
  -H "Authorization: Bearer <token>" 
# Output: JSON con estadísticas
```

### Paso 3: Datos en BD ✅
```bash
psql -c "SELECT COUNT(*) FROM consolidated_intelligence;"
# Output: > 0
```

### Paso 4: UI Renderiza ✅
```bash
# Visitar http://localhost:3000/dashboard/analisis-brecha
# Debería mostrar gráficos con datos
```

### Paso 5: Alertas Llegan ✅
```bash
# Ajustar urgency_score a >= 80
# Verificar email en correo admin
# Verificar SMS en teléfono admin
```

---

## 📞 SOLUCIÓN DE PROBLEMAS

### Si init-phase2-4-tables.js falla:
```bash
# Verificar conexión PostgreSQL
psql -U usuario -d cenplus_db -c "SELECT 1"

# Limpiar si es necesario
psql -c "DROP TABLE IF EXISTS admin_alerts CASCADE;"

# Reintentar
node scripts/init-phase2-4-tables.js
```

### Si scrapers retornan 0 datos:
- [ ] ¿Está la BD inicializada?
- [ ] ¿Están las credenciales en .env?
- [ ] ¿Están los servidores externos disponibles?
- [ ] Activar mock data: `use_mock: true` en request

### Si alertas no llegan por email:
- [ ] Verificar API key de SendGrid
- [ ] Verificar correo del remitente
- [ ] Revisar logs: `SELECT * FROM admin_alerts WHERE status='sent'`

### Si WebSocket no conecta:
- [ ] Verificar NEXT_PUBLIC_WS_URL
- [ ] Verificar que servidor Next está corriendo
- [ ] Revisar browser console para errores

---

## 📋 RESUMEN EJECUTIVO

**Total de tareas:** 12  
**Bloqueadores:** 3 (BD, .env, credenciales)  
**Horas estimadas:** 8-12 horas (distribuidas)

**Secuencia recomendada:**
1. **Hoy (2 horas):** Tasks 1-4 (BD, config, test básico)
2. **Mañana (3 horas):** Tasks 5-8 (PostGIS, páginas, administración)
3. **Esta semana (3-4 horas):** Tasks 9-12 (Optimización, seguridad, tests)

---

**Generado:** 2024-04-04  
**Estado:** 🟢 LISTO PARA COMENZAR  
**Fase Actual:** 2, 3, 4 (Implementación Completa)
