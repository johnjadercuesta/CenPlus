Write-Host "Iniciando instalacion automatica de PostgreSQL y PostGIS usando permisos de Administrador..."
Write-Host "Espere pacientemente, esto puede tomar varios minutos..."

choco install postgresql --params '/Password:postgres' -y
choco install postgis -y

Write-Host "============================"
Write-Host "INSTALACION FINALIZADA."
Write-Host "Puedes cerrar esta ventana azul de comandos."
Write-Host "============================"

New-Item -ItemType File -Force -Path "y:\mis aplicaciones\censos\cenplus\install_done.txt"
