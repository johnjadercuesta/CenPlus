# Arquitectura del Módulo de Tendencias en Redes Sociales

Este documento presenta la propuesta arquitectónica y el diseño del sistema para el módulo independiente de análisis de tendencias en redes sociales, requerido para integrarse al frontend de CenPlus (React/Next.js) mediante una API REST en Python.

## 1. Visión General del Sistema (Desacoplado)

El nuevo módulo será un **Microservicio Autónomo**. Su única responsabilidad es extraer, limpiar, procesar y servir la analítica sobre tendencias de diversas redes sociales. No compartirá base de datos con CenPlus directamente a nivel monolítico, operando sus propios flujos y bases de datos o comunicándose netamente a través de JSON sobre HTTP.

### Stack Tecnológico
*   **Backend & API**: Python 3.10+, FastAPI (Asíncrono, alto rendimiento y autogenera documentación con Swagger).
*   **Scraping y Extracción**: `snscrape` (para X, aunque a veces es inestable / requiere proxies), `Playwright` o `Selenium` para TikTok/Instagram/YouTube o librerías específicas no oficiales.
*   **NLP & Procesamiento**: `pandas` (manipulación de datos temporales/tabulares), `spaCy` o `NLTK` (limpieza y stopwords), `TextBlob` / `VADER` para análisis de sentimiento.
*   **Base de Datos**: PostgreSQL (con extensión PostGIS recomendada para geolocalización) o MongoDB si se prefieren documentos no estructurados. (Utilizaremos PostgreSQL JSON/Geo para el ejemplo).
*   **Frontend (CenPlus)**: React + Axios/SWR para consumo de endpoints, Recharts o Chart.js para líneas de tiempo, y Leaflet.js para los mapas.

## 2. Fase 2: Implementación Profunda (NLP y Scraping)

Esta fase transformará el prototipo estático en un sistema dinámico.

### [NEW] [sentiment.py](file:///y:/mis%20aplicaciones/censos/cenplus/social-trends-api/nlp_processor/sentiment.py)
Implementación de análisis de sentimiento básico usando `textblob` o similar, adaptando el puntaje a un rango [-1, 1].

### [NEW] [simulator.py](file:///y:/mis%20aplicaciones/censos/cenplus/social-trends-api/scrapers/simulator.py)
Generador de datos "raw" (texto crudo) para simular el flujo de entrada de redes sociales sin depender de APIs bloqueadas, permitiendo probar el motor NLP.

### [NEW] [analyzer.py](file:///y:/mis%20aplicaciones/censos/cenplus/social-trends-api/nlp_processor/analyzer.py)
El "cerebro" del módulo. Procesará los datos del simulador, calculará frecuencias de palabras clave (tokens), detectará crecimientos (Z-Score) y asignará geolocalización.

### [MODIFY] [TrendsDashboard.tsx](file:///y:/mis%20aplicaciones/censos/cenplus/src/components/TrendsDashboard.tsx)
Integración de:
- **Mapa Interactivo**: Usando `react-leaflet` para mostrar burbujas de calor por tendencia.
- **Gráfico de Líneas**: Usando `recharts` para visualizar el crecimiento histórico de una tendencia seleccionada.

## 3. Verificación Técnica
- Pruebas unitarias de limpieza de texto.
- Validación de latencia de la API bajo carga (múltiples n-gramas).
- Comprobación de la persistencia de datos (PostgreSQL).

## Open Questions
> [!IMPORTANT]
> ¿Deseas que el mapa muestre puntos individuales (marcadores) o un mapa de calor (heatmap)?
> ¿Qué categorías específicas te interesa priorizar además de "Seguridad" y "Cultura"?

## Verification Plan

### Automated Tests
- `pytest` para los módulos de limpieza y sentimiento.
- Validación de endpoints con `Postman` o `curl`.

### Manual Verification
- Visualización de datos en tiempo real en la nueva pestaña de la aplicación.
- Comprobación de filtros de tiempo (1h vs 24h).

### `main.py`
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import trends

app = FastAPI(
    title="Social Trends Analysis API",
    description="Microservicio dedicado a procesar tendencias geoespaciales y temporales.",
    version="1.0.0"
)

# Configurar CORS (Para permitir solicitudes desde el Frontend React)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Cambiar por el dominio exacto en producción (ej: https://CenPlus.com)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(trends.router, prefix="/api/v1")

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Social Trends API running successfully."}
```

### `routers/trends.py` (Endpoints y Lógica)
```python
from fastapi import APIRouter, Query
from typing import List, Optional
import datetime

router = APIRouter()

# Mock de respuesta del clasificador y geolocator
def get_mock_trends():
    return [
        {
            "id": 1,
            "keyword": "#SeguridadVial",
            "platform": "twitter",
            "frequency_score": 850,
            "sentiment": -0.4, # Negativo
            "growth_rate": 15.2, # % de crecimiento en las ultimas horas
            "location": {"lat": 6.2442, "lng": -75.5812, "city": "Medellín"},
            "timestamp": "2026-04-14T01:00:00Z"
        },
        {
            "id": 2,
            "keyword": "FestivalCultura",
            "platform": "tiktok",
            "frequency_score": 1200,
            "sentiment": 0.8, # Positivo
            "growth_rate": 45.0,
            "location": {"lat": 6.2518, "lng": -75.5636, "city": "Medellín"},
            "timestamp": "2026-04-14T01:05:00Z"
        }
    ]

