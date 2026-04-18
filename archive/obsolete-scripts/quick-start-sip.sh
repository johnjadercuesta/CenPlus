#!/bin/bash
# quick-start-sip.sh
# Script para inicializar rápidamente el Sistema SIP

echo "🧠 INICIALIZANDO SISTEMA DE INTELIGENCIA POBLACIONAL (SIP)..."
echo ""

# 1. Verificar que el servidor esté corriendo
echo "🔍 Verificando servidor en localhost:3000..."
if ! curl -s http://localhost:3000/api/auth/me > /dev/null 2>&1; then
  echo "❌ El servidor no parece estar corriendo en localhost:3000"
  echo "   Inicia con: npm run dev"
  exit 1
fi
echo "✅ Servidor detectado"
echo ""

# 2. Obtener token de admin (requiere credentials)
echo "📝 Ingresa credenciales de administrador:"
read -p "Email: " ADMIN_EMAIL
read -p "Contraseña: " -s ADMIN_PASS
echo ""

echo "🔐 Autenticando..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$ADMIN_EMAIL\", \"password\": \"$ADMIN_PASS\"}")

ADMIN_TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$ADMIN_TOKEN" ]; then
  echo "❌ Error de autenticación. Verifica email/contraseña"
  exit 1
fi
echo "✅ Token obtenido"
echo ""

# 3. Inicializar SIP
echo "🚀 Inicializando tablas y datos del SIP..."
INIT_RESPONSE=$(curl -s http://localhost:3000/api/intelligence/init-sip \
  -H "Authorization: Bearer $ADMIN_TOKEN")

echo "📊 Respuesta del servidor:"
echo $INIT_RESPONSE | grep -o "success\|error" && echo "✅ SIP INICIALIZADO CORRECTAMENTE"

echo ""
echo "📌 Próximos pasos:"
echo "   1. Abre el navegador: http://localhost:3000/dashboard/inteligencia-sip"
echo "   2. Deberías ver la Matriz de Priorización Administrativa"
echo "   3. Haz clic en un municipio para ver crisis específicas"
echo ""
echo "📚 Documentación: Ver SIP_README.md"
echo ""
