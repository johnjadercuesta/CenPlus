from textblob import TextBlob
from typing import Dict

def analyze_sentiment(text: str) -> float:
    """
    Analiza el sentimiento de un texto y retorna un valor entre -1 y 1.
    Usa TextBlob por defecto. (Nota: TextBlob funciona mejor en inglés, 
    para español idealmente usaríamos un modelo pre-entrenado de spaCy o Transformers).
    """
    if not text:
        return 0.0
    
    blob = TextBlob(text)
    # polarity va de -1.0 a 1.0
    return blob.sentiment.polarity

def get_sentiment_label(score: float) -> str:
    if score > 0.2:
        return "Positivo"
    elif score < -0.2:
        return "Negativo"
    else:
        return "Neutral"
