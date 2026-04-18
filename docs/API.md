# Referencia de API

## Autenticación

### POST /api/auth/login
Inicia sesión con email y password.

**Request:**
```json
{
  "email": "admin@correo.com",
  "password": "contrasena"
}
```

**Response:**
```json
{
  "token": "jwt_token",
  "user": { "id": 1, "email": "...", "nombre": "...", "role": "administrador" }
}
```

### GET /api/auth/me
Obtiene el usuario actual autenticado.

**Headers:** Cookie con JWT

**Response:**
```json
{ "id": 1, "email": "...", "nombre": "...", "role": "administrador" }
```

### POST /api/auth/logout
Cierra sesión.

---

## Ciudadanos

### GET /api/ciudadanos
Obtiene lista paginada de ciudadanos.

**Query Params:**
- `page`: número de página
- `limit`: registros por página
- `busqueda`: buscar por nombre o cédula
- `nivel_estudios`, `ocupacion`, `sexo`, `barrio`, `corregimiento`, `problemática`, `es_lider`: filtros
- `desde_archivo`: usar datos de archivo (boolean)

**Response:**
```json
{
  "data": [...ciudadanos],
  "total": 100,
  "page": 1,
  "limit": 50
}
```

### POST /api/ciudadanos
Crea nuevo ciudadano.

**Body:**
```json
{
  "id_unico": "12345678",
  "nombre_completo": "Juan Pérez",
  "telefono": "3001234567",
  "sexo": "Masculino",
  "edad": 35,
  "nivel_estudios": "Universitario",
  "ocupacion": "Ingeniero",
  "regimen_salud": "Contributivo",
  "puesto_votacion": "Centro",
  "zona": "urbana",
  "id_comuna": 1,
  "id_barrio": 1,
  "barrio": "Barrio 1",
  "es_lider": false,
  "lider_id": 1
}
```

### GET /api/ciudadanos/[id]
Obtiene ciudadano por ID.

### PUT /api/ciudadanos/[id]
Actualiza ciudadano.

### DELETE /api/ciudadanos/[id]
Elimina ciudadano.

### GET /api/ciudadanos/coords
Obtiene todos los ciudadanos con coordenadas para mapas.

---

## Líderes

### GET /api/lideres
Lista todos los líderes/usuarios. Requiere rol: administrador.

### POST /api/lideres
Crea nuevo líder. Requiere rol: administrador.

**Body:**
```json
{
  "email": "lider@correo.com",
  "password": "contrasena",
  "nombre": "Nombre Líder",
  "role": "lider"
}
```

### GET /api/lideres/[id]
Obtiene líder por ID.

### PUT /api/lideres/[id]
Actualiza líder.

### DELETE /api/lideres/[id]
Elimina líder.

---

## Sectores

### GET /api/sectores
Lista todos los sectores.

### POST /api/sectores
Crea nuevo sector. Requiere rol: administrador | estratega.

**Body:**
```json
{
  "nombre": "Sector 1",
  "meta": 100,
  "zona": "urbana",
  "latitud": 6.2476,
  "longitud": -75.5658,
  "radio": 500,
  "poligono": [[6.24,-75.56],[6.25,-75.56],[...]]
}
```

### GET /api/sectores/[id]
Obtiene sector por ID.

### PUT /api/sectores/[id]
Actualiza sector.

### DELETE /api/sectores/[id]
Elimina sector.

### GET /api/sectores/stats
Estadísticas por sector.

---

## Estadísticas

### GET /api/stats
Obtiene estadísticas generales del censo.

**Query Params:**
- `desde_archivo`: boolean

**Response:**
```json
{
  "total": 1000,
  "lideres": 10,
  "conCoords": 500,
  "hoy": 50,
  "semana": 200,
  "meta": 5000,
  "porcentajeMeta": 20,
  "avgEdad": 35,
  "porEstudios": [...],
  "porSexo": [...],
  "topBarrios": [...],
  "topOcupaciones": [...],
  "porLider": [...],
  "ultimos7dias": [...]
}
```

---

## Archivos

### GET /api/archivos
Lista archivos electoralas archivados.

### POST /api/archivos
Sube nuevo archivo.

### GET /api/archivos/[id]
Obtiene detalle de archivo.

### PUT /api/archivos/[id]
Actualiza archivo.

### DELETE /api/archivos/[id]
Elimina archivo.

### GET /api/archivos/[id]/export
Exporta archivo a Excel.

### GET /api/archivos/[id]/detalle
Detalle de registros del archivo.

### POST /api/archivos/[id]/restaurar
Restaura datos desde archivo.

### GET /api/archivos/compare
Compara archivo con datos actuales.

---

## Territorio

### GET /api/territorio/comunas
Lista comunas.

### GET /api/territorio/barrios
Lista barrios.

### GET /api/territorio/puestos
Lista puestos de votación.

### GET /api/territorio/problematicas
Lista de problematicas sociales.

---

## Inteligencia Territorial

### GET /api/trendsmap/search
Búsqueda de tendencias.

### GET /api/trendsmap/growth
Crecimiento de tendencias.

### GET /api/trendsmap/hotspots
Puntos calientes de tendencias.

### POST /api/trendsmap/submit
Envía datos de tendencia.

---

## Configuración

### GET /api/config
Obtiene configuración del sistema.

### PUT /api/config
Actualiza configuración.

---

## Códigos de Error

| Código | Descripción |
|-------|-------------|
| 400 | Bad Request - datos inválidos |
| 401 | Unauthorized - no autenticado |
| 403 | Forbidden - sin permiso |
| 404 | Not Found |
| 500 | Error interno del servidor |