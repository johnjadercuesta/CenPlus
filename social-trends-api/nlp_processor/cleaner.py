import re
import string
from typing import List

# Lista básica de stopwords en español
STOPWORDS_ES = {
    "el", "la", "los", "las", "un", "una", "unos", "unas", "y", "o", "pero", "si", "por", "para", "de", "con",
    "en", "a", "que", "es", "este", "esta", "estos", "estas", "del", "al", "lo", "su", "sus", "se", "como"
}

def clean_text(text: str) -> str:
    """Limpieza profunda de texto para análisis de tendencias"""
    if not text:
        return ""
    
    # Convertir a minúsculas
    text = text.lower()
    
    # Eliminar URLs
    text = re.sub(r'http\S+|www\S+|https\S+', '', text, flags=re.MULTILINE)
    
    # Eliminar menciones (@usuario) y hashtags (#hashtag se mantiene pero guardamos el texto)
    text = re.sub(r'@\w+', '', text)
    
    # Eliminar puntuación (excepto #)
    text = text.translate(str.maketrans('', '', string.punctuation.replace('#', '')))
    
    # Eliminar números
    text = re.sub(r'\d+', '', text)
    
    # Eliminar espacios extra
    text = re.sub(r'\s+', ' ', text).strip()
    
    return text

def get_tokens(text: str) -> List[str]:
    """Tokenización simple y filtrado de stopwords"""
    cleaned = clean_text(text)
    words = cleaned.split()
    # Filtrar palabras cortas y stopwords
    return [w for w in words if len(w) > 3 and w not in STOPWORDS_ES]
