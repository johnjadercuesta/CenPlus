# 🧠 Sistema de Inteligencia Poblacional (SIP)

## Descripción

El **Sistema de Inteligencia Poblacional (SIP)** es una solución avanzada que reemplaza los análisis de "Inteligencia de Mercado" mockeados con inteligencia **REAL** basada en:

1. **Datos de Redes Sociales**: Monitoreo de Facebook, Twitter/X, Instagram
2. **Datos Web**: Análisis de tendencias en Google, búsquedas, noticias
3. **Datos Censales**: Información de población del DANE (Departamento Nacional de Estadística)
4. **Datos Gubernamentales**: Mensajes de entidades públicas

## 🏗️ Arquitectura SIP - FASE 1

### Componentes Creados

#### 1. **algorithmEngine.ts** (`src/lib/algorithmEngine.ts`)
Motor de cálculo del SIP que transforma menciones web en "puntajes de urgencia":

```typescript
// Fórmula SIP:
Urgency = (Mentions / Adult_Population) × Weight × Decay × Multiplier × 100

// Resultado: 0-100 (escala de urgencia)
```

**Características:**
- Diccionario de 20+ palabras clave con pesos 1-10
- Categorías: Seguridad, Salud, Servicios, Empleo, Política
- Decay factor: Menciones antiguas pierden relevancia
- Multiplier: Factor de amplificación según categoría

#### 2. **demographicAnalysis.ts** (`src/lib/demographicAnalysis.ts`)
Implementa el **CRUCE DEMOGRÁFICO** del SIP:

```typescript
// Relaciona:
Menciones de Red Social + Datos de DANE = Impacto Social Real
```

**Funciones principales:**
- `getDemographicProfile()`: Obtiene población de municipio
- `analyzeAndStoreDemographicCrossing()`: Calcula impacto y guarda en BD
- `updateAdminPriorityMatrix()`: Genera ranking de municipios
- `getActiveCrisisByMunicipio()`: Crisis actuales por ubicación
- `getCriticalMunicipalities()`: Municipios que requieren acción

#### 3. **Tablas de BD** (Script: `scripts/init-sip-tables.js`)

```sql
-- Diccionario de palabras clave con urgencia
keyword_weights:
  - keyword (ej: "homicidio")
  - urgency_weight (1-10)
  - category (seguridad, salud, etc)
  - multiplier (factor de amplificación)

-- Cruce web + censo + urgencia
demographic_crossing:
  - municipio, departamento
  - keyword, category
  - mention_count, urgency_score
  - adult_population, impact_ratio
  - decision_level (critical|high|medium|low)
  - trending_direction (up|down|stable)
  - confidence (0-1)

-- Matriz ejecutiva de decisión
admin_priority_matrix:
  - municipio, departamento
  - max_urgency_score
  - crisis_count (cuántas crisis críticas)
  - trending_up_count (empeorando)
  - priority_rank (1=más urgente)
  - admin_action_required (bool)
```

#### 4. **API Endpoints**

```
GET /api/intelligence/init-sip
  - Inicializa tablas SIP
  - Puebla con datos de prueba
  - Solo administrador

GET /api/intelligence/sip-report?dashboard=true
  - Retorna Matriz de Priorización
  - Top 10 municipios por urgencia
  - Resumen ejecutivo

GET /api/intelligence/sip-report?municipio=Bogotá
  - Retorna crisis específicas del municipio
  - Palabras clave, urgencia, tendencia
  - Recomendación de acción
```

#### 5. **Componente UI: SIPPriorityMatrix** (`src/components/SIPPriorityMatrix.tsx`)

Visualización interactiva de:
- ✅ Tabla de municipios prioritarios
- ✅ Colores por nivel de urgencia (rojo/naranja/amarillo)
- ✅ Indicadores de tendencia (📈📉➡️)
- ✅ Símbolos de acción requerida (🚨⚠️👁️ℹ️)
- ✅ Detalles por clic

#### 6. **Página Dashboard** (`src/app/dashboard/inteligencia-sip/page.tsx`)

Acceso en sidebar: **🧠 Sistema SIP** (solo admin)

## 🚀 Cómo Iniciar

### 1. Inicializar Tablas y Datos

