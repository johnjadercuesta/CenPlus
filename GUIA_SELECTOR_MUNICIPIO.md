# 📍 GUÍA: SELECTOR DE MUNICIPIO/CIUDAD

## ¿Qué es?

El **Selector de Municipio** es una herramienta que te permite personalizar todos los datos del sistema para tu ciudad específica. Una vez selecciones tu municipio, todos los análisis, tendencias, alertas y reportes se filtrarán automáticamente para mostrar solo información relevante a tu ubicación.

---

## 🎯 Ubicaciones del Selector

### 1. **Sidebar (Acceso Rápido)**
- Ubicación: Parte superior del menú lateral izquierdo
- Estilo: Compacto con dropdown
- Uso: Cambio rápido desde cualquier página

### 2. **Página Dedicada de Municipios**
- Ubicación: `/dashboard/municipios`
- Acceso: Menú → "📍 Municipios"
- Estilo: Vista completa con detalles e información

---

## 🔄 Cómo Usar

### Paso 1: Selector Compacto (Sidebar)

```
┌─────────────────────────────┐
│ 📍 Bogotá                   │  ← Click aquí para abrir
│ Cundinamarca                │
└─────────────────────────────┘
```

**Al hacer clic:**
- Se abre un dropdown con opciones
- Puedes buscar una ciudad
- Puedes filtrar por departamento
- Selecciona cualquier municipio

### Paso 2: Página Completa (/dashboard/municipios)

1. **Vista Actual del Municipio**
   - Nombre, Departamento, Región
   - Población, Coordenadas
   - Info geo-espacial

2. **Selector Visual**
   - Grid con todas las ciudades principales
   - Búsqueda por nombre
   - Filtro por departamento
   - Click para seleccionar

3. **Información Útil**
   - Cómo funciona
   - Beneficios
   - Estadísticas de cobertura

---

## 📊 Municipios Disponibles

### Principales (15 ciudades)

| Ciudad | Departamento | Región | Población |
|--------|--------------|--------|-----------|
| Bogotá | Cundinamarca | Andina | 8.2M |
| Medellín | Antioquia | Andina | 2.5M |
| Cali | Valle del Cauca | Pacífica | 2.2M |
| Barranquilla | Atlántico | Caribe | 1.3M |
| Cartagena | Bolívar | Caribe | 978K |
| Bucaramanga | Santander | Andina | 518K |
| Santa Marta | Magdalena | Caribe | 498K |
| Ibagué | Tolima | Andina | 540K |
| Cúcuta | N. Santander | Andina | 756K |
| Armenia | Quindío | Andina | 274K |
| Villavicencio | Meta | Llanera | 491K |
| Montería | Córdoba | Caribe | 436K |
| Neiva | Huila | Andina | 344K |
| Tunja | Boyacá | Andina | 190K |
| Pasto | Nariño | Pacífica | 477K |

### Cobertura Geográfica

- **32 Departamentos** - Colombia completa
- **4 Regiones** - Andina, Caribe, Pacífica, Llanera
- **Expansible** - Fácil agregar más municipios

---

## 💾 Cómo Se Guarda

**Automático:**
- Se guarda en `localStorage` del navegador
- No requiere login adicional
- Persiste entre navegaciones
- Sincronizado en toda la aplicación

**Manual:**
- Puedes cambiar en cualquier momento
- No hay límite de cambios
- Los datos se recuperan al recargar

**Código:**
```javascript
// Guardar
localStorage.setItem('cenplus_municipio_seleccionado', JSON.stringify(municipio))

// Recuperar
const municipio = JSON.parse(localStorage.getItem('cenplus_municipio_seleccionado'))
```

---

## 🔗 Integración con el Sistema

### ¿Qué Se Filtra?

✅ **Tendencias & Monitoreo**
- Datos filtrados por tu municipio
- Palabras clave locales
- Sentimiento local

✅ **Dashboard Territorial**
- Mapa centrado en tu ciudad
- Información demográfica local
- Sectores y líderes de tu zona

✅ **Alertas & Reportes**
- Solo crisis de tu municipio
- Recomendaciones localizadas
- Análisis específico de tu región

✅ **Social Listening**
- Menciones en tu ciudad
- Trending topics locales
- Análisis de influencers

### ¿Qué NO Se Filtra?

❌ Datos administrativos (usuarios, configuración)
❌ Reportes nacionales
❌ Comparativas entre ciudades
❌ Estadísticas agregadas

---

## 🎨 Interfaz Visual

### Selector Compacto (Sidebar)

