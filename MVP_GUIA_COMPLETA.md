# Guía Completa MVP - TikMark

## Visión General del MVP

TikMark es una plataforma de análisis de TikTok con IA que permite a creadores y marcas:
- 📊 Analizar su propio contenido
- 🔍 Espiar a la competencia
- 📈 Descubrir tendencias
- 💡 Recibir sugerencias de contenido personalizadas

---

## Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                       FRONTEND (React)                       │
│  - Dashboard de análisis                                     │
│  - Visualización de insights                                 │
│  - Lista de sugerencias de contenido                         │
└────────────────────┬────────────────────────────────────────┘
                     │ JWT Auth
┌────────────────────▼────────────────────────────────────────┐
│                    BACKEND (NestJS)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Auth Module  │  │ User Module  │  │ Analysis     │      │
│  │              │  │              │  │ Modules      │      │
│  └──────────────┘  └──────────────┘  └──────┬───────┘      │
│                                              │               │
│  ┌──────────────────────────────────────────▼─────────┐    │
│  │       CompetitorAnalysisService                     │    │
│  │  - analyzeCompetitors()                             │    │
│  │  - analyzeCategory()                                │    │
│  │  - analyzeTrending()                                │    │
│  │  - analyzeComparative()                             │    │
│  └─────┬──────────────┬──────────────┬─────────────┬──┘    │
└────────┼──────────────┼──────────────┼─────────────┼───────┘
         │              │              │             │
    ┌────▼────┐   ┌────▼────┐   ┌────▼────┐   ┌────▼────┐
    │ Apify   │   │ Google  │   │ Google  │   │ PostgreSQL│
    │ Client  │   │ Video   │   │ Gemini  │   │ Database  │
    │         │   │ Intel.  │   │ AI      │   │           │
    └─────────┘   └─────────┘   └─────────┘   └───────────┘
       │                │             │              │
    Scraping      Video Analysis  Suggestions    Storage
```

---

## Base de Datos - Esquema Completo

### Tablas Principales

```sql
-- 1. Usuarios
usuarios (
  id UUID PRIMARY KEY,
  email VARCHAR UNIQUE,
  username VARCHAR UNIQUE,
  password VARCHAR,
  nombre VARCHAR,
  apellido VARCHAR,
  tipoSuscripcion ENUM('gratuita', 'basica', 'premium'),
  limiteBusquedasMes INT DEFAULT 10,
  busquedasUtilizadasMes INT DEFAULT 0,
  creado_en TIMESTAMP,
  actualizado_en TIMESTAMP
)

-- 2. Análisis de Competencia (NUEVO)
competitor_analysis (
  id UUID PRIMARY KEY,
  userId UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  analysisType ENUM('own_profile', 'competitor_profile', 'category', 'comparative', 'trending'),
  status ENUM('pending', 'processing', 'completed', 'failed'),

  -- Parámetros del análisis (JSON)
  parameters JSONB,

  -- Metadata del scraping (JSON)
  scrapingMetadata JSONB,

  -- Resultados completos (JSON)
  results JSONB,

  errorMessage TEXT,
  estimatedCost INT DEFAULT 0,

  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW(),
  completedAt TIMESTAMP
)

-- Índices
CREATE INDEX idx_competitor_analysis_user_created ON competitor_analysis(userId, createdAt DESC);
CREATE INDEX idx_competitor_analysis_type_status ON competitor_analysis(analysisType, status);

-- 3. Cache de Análisis de Videos (NUEVO)
video_analysis_cache (
  id UUID PRIMARY KEY,
  videoId VARCHAR UNIQUE NOT NULL,
  videoUrl VARCHAR,
  profile VARCHAR,

  -- Metadata del video (JSON)
  metadata JSONB,

  -- Métricas (JSON)
  metrics JSONB,

  -- Análisis IA (JSON) - NO CAMBIA
  aiAnalysis JSONB,

  createdAt TIMESTAMP DEFAULT NOW(),
  lastUsed TIMESTAMP DEFAULT NOW()
)

