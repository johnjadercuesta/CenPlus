from fastapi import APIRouter, Query, HTTPException
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import asyncio


router = APIRouter(prefix="/scrape", tags=["scraping"])


class ScrapeRequest(BaseModel):
    platforms: List[str]
    query: Optional[str] = "Colombia"
    max_results: int = 50


class SchedulerJob(BaseModel):
    name: str
    platforms: List[str]
    query: Optional[str] = "Colombia"
    frequency: str = "1h"  # "1h", "4h", "6h", "12h", "24h", "daily"


async def get_posts_with_api_fallback(platform: str, query: str, max_results: int):
    """
    Obtiene posts usando API oficial si está configurada, 
    si no usa scraping gratuito.
    """
    from routers.config import get_api_config
    from scrapers.twitter_scraper import twitter_scraper
    from scrapers.facebook_scraper import facebook_scraper
    from scrapers.instagram_scraper import instagram_scraper
    from scrapers.youtube_scraper import youtube_scraper
    from scrapers.google_scraper import google_scraper
    
    api_config = get_api_config()
    
    if platform == "twitter":
        if api_config.get("twitter_bearer_token"):
            from scrapers.twitter_api import twitter_api_scraper
            return await twitter_api_scraper.search(query, max_results=max_results, bearer_token=api_config["twitter_bearer_token"])
        else:
            return await twitter_scraper.search(query, max_results=max_results)
    
    elif platform == "youtube":
        if api_config.get("youtube_api_key"):
            from scrapers.youtube_api import youtube_api_scraper
            return await youtube_api_scraper.search_videos(query, max_results=max_results, api_key=api_config["youtube_api_key"])
        else:
            return await youtube_scraper.search_videos(query, max_results=max_results)
    
    elif platform in ["google", "google_news"]:
        if api_config.get("custom_search_key") and api_config.get("custom_search_id"):
            from scrapers.google_api import google_api_scraper
            return await google_api_scraper.search(query, max_results=max_results, api_key=api_config["custom_search_key"], cx=api_config["custom_search_id"])
        else:
            return await google_scraper.search(query, max_results=max_results, search_type="web" if platform == "google" else "news")
    
    elif platform == "instagram":
        return await instagram_scraper.get_hashtag_posts(query.replace("#", ""), max_results=max_results)
    
    elif platform == "facebook":
        return await facebook_scraper.get_page_posts("https://facebook.com/colombia", max_results=max_results)
    
    return []


@router.post("/run", summary="Ejecutar scraping bajo demanda")
async def run_scrape(request: ScrapeRequest):
    """
    Ejecuta scraping en las plataformas especificadas.
    Usa API oficial si está configurada, si no usa scraping gratuito.
    """
    from db.storage import data_storage
    
    valid_platforms = ["twitter", "facebook", "instagram", "youtube", "google", "google_news"]
    
    results = {}
    
    for platform in request.platforms:
        if platform not in valid_platforms:
            results[platform] = {"error": "Plataforma no válida"}
            continue
        
        try:
            posts = await get_posts_with_api_fallback(platform, request.query, request.max_results)
            
            if posts:
                data_storage.save_posts(platform, posts)
            
            results[platform] = {
                "success": True,
                "posts_count": len(posts),
                "source": "api" if platform in ["twitter", "youtube", "google", "google_news"] else "scraper"
            }
            
        except Exception as e:
            results[platform] = {
                "success": False,
                "error": str(e)
            }
    
    return {
        "status": "completed",
        "timestamp": datetime.now().isoformat(),
        "results": results
    }


@router.get("/status", summary="Estado del scraping")
async def get_status():
    """
    Retorna el estado actual del sistema de scraping.
    """
    from db.storage import data_storage
    from scrapers.rate_limiter import global_rate_limiter
    
    storage_status = data_storage.get_platforms_status()
    rate_limiter_stats = global_rate_limiter.get_stats()
    
    return {
        "storage": storage_status,
        "rate_limiter": rate_limiter_stats,
        "timestamp": datetime.now().isoformat()
    }


@router.get("/sources", summary="Listar fuentes disponibles")
async def get_sources():
    """
    Retorna las plataformas de scraping disponibles.
    """
    return {
        "sources": [
            {"id": "twitter", "name": "Twitter/X", "status": "available"},
            {"id": "facebook", "name": "Facebook", "status": "available", "note": "Requiere URL de página/grupo"},
            {"id": "instagram", "name": "Instagram", "status": "available"},
            {"id": "youtube", "name": "YouTube", "status": "available"},
            {"id": "google", "name": "Google (Web)", "status": "available"},
            {"id": "google_news", "name": "Google News", "status": "available"}
        ]
    }


@router.get("/data/{platform}", summary="Obtener datos de una plataforma")
async def get_platform_data(
    platform: str,
    limit: int = Query(50, ge=1, le=500),
    since_hours: int = Query(None, description="Filtrar datos de las últimas N horas")
):
    """
    Obtiene los datos almacenados de una plataforma específica.
    """
    from db.storage import data_storage
    from datetime import timedelta
    
    valid_platforms = ["twitter", "facebook", "instagram", "youtube", "google", "google_news"]
    
    if platform not in valid_platforms:
        raise HTTPException(status_code=400, detail="Plataforma no válida")
    
    since = None
    if since_hours:
        since = datetime.now() - timedelta(hours=since_hours)
    
    posts = data_storage.get_posts(platform, limit=limit, since=since)
    
    return {
        "platform": platform,
        "count": len(posts),
        "posts": posts
    }


@router.delete("/data/{platform}", summary="Limpiar datos de una plataforma")
async def clear_platform_data(platform: str):
    """
    Limpia todos los datos almacenados de una plataforma.
    """
    from db.storage import data_storage
    
    valid_platforms = ["twitter", "facebook", "instagram", "youtube", "google", "google_news"]
    
    if platform not in valid_platforms:
        raise HTTPException(status_code=400, detail="Plataforma no válida")
    
    data_storage.clear_platform(platform)
    
    return {
        "success": True,
        "message": f"Datos de {platform} eliminados"
    }


@router.delete("/data", summary="Limpiar todos los datos")
async def clear_all_data():
    """
    Limpia todos los datos de todas las plataformas.
    """
    from db.storage import data_storage
    
    data_storage.clear_all()
    
    return {
        "success": True,
        "message": "Todos los datos eliminados"
    }