```bash
# Ejecutar en el navegador (solo admin):
curl "http://localhost:3000/api/intelligence/init-sip" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Respuesta esperada:
{
  "status": "success",
  "message": "SIP inicializado correctamente",
  "stats": {
    "cross_analyzed": 50,
    "municipios_processed": 10,
    "keywords_in_dictionary": 5
  }
}
```

### 2. Acceder al Dashboard

1. **Solo para administradores**
2. Navega a: `/dashboard/inteligencia-sip`
3. Verás la **Matriz de Priorización Administrativa**

### 3. Ver Crisis Específicas

- Haz clic en cualquier municipio
- Se muestran las crisis actuales con:
  - Nota: Urgencia (0-100)
  - 📈📉➡️ Tendencia
  - 🚨⚠️👁️ℹ️ Acción requerida

## 📊 Niveles de Urgencia

| Score | Nivel | Color | Acción | Tiempo |
|-------|-------|-------|--------|--------|
| 80-100 | CRÍTICA | 🔴 Rojo | Inmediata | < 2 horas |
| 60-79 | ALTA | 🟠 Naranja | Prioritaria | < 24 horas |
| 40-59 | MEDIA | 🟡 Amarillo | Monitoreo | 48 horas |
| 0-39 | BAJA | 🟢 Verde | Informativo | — |

## 🔑 Diccionario de Palabras Clave (Fase 1)

### SEGURIDAD (Prioridad 1)
- homicidio (10/10, multiplier: 3.0)
- asesinato (10/10, multiplier: 3.0)
- violencia (9/10, multiplier: 2.5)
- pandilla (9/10, multiplier: 2.5)
- inseguridad (8/10, multiplier: 2.0)

### SERVICIOS (Prioridad 1)
- falta agua (9/10, multiplier: 2.5)
- corte agua (9/10, multiplier: 2.5)
- apagón (8/10, multiplier: 2.0)

### SALUD (Prioridad 1)
- hambre (10/10, multiplier: 3.0)
- desnutrición (9/10, multiplier: 2.5)
- epidemia (10/10, multiplier: 3.0)

### EMPLEO (Prioridad 2)
- desempleo (7/10, multiplier: 1.5)
- paro (7/10, multiplier: 1.5)
- protesta (8/10, multiplier: 2.0)

### POLÍTICA (Prioridad 2)
- elecciones (6/10, multiplier: 1.3)

## 📈 Indicadores de Tendencia

- **📈 Empeorando**: Menciones aumentaron >15% en 24h
- **📉 Mejorando**: Menciones disminuyeron >15% en 24h
- **➡️ Estable**: Variación < 15%

## 🎯 Acciones Administrativas

- **🚨 INMEDIATA**: crisis_count > 0 (requiere acción < 2h)
- **⚠️ PRIORITARIA**: trending_up_count > 2 (< 24h)
- **👁️ SEGUIMIENTO**: Monitoreo activo (48h)
- **ℹ️ INFORMATIVO**: Solo información

## 🔧 FASE 2 (Próximas Mejoras)

```typescript
// En desarrollo:
1. API Real de Meta (Ads Library) - reemplazar mock
2. API Real de Google Trends - reemplazar mock
3. Scraper de Datos Gubernamentales - DANE, Min Salud
4. PostGIS Geo-Mapping - calor de crisis por zona geográfica
5. Reportes PDF - Matriz de Priorización imprimible
6. Alertas Push - notificaciones cuando crisis sube a CRÍTICA
```

## 💾 Datos de Prueba

El sistema se inicializa con 50 registros de prueba que hacen cruce de:
- 10 municipios colombianos
- 5 palabras clave de prueba
- Datos de población reales de DANE
- Scores de urgencia simulados

## 🔐 Seguridad

- ✅ Solo administradores pueden ver SIP
- ✅ Todos los endpoints requieren Bearer token
- ✅ Token validado en cada request
- ✅ Log de auditoría en init-sip

## 🐛 Troubleshooting

**P: "No hay datos disponibles"**
- A: Ejecuta `GET /api/intelligence/init-sip` primero

**P: "Error 403 al acceder"**
- A: Solo administradores pueden ver SIP

**P: "Tabla no existe"**
- A: Verifica que `init-sip-tables.js` haya corrido exitosamente

## 📞 Soporte

Para implementar Fases 2-4 del SIP (Meta API, Gov Scraper, PostGIS), contacta al equipo de desarrollo.

---

**Sistema SIP v1.0** | Cenplus Inteligencia Territorial | 2024
