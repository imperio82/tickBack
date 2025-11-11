# TikMark Backend API

API REST desarrollada con NestJS para análisis de contenido de TikTok con integración de Google AI.

## Tabla de Contenidos

- [Características](#características)
- [Stack Tecnológico](#stack-tecnológico)
- [Instalación](#instalación)
- [Configuración](#configuración)
- [Documentación API](#documentación-api)
  - [Autenticación](#autenticación)
  - [Usuarios](#usuarios)
  - [TikTok Scraping](#tiktok-scraping)
  - [Análisis](#análisis)
  - [Servicios de IA](#servicios-de-ia)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Seguridad](#seguridad)

## Características

- 🔐 Autenticación JWT con refresh tokens
- 👥 Gestión completa de usuarios con roles y suscripciones
- 🎵 Scraping de TikTok (hashtags, perfiles, videos, comentarios, sonidos)
- 🤖 Integración con Google AI (Video Intelligence y Gemini)
- 📊 Sistema de análisis y tracking
- 📝 Documentación automática con Swagger
- 🗄️ PostgreSQL con TypeORM
- ✅ Validación de datos con class-validator

## Stack Tecnológico

- **Framework**: NestJS 11.0.1
- **Base de datos**: PostgreSQL con TypeORM
- **Autenticación**: JWT (Passport)
- **Documentación**: Swagger/OpenAPI
- **IA**: Google Cloud Video Intelligence API, Google Generative AI (Gemini)
- **Scraping**: Apify Client
- **Validación**: class-validator, class-transformer

## Instalación

```bash
# Instalar dependencias
npm install

# Desarrollo
npm run start:dev

# Producción
npm run build
npm run start:prod
```

## Configuración

### Variables de Entorno

Crear un archivo `.env` en la raíz del proyecto:

```env
# JWT
TOKEN_SECRET=tu_secreto_jwt_aqui
JWT_EXPIRES_IN=24h
REFRESH_TOKEN_SECRET=tu_secreto_refresh_aqui

# Base de datos PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=tu_password
DB_DATABASE=tick

# Google Cloud
GOOGLE_APPLICATION_CREDENTIALS=./service-google.json
GOOGLE_PROJECT_ID=tu_project_id

# Apify
APIFY_TOKEN=tu_apify_token
```

### Base de Datos

Asegúrate de tener PostgreSQL instalado y crea la base de datos:

```sql
CREATE DATABASE tick;
```

## Documentación API

La API está disponible en: `http://localhost:3000/api`

Documentación Swagger: `http://localhost:3000/doc`

---

## Autenticación

Todos los endpoints protegidos requieren un token JWT en el header:
```
Authorization: Bearer {access_token}
```

### POST /api/auth/login
Iniciar sesión con email y contraseña.

**Body:**
```json
{
  "email": "usuario@example.com",
  "password": "contraseña123"
}
```

**Respuesta:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### POST /api/auth/refresh
Refrescar el access token usando el refresh token.

**Headers:**
```
Authorization: Bearer {refresh_token}
```

**Respuesta:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### GET /api/auth/me
Obtener información del usuario autenticado.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Respuesta:**
```json
{
  "id": "uuid",
  "email": "usuario@example.com",
  "name": "Nombre Usuario",
  "role": "admin",
  "createdAt": "2025-01-15T10:30:00.000Z",
  "updatedAt": "2025-01-15T10:30:00.000Z"
}
```

---

## Usuarios

### POST /api/user
Crear un nuevo usuario.

**Body:**
```json
{
  "email": "nuevo@example.com",
  "username": "usuario123",
  "password": "password123",
  "nombre": "Juan",
  "apellido": "Pérez",
  "telefono": "+34123456789",
  "empresa": "Mi Empresa",
  "cargo": "Analista"
}
```

**Respuesta:**
```json
{
  "id": "uuid",
  "email": "nuevo@example.com",
  "username": "usuario123",
  "nombre": "Juan",
  "apellido": "Pérez",
  "estado": "activo",
  "tipoSuscripcion": "gratuita",
  "creadoEn": "2025-01-15T10:30:00.000Z"
}
```

### GET /api/user
Listar usuarios (paginado).

**Query Parameters:**
- `page` (opcional): Número de página (default: 1)
- `limit` (opcional): Resultados por página (default: 10)

**Respuesta:**
```json
{
  "usuarios": [...],
  "total": 50
}
```

### GET /api/user/:id
Obtener usuario por ID.

**Parámetros:**
- `id`: UUID del usuario

### GET /api/user/email/:email
Obtener usuario por email.

**Parámetros:**
- `email`: Email del usuario

### PUT /api/user/:id
Actualizar información del usuario.

**Body:**
```json
{
  "nombre": "Juan Carlos",
  "apellido": "Pérez García",
  "telefono": "+34987654321",
  "empresa": "Nueva Empresa S.L.",
  "cargo": "Director de Marketing",
  "notificacionesEmail": true,
  "notificacionesPush": false
}
```

### PUT /api/user/:id/suscripcion
Actualizar suscripción del usuario.

**Body:**
```json
{
  "tipoSuscripcion": "premium",
  "fechaVencimiento": "2025-12-31T23:59:59.000Z"
}
```

**Tipos de suscripción:**
- `gratuita`: Plan gratuito
- `basica`: Plan básico
- `premium`: Plan premium
- `empresarial`: Plan empresarial

### PUT /api/user/:id/verificar-email
Marcar el email del usuario como verificado.

### PUT /api/user/:id/incrementar-busquedas
Incrementar el contador de búsquedas utilizadas.

### DELETE /api/user/:id
Eliminar un usuario.

---

## TikTok Scraping

### POST /api/tiktok/scrape/hashtags
Obtener videos por hashtags.

**Body:**
```json
{
  "hashtags": ["marketing", "tiktokads"],
  "numberOfVideos": 50,
  "resultsPerPage": 10,
  "shouldDownloadVideos": false,
  "shouldDownloadCovers": true,
  "shouldDownloadSubtitles": false
}
```

**Respuesta:**
```json
{
  "success": true,
  "data": [...],
  "runId": "apify-run-id",
  "totalResults": 50
}
```

### POST /api/tiktok/scrape/profiles
Obtener videos de perfiles específicos.

**Body:**
```json
{
  "profiles": ["@username1", "@username2"],
  "numberOfVideos": 30,
  "resultsPerPage": 10,
  "shouldDownloadVideos": true
}
```

### POST /api/tiktok/scrape/search
Buscar videos por término de búsqueda.

**Body:**
```json
{
  "search": "digital marketing tips",
  "numberOfVideos": 100,
  "resultsPerPage": 20
}
```

### POST /api/tiktok/scrape/videos
Obtener información de videos específicos.

**Body:**
```json
{
  "videoUrls": [
    "https://www.tiktok.com/@username/video/1234567890",
    "https://www.tiktok.com/@username/video/0987654321"
  ],
  "shouldDownloadVideos": true,
  "shouldDownloadCovers": true,
  "shouldDownloadSubtitles": true
}
```

### POST /api/tiktok/scrape/advanced
Scraping avanzado con múltiples filtros.

**Body:**
```json
{
  "type": "HASHTAG",
  "hashtags": ["viral"],
  "maxResults": 100,
  "minLikes": 1000,
  "maxLikes": 1000000,
  "minViews": 10000,
  "createdAfter": "2025-01-01",
  "createdBefore": "2025-01-31",
  "includeVideoDetails": true,
  "includeAuthorDetails": true,
  "includeMusicDetails": true,
  "region": "US",
  "language": "en"
}
```

**Tipos disponibles:**
- `HASHTAG`: Búsqueda por hashtags
- `PROFILE`: Búsqueda por perfiles
- `SEARCH`: Búsqueda por términos
- `VIDEO`: Videos específicos
- `TREND`: Videos en tendencia
- `MUSIC`: Videos por música

### POST /api/tiktok/scrape/comments
Obtener comentarios de videos.

**Body:**
```json
{
  "videoUrls": ["https://www.tiktok.com/@username/video/1234567890"],
  "maxComments": 100
}
```

### POST /api/tiktok/scrape/sounds
Obtener información de sonidos/música.

**Body:**
```json
{
  "soundUrls": ["https://www.tiktok.com/music/sound-name-1234567890"]
}
```

### GET /api/tiktok/trending
Obtener videos en tendencia.

**Query Parameters:**
- `region` (opcional): Código de región (US, ES, MX, etc.)
- `maxResults` (opcional): Número máximo de resultados

### GET /api/tiktok/run/:runId/status
Obtener el estado de una ejecución de scraping.

**Parámetros:**
- `runId`: ID de la ejecución de Apify

**Respuesta:**
```json
{
  "status": "SUCCEEDED",
  "startedAt": "2025-01-15T10:00:00.000Z",
  "finishedAt": "2025-01-15T10:05:00.000Z",
  "stats": {
    "inputBodyLen": 150,
    "restartCount": 0,
    "workersUsed": 1
  },
  "computeUnits": 0.05
}
```

---

## Análisis

Todos los endpoints de análisis requieren autenticación JWT.

### POST /api/analysis
Crear un nuevo análisis.

**Body:**
```json
{
  "query": "Análisis de tendencias marketing",
  "queryType": "investigacion",
  "description": "Análisis de las principales tendencias en marketing digital",
  "parameters": {
    "hashtags": ["marketing", "digital"],
    "region": "ES"
  },
  "status": "pending"
}
```

**Tipos de consulta:**
- `propia`: Consulta propia
- `investigacion`: Investigación
- `SQL_QUERY`: Consulta SQL

**Estados:**
- `pending`: Pendiente
- `completed`: Completado
- `failed`: Fallido

### GET /api/analysis
Listar análisis del usuario (paginado).

**Query Parameters:**
- `page` (opcional): Número de página
- `limit` (opcional): Resultados por página
- `queryType` (opcional): Filtrar por tipo
- `status` (opcional): Filtrar por estado

**Respuesta:**
```json
{
  "data": [...],
  "total": 25,
  "page": 1,
  "limit": 10,
  "totalPages": 3
}
```

### GET /api/analysis/:id
Obtener análisis específico.

**Parámetros:**
- `id`: ID del análisis

### GET /api/analysis/stats
Obtener estadísticas de análisis del usuario.

**Respuesta:**
```json
{
  "total": 50,
  "byType": {
    "propia": 20,
    "investigacion": 25,
    "SQL_QUERY": 5
  },
  "byStatus": {
    "pending": 5,
    "completed": 40,
    "failed": 5
  },
  "recent": 10
}
```

### GET /api/analysis/search
Buscar en los resultados de análisis.

**Query Parameters:**
- `term`: Término de búsqueda

### GET /api/analysis/duplicates
Obtener análisis duplicados.

**Respuesta:**
```json
{
  "groups": [...],
  "totalGroups": 5,
  "totalDuplicates": 15
}
```

### GET /api/analysis/by-query-type/:queryType
Obtener análisis por tipo de consulta.

**Parámetros:**
- `queryType`: Tipo de consulta (propia, investigacion, SQL_QUERY)

**Query Parameters:**
- `page` (opcional)
- `limit` (opcional)

### GET /api/analysis/date-range
Obtener análisis por rango de fechas.

**Query Parameters:**
- `startDate`: Fecha inicial (ISO 8601)
- `endDate`: Fecha final (ISO 8601)

### PATCH /api/analysis/:id
Actualizar análisis.

**Body:**
```json
{
  "query": "Nuevo título",
  "description": "Nueva descripción",
  "status": "completed"
}
```

### PATCH /api/analysis/:id/status
Actualizar solo el estado del análisis.

**Body:**
```json
{
  "status": "completed"
}
```

### PATCH /api/analysis/:id/result
Actualizar solo el resultado del análisis.

**Body:**
```json
{
  "analysisResult": {
    "videos": 50,
    "engagement": 15000,
    "topHashtags": ["viral", "fyp"]
  }
}
```

### DELETE /api/analysis/:id
Eliminar un análisis.

### DELETE /api/analysis/bulk/multiple
Eliminar múltiples análisis.

**Body:**
```json
{
  "ids": [1, 2, 3, 4, 5]
}
```

**Respuesta:**
```json
{
  "message": "Análisis eliminados correctamente",
  "deletedCount": 5
}
```

---

## Servicios de IA

### Análisis de Video

#### POST /api/ai-services/video/analyze
Analizar un video usando Google Video Intelligence.

**Body:**
```json
{
  "videoUrl": "https://storage.googleapis.com/mi-bucket/video.mp4",
  "userId": "uuid-usuario",
  "features": ["LABEL_DETECTION", "SPEECH_TRANSCRIPTION", "SHOT_CHANGE_DETECTION"]
}
```

**Features disponibles:**
- `LABEL_DETECTION`: Detección de etiquetas
- `SPEECH_TRANSCRIPTION`: Transcripción de audio
- `SHOT_CHANGE_DETECTION`: Detección de cambios de escena
- `EXPLICIT_CONTENT_DETECTION`: Detección de contenido explícito
- `FACE_DETECTION`: Detección de rostros
- `LOGO_RECOGNITION`: Reconocimiento de logos
- `TEXT_DETECTION`: Detección de texto

**Respuesta:**
```json
{
  "labels": [
    {
      "entity": "música",
      "confidence": 0.95,
      "segments": [...]
    }
  ],
  "speechTranscriptions": [
    {
      "transcript": "Hola, bienvenidos...",
      "confidence": 0.92,
      "startTime": "0s",
      "endTime": "5s"
    }
  ],
  "shotChanges": [...],
  "processingTime": 45.2,
  "videoUri": "gs://mi-bucket/video.mp4"
}
```

#### GET /api/ai-services/video/cost-estimate
Estimar el costo de análisis de un video.

**Query Parameters:**
- `duration`: Duración del video en segundos

**Respuesta:**
```json
{
  "duration": 120,
  "estimatedCost": 0.15,
  "currency": "USD",
  "breakdown": {
    "labelDetection": 0.05,
    "speechTranscription": 0.10
  }
}
```

### Generación de Texto con Gemini

#### POST /api/ai-services/text/generate
Generar texto usando Google Gemini.

**Body:**
```json
{
  "prompt": "Escribe un copy para TikTok sobre marketing digital",
  "model": "gemini-1.5-flash",
  "systemInstruction": "Eres un experto en marketing digital",
  "maxOutputTokens": 500,
  "temperature": 0.7,
  "topK": 40,
  "topP": 0.95
}
```

**Modelos disponibles:**
- `gemini-1.5-flash`: Rápido y eficiente
- `gemini-1.5-pro`: Mayor capacidad
- `gemini-2.0-flash-exp`: Experimental
- `gemini-exp-1206`: Experimental avanzado

**Respuesta:**
```json
{
  "text": "¡Descubre los secretos del marketing digital! 📱✨...",
  "model": "gemini-1.5-flash",
  "tokensUsed": 145
}
```

#### POST /api/ai-services/text/generate-with-image
Generar texto a partir de una imagen.

**Headers:**
```
Content-Type: multipart/form-data
```

**Body (form-data):**
- `image`: Archivo de imagen (JPG, PNG, WebP)
- `prompt`: Prompt de texto
- `systemInstruction` (opcional): Instrucción del sistema

**Respuesta:**
```json
{
  "text": "Esta imagen muestra un producto de tecnología...",
  "model": "gemini-1.5-flash",
  "tokensUsed": 98
}
```

#### POST /api/ai-services/text/conversation
Conversación con historial de mensajes.

**Body:**
```json
{
  "messages": [
    {
      "role": "user",
      "content": "¿Qué estrategias de TikTok recomiendas?"
    },
    {
      "role": "model",
      "content": "Recomiendo enfocarte en..."
    },
    {
      "role": "user",
      "content": "¿Y para aumentar el engagement?"
    }
  ],
  "model": "gemini-1.5-flash",
  "systemInstruction": "Eres un experto en redes sociales",
  "maxOutputTokens": 1000,
  "temperature": 0.8
}
```

**Respuesta:**
```json
{
  "text": "Para aumentar el engagement en TikTok...",
  "model": "gemini-1.5-flash",
  "tokensUsed": 234
}
```

#### POST /api/ai-services/text/multiple-candidates
Generar múltiples variaciones de texto.

**Body:**
```json
{
  "prompt": "Escribe un hook para video de TikTok",
  "candidateCount": 3,
  "model": "gemini-1.5-flash",
  "systemInstruction": "Crea hooks llamativos y cortos"
}
```

**Respuesta:**
```json
{
  "candidates": [
    "¿Sabías que el 90% de las personas...?",
    "Lo que nadie te cuenta sobre...",
    "Este truco cambió mi vida por completo..."
  ]
}
```

#### POST /api/ai-services/text/count-tokens
Contar tokens de un texto.

**Body:**
```json
{
  "text": "Este es el texto a analizar...",
  "model": "gemini-1.5-flash",
  "systemInstruction": "Opcional"
}
```

**Respuesta:**
```json
{
  "text": "Este es el texto a analizar...",
  "tokenCount": 42,
  "model": "gemini-1.5-flash"
}
```

### Información de Modelos

#### GET /api/ai-services/models
Obtener lista de modelos disponibles.

**Respuesta:**
```json
{
  "models": [
    "gemini-1.5-flash",
    "gemini-1.5-pro",
    "gemini-2.0-flash-exp",
    "gemini-exp-1206"
  ]
}
```

#### GET /api/ai-services/models/check
Verificar disponibilidad de un modelo.

**Query Parameters:**
- `model`: Nombre del modelo a verificar

**Respuesta:**
```json
{
  "model": "gemini-1.5-flash",
  "available": true
}
```

---

## Estructura del Proyecto

```
src/
├── analisis/              # Módulo de análisis (en desarrollo)
├── apify/                 # Módulo de scraping de TikTok
│   ├── analiticsController/   # Controlador de análisis
│   ├── downloaderVideo/       # Descargador de videos
│   ├── entity/               # Entidades de BD
│   ├── util/                 # Utilidades
│   ├── apify.controller.ts
│   ├── apify.dto.ts
│   ├── apify.module.ts
│   └── apify.service.ts
├── auth/                  # Módulo de autenticación
│   ├── guards/           # Guards JWT
│   ├── dto/              # DTOs de autenticación
│   ├── auth.controller.ts
│   ├── auth.module.ts
│   ├── auth.service.ts
│   ├── strategy.ts
│   └── jwtRefreshStrategy.ts
├── config/               # Módulo de configuración
├── googleAi/             # Módulo de Google AI
│   ├── dto/
│   ├── google-video-intelligence.service.ts
│   ├── googleAI.controller.ts
│   ├── iaLenguageGeneta.ts
│   └── google.module.ts
├── user/                 # Módulo de usuarios
│   ├── dto/
│   ├── user.Entity/
│   ├── user.controller.ts
│   ├── user.module.ts
│   └── user.service.ts
├── util/                 # Utilidades globales
├── app.controller.ts
├── app.module.ts
├── app.service.ts
└── main.ts
```

## Seguridad

### Consideraciones de Seguridad

1. **Autenticación JWT**: Todos los endpoints sensibles están protegidos con JWT
2. **Validación de datos**: Se utiliza class-validator para validar todos los inputs
3. **CORS**: Configurado para permitir requests cross-origin
4. **Rate Limiting**: Se recomienda implementar rate limiting en producción
5. **Variables de entorno**: Todas las credenciales deben estar en variables de entorno

### Recomendaciones para Producción

- [ ] Cambiar `synchronize: true` a `false` en TypeORM
- [ ] Configurar CORS con orígenes específicos
- [ ] Implementar rate limiting
- [ ] Añadir helmet para headers de seguridad
- [ ] Implementar logging y monitoring
- [ ] Configurar SSL/TLS
- [ ] Implementar roles y permisos granulares
- [ ] Añadir validación de archivos subidos
- [ ] Implementar backup automático de base de datos

## Licencia

[Especificar licencia]

## Contacto

[Información de contacto]
