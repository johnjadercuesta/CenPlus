import asyncio
from typing import Dict, List, Optional
from datetime import datetime
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
import json
from pathlib import Path


class ScrapeScheduler:
    """
    Administrador de tareas programadas para scraping.
    Permite programar scraping en intervalos específicos.
    """
    
    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self.jobs_file = Path(__file__).parent.parent / "data" / "scheduler_jobs.json"
        self.jobs_file.parent.mkdir(exist_ok=True)
        
        # Cargar trabajos guardados
        self.jobs = self._load_jobs()
        
        # Iniciar scheduler si no está corriendo
        if not self.scheduler.running:
            self.scheduler.start()
    
    def _load_jobs(self) -> Dict:
        """Carga los trabajos guardados."""
        try:
            if self.jobs_file.exists():
                with open(self.jobs_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
        except:
            pass
        return {"jobs": [], "enabled": True}
    
    def _save_jobs(self):
        """Guarda los trabajos en archivo."""
        with open(self.jobs_file, 'w', encoding='utf-8') as f:
            json.dump(self.jobs, f, ensure_ascii=False, indent=2)
    
    async def run_scrape_task(self, task_name: str, platforms: List[str], query: str = None):
        """
        Ejecuta la tarea de scraping.
        Esta función es llamada por el scheduler.
        """
        print(f"[Scheduler] Ejecutando tarea: {task_name}")
        
        # Importar scrapers dinámicamente para evitar ciclos
        from scrapers.twitter_scraper import twitter_scraper
        from scrapers.facebook_scraper import facebook_scraper
        from scrapers.instagram_scraper import instagram_scraper
        from scrapers.youtube_scraper import youtube_scraper
        from scrapers.google_scraper import google_scraper
        from db.storage import data_storage
        
        scrapers = {
            "twitter": twitter_scraper,
            "facebook": facebook_scraper,
            "instagram": instagram_scraper,
            "youtube": youtube_scraper,
            "google": google_scraper,
            "google_news": google_scraper
        }
        
        results = {}
        
        for platform in platforms:
            if platform in scrapers:
                try:
                    scraper = scrapers[platform]
                    
                    if platform == "twitter":
                        posts = await scraper.search(query or "Colombia", max_results=50)
                    elif platform == "facebook":
                        # Facebook requiere URLs específicas de páginas/grupos
                        # Por ahora usamos datos de ejemplo
                        posts = []
                    elif platform == "instagram":
                        posts = await scraper.get_hashtag_posts("colombia", max_results=30)
                    elif platform == "youtube":
                        posts = await scraper.search_videos(query or "Colombia", max_results=30)
                    elif platform == "google":
                        posts = await scraper.search(query or "Colombia", max_results=30, search_type="web")
                    elif platform == "google_news":
                        posts = await scraper.search(query or "Colombia", max_results=30)
                    else:
                        posts = []
                    
                    # Guardar posts
                    if posts:
                        data_storage.save_posts(platform, posts)
                    
                    results[platform] = len(posts)
                    print(f"[Scheduler] {platform}: {len(posts)} posts obtenidos")
                    
                except Exception as e:
                    print(f"[Scheduler] Error en {platform}: {str(e)}")
                    results[platform] = 0
        
        # Actualizar último execution
        self.jobs["last_execution"] = {
            "task": task_name,
            "datetime": datetime.now().isoformat(),
            "results": results
        }
        self._save_jobs()
        
        return results
    
    def add_interval_job(
        self,
        job_id: str,
        name: str,
        platforms: List[str],
        query: str,
        hours: int = 1,
        enabled: bool = True
    ):
        """
        Agrega un trabajo que se ejecuta cada X horas.
        """
        job = {
            "id": job_id,
            "name": name,
            "type": "interval",
            "platforms": platforms,
            "query": query,
            "hours": hours,
            "enabled": enabled,
            "created_at": datetime.now().isoformat()
        }
        
        # Agregar al scheduler
        self.scheduler.add_job(
            self.run_scrape_task,
            trigger=IntervalTrigger(hours=hours),
            id=job_id,
            args=[name, platforms, query],
            replace_existing=True
        )
        
        # Guardar en archivo
        if "jobs" not in self.jobs:
            self.jobs["jobs"] = []
        
        # Remover si existe
        self.jobs["jobs"] = [j for j in self.jobs["jobs"] if j.get("id") != job_id]
        self.jobs["jobs"].append(job)
        self._save_jobs()
        
        print(f"[Scheduler] Trabajo_intervalo agregado: {job_id} ({hours}h)")
        
        return job
    
    def add_cron_job(
        self,
        job_id: str,
        name: str,
        platforms: List[str],
        query: str,
        hour: int,
        minute: int = 0,
        enabled: bool = True
    ):
        """
        Agrega un trabajo que se ejecuta a una hora específica del día.
        """
        job = {
            "id": job_id,
            "name": name,
            "type": "cron",
            "platforms": platforms,
            "query": query,
            "hour": hour,
            "minute": minute,
            "enabled": enabled,
            "created_at": datetime.now().isoformat()
        }
        
        # Agregar al scheduler
        self.scheduler.add_job(
            self.run_scrape_task,
            trigger=CronTrigger(hour=hour, minute=minute),
            id=job_id,
            args=[name, platforms, query],
            replace_existing=True
        )
        
        # Guardar en archivo
        if "jobs" not in self.jobs:
            self.jobs["jobs"] = []
        
        self.jobs["jobs"] = [j for j in self.jobs["jobs"] if j.get("id") != job_id]
        self.jobs["jobs"].append(job)
        self._save_jobs()
        
        print(f"[Scheduler] Trabajo_cron agregado: {job_id} (daily {hour}:{minute:02d})")
        
        return job
    
    def remove_job(self, job_id: str):
        """Elimina un trabajo del scheduler."""
        try:
            self.scheduler.remove_job(job_id)
        except:
            pass
        
        # Remover de archivo
        self.jobs["jobs"] = [j for j in self.jobs.get("jobs", []) if j.get("id") != job_id]
        self._save_jobs()
        
        print(f"[Scheduler] Trabajo eliminado: {job_id}")
    
    def get_jobs(self) -> List[Dict]:
        """Retorna la lista de trabajos configurados."""
        return self.jobs.get("jobs", [])
    
    def get_job(self, job_id: str) -> Optional[Dict]:
        """Retorna un trabajo específico."""
        for job in self.jobs.get("jobs", []):
            if job.get("id") == job_id:
                return job
        return None
    
    def toggle_job(self, job_id: str, enabled: bool):
        """Habilita o deshabilita un trabajo."""
        job = self.get_job(job_id)
        if not job:
            return
        
        if enabled:
            # Recrear el trabajo
            if job.get("type") == "interval":
                self.add_interval_job(
                    job["id"], job["name"], job["platforms"],
                    job["query"], job["hours"], enabled=True
                )
            else:
                self.add_cron_job(
                    job["id"], job["name"], job["platforms"],
                    job["query"], job["hour"], job["minute"], enabled=True
                )
        else:
            self.remove_job(job_id)
    
    def run_job_now(self, job_id: str):
        """Ejecuta un trabajo inmediatamente."""
        job = self.get_job(job_id)
        if not job:
            return {"error": "Trabajo no encontrado"}
        
        return asyncio.run(self.run_scrape_task(
            job["name"],
            job["platforms"],
            job.get("query")
        ))
    
    def get_status(self) -> Dict:
        """Retorna el estado del scheduler."""
        scheduled_jobs = self.scheduler.get_jobs()
        
        return {
            "running": self.scheduler.running,
            "jobs_count": len(scheduled_jobs),
            "last_execution": self.jobs.get("last_execution"),
            "jobs": [
                {
                    "id": j.id,
                    "next_run": str(j.next_run_time) if j.next_run_time else None
                }
                for j in scheduled_jobs
            ]
        }


# Instancia global del scheduler
scrape_scheduler = ScrapeScheduler()


# Funciones de conveniencia para usar en endpoints
def add_scrape_job(
    name: str,
    platforms: List[str],
    query: str = "Colombia",
    frequency: str = "1h"
) -> Dict:
    """
    Agrega un trabajo de scraping con frecuencia predefinida.
    
    Frequencies válidas: "1h", "4h", "6h", "12h", "24h", o "daily"
    """
    job_id = f"scrape_{name.replace(' ', '_').lower()}"
    
    # Determinar horas según frecuencia
    freq_map = {
        "1h": 1,
        "4h": 4,
        "6h": 6,
        "12h": 12,
        "24h": 24
    }
    
    if frequency == "daily":
        # Ejecutar a las 8 AM todos los días
        scrape_scheduler.add_cron_job(
            job_id, name, platforms, query,
            hour=8, minute=0
        )
    elif frequency in freq_map:
        scrape_scheduler.add_interval_job(
            job_id, name, platforms, query,
            hours=freq_map[frequency]
        )
    else:
        return {"error": "Frecuencia inválida"}
    
    return {"success": True, "job_id": job_id}