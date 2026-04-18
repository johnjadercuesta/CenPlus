from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import trends
from routers import scrape
from routers import scheduler
from routers import config
import os


app = FastAPI(
    title="Social Trends Analysis API",
    description="Microservicio de scraping y análisis de tendencias de redes sociales.",
    version="1.0.0"
)

# Configurar CORS (Para permitir solicitudes desde el Frontend React)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Cambiar por el dominio exacto en producción
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir routers
app.include_router(trends.router, prefix="/api/v1")
app.include_router(scrape.router, prefix="/api/v1")
app.include_router(scheduler.router, prefix="/api/v1")
app.include_router(config.router, prefix="/api/v1")


@app.on_event("startup")
async def startup_event():
    """Eventos al iniciar el servidor."""
    print("=" * 50)
    print("Social Trends API - Iniciando servicios...")
    print("=" * 50)
    
    # Crear directorio de datos si no existe
    data_dir = os.path.join(os.path.dirname(__file__), "data")
    os.makedirs(data_dir, exist_ok=True)
    
    # Importar scheduler para inicializar
    try:
        from scheduler.jobs import scrape_scheduler
        print(f"Scheduler inicializado: {len(scrape_scheduler.get_jobs())} tareas")
    except Exception as e:
        print(f"Error inicializando scheduler: {e}")
    
    print("=" * 50)
    print("API lista para recibir solicitudes")
    print("=" * 50)


@app.get("/")
def read_root():
    return {
        "status": "ok",
        "message": "Social Trends API running successfully.",
        "version": "1.0.0",
        "endpoints": {
            "trends": "/api/v1/trends",
            "trends_map": "/api/v1/trends/map",
            "trends_compare": "/api/v1/trends/compare",
            "scrape_run": "/api/v1/scrape/run",
            "scrape_status": "/api/v1/scrape/status",
            "scrape_sources": "/api/v1/scrape/sources",
            "scheduler_list": "/api/v1/scheduler/list",
            "scheduler_add": "/api/v1/scheduler/add"
        }
    }


@app.get("/health")
def health_check():
    """Endpoint de verificación de salud."""
    from db.storage import data_storage
    from scrapers.rate_limiter import global_rate_limiter
    
    return {
        "status": "healthy",
        "storage": data_storage.get_platforms_status(),
        "rate_limiter_stats": global_rate_limiter.get_stats()
    }