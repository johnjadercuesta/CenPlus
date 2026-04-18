import asyncio
import time
from typing import Dict, Optional
from datetime import datetime, timedelta


class RateLimiter:
    """
    Rate limiter global para evitar bloqueos en scraping.
    Implementa delays entre requests por fuente.
    """
    
    def __init__(self, min_interval: int = 3, max_retries: int = 3):
        """
        Args:
            min_interval: Segundos mínimos entre requests (default: 3s)
            max_retries: Número máximo de reintentos en caso de error
        """
        self.min_interval = min_interval
        self.max_retries = max_retries
        self.last_request_time: Dict[str, float] = {}
        self.request_count: Dict[str, int] = {}
        self.lock = asyncio.Lock()
        
    async def wait_if_needed(self, source: str) -> None:
        """
        Espera el tiempo necesario antes de hacer un nuevo request.
        """
        async with self.lock:
            current_time = time.time()
            last_time = self.last_request_time.get(source, 0)
            
            elapsed = current_time - last_time
            if elapsed < self.min_interval:
                wait_time = self.min_interval - elapsed
                await asyncio.sleep(wait_time)
            
            self.last_request_time[source] = time.time()
            self.request_count[source] = self.request_count.get(source, 0) + 1
    
    async def execute_with_retry(self, source: str, func, *args, **kwargs):
        """
        Ejecuta una función con reintentos en caso de error.
        """
        last_error = None
        
        for attempt in range(self.max_retries):
            try:
                await self.wait_if_needed(source)
                return await func(*args, **kwargs)
            except Exception as e:
                last_error = e
                if attempt < self.max_retries - 1:
                    # Backoff exponencial: 10s, 30s, 60s
                    wait_time = min(10 * (2 ** attempt), 60)
                    print(f"[RateLimiter] Error en {source} (intento {attempt + 1}), reintentando en {wait_time}s: {str(e)}")
                    await asyncio.sleep(wait_time)
                else:
                    print(f"[RateLimiter] Error final en {source} después de {self.max_retries} intentos: {str(e)}")
        
        raise last_error
    
    def get_stats(self) -> Dict:
        """Retorna estadísticas de uso del rate limiter."""
        return {
            source: {
                "requests": self.request_count.get(source, 0),
                "last_request": datetime.fromtimestamp(self.last_request_time.get(source, 0)).isoformat() if self.last_request_time.get(source, 0) else None
            }
            for source in self.request_count.keys()
        }
    
    def reset(self, source: Optional[str] = None) -> None:
        """Resetea los contadores de requests."""
        if source:
            self.last_request_time.pop(source, None)
            self.request_count.pop(source, None)
        else:
            self.last_request_time.clear()
            self.request_count.clear()


# Instancia global del rate limiter
global_rate_limiter = RateLimiter(min_interval=3)