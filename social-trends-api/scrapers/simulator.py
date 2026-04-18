import random
import datetime
from typing import List, Dict

# Datos base para simulación realista en Antioquia/Medellín
LOCATIONS = [
    {"city": "Medellín", "lat": 6.2442, "lng": -75.5812},
    {"city": "Bello", "lat": 6.3373, "lng": -75.5579},
    {"city": "Itagüí", "lat": 6.1846, "lng": -75.5991},
    {"city": "Envigado", "lat": 6.1759, "lng": -75.5841},
    {"city": "Rionegro", "lat": 6.1552, "lng": -75.3737}
]

TOPICS = [
    {"keyword": "Seguridad", "texts": ["Necesitamos más patrullaje en el centro", "La inseguridad está terrible hoy", "Excelente labor de la policía en mi barrio"]},
    {"keyword": "Movilidad", "texts": ["El taco en la regional está imposible", "Metro de Medellín con retrasos", "Malla vial en mal estado"]},
    {"keyword": "Clima", "texts": ["Que calor está haciendo hoy", "Fuerte aguacero en el norte", "Cielo despejado en Medellín"]},
    {"keyword": "Cultura", "texts": ["Evento cultural en el Parque Berrio", "Museo de Antioquia con nueva expo", "Concierto este fin de semana"]},
    {"keyword": "Política", "texts": ["Debate sobre el presupuesto", "Nuevas medidas de la alcaldía", "Encuestas electorales"]}
]

PLATFORMS = ["twitter", "tiktok", "instagram"]

def generate_raw_posts(count: int = 50) -> List[Dict]:
    """Genera una lista de posts simulados con texto crudo y metadatos"""
    posts = []
    for _ in range(count):
        topic = random.choice(TOPICS)
        location = random.choice(LOCATIONS)
        platform = random.choice(PLATFORMS)
        
        posts.append({
            "text": random.choice(topic["texts"]),
            "platform": platform,
            "location": location,
            "timestamp": (datetime.datetime.now() - datetime.timedelta(minutes=random.randint(0, 1440))).isoformat(),
            "user_id": f"user_{random.randint(100, 999)}"
        })
    return posts