-- Índices
CREATE UNIQUE INDEX idx_video_cache_video_id ON video_analysis_cache(videoId);
CREATE INDEX idx_video_cache_created ON video_analysis_cache(createdAt DESC);
CREATE INDEX idx_video_cache_last_used ON video_analysis_cache(lastUsed DESC);
```

### Estructura de Datos JSON

#### `competitor_analysis.parameters` (ejemplos):

```json
// Para análisis de competidores
{
  "profiles": ["@competitor1", "@competitor2"],
  "numberOfVideos": 50,
  "minViews": 1000,
  "minEngagementRate": 0.02
}

// Para análisis de categoría
{
  "hashtags": ["#marketing", "#emprendimiento"],
  "keywords": ["marketing digital"],
  "numberOfVideos": 200,
  "region": "MX"
}

// Para trending
{
  "region": "US",
  "numberOfVideos": 100
}
```

#### `competitor_analysis.results` (estructura):

```json
{
  "videos": [
    {
      "videoId": "7123456789",
      "videoUrl": "https://tiktok.com/...",
      "profile": "@competitor1",
      "description": "5 tips de marketing...",
      "hashtags": ["#marketing", "#tips"],
      "metrics": {
        "views": 50000,
        "likes": 2500,
        "comments": 150,
        "shares": 80,
        "engagementRate": 0.0546
      },
      "aiAnalysis": {
        "topics": ["marketing", "tips", "negocios"],
        "transcript": "Hoy te traigo 5 tips...",
        "keyPhrases": ["tips de marketing", "estrategia digital"]
      }
    }
  ],
  "insights": {
    "topTopics": [
      {
        "topic": "marketing digital",
        "frequency": 15,
        "avgEngagement": 0.048
      }
    ],
    "topHashtags": [
      {
        "hashtag": "#marketing",
        "usage": 25,
        "avgViews": 45000,
        "avgEngagement": 0.045
      }
    ],
    "topProfiles": [
      {
        "username": "@competitor1",
        "avgEngagement": 0.052,
        "totalVideos": 30,
        "topTopic": "marketing"
      }
    ],
    "durationAnalysis": {
      "optimal": { "min": 15, "max": 30, "median": 22 },
      "avgDuration": 23.5
    },
    "bestPractices": [
      "Videos entre 15-30 segundos tienen mejor engagement",
      "Subtítulos aumentan engagement en 25%",
      "Hooks en primeros 3 segundos son críticos"
    ],
    "trendingPatterns": [
      "Formato problema-solución es recurrente",
      "Videos educativos superan entretenimiento"
    ]
  },
  "contentSuggestions": [
    {
      "title": "5 errores fatales en marketing digital",
      "description": "Crea un video educativo corto (20s) explicando errores comunes basado en el éxito de @competitor1",
      "suggestedHashtags": ["#marketing", "#tips", "#emprendimiento"],
      "targetAudience": "Emprendedores y pequeños negocios",
      "estimatedEngagement": "high",
      "reasoning": "Similar a video top de @competitor1 con 50k views",
      "inspirationFrom": "@competitor1"
    }
  ],
  "comparative": {
    "yourProfile": {
      "avgEngagement": 0.035,
      "topTopics": ["emprendimiento", "motivación"],
      "strengths": ["Alto engagement en motivación"]
    },
    "competitors": {
      "avgEngagement": 0.048,
      "topTopics": ["marketing", "estrategias"],
      "opportunities": ["Contenido más técnico", "Tips prácticos"]
    },
    "recommendations": [
      "Incorporar más contenido educativo técnico",
      "Reducir duración de videos a 15-25 segundos"
    ]
  }
}
```

---

## API Endpoints - Guía Completa

### Base URL
```
http://localhost:3000/api
```

### Autenticación
Todos los endpoints requieren JWT:
```
Authorization: Bearer {access_token}
```

---

### 1. Analizar Propio Perfil

**Endpoint**: `POST /content-suggestions/analyze-profile`

**Request**:
```json
{
  "tiktokUsername": "@mi_usuario",
  "numberOfVideos": 50,
  "analyzeTop": 10,
  "filters": {
    "minViews": 1000,
    "minEngagementRate": 0.02,
    "includeSubtitles": true
  }
}
```

**Response**:
```json
{
  "success": true,
  "analysisId": "uuid-123",
  "profileData": {
    "username": "@mi_usuario",
    "totalVideos": 50,
    "analyzedVideos": 10,
    "avgEngagementRate": 0.035
  },
  "topVideos": [...],
  "insights": {...},
  "contentSuggestions": [...]
}
```

---

### 2. Analizar Competidores

**Endpoint**: `POST /competitor-analysis/competitors`

**Request**:
```json
{
  "competitorProfiles": [
    "@competidor1",
    "@competidor2",
    "@competidor3"
  ],
  "videosPerProfile": 50,
  "analyzeTop": 20,
  "filters": {
    "minViews": 5000,
    "minEngagementRate": 0.03
  }
}
```

**Response**:
```json
{
  "success": true,
  "analysisId": "uuid-456",
  "summary": {
    "competitorsAnalyzed": 3,
    "totalVideos": 150,
    "analyzedVideos": 20,
    "processingTime": 45000
  },
  "insights": {
    "topProfiles": [
      {
        "username": "@competidor1",
        "avgEngagement": 0.052,
        "totalVideos": 50,
        "topTopic": "marketing digital"
      }
    ],
    "topTopics": [...],
    "topHashtags": [...],
    "bestPractices": [...]
  },
  "suggestions": [
    {
      "title": "10 herramientas IA para marketing",
      "description": "Basado en el éxito de @competidor1...",
      "suggestedHashtags": ["#marketing", "#ia", "#herramientas"],
      "estimatedEngagement": "high",
      "reasoning": "Similar a video viral de competidor",
      "inspirationFrom": "@competidor1"
    }
  ]
}
```

---

### 3. Analizar Categoría/Hashtags

**Endpoint**: `POST /competitor-analysis/category`

**Request**:
```json
{
  "hashtags": ["#marketingdigital", "#emprendimiento"],
  "keywords": ["marketing digital", "redes sociales"],
  "numberOfVideos": 200,
  "analyzeTop": 30,
  "region": "MX",
  "filters": {
    "minViews": 10000,
    "minEngagementRate": 0.04
  }
}
```

**Response**:
```json
{
  "success": true,
  "analysisId": "uuid-789",
  "summary": {
    "totalVideos": 200,
    "analyzedVideos": 30,
    "processingTime": 120000
  },
  "insights": {
    "topTopics": [
      {
        "topic": "estrategias de marketing",
        "frequency": 45,
        "avgEngagement": 0.056
      }
    ],
    "topHashtags": [
      {
        "hashtag": "#marketingdigital",
        "usage": 120,
        "avgViews": 78000,
        "avgEngagement": 0.048
      }
    ],
    "topCreators": [
      {
        "username": "@marketing_pro",
        "videoCount": 15,
        "avgEngagement": 0.062
      }
    ],
    "trendingPatterns": [
      "Videos de 'antes vs después' son virales",
      "Tutorials step-by-step dominan la categoría"
    ]
  },
  "suggestions": [...]
}
```

---

### 4. Analizar Trending

**Endpoint**: `POST /competitor-analysis/trending`

**Request**:
```json
{
  "region": "US",
  "numberOfVideos": 100,
  "analyzeTop": 20
}
```

**Response**:
```json
{
  "success": true,
  "analysisId": "uuid-101",
  "summary": {
    "region": "US",
    "totalVideos": 100,
    "analyzedVideos": 20
  },
  "insights": {
    "topTopics": [...],
    "emergingTrends": [
      "Videos con IA generativa están en auge",
      "Challenges de productividad trending"
    ],
    "viralPatterns": [
      "Reacciones a noticias actuales",
      "Mini-documentales de 60 segundos"
    ]
  },
  "suggestions": [...]
}
```

---

### 5. Análisis Comparativo

**Endpoint**: `POST /competitor-analysis/comparative`

**Request**:
```json
{
  "yourProfile": "@mi_usuario",
  "competitorProfiles": [
    "@competidor1",
    "@competidor2"
  ],
  "videosPerProfile": 50
}
```

**Response**:
```json
{
  "success": true,
  "analysisId": "uuid-202",
  "comparison": {
    "yourProfile": {
      "avgEngagement": 0.035,
      "topTopics": ["motivación", "emprendimiento"],
      "strengths": [
        "Alto engagement en contenido motivacional",
        "Audiencia muy comprometida en comentarios"
      ]
    },
    "competitors": {
      "avgEngagement": 0.048,
      "topTopics": ["marketing", "estrategias", "herramientas"],
      "opportunities": [
        "Contenido más técnico y práctico",
        "Mayor uso de datos y estadísticas",
        "Videos más cortos (15-20s)"
      ]
    },
    "recommendations": [
      "Combinar motivación con tips técnicos",
      "Reducir duración promedio a 18 segundos",
      "Incorporar hashtags #marketing y #estrategias",
      "Agregar más valor educativo concreto"
    ]
  },
  "suggestions": [
    {
      "title": "Motivación + Estrategia: Cómo crecer tu negocio",
      "description": "Fusiona tu fortaleza en motivación con estrategias prácticas...",
      "suggestedHashtags": ["#emprendimiento", "#marketing", "#motivacion"],
      "estimatedEngagement": "high",
      "reasoning": "Combina tu fortaleza con oportunidad identificada"
    }
  ]
}
```

---

### 6. Historial de Análisis

**Endpoint**: `GET /competitor-analysis/history`

**Query Parameters**:
- `type` (opcional): `own_profile | competitor_profile | category | trending | comparative`
- `page` (opcional): número de página (default: 1)
- `limit` (opcional): resultados por página (default: 10)

**Request**:
```
GET /competitor-analysis/history?type=competitor_profile&page=1&limit=10
```

**Response**:
```json
{
  "data": [
    {
      "id": "uuid-456",
      "analysisType": "competitor_profile",
      "status": "completed",
      "parameters": {
        "profiles": ["@comp1", "@comp2"]
      },
      "createdAt": "2025-01-15T10:00:00Z",
      "completedAt": "2025-01-15T10:05:00Z"
    }
  ],
  "total": 25,
  "page": 1,
  "limit": 10,
  "totalPages": 3
}
```

---

### 7. Obtener Análisis Específico

**Endpoint**: `GET /competitor-analysis/:id`

**Request**:
```
GET /competitor-analysis/uuid-456
```

**Response**:
```json
{
  "id": "uuid-456",
  "userId": "user-123",
  "analysisType": "competitor_profile",
  "status": "completed",
  "parameters": {...},
  "scrapingMetadata": {
    "totalVideosScraped": 150,
    "videosAfterFilter": 120,
    "videosAnalyzedWithAI": 20,
    "scrapingDuration": 45000
  },
  "results": {
    "videos": [...],
    "insights": {...},
    "contentSuggestions": [...]
  },
  "createdAt": "2025-01-15T10:00:00Z",
  "completedAt": "2025-01-15T10:05:00Z"
}
```

---

## Integración Frontend - Ejemplos

### 1. Analizar Competidores

```typescript
// frontend/src/services/analysisService.ts
import axios from 'axios';

