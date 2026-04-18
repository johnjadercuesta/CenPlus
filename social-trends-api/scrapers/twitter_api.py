import httpx
from typing import List, Dict, Optional
import asyncio


class TwitterAPIScraper:
    """
    Scraper usando la API oficial de Twitter/X (Twitter API v2)
    """
    
    async def search(self, query: str, max_results: int = 100, bearer_token: str = None) -> List[Dict]:
        """
        Busca tweets usando Twitter API v2
        """
        if not bearer_token:
            return []
        
        url = "https://api.twitter.com/2/tweets/search/recent"
        
        headers = {
            "Authorization": f"Bearer {bearer_token}",
            "Content-Type": "application/json"
        }
        
        params = {
            "query": f"{query} -is:retweet lang:es",
            "max_results": min(max_results, 100),
            "tweet.fields": "created_at,public_metrics,author_id,geo",
            "expansions": "author_id",
            "user.fields": "username,name,location"
        }
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(url, headers=headers, params=params)
                
                if response.status_code == 200:
                    data = response.json()
                    return self._parse_twitter_response(data)
                elif response.status_code == 401:
                    print("[Twitter API] Error: Token inválido o expirado")
                elif response.status_code == 429:
                    print("[Twitter API] Error: Rate limit alcanzado")
                else:
                    print(f"[Twitter API] Error: {response.status_code} - {response.text[:200]}")
        except Exception as e:
            print(f"[Twitter API] Error: {str(e)}")
        
        return []
    
    def _parse_twitter_response(self, data: dict) -> List[Dict]:
        """Parsea respuesta de Twitter API a formato interno"""
        tweets = data.get("data", [])
        users = {u["id"]: u for u in data.get("includes", {}).get("users", [])}
        
        result = []
        for tweet in tweets:
            user = users.get(tweet.get("author_id", ""), {})
            metrics = tweet.get("public_metrics", {})
            
            result.append({
                "id": tweet.get("id", ""),
                "text": tweet.get("text", ""),
                "date": tweet.get("created_at", ""),
                "username": user.get("username", ""),
                "user_displayname": user.get("name", ""),
                "followers": 0,
                "retweets": metrics.get("retweet_count", 0),
                "likes": metrics.get("like_count", 0),
                "replies": metrics.get("reply_count", 0),
                "hashtags": [],
                "mentions": [],
                "url": f"https://twitter.com/{user.get('username', '')}/status/{tweet.get('id', '')}",
                "platform": "twitter",
                "location": {"city": "Colombia", "lat": 6.2476, "lng": -75.5658},
                "raw_date": tweet.get("created_at", ""),
                "query_used": "",
                "source": "twitter_api"
            })
        
        return result


twitter_api_scraper = TwitterAPIScraper()