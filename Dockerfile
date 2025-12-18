# Etapa 1: Build
FROM node:20-alpine AS builder

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar TODAS las dependencias (incluyendo devDependencies para el build)
RUN npm ci

# Copiar el código fuente
COPY . .

# Construir la aplicación NestJS
RUN npm run build

# Etapa 2: Producción
FROM node:20-alpine

# Instalar dependencias del sistema necesarias para yt-dlp y ffmpeg
RUN apk add --no-cache \
    python3 \
    py3-pip \
    ffmpeg \
    && pip3 install --no-cache-dir --break-system-packages yt-dlp

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar solo dependencias de producción
RUN npm ci --only=production

# Copiar el código compilado desde la etapa de build
COPY --from=builder /app/dist ./dist

# Crear directorio temporal para descargas
RUN mkdir -p /app/temp && chmod 777 /app/temp

# Exponer el puerto
EXPOSE 3000

# Variables de entorno por defecto (serán sobrescritas por Railway)
ENV NODE_ENV=production

# Comando para iniciar la aplicación
CMD ["node", "dist/main"]
