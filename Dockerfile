FROM node:20-alpine

WORKDIR /app

# Instala dependencias
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund --silent

# Copia el código de la aplicación
COPY . .

ENV PORT=3000
EXPOSE 3000

# En desarrollo usamos el script dev; en producción se puede cambiar a `npm run build && npm run start`
CMD ["npm", "run", "dev"]
