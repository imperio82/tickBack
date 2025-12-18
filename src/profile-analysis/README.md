# 📊 Profile Analysis Module - Documentación Completa

## 🎯 Descripción General

Este módulo implementa un **flujo completo de análisis de perfil de TikTok** con arquitectura modular. Incluye:

1. **Scraping de perfil** con Apify
2. **Filtrado inteligente** de datos con análisis de engagement
3. **Selección de videos** por parte del usuario
4. **Descarga y análisis de videos** con Google Video Intelligence
5. **Generación de insights** con Gemini IA

## 📁 Estructura del Módulo

```
src/profile-analysis/
├── entities/
│   ├── profile-analysis.entity.ts      # Entidad principal del análisis
│   └── video-analysis-job.entity.ts    # Entidad para jobs de procesamiento
├── services/
│   ├── profile-analysis.service.ts     # Servicio de ProfileAnalysis
│   └── video-analysis-job.service.ts   # Servicio de VideoAnalysisJob
├── processors/
│   └── video-analysis.processor.ts     # Procesador asíncrono de videos
├── dto/
│   └── profile-analysis.dto.ts         # DTOs de request/response
├── profile-analysis.controller.ts      # Controlador con todos los endpoints
├── profile-analysis.module.ts          # Módulo de NestJS
└── README.md                           # Esta documentación
```

## 🔄 Flujo Completo del Sistema

### **Paso 1: Scraping del Perfil**

**Endpoint:** `POST /profile-analysis/scrape`

```bash
curl -X POST http://localhost:3000/profile-analysis/scrape \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "profileUrl": "https://www.tiktok.com/@username",
    "resultsPerPage": 50
  }'
```

**Response:**
```json
{
  "analysisId": "uuid-del-analisis",
  "totalVideos": 50,
  "runId": "apify-run-id",
  "status": "scraped",
  "message": "Scraping completado exitosamente. 50 videos obtenidos."
}
```

**¿Qué hace?**
- Ejecuta el scraping con TikTok Apify
- Crea un `ProfileAnalysis` en la BD
- Guarda los datos scrapeados en `Analysis` entity
- Retorna el `analysisId` para los siguientes pasos

---

### **Paso 2: Filtrar Datos**

**Endpoint:** `POST /profile-analysis/:analysisId/filter`

```bash
curl -X POST http://localhost:3000/profile-analysis/{analysisId}/filter \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "filteredDataId": "uuid-del-analisis",
  "top5EngagementOptimo": [
    {
      "id": "7244920758097497350",
      "texto": "Check out this amazing dance!",
      "vistas": 1500000,
      "likes": 250000,
      "comentarios": 5000,
      "compartidos": 3000,
      "hashtags": ["fyp", "dance", "viral"],
      "metricas": {
        "engagementTotal": 258000,
        "tasaEngagement": "17.20"
      },
      "multimedia": {
        "webVideoUrl": "https://...",
        "coverUrl": "https://..."
      }
    }
  ],
  "insights": {
    "recomendacionesContenido": [...],
    "estrategiaHashtags": [...],
    "patronesOptimos": {...}
  },
  "estadisticas": {
    "promedioVistas": 120000,
    "promedioLikes": 15000
  }
}
```

**¿Qué hace?**
- Aplica `analizarDatosTikTok()` a los datos scrapeados
- Filtra y ordena videos por engagement (likes + comments + shares)
- Genera insights preliminares con `obtenerInsightsParaIA()`
- Guarda todo en `ProfileAnalysis.filteredData`

---

### **Paso 3: Obtener Videos Filtrados**

**Endpoint:** `GET /profile-analysis/:analysisId/filtered-videos`

```bash
curl -X GET http://localhost:3000/profile-analysis/{analysisId}/filtered-videos \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "videos": [
    {
      "id": "7244920758097497350",
      "videoUrl": "https://www.tiktok.com/@user/video/...",
      "texto": "Amazing content!",
      "vistas": 1500000,
      "likes": 250000,
      "thumbnail": "https://...",
      "hashtags": ["fyp", "dance"],
      "autor": {
        "nombre": "username",
        "followers": 500000
      }
    }
  ],
  "recomendados": ["7244920758097497350", "..."],
  "totalVideos": 5
}
```

