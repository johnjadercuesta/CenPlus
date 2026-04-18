#!/usr/bin/env python
"""
Inicia el servidor FastAPI en un hilo separado para no bloquear la terminal.
"""
import threading
import uvicorn
from pathlib import Path
import os

def run_server():
    """Ejecuta el servidor uvicorn."""
    # Cambiar al directorio del script
    os.chdir(Path(__file__).parent)
    
    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
        log_level="info"
    )

if __name__ == "__main__":
    print("=" * 50)
    print("Iniciando Social Trends API...")
    print("=" * 50)
    
    # Ejecutar en hilo separado
    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()
    
    print("Servidor iniciado en: http://127.0.0.1:8000")
    print("Presiona Ctrl+C para detener")
    print("=" * 50)
    
    # Mantener el hilo principal vivo
    try:
        server_thread.join()
    except KeyboardInterrupt:
        print("\nServidor detenido.")