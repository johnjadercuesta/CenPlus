Write-Host "Aplicando configuracion para acceso de desarrollo (trust)..."
Restart-Service postgresql-x64-18 -Force
Write-Host "Servicio Reiniciado. Ya puedes cerrar esta ventana."
Start-Sleep -Seconds 3