**¿Qué hace?**
- Retorna los videos óptimos para que el **frontend los muestre al usuario**
- El usuario puede seleccionar cuáles videos quiere analizar
- `recomendados` contiene los IDs de los top 3

---

### **Paso 4: Analizar Videos Seleccionados**

**Endpoint:** `POST /profile-analysis/:analysisId/analyze-videos`

```bash
curl -X POST http://localhost:3000/profile-analysis/{analysisId}/analyze-videos \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "selectedVideoIds": [
      "7244920758097497350",
      "7244920758097497351"
    ],
    "analysisType": "detailed"
  }'
```

**Response:**
```json
{
  "jobId": "uuid-del-job",
  "status": "queued",
  "estimatedTime": 60,
  "videosToAnalyze": 2,
  "message": "Análisis iniciado. Job ID: ... Se procesarán 2 videos."
}
```

**¿Qué hace?**
- Crea un `VideoAnalysisJob` con los videos seleccionados
- El job queda en estado `QUEUED`
- Para ejecutar el procesamiento, llamar al endpoint de testing (ver abajo)

---

### **Paso 4.1: Ejecutar el Procesamiento (TESTING)**

**Endpoint:** `POST /profile-analysis/jobs/:jobId/process`

```bash
curl -X POST http://localhost:3000/profile-analysis/jobs/{jobId}/process \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "message": "Procesamiento iniciado para job {jobId}. Usa el endpoint de status para ver el progreso.",
  "jobId": "uuid-del-job"
}
```

**¿Qué hace el Processor?**
1. **Descarga** cada video con `VideoDownloaderService`
2. **Sube** a Google Cloud Storage
3. **Analiza** con Google Video Intelligence API:
   - Labels (dance, music, etc.)
   - Speech transcriptions
   - Shot changes
4. **Guarda en caché** (`VideoAnalysisCache`)
5. **Genera insights** con Gemini IA
6. **Actualiza progreso** en tiempo real

**IMPORTANTE:** En producción, este paso debería ejecutarse automáticamente con un sistema de colas (Bull/BullMQ). Por ahora, se ejecuta manualmente para testing.

---

### **Paso 5: Monitorear el Progreso**

**Endpoint:** `GET /profile-analysis/:analysisId/video-analysis-status/:jobId`

```bash
curl -X GET http://localhost:3000/profile-analysis/{analysisId}/video-analysis-status/{jobId} \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "jobId": "uuid-del-job",
  "status": "analyzing_videos",
  "progress": 45,
  "currentStep": "Analizando video 2/5",
  "videosProcessed": 1,
  "videosTotal": 5,
  "currentVideo": "Analizando video 2/5"
}
```

**Estados posibles:**
- `queued` - En cola (0%)
- `downloading` - Descargando videos (1-35%)
- `analyzing_videos` - Analizando con Google AI (35-70%)
- `generating_insights` - Generando insights con Gemini (70-95%)
- `completed` - Completado (100%)
- `failed` - Fallido

---

### **Paso 6: Obtener Insights Finales**

**Endpoint:** `GET /profile-analysis/:analysisId/insights`

```bash
curl -X GET http://localhost:3000/profile-analysis/{analysisId}/insights \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "videoAnalysis": [
    {
      "videoId": "7244920758097497350",
      "videoData": {
        "texto": "Amazing dance!",
        "vistas": 1500000,
        "hashtags": ["fyp", "dance"]
      },
      "videoAnalysis": {
        "labels": [
          {"entity": "dance", "confidence": 0.95},
          {"entity": "music", "confidence": 0.89}
        ],
        "speechTranscriptions": [...],
        "shotChanges": [...]
      }
    }
  ],
  "geminiInsights": {
    "rawResponse": "...",
    "parsedInsights": {
      "resumenGeneral": "El perfil se enfoca en contenido de baile...",
      "patronesIdentificados": [
        "Videos cortos (15-30s) tienen mejor engagement",
        "Uso de música trending aumenta views en 40%"
      ],
      "recomendaciones": [
        "Publicar entre 6-8 PM para máximo engagement",
        "Usar hashtags #fyp #dance #viral"
      ],
      "ideasContenido": [
        {
          "titulo": "Dance Challenge with trending sound",
          "concepto": "...",
          "hashtags": ["fyp", "dance"],
          "razonamiento": "Basado en tu top video con 1.5M views"
        }
      ]
    }
  },
  "recommendations": [...],
  "patterns": {...},
  "status": "completed"
}
```