```
┌─────────────────────────────────────────┐
│ Municipio Selector (Compacto)           │
├─────────────────────────────────────────┤
│ [📍 Bogotá  ▼ Cundinamarca]             │
│                                         │
│ Al hacer click:                         │
│ ┌───────────────────────────────────┐   │
│ │ 🔍 Buscar ciudad...               │   │
│ │                                   │   │
│ │ DEPARTAMENTOS                     │   │
│ │ [Andina] [ Caribe ] [ Pacífica ]  │   │
│ │                                   │   │
│ │ CIUDADES                          │   │
│ │ ✓ Bogotá     [Bogotá]             │   │
│ │   Medellín                        │   │
│ │   Cali                            │   │
│ │   ...más                          │   │
│ └───────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

### Selector Completo (Página)

```
┌──────────────────────────────────────────────┐
│ 📍 Mis Municipios                           │
├──────────────────────────────────────────────┤
│                                              │
│ [Estadísticas del Municipio Actual]         │
│ ┌────────────┬────────────┬────────┬─────┐  │
│ │ Municipio  │ Departam.  │ Región │ Pop │  │
│ │ Bogotá     │ Cund.      │ Andina │ 8.2M│  │
│ └────────────┴────────────┴────────┴─────┘  │
│                                              │
│ [Selector Visual]                           │
│ 🔍 Buscar: ________________                │
│                                              │
│ Filtro: [Todos ▼]                          │
│                                              │
│ ┌─────┬─────┬─────┬─────┐                  │
│ │Bogotá│Medellín│Cali │...│                │
│ │  ✓  │      │    │    │                  │
│ └─────┴─────┴─────┴─────┘                  │
│                                              │
│ [Información: Cómo funciona | Beneficios]  │
└──────────────────────────────────────────────┘
```

---

## 🚀 Ejemplo de Uso

### Escenario 1: Cambio Rápido en el Dashboard

```
1. Estás en /dashboard
2. Ves el Sidebar con "📍 Bogotá"
3. Haces click
4. Se abre dropdown
5. Buscas "Medellín"
6. Haces click en "Medellín"
7. La página se actualiza
8. Ahora ves datos de Medellín
```

### Escenario 2: Exploración en Página Dedicada

```
1. Navegas a /dashboard/municipios
2. Ves tarjetas con info de Bogotá (actual)
3. Desplazas el grid de ciudades
4. Ves todas las ciudades disponibles
5. Haces click en "Cali"
6. Se actualiza la información
7. Ahora ves detalles de Cali
```

### Escenario 3: Persistencia

```
1. Estás en Bogotá
2. Cambias a Medellín en el Sidebar
3. Navega a otra página (/dashboard/tendencias)
4. Recarga la página (F5)
5. Sigue mostrando Medellín
6. Tu selección se mantuvo
```

---

## 🔧 Configuración Técnica

### Para Desarrolladores

**Hook personalizado:**
```typescript
import { useMunicipioSelector } from '@/lib/useMunicipioSelector';

function MiComponente() {
  const { municipioSeleccionado, cambiarMunicipio } = useMunicipioSelector();
  
  // ... usar municipioSeleccionado en tu lógica
}
```

**Escuchar cambios:**
```javascript
window.addEventListener('municipioChanged', (event) => {
  const municipio = event.detail.municipio;
  console.log('Nuevo municipio:', municipio);
});
```

**Datos disponibles:**
```typescript
interface Municipio {
  codigo: string;        // "11001" para Bogotá
  nombre: string;        // "Bogotá"
  departamento: string;  // "Cundinamarca"
  region: string;        // "Andina"
  poblacion: number;     // 8181047
  latitud: number;       // 4.7110
  longitud: number;      // -74.0055
}
```

---

## 📋 Checklist de Implementación

✅ Componente `MunicipioSelector.tsx` creado
✅ Hook `useMunicipioSelector.ts` creado
✅ Datos de municipios en `municipios-data.ts`
✅ Integración en Sidebar
✅ Página dedicada `/dashboard/municipios`
✅ Link en navegación del menú
✅ LocalStorage para persistencia
✅ Evento personalizado para cambios
✅ Íconos y estilos visuales
✅ Búsqueda y filtrado funcional

---

## 📞 Soporte

**¿Cómo cambio mi municipio?**
→ Haz click en el selector del Sidebar o ve a `/dashboard/municipios`

**¿Se guarda mi preferencia?**
→ Sí, se guarda automáticamente en localStorage

**¿Puedo ver datos de múltiples ciudades?**
→ Próximamente, veremos multi-select

**¿Cómo agrego más ciudades?**
→ Edita `src/lib/municipios-data.ts` y agrega a `MUNICIPIOS_EXPANDED`

---

**Creado:** 2024-04-04  
**Estado:** ✅ ACTIVO  
**Municipios disponibles:** 15 principales + 32 departamentos  
**Cobertura:** Colombia completa
