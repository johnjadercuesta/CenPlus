# Componentes

## Estructura de Componentes

Los componentes se encuentran en `src/components/` y se utilizan en las páginas del dashboard en `src/app/dashboard/`.

## Componentes Principales

### Sidebar.tsx
Navegación lateral del dashboard. Renderiza el menú basado en el rol del usuario autenticado.

**Props:** No acepta props (usa sesión del contexto)

**Dependencias:** 
- `next/link` para navegación
- Iconos de Lucide React

---

### FormularioCiudadano.tsx
Formulario para crear/editar ciudadanos. Maneja todos los campos del modelo Ciudadano.

**Props:**
- `onSubmit`: función a ejecutar al enviar
- `ciudadanoInicial`: datos para edición (opcional)

**Estados internos:**
- Datos del formulario
- Carga de coordenadas desde dirección

---

### TablaCiudadanos.tsx
Tabla paginada para mostrar lista de ciudadanos.

**Props:**
- `ciudadanos`: array de ciudadanos
- `total`: total de registros
- `page`: página actual
- `onPageChange`: cambio de página
- `onEdit`, `onDelete`: callbacks

---

### MapaCalor.tsx
Mapa de calor usando leaflet.heat para visualizar密度 de ciudadanos.

**Props:**
- `ciudadanos`: array con latitud, longitud
- `meta`: meta de votos (opcional)

---

### DrawingMap.tsx
Mapa interactivo que permite dibujar polígonos para definir sectores.

**Props:**
- `bounds`: límites iniciales
- `onDrawComplete`: callback al terminar de dibujar

---

### GestionSectores.tsx
Panel de administración de sectores con CRUD completo.

**Props:** No acepta props

---

### GestionLideres.tsx
Panel de administración de líderes/usuarios del sistema.

**Props:** No acepta props

---

### KPICard.tsx
Card reutilizable para mostrar indicadores en el dashboard.

**Props:**
- `title`: título del indicador
- `value`: valor numérico
- `icon`: icono de Lucide
- `color`: color del borde (opcional)

---

### ArchivoSelector.tsx
Componente para seleccionar archivos electorales archivados.

**Props:**
- `onSelect`: callback al seleccionar archivo

---

### GraficoTendencias.tsx
Gráfico de tendencias usando Recharts.

**Props:**
- `data`: datos para graficar

---

### TrendsDashboard.tsx
Dashboard de inteligencia territorial.

---

### TrendsMap.tsx, TrendsChart.tsx, TrendsSearch.tsx
Componentes para el módulo de inteligencia territorial.

---

### InteligenciaTerritorial.tsx
Componente principal del módulo de inteligencia.

---

### MapaInteligencia.tsx
Mapa especializado para inteligencia territorial.

---

## Patrones de Uso

### Fetching de Datos
Los componentes usan `useEffect` para cargar datos desde las APIs:

```typescript
useEffect(() => {
  fetch('/api/endpoint').then(res => res.json()).then(setData);
}, []);
```

### Manejo de Formularios
Formularios controlados con estado local:

```typescript
const [formData, setFormData] = useState({...});
const handleChange = (e) => {
  setFormData({...formData, [e.target.name]: e.target.value});
};
```

### Componentes Cliente
Todos los componentes que usan hooks deben tener `'use client'` al inicio.

---

## Integración conPáginas

Los componentes se importan en las páginas de `src/app/dashboard/[modulo]/page.tsx`:

```typescript
import Componente from '@/components/Componente';

export default function Pagina() {
  return <Componente />;
}
```