# CenPlus - Sistema de Gestión de Censos Electorales

CenPlus es una aplicación web para la gestión de censos electorales, permitiendo el registro de ciudadanos, visualización de datos demográficos en mapas de calor, gestión de líderes comunitarios y análisis territorial.

## Características

### Módulos Principal

- **Ciudadanos**: Registro, edición, eliminación e importación/exportación de datos de ciudadanos con información completa (demográfica, ubicación, líder asignado).
- **Sectores**: Gestión de barrios y zonas geográficas con polígonos y coordenadas para visualización en mapas.
- **Líderes**: Sistema de gestión de líderes comunitarios con roles diferenciados (administrador, estratega, líder, analista).
- **Dashboard**: Panel principal con KPIs, estadísticas en tiempo real y gráficos de distribución.
- **Mapas**: Visualización interactiva con mapas de calor, drawing de zonas y localization.
- **Archivos**: Versionado de datos electorales con restauración y comparación.
- **Inteligencia Territorial**: Análisis de tendencias, gráficos de redes sociales y visualización de problematicas sociales.
- **Configuración**: Opciones del sistema y gestión de usuarios.

### Autenticación

- Sistema de autenticación basado en JWT
- Roles: administrador, estratega, líder, analista
- Control de acceso por rol en cada endpoint

## Tecnologías

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Maps**: Leaflet, react-leaflet, leaflet.heat
- **Backend**: Next.js API Routes
- **Base de Datos**: PostgreSQL (via pg)
- **Auth**: JWT, bcryptjs
- **Gráficos**: Recharts
- **Excel**: xlsx para importación/exportación
- **Correo**: SendGrid
- **SMS**: Twilio

## Estructura del Proyecto

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   │   ├── auth/          # Autenticación
│   │   ├── ciudadanos/    # Gestión de ciudadanos
│   │   ├── sectores/     # Gestión de sectores
│   │   ├── lideres/      # Gestión de líderes
│   │   ├── archivos/     # Versionado de archivos
│   │   ├── territorio/   # Datos territoriales
│   │   └── trendsmap/     # Inteligencia territorial
│   ├── dashboard/        # Páginas del dashboard
│   └── layout.tsx        # Layout principal
├── components/            # Componentes React
│   ├── Sidebar.tsx       # Navegación lateral
│   ├── FormularioCiudadano.tsx
│   ├── TablaCiudadanos.tsx
│   ├── MapaCalor.tsx
│   ├── DrawingMap.tsx
│   ├── GestionSectores.tsx
│   └── ...
├── lib/                  # Utilidades
│   ├── db.ts             # Conexión PostgreSQL
│   ├── auth.ts           # Funciones de auth
│   ├── geoData.ts        # Datos geográficos
│   └── ...
└── types/                # TypeScript types
    ├── ciudadano.ts
    └── trends.ts
```

## Modelos de Datos Principales

### Ciudadano
-.id_unico: string (cédula)
- nombre_completo: string
- telefono: string
- sexo: Masculino | Femenino | Otro
- edad: number
- nivel_estudios: Ninguno | Primaria | Secundaria | Técnico | Universitario | Posgrado
- ocupacion: string
- regimen_salud: Subsidiado | Contributivo | Ninguno | Otro
- puesto_votacion: string
- zona: urbana | rural
- id_comuna, id_barrio
- es_lider: boolean
- lider_id: number
- latitud, longitud

### Lider
- id, email, nombre
- role: administrador | estratega | lider | analista
- activo: number

### Sector
- id, nombre, meta, zona
- latitud, longitud, radio
- poligono: coordenadas geoJSON
- activo: number

## Instalación

1. **Instalar dependencias**:
```bash
npm install
```

2. **Configurar variables de entorno**:
Crear `.env` con:
```
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
JWT_SECRET=tu_secret_aqui
```

3. **Iniciar**:
```bash
npm run dev
```

4. **Acceder**: http://localhost:3000

## Scripts Disponibles

- `npm run dev` - Servidor de desarrollo
- `npm run build` - Build de producción
- `npm run start` - Iniciar producción
- `npm run lint` - Linting

## Licencia

Proprietario - Uso privado