---

## 🗄️ Base de Datos

### **Entidad: ProfileAnalysis**

```typescript
{
  id: string;                    // UUID
  userId: string;                // ID del usuario
  profileUrl: string;            // URL del perfil
  scrapedDataId: string;         // Relación con Analysis
  filteredData: {...};           // Datos filtrados
  preliminaryInsights: {...};    // Insights preliminares
  status: ProfileAnalysisStatus; // Estado del análisis
  scrapingMetadata: {...};       // Metadata del scraping
  createdAt: Date;
  updatedAt: Date;
}
```

### **Entidad: VideoAnalysisJob**

```typescript
{
  id: string;                     // UUID
  profileAnalysisId: string;      // Relación con ProfileAnalysis
  userId: string;                 // ID del usuario
  selectedVideoIds: string[];     // Videos seleccionados
  videosDownloaded: [...];        // Videos descargados
  videoAnalysisResults: [...];    // Resultados del análisis
  geminiInsights: {...};          // Insights de Gemini
  status: VideoAnalysisJobStatus; // Estado del job
  progress: number;               // 0-100
  processingMetadata: {...};      // Metadata del proceso
  createdAt: Date;
  completedAt: Date;
}
```

---

## 🛠️ Endpoints Adicionales

### Obtener Historial del Usuario

```bash
GET /profile-analysis/user/history?limit=20
```

### Obtener Estadísticas del Usuario

```bash
GET /profile-analysis/user/stats
```

Response:
```json
{
  "total": 15,
  "completed": 10,
  "inProgress": 2,
  "failed": 3
}
```

### Eliminar Análisis

```bash
DELETE /profile-analysis/:analysisId
```

---

## 🚀 Ejemplo de Flujo Completo (cURL)

```bash
# 1. Scrapear perfil
ANALYSIS_ID=$(curl -X POST http://localhost:3000/profile-analysis/scrape \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"profileUrl": "https://www.tiktok.com/@username"}' \
  | jq -r '.analysisId')

echo "Analysis ID: $ANALYSIS_ID"

# 2. Filtrar datos
curl -X POST http://localhost:3000/profile-analysis/$ANALYSIS_ID/filter \
  -H "Authorization: Bearer $TOKEN"

# 3. Ver videos filtrados
curl -X GET http://localhost:3000/profile-analysis/$ANALYSIS_ID/filtered-videos \
  -H "Authorization: Bearer $TOKEN"

# 4. Analizar videos seleccionados
JOB_ID=$(curl -X POST http://localhost:3000/profile-analysis/$ANALYSIS_ID/analyze-videos \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"selectedVideoIds": ["video1", "video2"]}' \
  | jq -r '.jobId')

echo "Job ID: $JOB_ID"

# 5. Ejecutar procesamiento (TESTING)
curl -X POST http://localhost:3000/profile-analysis/jobs/$JOB_ID/process \
  -H "Authorization: Bearer $TOKEN"

# 6. Monitorear progreso (polling cada 5 segundos)
while true; do
  STATUS=$(curl -s -X GET http://localhost:3000/profile-analysis/$ANALYSIS_ID/video-analysis-status/$JOB_ID \
    -H "Authorization: Bearer $TOKEN" \
    | jq -r '.status')

  echo "Status: $STATUS"

  if [ "$STATUS" = "completed" ] || [ "$STATUS" = "failed" ]; then
    break
  fi

  sleep 5
done

# 7. Obtener insights finales
curl -X GET http://localhost:3000/profile-analysis/$ANALYSIS_ID/insights \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.'
```

---

## ⚙️ Configuración Necesaria

### Variables de Entorno

```env
# Apify
APIFY_TOKEN=your_apify_token

# Google Cloud
GOOGLE_APPLICATION_CREDENTIALS=path/to/credentials.json
GOOGLE_CLOUD_PROJECT_ID=your_project_id

# Google AI (Gemini)
GOOGLE_AI_API_KEY=your_gemini_api_key

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_DATABASE=tick
```

