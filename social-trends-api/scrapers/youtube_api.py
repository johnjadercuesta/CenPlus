import httpx
from typing import List, Dict
import asyncio


class YouTubeAPIScraper:
    """
    Scraper usando YouTube Data API v3
    """
    
    async def search_videos(self, query: str, max_results: int = 50, api_key: str = None) -> List[Dict]:
        """
        Busca videos usando YouTube Data API
        """
        if not api_key:
            return []
        
        url = "https://www.googleapis.com/youtube/v3/search"
        
        params = {
            "part": "snippet",
            "q": query,
            "type": "video",
            "maxResults": min(max_results, 50),
            "key": api_key,
            "regionCode": "CO",
            "relevanceLanguage": "es"
        }
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(url, params=params)
                
                if response.status_code == 200:
                    data = response.json()
                    return self._parse_youtube_response(data)
                elif response.status_code == 403:
                    print("[YouTube API] Error: API key inválida o cuota excedida")
                else:
                    print(f"[YouTube API] Error: {response.status_code}")
        except Exception as e:
            print(f"[YouTube API] Error: {str(e)}")
        
        return []
    
    def _parse_youtube_response(self, data: dict) -> List[Dict]:
        """Parsea respuesta de YouTube API"""
        videos = data.get("items", [])
        
        result = []
        for video in videos:
            snippet = video.get("snippet", {})
            
            result.append({
                "id": video.get("id", {}).get("videoId", ""),
                "title": snippet.get("title", ""),
                "description": snippet.get("description", ""),
                "text": snippet.get("title", "") + " " + snippet.get("description", ""),
                "channel_title": snippet.get("channelTitle", ""),
                "published_at": snippet.get("publishedAt", ""),
                "thumbnail": snippet.get("thumbnails", {}).get("high", {}).get("url", ""),
                "platform": "youtube",
                "location": {"city": "Colombia", "lat": 6.2476, "lng": -75.5658},
                "source": "youtube_api"
            })
        
        return result


youtube_api_scraper = YouTubeAPIScraper()