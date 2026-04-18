# Arquitectura de CenPlus

## Visión General

CenPlus es una aplicación web full-stack construida sobre Next.js 14 utilizando el patrón App Router. La arquitectura sigue los principios de una aplicación serverless con API routes integradas.

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 14, React 18, TypeScript |
| Estilos | Tailwind CSS |
| Mapas | Leaflet, react-leaflet |
| Backend | Next.js API Routes |
| Base de datos | PostgreSQL |
| ORM/Conexión | pg (node-postgres) |
| Auth | JWT + bcryptjs |

## Estructura de Capas

### 1. Capa de Presentación (`src/app/dashboard`, `src/components`)

Components React que renderizan la interfaz de usuario. Utilizan:
- Componentes propios para formularios, tablas, mapas
- Fetching de datos directamente desde APIs internas
- Estado local con useState/useEffect

### 2. Capa de API (`src/app/api`)

Next.js Route Handlers que exponen endpoints REST:
- Autenticación: `/api/auth/*`
- Ciudadanos: `/api/ciudadanos/*`
- Líderes: `/api/lideres/*`
- Sectores: `/api/sectores/*`
- Archivos: `/api/archivos/*`
- Territorio: `/api/territorio/*`
- Trendsmap: `/api/trendsmap/*`

Cada endpoint implementa:
- Validación de sesión JWT
- Control de acceso por rol
- Conexión directa a PostgreSQL

### 3. Capa de Datos (`src/lib/db.ts`)

Pool de conexiones PostgreSQL compartido. Cada request crea una conexión del pool.

## Flujo de Autenticación

1. Usuario envía email + password a `/api/auth/login`
2. Servidor verifica credenciales contra tabla `administradores`
3. Si válido, genera JWT con payload {userId, role}
4. JWT se almacena en cookie HTTP-only
5. Cada request subsiguiente incluye la cookie
6. Middleware o función `auth.ts` valida el JWT
7. Si válido, inyecta info del usuario en el request

## Control de Acceso por Rol

| Rol | Permisos |
|----|----------|
| administrador | CRUD total, gestión usuarios, sectores |
| estratega | Crear sectores, ver todas las estadísticas |
| lider | Solo gestionar sus propios ciudadanos |
| analista | Solo lectura de datos |

## Modelo de Datos

### Tablas Principales

```sql
-- Líderes/Usuarios
administradores (id, email, password, nombre, role, activo, created_at)

-- Citizens
ciudadanos (id, id_unico, nombre_completo, telefono, sexo, edad,
            nivel_estudios, ocupacion, regimen_salud, puesto_votacion,
            zona, id_comuna, id_barrio, barrio, corregimiento, vereda,
            es_lider, nombre_lider, lider_id, latitud, longitud, 
            created_at, updated_at)

-- Sectores/Zonas
sectores (id, nombre, votos_historicos, meta, zona, latitud, longitud, 
         radio, poligono, activo, descripcion)
```

### Tablas Territoriales

```sql
comunas (id, nombre, tipo)
barrios (id, nombre, comuna_id, tipo)
puestos_votacion (id, nombre, comuna_id, votos_historicos)
problematicas_sociales (id, nombre)
```

### Tablas de Inteligencia

```sql
archivos (id, nombre, total_registros, checksum, created_at, activo)
tendencias (id, query, count, sentiment, fuente, created_at)
```

## Patrones de Código

### API Route
```typescript
// src/app/api/recurso/route.ts
import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { auth } from '@/lib/auth';

export async function GET(request: Request) {
  const user = await auth(request);
  if (!user) return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  
  const result = await pool.query('SELECT * FROM tabla');
  return NextResponse.json(result.rows);
}
```

### Componente with Data
```typescript
// src/components/Componente.tsx
'use client';
import { useEffect, useState } from 'react';

export default function Componente() {
  const [data, setData] = useState([]);
  
  useEffect(() => {
    fetch('/api/recurso').then(res => res.json()).then(setData);
  }, []);
  
  return (...);
}
```

### Type Definition
```typescript
// src/types/recurso.ts
export interface Recurso {
  id: number;
  nombre: string;
  // ...
}
```

## Variables de Entorno Requeridas

| Variable | Descripción |
|----------|-------------|
| DATABASE_URL | Connection string PostgreSQL |
| JWT_SECRET | Clave secreta para JWT |
| NEXT_PUBLIC_API_URL | URL de la API (opcional) |

## Consideraciones de Producción

- La aplicación corre en modo serverless (Vercel) o servidor tradicional (Node.js)
- PostgreSQL debe estar accesible desde el entorno de producción
- Las cookies de auth deben tener `HttpOnly`, `Secure`, `SameSite`
- Considerar caching para endpoints de estadísticas
- Las coordenadas geográficas usan sistema WGS84