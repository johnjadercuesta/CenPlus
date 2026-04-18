from fastapi import APIRouter, HTTPException
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime


router = APIRouter(prefix="/scheduler", tags=["scheduler"])


class AddJobRequest(BaseModel):
    name: str
    platforms: List[str]
    query: Optional[str] = "Colombia"
    frequency: str  # "1h", "4h", "6h", "12h", "24h", "daily"
    hour: Optional[int] = None  # Para frecuencia "daily"
    minute: Optional[int] = 0


@router.get("/list", summary="Listar tareas programadas")
async def list_jobs():
    """
    Retorna la lista de todas las tareas programadas.
    """
    from scheduler.jobs import scrape_scheduler
    
    return {
        "jobs": scrape_scheduler.get_jobs(),
        "status": scrape_scheduler.get_status()
    }


@router.post("/add", summary="Agregar tarea programada")
async def add_job(request: AddJobRequest):
    """
    Agrega una nueva tarea de scraping programada.
    """
    from scheduler.jobs import add_scrape_job
    
    valid_frequencies = ["1h", "4h", "6h", "12h", "24h", "daily"]
    
    if request.frequency not in valid_frequencies:
        raise HTTPException(
            status_code=400,
            detail=f"Frecuencia inválida. Use: {valid_frequencies}"
        )
    
    result = add_scrape_job(
        name=request.name,
        platforms=request.platforms,
        query=request.query or "Colombia",
        frequency=request.frequency
    )
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return {
        "success": True,
        "job_id": result["job_id"],
        "message": f"Tarea '{request.name}' programada con frecuencia {request.frequency}"
    }


@router.delete("/{job_id}", summary="Eliminar tarea programada")
async def remove_job(job_id: str):
    """
    Elimina una tarea programada.
    """
    from scheduler.jobs import scrape_scheduler
    
    scrape_scheduler.remove_job(job_id)
    
    return {
        "success": True,
        "message": f"Tarea {job_id} eliminada"
    }


@router.post("/{job_id}/run", summary="Ejecutar tarea inmediatamente")
async def run_job_now(job_id: str):
    """
    Ejecuta una tarea programada inmediatamente (sin esperar su hora).
    """
    from scheduler.jobs import scrape_scheduler
    
    result = scrape_scheduler.run_job_now(job_id)
    
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    
    return {
        "success": True,
        "result": result,
        "message": f"Tarea {job_id} ejecutada"
    }


@router.post("/{job_id}/toggle", summary="Habilitar/deshabilitar tarea")
async def toggle_job(job_id: str, enabled: bool = True):
    """
    Habilita o deshabilita una tarea programada.
    """
    from scheduler.jobs import scrape_scheduler
    
    scrape_scheduler.toggle_job(job_id, enabled)
    
    return {
        "success": True,
        "message": f"Tarea {job_id} {'habilitada' if enabled else 'deshabilitada'}"
    }


@router.get("/status", summary="Estado del scheduler")
async def get_scheduler_status():
    """
    Retorna el estado actual del scheduler.
    """
    from scheduler.jobs import scrape_scheduler
    
    return scrape_scheduler.get_status()