# 🔌 Multi-Tenancy API Reference

## Overview

All API endpoints in CenPlus are automatically tenant-scoped. The tenant is detected from the request and all database queries are automatically routed to the correct schema.

---

## Authentication

### Login (Tenant-Aware)

**POST** `/api/auth/login`

```bash
curl -X POST https://tenant1.yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "password123",
    "tenant": "tenant1"
  }'
```

**Response** (200 OK):
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "email": "admin@example.com",
  "nombre": "Admin User",
  "role": "administrador"
}
```

**Token Content** (decoded):
```json
{
  "userId": 1,
  "email": "admin@example.com",
  "nombre": "Admin User",
  "role": "administrador",
  "tenant": "tenant1",
  "iat": 1715000000,
  "exp": 1715086400
}
```

---

## Request Pattern

### Headers Required

| Header | Example | Required | Purpose |
|--------|---------|----------|---------|
| `Authorization` | `Bearer <JWT_TOKEN>` | ✅ Yes | Authentication |
| `x-tenant` | `tenant1` | ✅ Yes | Tenant identification |
| `Content-Type` | `application/json` | ✅ (POST/PUT) | Request format |

### Example Request

```bash
curl -X GET https://tenant1.yourdomain.com/api/ciudadanos?limit=10 \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "x-tenant: tenant1" \
  -H "Content-Type: application/json"
```

---

## Core Endpoints

### Ciudadanos (Citizens)

#### GET /api/ciudadanos
List all citizens (paginated, searchable, filterable)

**Query Parameters**:
- `page` (int, default=1): Page number
- `limit` (int, default=50): Records per page (max 1000)
- `search` (string): Search by ID or full name
- `nivel` (string): Filter by education level
- `ocupacion` (string): Filter by occupation
- `sexo` (string): Filter by sex (Masculino|Femenino|Otro)
- `barrio` (string): Filter by barrio
- `es_lider` (boolean): Filter by leader status
- `all` (boolean): Get all records (ignores pagination)

**Request**:
```bash
curl -X GET "https://tenant1.yourdomain.com/api/ciudadanos?page=1&limit=50&nivel=Universitario" \
  -H "Authorization: Bearer <JWT>" \
  -H "x-tenant: tenant1"
```

**Response** (200 OK):
```json
{
  "data": [
    {
      "id": 1,
      "id_unico": "123456789",
      "nombre_completo": "Juan García",
      "edad": 35,
      "sexo": "Masculino",
      "nivel_estudios": "Universitario",
      "ocupacion": "Ingeniero",
      "barrio": "El Hueco",
      "es_lider": true,
      "created_at": "2026-05-08T10:30:00Z"
    }
  ],
  "count": 150,
  "page": 1,
  "limit": 50,
  "total_pages": 3
}
```

#### POST /api/ciudadanos
Create a new citizen

**Request Body**:
```json
{
  "id_unico": "987654321",
  "nombre_completo": "María López",
  "telefono": "3105551234",
  "sexo": "Femenino",
  "edad": 28,
  "nivel_estudios": "Secundaria",
  "ocupacion": "Vendedora",
  "regimen_salud": "Contributivo",
  "barrio": "Laureles",
  "corregimiento": "Medellín",
  "es_lider": false,
  "latitud": 6.2237,
  "longitud": -75.5695
}
```

**Response** (201 Created):
```json
{
  "data": {
    "id": 2,
    "id_unico": "987654321",
    "nombre_completo": "María López",
    ...
  },
  "message": "Registro exitoso"
}
```

**Errors**:
- `400 Bad Request`: Missing required fields
- `401 Unauthorized`: No valid JWT
- `403 Forbidden`: Token doesn't match tenant
- `409 Conflict`: ID already exists

#### PUT /api/ciudadanos/[id]
Update a citizen

**Request Body** (partial update):
```json
{
  "ocupacion": "Gerente",
  "edad": 29
}
```

**Response** (200 OK):
```json
{
  "data": { /* updated citizen */ },
  "message": "Actualización exitosa"
}
```

#### DELETE /api/ciudadanos/[id]
Delete a citizen

**Response** (200 OK):
```json
{
  "message": "Registro eliminado"
}
```

---

### Territorio (Territory)

#### GET /api/territorio/comunas
Get all comunas (administrative divisions)

```bash
curl -X GET https://tenant1.yourdomain.com/api/territorio/comunas \
  -H "Authorization: Bearer <JWT>" \
  -H "x-tenant: tenant1"
```

**Response**:
```json
{
  "data": [
    {
      "id": 1,
      "nombre": "Comuna 1 - Popular",
      "barrios": [
        { "id": 1, "nombre": "Santo Domingo" },
        { "id": 2, "nombre": "Popular" }
      ]
    }
  ]
}
```

#### POST /api/territorio/comunas
Create a new comuna (requires administrador/estratega role)

#### GET /api/territorio/comunas/[id]
Get specific comuna with barrios

#### PUT /api/territorio/comunas/[id]
Update comuna details

#### DELETE /api/territorio/comunas/[id]
Delete comuna

---

### Trends (Social Media Trends)

#### GET /api/trendsmap/search
Search trends by keyword or hashtag

**Query Parameters**:
- `q` (string): Keyword to search
- `hashtags` (array): Hashtag filter
- `days` (int): Look back days (1-365)
- `limit` (int): Max results (1-1000)

```bash
curl -X GET "https://tenant1.yourdomain.com/api/trendsmap/search?q=economía&days=7&limit=50" \
  -H "Authorization: Bearer <JWT>" \
  -H "x-tenant: tenant1"
