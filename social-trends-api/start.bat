@echo off
REM Iniciar servidor FastAPI en nueva ventana
cd /d "%~dp0"
start "FastAPI Server" cmd /k "python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload"
echo Servidor iniciado en http://127.0.0.1:8000
echo Presiona cualquier tecla para salir...
pause > nul