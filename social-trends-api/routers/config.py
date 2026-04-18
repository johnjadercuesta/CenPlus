from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import json
from pathlib import Path

router = APIRouter(prefix="/scrape", tags=["scraping"])


class APIConfig(BaseModel):
    twitter_bearer_token: Optional[str] = None
    youtube_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None
    custom_search_key: Optional[str] = None
    custom_search_id: Optional[str] = None


CONFIG_FILE = Path(__file__).parent.parent / "data" / "api_config.json"


@router.post("/config", summary="Guardar configuración de APIs")
async def save_api_config(config: APIConfig):
    """
    Guarda la configuración de API keys en un archivo local.
    """
    try:
        config_dict = config.dict(exclude_none=True)
        
        CONFIG_FILE.parent.mkdir(exist_ok=True)
        
        with open(CONFIG_FILE, 'w') as f:
            json.dump(config_dict, f, indent=2)
        
        return {"success": True, "message": "Configuración guardada"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/config", summary="Obtener configuración de APIs")
async def get_api_config():
    """
    Retorna la configuración de APIs (sin las keys reales por seguridad).
    """
    try:
        if CONFIG_FILE.exists():
            with open(CONFIG_FILE, 'r') as f:
                config = json.load(f)
            
            # Retornar solo qué APIs están configuradas
            return {
                "twitter_configured": bool(config.get("twitter_bearer_token")),
                "youtube_configured": bool(config.get("youtube_api_key")),
                "openai_configured": bool(config.get("openai_api_key")),
                "custom_search_configured": bool(config.get("custom_search_key")),
            }
        return {
            "twitter_configured": False,
            "youtube_configured": False,
            "openai_configured": False,
            "custom_search_configured": False,
        }
    except Exception as e:
        return {}


def get_api_config() -> dict:
    """Función para obtener la config en otros módulos."""
    try:
        if CONFIG_FILE.exists():
            with open(CONFIG_FILE, 'r') as f:
                return json.load(f)
    except:
        pass
    return {}