---

## 🔧 Próximos Pasos (Mejoras)

### 1. **Implementar Sistema de Colas**

Actualmente, el processor se ejecuta manualmente. Para producción:

```typescript
// En analyze-videos endpoint
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

constructor(
  @InjectQueue('video-analysis') private videoAnalysisQueue: Queue
) {}

// En vez de retornar el jobId
await this.videoAnalysisQueue.add('process-videos', {
  jobId: job.id
});
```

### 2. **WebSockets para Progreso en Tiempo Real**

```typescript
// En el processor
this.websocketGateway.emit('job-progress', {
  jobId,
  progress,
  status
});
```

### 3. **Optimizaciones**

- **Procesamiento paralelo** de videos (actualmente secuencial)
- **Límites de rate** para Google APIs
- **Retry logic** para fallos transitorios
- **Compresión de videos** antes de analizar (reducir costos)

### 4. **Caché Mejorado**

- El sistema ya usa `VideoAnalysisCache`
- Implementar TTL (time-to-live)
- Limpiar caché antigua periódicamente

---

## 📊 Costos Estimados

### Por Video Analizado

- **Apify Scraping**: ~$0.02 por perfil (50 videos)
- **Google Video Intelligence**: ~$0.10 por minuto de video
- **Google Gemini 1.5 Pro**: ~$0.0035 por 1K tokens

**Ejemplo:** Analizar 5 videos de 30s cada uno:
- Scraping: $0.02
- Video Analysis: $0.25 (5 videos × 0.5 min × $0.10)
- Gemini: ~$0.02
- **Total: ~$0.29**

---

## 🐛 Troubleshooting

### Error: "yt-dlp no está disponible"

Instalar yt-dlp:
```bash
pip install yt-dlp
```

### Error: "No hay datos scrapeados"

Verificar que el paso 1 (scraping) se completó exitosamente y que `scrapedDataId` no es null.

### Error: "Video no tiene URL"

Algunos videos pueden no tener `webVideoUrl`. El processor los omite automáticamente.

### Job se queda en "queued"

Ejecutar manualmente el endpoint `/jobs/:jobId/process` o implementar el sistema de colas.

---

## 📝 Notas Importantes

1. **Todos los datos se relacionan con el userId** - Cada usuario solo ve sus propios análisis
2. **El caché ahorra costos** - Videos ya analizados no se re-procesan
3. **Los insights son generativos** - Cada vez que Gemini analiza, puede dar respuestas ligeramente diferentes
4. **El scraping puede tardar** - Apify puede tomar 1-5 minutos dependiendo del perfil
5. **Google Video Intelligence es costoso** - Usar calidad 'worst' para videos de prueba

---

## 🎓 Ejemplo de Uso en Frontend (React/Vue)

```javascript
// 1. Iniciar scraping
const { analysisId } = await api.post('/profile-analysis/scrape', {
  profileUrl: 'https://www.tiktok.com/@user'
});

// 2. Filtrar
await api.post(`/profile-analysis/${analysisId}/filter`);

// 3. Obtener videos para mostrar al usuario
const { videos, recomendados } = await api.get(
  `/profile-analysis/${analysisId}/filtered-videos`
);

// 4. Usuario selecciona videos (UI)
const selectedIds = ['video1', 'video2'];

// 5. Iniciar análisis
const { jobId } = await api.post(
  `/profile-analysis/${analysisId}/analyze-videos`,
  { selectedVideoIds: selectedIds }
);

// 6. Ejecutar procesamiento (testing)
await api.post(`/profile-analysis/jobs/${jobId}/process`);

// 7. Polling para progreso
const interval = setInterval(async () => {
  const { status, progress } = await api.get(
    `/profile-analysis/${analysisId}/video-analysis-status/${jobId}`
  );

  updateProgressBar(progress);

  if (status === 'completed') {
    clearInterval(interval);
    loadInsights();
  }
}, 5000);

// 8. Mostrar insights
async function loadInsights() {
  const insights = await api.get(
    `/profile-analysis/${analysisId}/insights`
  );

  displayInsights(insights);
}
```

---

¡Listo! 🎉 El sistema está completamente implementado y documentado.
