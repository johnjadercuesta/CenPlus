from fastapi import APIRouter, Query
from typing import List, Optional
import datetime
from nlp_processor.analyzer import analyzer

router = APIRouter()


@router.get("/trends", summary="Obtener lista de tendencias actuales")
async def get_trends(
    platform: Optional[str] = None,
    limit: int = 10,
    time_range: str = "24h"
):
    """
    Retorna el top N de tendencias procesadas por el motor NLP.
    Usa datos reales del storage si hay datos disponibles.
    """
    # Convertir time_range (ej: "1h", "24h", "7d") a horas
    try:
        if time_range.endswith('h'):
            hours = int(time_range[:-1])
        elif time_range.endswith('d'):
            hours = int(time_range[:-1]) * 24
        else:
            hours = 24
    except:
        hours = 24
    
    # Obtener tendencias del analyzer (usa datos reales del storage)
    trends = analyzer.get_top_trends(platform=platform, limit=limit, hours=hours)
    
    # Si no hay datos reales, usar datos de ejemplo
    if not trends:
        trends = get_sample_trends(limit)
    
    return {"data": trends}


@router.get("/trends/map", summary="Datos geográficos de tendencias")
async def get_trends_map(
    city: Optional[str] = Query(None, description="Filtro exacto por ciudad"),
    limit: int = Query(50, ge=1, le=200)
):
    """
    Retorna puntos geográficos procesados listos para integrarse con Leaflet.
    """
    trends = analyzer.get_top_trends(limit=limit)
    
    if city:
        trends = [t for t in trends if t.get("location", {}).get("city", "").lower() == city.lower()]
    
    if not trends:
        trends = get_sample_trends(limit)
    
    map_features = []
    for t in trends:
        location = t.get("location", {})
        map_features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [location.get("lng", -75.5658), location.get("lat", 6.2476)]
            },
            "properties": {
                "keyword": t.get("keyword", ""),
                "intensity": t.get("frequency_score", 0),
                "sentiment": t.get("sentiment", 0),
                "city": location.get("city", "Colombia")
            }
        })
    
    return {"type": "FeatureCollection", "features": map_features}


@router.get("/trends/compare", summary="Comparar múltiples tendencias")
async def compare_trends(
    keywords: str = Query(..., description="Keywords separadas por coma (ej: inseguridad,movilidad)")
):
    """
    Compara estadísticas detalladas entre varias palabras clave.
    """
    kw_list = [k.strip() for k in keywords.split(",")]
    comparison = analyzer.compare_trends(kw_list)
    
    # Si no hay datos, retornar ejemplo
    if all(c.get("status") == "not_found" for c in comparison):
        comparison = get_sample_comparison(kw_list)
    
    return {"data": comparison}


@router.get("/stats", summary="Estadísticas globales")
async def get_stats():
    """
    Retorna estadísticas de todas las plataformas.
    """
    platform_stats = analyzer.get_platform_stats()
    return {"data": platform_stats}


def get_sample_trends(limit: int = 10) -> List[dict]:
    """Datos de ejemplo cuando no hay datos reales."""
    return [
        {"keyword": "#Agua", "platform": "twitter", "frequency_score": 150, "sentiment": 0.3, "growth_rate": 25, "location": {"city": "Medellín", "lat": 6.2442, "lng": -75.5812}, "timestamp": datetime.datetime.now().isoformat()},
        {"keyword": "#Seguridad", "platform": "twitter", "frequency_score": 120, "sentiment": -0.2, "growth_rate": 15, "location": {"city": "Bogotá", "lat": 4.7110, "lng": -74.0721}, "timestamp": datetime.datetime.now().isoformat()},
        {"keyword": "#Movilidad", "platform": "twitter", "frequency_score": 100, "sentiment": -0.1, "growth_rate": 20, "location": {"city": "Cali", "lat": 3.4516, "lng": -76.5320}, "timestamp": datetime.datetime.now().isoformat()},
        {"keyword": "#Salud", "platform": "youtube", "frequency_score": 80, "sentiment": 0.4, "growth_rate": 10, "location": {"city": "Barranquilla", "lat": 10.9685, "lng": -74.7813}, "timestamp": datetime.datetime.now().isoformat()},
        {"keyword": "#Educación", "platform": "google_news", "frequency_score": 70, "sentiment": 0.5, "growth_rate": 8, "location": {"city": "Bucaramanga", "lat": 7.1255, "lng": -73.1198}, "timestamp": datetime.datetime.now().isoformat()},
    ][:limit]


def get_sample_comparison(keywords: List[str]) -> List[dict]:
    """Comparación de ejemplo."""
    return [
        {"keyword": kw, "frequency_score": 0, "sentiment": 0, "growth_rate": 0, "status": "no_data", "message": "No hay datos disponibles. Ejecute scraping primero."}
        for kw in keywords
    ]