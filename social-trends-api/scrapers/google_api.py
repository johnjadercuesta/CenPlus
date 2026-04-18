import httpx
from typing import List, Dict
import asyncio


class GoogleAPIScraper:
    """
    Scraper usando Google Custom Search JSON API
    """
    
    async def search(self, query: str, max_results: int = 50, api_key: str = None, cx: str = None) -> List[Dict]:
        """
        Busca en Google usando Custom Search API
        """
        if not api_key or not cx:
            return []
        
        url = "https://www.googleapis.com/customsearch/v1"
        
        params = {
            "key": api_key,
            "cx": cx,
            "q": query,
            "num": min(max_results, 10),
            "gl": "co",
            "hl": "es"
        }
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(url, params=params)
                
                if response.status_code == 200:
                    data = response.json()
                    return self._parse_google_response(data)
                elif response.status_code == 403:
                    print("[Google API] Error: API key o CX inválido")
                else:
                    print(f"[Google API] Error: {response.status_code}")
        except Exception as e:
            print(f"[Google API] Error: {str(e)}")
        
        return []
    
    def _parse_google_response(self, data: dict) -> List[Dict]:
        """Parsea respuesta de Google Custom Search API"""
        results = data.get("items", [])
        
        result = []
        for item in results:
            result.append({
                "title": item.get("title", ""),
                "link": item.get("link", ""),
                "snippet": item.get("snippet", ""),
                "text": item.get("title", "") + " " + item.get("snippet", ""),
                "date": item.get("pagemap", {}).get("metatags", [{}])[0].get("date", ""),
                "platform": "google",
                "location": {"city": "Colombia", "lat": 6.2476, "lng": -75.5658},
                "source": "google_api"
            })
        
        return result


google_api_scraper = GoogleAPIScraper()