const API_BASE = 'http://localhost:3000/api';

export const analyzeCompetitors = async (
  competitorProfiles: string[],
  filters?: any
) => {
  const token = localStorage.getItem('access_token');

  const response = await axios.post(
    `${API_BASE}/competitor-analysis/competitors`,
    {
      competitorProfiles,
      videosPerProfile: 50,
      analyzeTop: 20,
      filters
    },
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );

  return response.data;
};

// Uso en componente React
function CompetitorAnalysisPage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const data = await analyzeCompetitors(
        ['@competitor1', '@competitor2'],
        {
          minViews: 5000,
          minEngagementRate: 0.03
        }
      );
      setResults(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={handleAnalyze} disabled={loading}>
        {loading ? 'Analizando...' : 'Analizar Competencia'}
      </button>

      {results && (
        <div>
          <h2>Resultados</h2>
          <InsightsCard insights={results.insights} />
          <SuggestionsCard suggestions={results.suggestions} />
        </div>
      )}
    </div>
  );
}
```

### 2. Mostrar Sugerencias de Contenido

```typescript
// frontend/src/components/SuggestionsCard.tsx
interface Suggestion {
  title: string;
  description: string;
  suggestedHashtags: string[];
  estimatedEngagement: 'high' | 'medium-high' | 'medium' | 'low';
  reasoning: string;
  inspirationFrom?: string;
}