```

**Response**:
```json
{
  "data": [
    {
      "id": 1,
      "text": "Noticia sobre economía local",
      "hashtags": ["#economia", "#desarrollo"],
      "departamento": "Antioquia",
      "municipio": "Medellín",
      "created_at": "2026-05-08T15:30:00Z"
    }
  ],
  "count": 25
}
```

#### POST /api/trendsmap/seed
Initialize trends data (admin only)

```bash
curl -X POST https://tenant1.yourdomain.com/api/trendsmap/seed \
  -H "Authorization: Bearer <JWT>" \
  -H "x-tenant: tenant1"
```

**Response**:
```json
{
  "message": "Trends seeded successfully",
  "created": 150,
  "duplicatesSkipped": 3
}
```

---

### Configuration

#### GET /api/config
Get all configuration values for tenant

```bash
curl -X GET https://tenant1.yourdomain.com/api/config \
  -H "Authorization: Bearer <JWT>" \
  -H "x-tenant: tenant1"
```

**Response**:
```json
{
  "data": {
    "meta_global": "1000",
    "timezone": "America/Bogota",
    "language": "es"
  }
}
```

#### PUT /api/config
Update configuration (administrador only)

**Request Body**:
```json
{
  "meta_global": "2000",
  "timezone": "America/Bogota"
}
```

---

## Tenant Detection

### How Tenant is Detected

The system checks in this order:

1. **Subdomain**: `tenant1.yourdomain.com` → tenant: `tenant1`
2. **x-tenant header**: `x-tenant: tenant1`
3. **Cookie**: `tenant=tenant1`
4. **JWT claim**: Token contains `tenant: "tenant1"`

### Validation

All tenant names are validated:
- Pattern: `/^[a-z0-9_]+$/`
- Length: 1-63 characters
- Lowercase only

Invalid tenants return `400 Bad Request`:
```json
{
  "error": "Tenant no especificado"
}
```

---

## Error Handling

### Standard Error Response

```json
{
  "error": "Error description",
  "code": "ERROR_CODE",
  "details": "Additional context (optional)"
}
```

### Common HTTP Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | Success | GET, PUT returned data |
| 201 | Created | POST created new record |
| 400 | Bad Request | Invalid parameters |
| 401 | Unauthorized | Missing JWT |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Record doesn't exist |
| 409 | Conflict | Duplicate ID |
| 500 | Server Error | Database error |

### Example Error

**Request**:
```bash
curl -X GET https://tenant1.yourdomain.com/api/ciudadanos \
  -H "x-tenant: tenant1"
  # Missing Authorization header
```

**Response** (401):
```json
{
  "error": "No autorizado"
}
```

---

## Rate Limiting

(To be implemented in production)

- **Tier 1** (Free): 1,000 requests/day
- **Tier 2** (Standard): 10,000 requests/day
- **Tier 3** (Premium): Unlimited

Response headers:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1715086400
```

---

## Webhook Events

(Optional feature)

Subscribe to tenant events:

```bash
curl -X POST https://tenant1.yourdomain.com/api/webhooks \
  -H "Authorization: Bearer <JWT>" \
  -H "x-tenant: tenant1" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://myapp.com/webhook",
    "events": ["ciudadano.created", "ciudadano.updated"]
  }'
```

**Webhook Payload**:
```json
{
  "event": "ciudadano.created",
  "tenant": "tenant1",
  "data": {
    "id": 2,
    "nombre_completo": "María López",
    ...
  },
  "timestamp": "2026-05-08T15:30:00Z"
}
```

---

## Code Examples

### JavaScript/Node.js

```javascript
const axios = require('axios');

const BASE_URL = 'https://tenant1.yourdomain.com';
const TENANT = 'tenant1';

// Login
async function login(email, password) {
  const res = await axios.post(`${BASE_URL}/api/auth/login`, {
    email,
    password,
    tenant: TENANT
  });
  return res.data.token;
}

// Get citizens
async function getCitizens(token, page = 1) {
  const res = await axios.get(`${BASE_URL}/api/ciudadanos`, {
    params: { page, limit: 50 },
    headers: {
      Authorization: `Bearer ${token}`,
      'x-tenant': TENANT
    }
  });
  return res.data;
}

// Create citizen
async function createCitizen(token, data) {
  const res = await axios.post(`${BASE_URL}/api/ciudadanos`, data, {
    headers: {
      Authorization: `Bearer ${token}`,
      'x-tenant': TENANT
    }
  });
  return res.data;
}

// Usage
(async () => {
  const token = await login('admin@example.com', 'password');
  const citizens = await getCitizens(token);
  console.log('Citizens:', citizens.data);
})();
```

### Python

```python
import requests
import json

BASE_URL = "https://tenant1.yourdomain.com"
TENANT = "tenant1"

class CenPlusAPI:
    def __init__(self, email, password):
        self.token = self._login(email, password)
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "x-tenant": TENANT
        }
    
    def _login(self, email, password):
        res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": email,
            "password": password,
            "tenant": TENANT
        })
        return res.json()["token"]
    
    def get_citizens(self, page=1):
        res = requests.get(f"{BASE_URL}/api/ciudadanos", 
            params={"page": page, "limit": 50},
            headers=self.headers
        )
        return res.json()
    
    def create_citizen(self, data):
        res = requests.post(f"{BASE_URL}/api/ciudadanos",
            json=data,
            headers=self.headers
        )
        return res.json()

# Usage
api = CenPlusAPI("admin@example.com", "password")
citizens = api.get_citizens()
print("Citizens:", citizens["data"])
```

---

## SDKs

(Coming soon)

- TypeScript SDK
- Python SDK
- Go SDK
- Java SDK

---

**Last Updated**: May 8, 2026  
**API Version**: 1.0