@router.get("/trends", summary="Obtener lista de tendencias actuales")
async def get_trends(
    platform: Optional[str] = None,
    limit: int = 10,
    time_range: str = "24h"
):
    """
    Retorna el top N de tendencias filtradas por plataforma y rango de tiempo.
    """
    trends = get_mock_trends()
    if platform:
        trends = [t for t in trends if t.platform == platform.lower()]
    
    return {"data": sorted(trends, key=lambda x: x["frequency_score"], reverse=True)[:limit]}

@router.get("/trends/map", summary="Datos geográficos de tendencias")
async def get_trends_map(
    city: Optional[str] = Query(None, description="Filtro exacto por ciudad")
):
    """
    Retorna puntos geográficos pesados listos para integrarse con Leaflet (Heatmap o Markers).
    """
    trends = get_mock_trends()
    if city:
         trends = [t for t in trends if t["location"]["city"].lower() == city.lower()]
    
    map_features = []
    for t in trends:
        map_features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [t["location"]["lng"], t["location"]["lat"]]
            },
            "properties": {
                "keyword": t["keyword"],
                "intensity": t["frequency_score"],
                "sentiment": t["sentiment"]
            }
        })
    return {"type": "FeatureCollection", "features": map_features}
```

## 4. Algoritmo de Detección Temporal y NLP

**¿Cómo funciona internamente la detección de tendencias?**
1.  **Recolección por Lotes (Cron)**: Cada hora se ejecuta un script de Playwright/snscrape descargando posts recientes en ciertas coordenadas.
2.  **Limpieza NLP**: 
    - Textos pasan por minúsculas, se quitan stopwords (`del, las, y, con`), emojis y caracteres especiales.
    - Se extraen n-gramas (bigramas/trigramas) o **entidades nombradas (NER)** usando `spaCy`.
3.  **Z-Score / Exponential Moving Average (EMA)**: 
    - Se guarda el contador histórico de cada palabra/hashtag.
    - Una "tendencia" no es la palabra que más se dice total (eso sería ruido como "buenos días"), sino aquella cuya velocidad subió exponencialmente (Crecimiento súbito). Se aplica la fórmula Z-Score para detectar anomalías de frecuencia frente a la media de la semana pasada.

## 5. Ejemplo de Integración en Frontend (React / Next.js)

Se debe construir un componente dentro de la aplicación actual de CenPlus que consulte el backend de FastAPI.

```tsx
// src/components/TrendsDashboard.tsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

// URL de la API del Microservicio Python
const API_BASE_URL = process.env.NEXT_PUBLIC_TRENDS_API_URL || 'http://localhost:8000/api/v1';

export default function TrendsDashboard() {
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [platform, setPlatform] = useState('');

  const fetchTrends = async () => {
    setLoading(true);
    try {
      // Consumir el Microservicio Python desacoplado
      const { data } = await axios.get(`${API_BASE_URL}/trends`, {
        params: { platform: platform || undefined, limit: 5 }
      });
      setTrends(data.data);
    } catch (err) {
      console.error("Error al obtener las tendencias", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrends();
  }, [platform]);

  return (
    <div className="p-6 bg-slate-900 rounded-lg text-white">
      <h2 className="text-xl font-bold mb-4">Radar de Tendencias Geocalizadas</h2>
      <select 
        className="w-full mb-4 p-2 bg-slate-800 rounded border border-slate-700"
        value={platform} 
        onChange={(e) => setPlatform(e.target.value)}
      >
        <option value="">Todas las redes</option>
        <option value="twitter">X (Twitter)</option>
        <option value="tiktok">TikTok</option>
      </select>

      {loading ? (
        <p className="text-slate-400">Analizando miles de interacciones en tiempo real...</p>
      ) : (
        <ul className="space-y-3">
          {trends.map((t: any) => (
            <li key={t.id} className="flex justify-between p-4 bg-slate-800 rounded border-l-4 border-blue-500 shadow-md">
              <div>
                <span className="font-semibold block">{t.keyword}</span>
                <span className="text-xs text-slate-400">
                  {t.platform.toUpperCase()} • {t.location.city} • Sentimiento: {t.sentiment > 0 ? "🟢" : "🔴"}
                </span>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-green-400">+{t.growth_rate}%</span>
                <span className="block text-xs text-slate-500">Mención/hora: {t.frequency_score}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

## Beneficios de esta arquitectura

*   **No impacta CenPlus (Next.js)**: Al correr en un microservicio de Python separado, todos los bloqueos por NLP y scraping quedan aislados.
*   **Fácil despliegue gratuito**: FastAPI puede desplegarse como un Docker o en Render/Railway de manera gratuita, mientras que CenPlus sigue en Vercel.
*   **Agnóstico**: Total flexibilidad. Si en 6 meses se necesita cambiar el método de extracción, el frontend en React no sufre cambios en absoluto.

## User Review Required

> [!WARNING]
> ¿Estás de acuerdo con el desacoplamiento mediante FastAPI para el procesamiento NLP y scraping?
> Es esencial confirmar si deseas que iniciemos la creación de estos archivos de Python dentro del mismo repositorio de `cenplus/` (por ejemplo en una carpeta `/microservicios/trends`) o si se administrará estrictamente en un repositorio aparte (como se propone arriba). 

Por favor, confirma la propuesta o si deseas ajustar algo en los endpoints o algoritmos recomendados.
