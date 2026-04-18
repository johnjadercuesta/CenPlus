$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

Write-Host "=" * 50
Write-Host "Iniciando Social Trends API..."
Write-Host "=" * 50

# Iniciar el servidor en un Job para que no bloque la terminal
$Job = Start-Job -ScriptBlock {
    param($dir)
    Set-Location $dir
    python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
} -ArgumentList $ScriptDir

# Esperar a que el job inicie
Start-Sleep -Seconds 3

# Verificar si el job está corriendo
if ($Job.State -eq "Running") {
    Write-Host "Servidor iniciado en: http://127.0.0.1:8000" -ForegroundColor Green
    Write-Host "Presiona Ctrl+C para detener" -ForegroundColor Yellow
    Write-Host "=" * 50
    
    # Recibir el resultado del job
    $Job | Receive-Job -Keep
    
    # Mantener el script corriendo
    try {
        while ($Job.State -eq "Running") {
            Start-Sleep -Seconds 1
        }
    } finally {
        Stop-Job $Job
        Remove-Job $Job
    }
} else {
    Write-Host "Error al iniciar el servidor" -ForegroundColor Red
    $Job | Receive-Job
}