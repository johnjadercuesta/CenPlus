import json
import os
from typing import List, Dict, Optional
from datetime import datetime
from pathlib import Path


class DataStorage:
    """
    Almacena los datos de scraping en archivos JSON locales.
    Mantiene un historial de extracciones por fuente.
    """
    
    def __init__(self, data_dir: str = None):
        if data_dir is None:
            # Directorio por defecto: social-trends-api/data
            base_dir = Path(__file__).parent.parent
            data_dir = base_dir / "data"
        
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(exist_ok=True)
        
        # Archivos de datos por plataforma
        self.files = {
            "twitter": self.data_dir / "twitter_data.json",
            "facebook": self.data_dir / "facebook_data.json",
            "instagram": self.data_dir / "instagram_data.json",
            "youtube": self.data_dir / "youtube_data.json",
            "google": self.data_dir / "google_data.json",
            "google_news": self.data_dir / "google_news_data.json",
            "metadata": self.data_dir / "metadata.json"
        }
        
        # Inicializar archivos si no existen
        for key, filepath in self.files.items():
            if not filepath.exists():
                self._init_file(key, filepath)
    
    def _init_file(self, key: str, filepath: Path):
        """Inicializa un archivo JSON con estructura base."""
        if key == "metadata":
            data = {
                "last_update": None,
                "total_posts": 0,
                "sources": {}
            }
        else:
            data = {
                "posts": [],
                "last_update": None,
                "total_count": 0
            }
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    
    def _read_json(self, filepath: Path) -> dict:
        """Lee un archivo JSON."""
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return {"posts": [], "last_update": None, "total_count": 0}
    
    def _write_json(self, filepath: Path, data: dict):
        """Escribe un archivo JSON."""
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    
    # ============== OPERACIONES DE ESCRITURA ==============
    
    def save_posts(self, platform: str, posts: List[Dict]):
        """
        Guarda posts de una plataforma específica.
        
        Args:
            platform: Nombre de la plataforma (twitter, facebook, etc.)
            posts: Lista de posts a guardar
        """
        if platform not in self.files:
            print(f"[DataStorage] Plataforma desconocida: {platform}")
            return
        
        filepath = self.files[platform]
        data = self._read_json(filepath)
        
        # Agregar nuevos posts (evitar duplicados por ID)
        existing_ids = {p.get('id') for p in data.get('posts', [])}
        new_posts = [p for p in posts if p.get('id') not in existing_ids]
        
        data['posts'].extend(new_posts)
        data['last_update'] = datetime.now().isoformat()
        data['total_count'] = len(data['posts'])
        
        self._write_json(filepath, data)
        
        # Actualizar metadata
        self._update_metadata(platform, len(new_posts))
        
        print(f"[DataStorage] Guardados {len(new_posts)} nuevos posts de {platform}. Total: {data['total_count']}")
    
    def _update_metadata(self, platform: str, new_count: int):
        """Actualiza el archivo de metadatos."""
        filepath = self.files["metadata"]
        data = self._read_json(filepath)
        
        if "sources" not in data:
            data["sources"] = {}
        
        if platform not in data["sources"]:
            data["sources"][platform] = {"total": 0, "last_scrape": None}
        
        data["sources"][platform]["total"] += new_count
        data["sources"][platform]["last_scrape"] = datetime.now().isoformat()
        
        data["last_update"] = datetime.now().isoformat()
        
        # Contar total de posts
        total = sum(src.get("total", 0) for src in data["sources"].values())
        data["total_posts"] = total
        
        self._write_json(filepath, data)
    
    # ============== OPERACIONES DE LECTURA ==============
    
    def get_posts(self, platform: str, limit: int = None, since: datetime = None) -> List[Dict]:
        """
        Obtiene posts de una plataforma.
        
        Args:
            platform: Nombre de la plataforma
            limit: Límite de posts a retornar
            since: Filtrar posts desde esta fecha
            
        Returns:
            Lista de posts
        """
        if platform not in self.files:
            return []
        
        filepath = self.files[platform]
        data = self._read_json(filepath)
        
        posts = data.get('posts', [])
        
        # Filtrar por fecha si se especifica
        if since:
            posts = [
                p for p in posts 
                if p.get('date') and datetime.fromisoformat(p['date']) >= since
            ]
        
        # Aplicar límite
        if limit:
            posts = posts[:limit]
        
        return posts
    
    def get_all_posts(self, limit: int = None) -> List[Dict]:
        """Obtiene todos los posts de todas las plataformas."""
        all_posts = []
        
        for platform in ["twitter", "facebook", "instagram", "youtube", "google", "google_news"]:
            posts = self.get_posts(platform)
            for post in posts:
                post['source_platform'] = platform
            all_posts.extend(posts)
        
        # Ordenar por fecha (más recientes primero)
        all_posts.sort(key=lambda x: x.get('date', ''), reverse=True)
        
        if limit:
            all_posts = all_posts[:limit]
        
        return all_posts
    
    def get_metadata(self) -> Dict:
        """Obtiene los metadatos del almacenamiento."""
        filepath = self.files["metadata"]
        return self._read_json(filepath)
    
    def get_platforms_status(self) -> Dict:
        """Obtiene el estado de cada plataforma."""
        status = {}
        
        for platform in ["twitter", "facebook", "instagram", "youtube", "google", "google_news"]:
            posts = self.get_posts(platform)
            status[platform] = {
                "count": len(posts),
                "has_data": len(posts) > 0,
                "last_update": self.get_posts(platform, limit=1)[0].get('date') if posts else None
            }
        
        return status
    
    # ============== OPERACIONES DE LIMPIEZA ==============
    
    def clear_platform(self, platform: str):
        """Limpia todos los datos de una plataforma."""
        if platform not in self.files:
            return
        
        filepath = self.files[platform]
        self._init_file(platform, filepath)
        
        # Actualizar metadata
        filepath_meta = self.files["metadata"]
        data = self._read_json(filepath_meta)
        
        if platform in data.get("sources", {}):
            data["sources"][platform] = {"total": 0, "last_scrape": None}
        
        total = sum(src.get("total", 0) for src in data.get("sources", {}).values())
        data["total_posts"] = total
        data["last_update"] = datetime.now().isoformat()
        
        self._write_json(filepath_meta, data)
    
    def clear_all(self):
        """Limpia todos los datos de todas las plataformas."""
        for platform in ["twitter", "facebook", "instagram", "youtube", "google", "google_news"]:
            self.clear_platform(platform)


# Instancia global
data_storage = DataStorage()