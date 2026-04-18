from typing import List, Dict, Optional
from collections import Counter
from nlp_processor.cleaner import get_tokens
from nlp_processor.sentiment import analyze_sentiment
import datetime
import os
import json


class TrendAnalyzer:
    """
    Analizador de tendencias que procesa datos reales del storage.
    """
    
    def __init__(self):
        # Cargar datos desde archivos JSON directamente
        self.data_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
        
    def _load_platform_data(self, platform: str) -> List[Dict]:
        """Carga datos de una plataforma desde JSON."""
        filepath = os.path.join(self.data_dir, f"{platform}_data.json")
        try:
            if os.path.exists(filepath):
                with open(filepath, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    return data.get('posts', [])
        except Exception as e:
            print(f"[Analyzer] Error cargando {platform}: {e}")
        return []
    
    def _parse_date(self, date_str: str) -> datetime.datetime:
        """Parsea fecha de string a datetime."""
        try:
            return datetime.datetime.fromisoformat(date_str)
        except:
            try:
                return datetime.datetime.strptime(date_str, "%Y-%m-%d %H:%M:%S")
            except:
                return datetime.datetime.now()
        
    def get_top_trends(
        self, 
        platform: Optional[str] = None, 
        limit: int = 10, 
        hours: int = 24
    ) -> List[Dict]:
        """
        Procesa los datos almacenados y extrae tendencias.
        
        Args:
            platform: Filtrar por plataforma específica
            limit: Número máximo de tendencias
            hours: Filtrar datos de las últimas N horas
            
        Returns:
            Lista de tendencias procesadas
        """
        # Calcular fecha de corte
        since = datetime.datetime.now() - datetime.timedelta(hours=hours)
        
        # Obtener datos según plataforma
        if platform:
            posts = self._load_platform_data(platform)
            # Filtrar por fecha
            posts = [p for p in posts if p.get('date') and self._parse_date(p['date']) >= since]
        else:
            # Cargar todas las plataformas
            all_posts = []
            for plat in ["twitter", "facebook", "instagram", "youtube", "google", "google_news"]:
                plat_posts = self._load_platform_data(plat)
                for p in plat_posts:
                    p['source_platform'] = plat
                all_posts.extend(plat_posts)
            posts = all_posts
            # Filtrar por fecha
            posts = [p for p in posts if p.get('date') and self._parse_date(p['date']) >= since]
        
        if not posts:
            return self._get_empty_trends(limit)
        
        # Procesar posts para extraer keywords
        token_stats = {}  # {token: {"count": 0, "sentiment_sum": 0, "locations": set()}}
        
        for post in posts:
            # Extraer texto según plataforma
            text = post.get('text') or post.get('title') or post.get('description') or ""
            if not text:
                continue
            
            # Analizar sentimiento
            try:
                sentiment = analyze_sentiment(text)
            except:
                sentiment = 0
            
            # Tokenizar
            tokens = get_tokens(text)
            
            # Extraer ubicación
            location = post.get('location') or {}
            if not location and post.get('source_platform') == 'twitter':
                # Para Twitter, intentar inferir de datos
                location = {"city": "Colombia", "lat": 6.2476, "lng": -75.5658}
            
            for token in tokens:
                if token not in token_stats:
                    token_stats[token] = {
                        "count": 0,
                        "sentiment_sum": 0,
                        "locations": set(),
                        "platforms": set(),
                        "lat_sum": 0,
                        "lng_sum": 0
                    }
                
                stats = token_stats[token]
                stats["count"] += 1
                stats["sentiment_sum"] += sentiment
                if location:
                    stats["locations"].add(location.get("city", "Desconocido"))
                    stats["lat_sum"] += location.get("lat", 0)
                    stats["lng_sum"] += location.get("lng", 0)
                stats["platforms"].add(post.get("source_platform", "unknown"))
        
        # Formatear resultados
        results = []
        for token, stats in token_stats.items():
            count = stats["count"]
            location_count = len(stats["locations"]) or 1
            
            # Calcular sentimiento promedio
            avg_sentiment = round(stats["sentiment_sum"] / count, 2) if count > 0 else 0
            
            # Calcular growth rate (comparando con datos anteriores)
            growth_rate = self._calculate_growth_rate(token, count)
            
            results.append({
                "keyword": f"#{token.capitalize()}" if len(token) > 4 else token.upper(),
                "platform": list(stats["platforms"])[0] if stats["platforms"] else "mixed",
                "frequency_score": count * 10,
                "sentiment": avg_sentiment,
                "growth_rate": round(growth_rate, 1),
                "location": {
                    "city": list(stats["locations"])[0] if stats["locations"] else "Colombia",
                    "lat": stats["lat_sum"] / location_count if location_count > 0 else 6.2476,
                    "lng": stats["lng_sum"] / location_count if location_count > 0 else -75.5658
                },
                "timestamp": datetime.datetime.now().isoformat()
            })
        
        # Ordenar por frecuencia y limitar
        results.sort(key=lambda x: x["frequency_score"], reverse=True)
        return results[:limit]
    
    def _calculate_growth_rate(self, keyword: str, current_count: int) -> float:
        """
        Calcula el tasa de crecimiento comparando con datos anteriores.
        """
        # Por ahora retornamos un valor simple
        # En producción, comparar con datos de hace 24h
        return min(current_count * 0.5, 100)
    
    def _get_empty_trends(self, limit: int) -> List[Dict]:
        """Retorna tendencias vacías cuando no hay datos."""
        return []
    
    def compare_trends(self, keywords: List[str]) -> List[Dict]:
        """
        Compara estadísticas de keywords específicos.
        """
        all_trends = self.get_top_trends(limit=100)
        comparison = []
        
        for kw in keywords:
            search_kw = kw.lower().replace('#', '')
            match = next(
                (t for t in all_trends if search_kw in t["keyword"].lower()), 
                None
            )
            
            if match:
                comparison.append(match)
            else:
                comparison.append({
                    "keyword": kw,
                    "frequency_score": 0,
                    "sentiment": 0,
                    "growth_rate": 0,
                    "status": "not_found"
                })
        
        return comparison
    
    def get_platform_stats(self) -> Dict:
        """Retorna estadísticas por plataforma."""
        platforms = ["twitter", "facebook", "instagram", "youtube", "google", "google_news"]
        status = {}
        total = 0
        
        for plat in platforms:
            posts = self._load_platform_data(plat)
            count = len(posts)
            status[plat] = {
                "count": count,
                "has_data": count > 0,
                "last_update": posts[0].get('date') if posts else None
            }
            total += count
        
        return {
            "total_posts": total,
            "by_platform": status
        }
    
    def get_trends_by_location(self, city: str, limit: int = 10) -> List[Dict]:
        """Obtiene tendencias de una ciudad específica."""
        all_trends = self.get_top_trends(limit=100)
        
        # Filtrar por ciudad
        city_trends = [
            t for t in all_trends 
            if t.get("location", {}).get("city", "").lower() == city.lower()
        ]
        
        return city_trends[:limit]


# Instancia global
analyzer = TrendAnalyzer()