function SuggestionsCard({ suggestions }: { suggestions: Suggestion[] }) {
  const engagementColors = {
    high: 'bg-green-500',
    'medium-high': 'bg-blue-500',
    medium: 'bg-yellow-500',
    low: 'bg-gray-500'
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold">Sugerencias de Contenido</h3>

      {suggestions.map((suggestion, index) => (
        <div key={index} className="border rounded-lg p-4 shadow">
          <div className="flex items-center gap-2">
            <h4 className="text-lg font-semibold">{suggestion.title}</h4>
            <span className={`px-2 py-1 rounded text-white text-xs ${engagementColors[suggestion.estimatedEngagement]}`}>
              {suggestion.estimatedEngagement}
            </span>
          </div>

          <p className="text-gray-700 mt-2">{suggestion.description}</p>

          <div className="flex gap-2 mt-3">
            {suggestion.suggestedHashtags.map(tag => (
              <span key={tag} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                {tag}
              </span>
            ))}
          </div>

          <p className="text-sm text-gray-600 mt-2">
            <strong>Por qué funcionará:</strong> {suggestion.reasoning}
          </p>

          {suggestion.inspirationFrom && (
            <p className="text-sm text-purple-600 mt-1">
              💡 Inspirado en: {suggestion.inspirationFrom}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
```

### 3. Dashboard de Insights

```typescript
// frontend/src/components/InsightsDashboard.tsx
function InsightsDashboard({ insights }: any) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Top Topics */}
      <div className="border rounded-lg p-4">
        <h3 className="font-bold mb-3">Temas Principales</h3>
        <ul className="space-y-2">
          {insights.topTopics.slice(0, 5).map((topic: any) => (
            <li key={topic.topic} className="flex justify-between">
              <span>{topic.topic}</span>
              <span className="text-gray-600">
                {topic.frequency} videos ({(topic.avgEngagement * 100).toFixed(2)}% eng)
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Top Hashtags */}
      <div className="border rounded-lg p-4">
        <h3 className="font-bold mb-3">Hashtags Efectivos</h3>
        <ul className="space-y-2">
          {insights.topHashtags.slice(0, 5).map((hashtag: any) => (
            <li key={hashtag.hashtag} className="flex justify-between">
              <span className="text-blue-600">{hashtag.hashtag}</span>
              <span className="text-gray-600">
                {hashtag.avgViews.toLocaleString()} views
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Best Practices */}
      <div className="border rounded-lg p-4 md:col-span-2">
        <h3 className="font-bold mb-3">Mejores Prácticas Identificadas</h3>
        <ul className="list-disc list-inside space-y-1">
          {insights.bestPractices.map((practice: string, i: number) => (
            <li key={i} className="text-gray-700">{practice}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
```

---

## Plan de Implementación

### Fase 1: Base (Semana 1)
- [ ] Crear entidades `CompetitorAnalysis` y `VideoAnalysisCache`
- [ ] Migración de base de datos
- [ ] Implementar servicio base `CompetitorAnalysisService`

### Fase 2: Análisis Básico (Semana 2)
- [ ] Implementar `analyzeCompetitors()`
- [ ] Implementar sistema de caché
- [ ] Crear endpoints básicos
- [ ] Pruebas con perfiles reales

### Fase 3: Análisis Avanzado (Semana 3)
- [ ] Implementar `analyzeCategory()`
- [ ] Implementar `analyzeTrending()`
- [ ] Mejorar generación de insights con IA
- [ ] Optimizar costos

### Fase 4: Comparativas y Frontend (Semana 4)
- [ ] Implementar `analyzeComparative()`
- [ ] Crear componentes React
- [ ] Dashboard de insights
- [ ] Sistema de notificaciones

### Fase 5: Optimización (Semana 5)
- [ ] Implementar cola de trabajos (Bull)
- [ ] Webhooks para análisis largos
- [ ] Limpieza automática de caché viejo
- [ ] Documentación completa

---

## Límites de Suscripción Recomendados

```typescript
const SUBSCRIPTION_LIMITS = {
  gratuita: {
    analysisPerMonth: 3,
    videosPerAnalysis: 50,
    competitorsPerAnalysis: 2,
    aiAnalysisPerMonth: 10,  // videos analizados con IA
  },
  basica: {
    analysisPerMonth: 10,
    videosPerAnalysis: 100,
    competitorsPerAnalysis: 5,
    aiAnalysisPerMonth: 50,
  },
  premium: {
    analysisPerMonth: 50,
    videosPerAnalysis: 200,
    competitorsPerAnalysis: 10,
    aiAnalysisPerMonth: 200,
  },
  empresarial: {
    analysisPerMonth: -1,  // ilimitado
    videosPerAnalysis: 500,
    competitorsPerAnalysis: 20,
    aiAnalysisPerMonth: -1,
  }
};
```

---

## Costos Estimados por Análisis

| Tipo de Análisis | Videos Scrapeados | Videos con IA | Costo Apify | Costo IA | Total |
|------------------|-------------------|---------------|-------------|----------|-------|
| Propio Perfil | 50 | 10 | $0.05 | $1.00 | ~$1.05 |
| 3 Competidores | 150 | 20 | $0.08 | $2.00 | ~$2.08 |
| Categoría | 200 | 30 | $0.10 | $3.00 | ~$3.10 |
| Trending | 100 | 20 | $0.05 | $2.00 | ~$2.05 |
| Comparativo | 200 | 30 | $0.10 | $3.00 | ~$3.10 |

**Con caché activo**: -60% a -80% en análisis repetidos

---

## Optimizaciones Futuras

1. **Cola de Trabajos**
   ```typescript
   // Usar Bull Queue para análisis largos
   @InjectQueue('analysis')
   private analysisQueue: Queue

   async queueAnalysis(params) {
     await this.analysisQueue.add('analyze-competitors', params);
     return { jobId: job.id };
   }
   ```

2. **Webhooks**
   ```typescript
   // Notificar al frontend cuando termine
   async onAnalysisComplete(analysisId: string) {
     await this.webhookService.notify(userId, {
       event: 'analysis.completed',
       analysisId
     });
   }
   ```

3. **Caché Inteligente**
   ```sql
   -- Limpiar videos no usados en 30 días
   DELETE FROM video_analysis_cache
   WHERE lastUsed < NOW() - INTERVAL '30 days';
   ```

4. **Rate Limiting**
   ```typescript
   @UseGuards(ThrottlerGuard)
   @Throttle(3, 60) // 3 análisis por minuto
   async analyzeCompetitors() {}
   ```

---

## Resumen

✅ **4 tipos de análisis** completos
✅ **Base de datos** con relaciones al usuario
✅ **Caché de videos** para ahorro de costos
✅ **Sugerencias con IA** contextualizadas
✅ **API REST** completa y documentada
✅ **Ejemplos de frontend** listos para usar

🚀 **Listo para implementar el MVP completo**

