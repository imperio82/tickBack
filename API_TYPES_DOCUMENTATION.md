# API Types Documentation - Frontend Integration Guide

Este documento contiene todos los tipos de datos (TypeScript) que el backend envía al frontend para facilitar la integración y desarrollo del front.

## Tabla de Contenidos

1. [AI Services (Google AI)](#ai-services-google-ai)
2. [Profile Analysis](#profile-analysis)
3. [Competitor Analysis](#competitor-analysis)
4. [Tipos Comunes](#tipos-comunes)

---

## AI Services (Google AI)

**Base URL:** `/ai-services`

### 1. POST `/ai-services/text/generate`
Genera texto usando IA

**Request Body:**
```typescript
interface GenerateTextRequest {
  prompt: string;
  model?: 'gemini-pro-latest' | 'gemini-flash-latest' | 'gemini-2.5-pro' | 'gemini-2.5-flash' | 'gemini-2.0-flash';
  systemInstruction?: string;
  maxOutputTokens?: number; // 1-4096, default: 1024
  temperature?: number; // 0.0-1.0, default: 0.7
  topK?: number; // 1-100, default: 40
  topP?: number; // 0.0-1.0, default: 0.95
}
```

**Response:**
```typescript
interface GenerateTextResponse {
  text: string;
  usage?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}
```

---

### 2. POST `/ai-services/text/generate-with-image`
Genera texto basado en una imagen

**Request (multipart/form-data):**
```typescript
interface GenerateTextWithImageRequest {
  prompt: string;
  image: File; // Archivo de imagen
  systemInstruction?: string;
}
```

**Response:**
```typescript
interface GenerateTextWithImageResponse {
  text: string;
  usage?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}
```

---

### 3. POST `/ai-services/text/conversation`
Genera respuesta en una conversación con historial

**Request Body:**
```typescript
interface ConversationMessage {
  role: 'user' | 'model';
  content: string;
}

interface GenerateConversationRequest {
  messages: ConversationMessage[];
  model?: string; // default: 'gemini-flash-latest'
  systemInstruction?: string;
  maxOutputTokens?: number; // default: 1024
  temperature?: number; // default: 0.7
  topK?: number; // default: 40
  topP?: number; // default: 0.95
}
```

**Response:**
```typescript
interface GenerateConversationResponse {
  text: string;
  usage?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}
```

---

### 4. POST `/ai-services/text/multiple-candidates`
Genera múltiples respuestas candidatas

**Request Body:**
```typescript
interface GenerateMultipleCandidatesRequest {
  prompt: string;
  candidateCount?: number; // 1-5, default: 3
  model?: string; // default: 'gemini-flash-latest'
  systemInstruction?: string;
}
```

**Response:**
```typescript
interface GenerateMultipleCandidatesResponse {
  candidates: string[];
}
```

---

### 5. POST `/ai-services/text/count-tokens`
Cuenta tokens de un texto

**Request Body:**
```typescript
interface CountTokensRequest {
  text: string;
  model?: string; // default: 'gemini-flash-latest'
  systemInstruction?: string;
}
```

**Response:**
```typescript
interface CountTokensResponse {
  text: string;
  tokenCount: number;
  model: string;
}
```

---

### 6. POST `/ai-services/video/analyze`
Analiza un video con Google Video Intelligence

**Request Body:**
```typescript
interface VideoAnalysisRequest {
  videoUrl: string; // URL del video (ej: 'gs://bucket-name/video.mp4')
  userId?: string;
  features?: string[]; // Características específicas a analizar
}
```

**Response:**
```typescript
interface LabelDetection {
  entity: string;
  categoryEntities: string[];
  confidence: number;
  segments: Array<{
    startTime: string;
    endTime: string;
  }>;
}

interface SpeechTranscription {
  alternatives: Array<{
    transcript: string;
    confidence: number;
    words: Array<{
      word: string;
      startTime: string;
      endTime: string;
      speakerTag?: number;
    }>;
  }>;
  languageCode: string;
}

interface ShotChange {
  startTime: string;
  endTime: string;
}

interface VideoAnalysisResponse {
  labels: LabelDetection[];
  speechTranscriptions: SpeechTranscription[];
  shotChanges: ShotChange[];
  processingTime: number;
  videoUri: string;
}
```

---

### 7. GET `/ai-services/video/cost-estimate`
Estima el costo de analizar un video

**Query Params:**
```typescript
interface CostEstimateQuery {
  duration: number; // Duración del video en segundos
}
```

**Response:**
```typescript
interface CostEstimateResponse {
  duration: number;
  estimatedCost: number; // En USD
  breakdown: {
    labelDetection: number;
    speechTranscription: number;
    shotDetection: number;
  };
}
```

---

### 8. GET `/ai-services/models`
Obtiene modelos disponibles

**Response:**
```typescript
interface AvailableModelsResponse {
  models: string[];
}
```

---

### 9. GET `/ai-services/models/check`
Verifica disponibilidad de un modelo

**Query Params:**
```typescript
interface ModelCheckQuery {
  model: string;
}
```

**Response:**
```typescript
interface ModelCheckResponse {
  model: string;
  available: boolean;
}
```

---

## Profile Analysis

**Base URL:** `/profile-analysis`
**Requiere autenticación:** Sí (JWT Bearer Token)

### Flujo de trabajo:
1. **Scrape** → 2. **Filter** → 3. **Get Filtered Videos** → 4. **Analyze Videos** → 5. **Check Status** → 6. **Get Insights**

---

### 1. POST `/profile-analysis/scrape`
**Paso 1:** Scrapea un perfil de TikTok

**Request Body:**
```typescript
interface ScrapeProfileRequest {
  profileUrl: string; // ej: 'https://www.tiktok.com/@username'
  resultsPerPage?: number; // 10-200, default: 50
}
```

**Response:**
```typescript
interface ScrapeProfileResponse {
  analysisId: string; // UUID del análisis (guardar para siguientes pasos)
  totalVideos: number;
  runId: string;
  status: 'scraped';
  message: string;
}
```

---

### 2. POST `/profile-analysis/:analysisId/filter`
**Paso 2:** Filtra datos scrapeados y genera insights preliminares

**Response:**
```typescript
interface FilteredDataResponse {
  filteredDataId: string;
  top5EngagementOptimo: Array<{
    id: string;
    texto: string;
    vistas: number;
    likes: number;
    comentarios: number;
    compartidos: number;
    metricas: any;
    hashtags: string[];
    multimedia: any;
    autor: any;
  }>;
  insights: {
    // Insights preliminares generados por analizarDatosTikTok
    [key: string]: any;
  };
  estadisticas: {
    // Estadísticas generales
    [key: string]: any;
  };
  message: string;
}
```

---

### 3. GET `/profile-analysis/:analysisId/filtered-videos`
**Paso 3:** Obtiene videos filtrados para que el usuario seleccione cuáles analizar

**Response:**
```typescript
interface FilteredVideo {
  id: string;
  videoUrl: string;
  texto: string;
  vistas: number;
  likes: number;
  comentarios: number;
  compartidos: number;
  metricas: any;
  hashtags: string[];
  thumbnail: string;
  autor: any;
  multimedia: any;
}

interface FilteredVideosResponse {
  videos: FilteredVideo[];
  recomendados: string[]; // IDs de videos recomendados (top 3 por engagement)
  totalVideos: number;
}
```

**🎨 Cómo mostrar en el frontend:**
```typescript
// Ejemplo de uso en el frontend
videos.map(video => (
  <VideoCard
    key={video.id}
    thumbnail={video.thumbnail}
    description={video.texto}
    views={video.vistas}
    likes={video.likes}
    comments={video.comentarios}
    shares={video.compartidos}
    hashtags={video.hashtags}
    isRecommended={recomendados.includes(video.id)}
  />
))
```

---

### 4. POST `/profile-analysis/:analysisId/analyze-videos`
**Paso 4:** Inicia el análisis de videos seleccionados

**Request Body:**
```typescript
interface AnalyzeVideosRequest {
  selectedVideoIds: string[]; // IDs de los videos seleccionados
  analysisType?: 'quick' | 'detailed'; // default: 'detailed'
  includeTranscription?: boolean; // default: true
}
```

**Response:**
```typescript
interface AnalyzeVideosResponse {
  jobId: string; // UUID del job (usar para polling de status)
  status: 'queued';
  estimatedTime: number; // Tiempo estimado en segundos
  videosToAnalyze: number;
  message: string;
}
```

---

### 5. GET `/profile-analysis/:analysisId/video-analysis-status/:jobId`
**Paso 5:** Obtiene el estado del análisis (usar para polling)

**Response:**
```typescript
type JobStatus = 'queued' | 'downloading' | 'analyzing_videos' | 'generating_insights' | 'completed' | 'failed';

interface VideoAnalysisStatusResponse {
  jobId: string;
  status: JobStatus;
  progress: number; // 0-100
  currentStep: string; // Descripción del paso actual
  videosProcessed: number;
  videosTotal: number;
  currentVideo?: string;
  errorMessage?: string;
}
```

**🎨 Cómo mostrar en el frontend:**
```typescript
// Polling cada 3 segundos hasta que status === 'completed'
const pollStatus = async () => {
  const response = await fetch(`/profile-analysis/${analysisId}/video-analysis-status/${jobId}`);
  const data: VideoAnalysisStatusResponse = await response.json();

  // Actualizar UI con el progreso
  setProgress(data.progress);
  setCurrentStep(data.currentStep);

  if (data.status === 'completed') {
    // Ir al paso 6 para obtener insights
    fetchInsights();
  } else if (data.status === 'failed') {
    showError(data.errorMessage);
  } else {
    // Continuar polling
    setTimeout(pollStatus, 3000);
  }
};
```

---

### 6. GET `/profile-analysis/:analysisId/insights`
**Paso 6:** Obtiene insights finales del análisis completado

**Response:**
```typescript
interface VideoAnalysisResult {
  videoId: string;
  videoUrl: string;
  videoAnalysis: {
    labels: LabelDetection[];
    speechTranscriptions: SpeechTranscription[];
    shotChanges: ShotChange[];
  };
  downloadedFilePath?: string;
  processingTime?: number;
}

interface GeminiInsights {
  rawResponse: string; // Respuesta cruda de Gemini
  parsedInsights?: {
    recomendaciones: string[];
    patronesIdentificados: string[];
    mejoresPracticas: string[];
    oportunidades: string[];
    [key: string]: any;
  };
}

interface InsightsResponse {
  videoAnalysis: VideoAnalysisResult[];
  geminiInsights: GeminiInsights;
  recommendations: string[]; // Recomendaciones extraídas
  patterns: {
    topLabels: Array<{
      label: string;
      count: number;
    }>;
    totalVideosAnalyzed: number;
  };
  status: 'completed';
}
```

**🎨 Cómo mostrar en el frontend:**
```typescript
// Sección de Recomendaciones
<RecommendationsList recommendations={insights.recommendations} />

// Sección de Patrones
<PatternChart topLabels={insights.patterns.topLabels} />

// Sección de Análisis de Videos
insights.videoAnalysis.map(video => (
  <VideoInsightCard
    key={video.videoId}
    url={video.videoUrl}
    labels={video.videoAnalysis.labels}
    transcription={video.videoAnalysis.speechTranscriptions}
  />
))
```

---

### 7. POST `/profile-analysis/:analysisId/regenerate-insights/:jobId`
**Paso 7 (alternativo):** Regenera solo el análisis final con Gemini

**⚠️ Usar este endpoint para:**
1. **Recuperar errores:** Cuando el análisis con Gemini falló o no se completó correctamente
2. **Generar variantes:** Crear diferentes versiones con enfoques distintos (creativo, viral, educativo)
3. **Más ideas:** Obtener más sugerencias de contenido sin volver a analizar videos
4. **Experimentar:** Probar diferentes temperaturas y enfoques para mejores resultados

**Request Body:**
```typescript
interface RegenerateInsightsRequest {
  temperature?: number; // 0.0-1.0, default: 0.7. Mayor = más creativo
  enfoque?: 'creativo' | 'conservador' | 'analitico' | 'viral' | 'educativo'; // default: 'analitico'
  numeroIdeas?: number; // 1-10, default: 3. Cantidad de ideas de contenido a generar
  guardarVariante?: boolean; // default: true. Si es true, guarda sin sobrescribir
  nombreVariante?: string; // Nombre/etiqueta para esta variante
}
```

**Enfoques disponibles:**
- **`creativo`**: Ideas innovadoras, atrevidas y originales. Formatos únicos que destaquen
- **`conservador`**: Recomendaciones probadas y de bajo riesgo. Contenido evergreen
- **`analitico`**: Insights basados en datos. Análisis profundo con justificaciones numéricas
- **`viral`**: Alto potencial de viralidad. Hooks emocionales y formatos compartibles
- **`educativo`**: Contenido educativo y de valor. Tutoriales y tips prácticos

**Response:**
```typescript
interface RegenerateInsightsResponse {
  success: boolean;
  message: string;
  jobId: string;
  videosAnalizados: number; // Cantidad de videos que se usarán para regenerar
  opciones: {
    enfoque: string;
    temperature: number;
    numeroIdeas: number;
    guardarVariante: boolean;
  };
}
```

**🎨 Cómo usar en el frontend:**

```typescript
// CASO 1: Regenerar por error (sin opciones)
const regenerarPorError = async () => {
  const response = await fetch(
    `/profile-analysis/${analysisId}/regenerate-insights/${jobId}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        guardarVariante: false // Sobrescribir el análisis fallido
      })
    }
  );

  const data = await response.json();
  if (data.success) pollStatus();
};

// CASO 2: Generar variante creativa
const generarVarianteCreativa = async () => {
  const response = await fetch(
    `/profile-analysis/${analysisId}/regenerate-insights/${jobId}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        enfoque: 'creativo',
        temperature: 0.9, // Máxima creatividad
        numeroIdeas: 10,  // Muchas ideas
        guardarVariante: true, // Guardar sin sobrescribir
        nombreVariante: 'Variante Ultra Creativa'
      })
    }
  );

  const data = await response.json();
  if (data.success) pollStatus();
};

// CASO 3: Generar variante viral
const generarVarianteViral = async () => {
  const response = await fetch(
    `/profile-analysis/${analysisId}/regenerate-insights/${jobId}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        enfoque: 'viral',
        temperature: 0.8,
        numeroIdeas: 5,
        guardarVariante: true,
        nombreVariante: 'Variante Viral - ' + new Date().toLocaleDateString()
      })
    }
  );

  const data = await response.json();
  if (data.success) pollStatus();
};

// Ejemplo de UI con selector de enfoque
<Select value={enfoque} onChange={(e) => setEnfoque(e.target.value)}>
  <option value="analitico">📊 Analítico</option>
  <option value="creativo">🎨 Creativo</option>
  <option value="viral">🔥 Viral</option>
  <option value="educativo">📚 Educativo</option>
  <option value="conservador">🛡️ Conservador</option>
</Select>

<Button onClick={() => regenerarConEnfoque(enfoque)}>
  🔄 Generar Variante {enfoque}
</Button>

// Slider para temperatura
<Slider
  min={0}
  max={1}
  step={0.1}
  value={temperature}
  onChange={(v) => setTemperature(v)}
  label="Creatividad"
/>
```

**Ventajas:**
- ✅ **No vuelve a descargar videos** - Ahorra tiempo y costos
- ✅ **No vuelve a analizar con Google AI** - Usa los resultados ya existentes
- ✅ **Solo regenera con Gemini** - Aproximadamente 10-15 segundos
- ✅ **Útil para recuperación de errores** - Si el análisis original falló
- ✅ **Genera variantes ilimitadas** - Experimenta con diferentes enfoques
- ✅ **Conserva el historial** - Todas las variantes se guardan automáticamente
- ✅ **Personalizable** - Controla creatividad, enfoque y cantidad de ideas

**📦 Acceso a variantes guardadas:**

Las variantes se guardan en `processingMetadata.insightsVariantes` del job:

```typescript
// Obtener todas las variantes
const job = await fetch(`/profile-analysis/${analysisId}/video-analysis-status/${jobId}`);
const variantes = job.processingMetadata?.insightsVariantes || [];

// Estructura de una variante
interface InsightVariante {
  nombre: string;           // "Variante Ultra Creativa"
  enfoque: string;          // "creativo"
  temperature: number;      // 0.9
  insights: {
    rawResponse: string;
    parsedInsights: any;
    usage: any;
  };
  generatedAt: Date;
}

// Mostrar selector de variantes en UI
<Select>
  <option value="principal">📊 Análisis Principal</option>
  {variantes.map((v, i) => (
    <option key={i} value={i}>
      {getEnfoqueEmoji(v.enfoque)} {v.nombre}
    </option>
  ))}
</Select>
```

**Flujo recomendado:**
```typescript
// 1. Detectar si los insights están incompletos
if (!insights || !insights.geminiInsights || !insights.geminiInsights.parsedInsights) {
  // 2. Mostrar opción de regenerar
  showRegenerateButton();

  // 3. Al regenerar, hacer polling del status
  await regenerate();
  pollStatus(); // Igual que en el paso 5

  // 4. Cuando complete, obtener insights
  if (status === 'completed') {
    fetchInsights(); // Paso 6
  }
}

// FLUJO AVANZADO: Generar múltiples variantes
const generarVariantesMultiples = async () => {
  const enfoques = ['creativo', 'viral', 'educativo', 'conservador'];

  for (const enfoque of enfoques) {
    await fetch(`/profile-analysis/${analysisId}/regenerate-insights/${jobId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        enfoque,
        temperature: enfoque === 'creativo' ? 0.9 : 0.7,
        numeroIdeas: enfoque === 'viral' ? 10 : 5,
        guardarVariante: true,
        nombreVariante: `Variante ${enfoque}`
      })
    });

    // Esperar a que complete
    await pollUntilComplete();
  }

  // Ahora tienes 4 variantes para comparar
  console.log('✅ 4 variantes generadas!');
};
```

---

### 8. GET `/profile-analysis/user/history`
Obtiene historial de análisis del usuario

**Query Params:**
```typescript
interface HistoryQuery {
  limit?: number; // default: 20
}
```

**Response:**
```typescript
interface ProfileAnalysis {
  id: string;
  userId: string;
  profileUrl: string;
  status: 'scraping' | 'scraped' | 'filtering' | 'analyzing' | 'completed' | 'failed';
  scrapedDataId?: string;
  filteredData?: any;
  createdAt: Date;
  updatedAt: Date;
  scrapingMetadata?: {
    apifyRunId: string;
    totalVideosScraped: number;
    scrapedAt: Date;
  };
}

interface UserHistoryResponse {
  analyses: ProfileAnalysis[];
  total: number;
}
```

---

### 9. GET `/profile-analysis/user/stats`
Obtiene estadísticas del usuario

**Response:**
```typescript
interface UserStatsResponse {
  totalAnalyses: number;
  completedAnalyses: number;
  failedAnalyses: number;
  totalVideosAnalyzed: number;
  averageVideosPerAnalysis: number;
  lastAnalysisDate?: Date;
}
```

---

### 10. DELETE `/profile-analysis/:analysisId`
Elimina un análisis

**Response:**
```typescript
interface DeleteAnalysisResponse {
  success: boolean;
  message: string;
}
```

---

## Competitor Analysis

**Base URL:** `/competitor-analysis`
**Requiere autenticación:** Sí (JWT Bearer Token)

---

### 1. POST `/competitor-analysis/competitors`
Analiza perfiles de competidores

**Request Body:**
```typescript
interface DateRange {
  from: string; // ISO date: '2025-01-01'
  to: string;   // ISO date: '2025-01-31'
}

interface AnalysisFilters {
  minViews?: number; // default: 0
  minEngagementRate?: number; // 0-1, ej: 0.02 = 2%
  dateRange?: DateRange;
}

interface AnalyzeCompetitorsRequest {
  competitorProfiles: string[]; // ej: ['@competitor1', '@competitor2']
  videosPerProfile?: number; // 10-100, default: 50
  analyzeTop?: number; // 5-50, default: 20 (cuántos videos analizar de cada perfil)
  filters?: AnalysisFilters;
}
```

**Response:**
```typescript
interface VideoMetrics {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  engagementRate: number;
}

interface VideoAIAnalysis {
  topics: string[];
  transcript: string;
  sentimentScore?: number;
  keyPhrases?: string[];
}

interface VideoResult {
  videoId: string;
  videoUrl: string;
  profile: string;
  description: string;
  hashtags: string[];
  metrics: VideoMetrics;
  aiAnalysis?: VideoAIAnalysis;
}

interface TopicInsight {
  topic: string;
  frequency: number; // Cuántas veces aparece
  avgEngagement: number;
}

interface HashtagInsight {
  hashtag: string;
  usage: number; // Cuántas veces se usa
  avgViews: number;
  avgEngagement: number;
}

interface ProfileInsight {
  username: string;
  avgEngagement: number;
  totalVideos: number;
  topTopic: string;
}

interface DurationAnalysis {
  optimal: {
    min: number;
    max: number;
    median: number;
  };
  avgDuration: number;
}

interface Insights {
  topTopics: TopicInsight[];
  topHashtags: HashtagInsight[];
  topProfiles?: ProfileInsight[];
  durationAnalysis: DurationAnalysis;
  bestPractices: string[]; // Lista de mejores prácticas identificadas
  viralPatterns?: string[]; // Patrones de videos virales
}

interface ContentSuggestion {
  title: string;
  description: string;
  suggestedHashtags: string[];
  targetAudience?: string;
  estimatedEngagement: 'high' | 'medium-high' | 'medium' | 'low';
  reasoning: string; // Por qué se sugiere este contenido
  inspirationFrom?: string; // De qué video/perfil se inspiró
}

interface AnalysisResponse {
  success: boolean;
  analysisId: string; // UUID del análisis (guardar para historial)
  summary: {
    totalVideos?: number;
    analyzedVideos?: number;
    competitorsAnalyzed?: number;
    processingTime?: number;
  };
  insights: Insights;
  suggestions: ContentSuggestion[]; // Sugerencias de contenido
}
```

**🎨 Cómo mostrar en el frontend:**
```typescript
// Dashboard de Competidores
<CompetitorDashboard>
  <InsightsSection>
    <TopTopics topics={insights.topTopics} />
    <TopHashtags hashtags={insights.topHashtags} />
    <DurationRecommendation duration={insights.durationAnalysis.optimal} />
  </InsightsSection>

  <SuggestionsSection>
    {suggestions.map(suggestion => (
      <SuggestionCard
        key={suggestion.title}
        title={suggestion.title}
        description={suggestion.description}
        hashtags={suggestion.suggestedHashtags}
        engagement={suggestion.estimatedEngagement}
        reasoning={suggestion.reasoning}
      />
    ))}
  </SuggestionsSection>
</CompetitorDashboard>
```

---

### 2. POST `/competitor-analysis/category`
Analiza videos por categoría/hashtags

**Request Body:**
```typescript
interface AnalyzeCategoryRequest {
  hashtags?: string[]; // ej: ['#marketing', '#emprendimiento']
  keywords?: string[]; // ej: ['marketing digital', 'redes sociales']
  numberOfVideos?: number; // 50-500, default: 200
  analyzeTop?: number; // 10-100, default: 30
  region?: string; // ej: 'US', 'MX', 'ES'
  filters?: AnalysisFilters;
}
```

**Response:**
```typescript
interface AnalysisCategoryResponse {
  success: boolean;
  analysisId: string;
  summary: {
    totalVideos?: number;
    analyzedVideos?: number;
    region?: string;
    processingTime?: number;
  };
  insights: Insights;
  suggestions: ContentSuggestion[];
}
```

---

### 3. POST `/competitor-analysis/trending`
Analiza videos en tendencia

**Request Body:**
```typescript
interface AnalyzeTrendingRequest {
  region?: string; // default: 'US'
  numberOfVideos?: number; // 20-200, default: 100
  analyzeTop?: number; // 10-50, default: 20
}
```

**Response:**
```typescript
interface AnalysisTrendingResponse {
  success: boolean;
  analysisId: string;
  summary: {
    totalVideos?: number;
    analyzedVideos?: number;
    region?: string;
    processingTime?: number;
  };
  insights: Insights & {
    trendingPatterns?: string[]; // Patrones de tendencias
    emergingTrends?: string[]; // Tendencias emergentes
  };
  suggestions: ContentSuggestion[];
}
```

---

### 4. POST `/competitor-analysis/comparative`
Análisis comparativo (tu perfil vs competidores)

**Request Body:**
```typescript
interface AnalyzeComparativeRequest {
  yourProfile: string; // ej: '@mi_usuario'
  competitorProfiles: string[]; // ej: ['@competitor1', '@competitor2']
  videosPerProfile?: number; // 20-100, default: 50
}
```

**Response:**
```typescript
interface ComparativeResult {
  yourProfile: {
    avgEngagement: number;
    topTopics: string[];
    strengths: string[]; // Fortalezas de tu perfil
  };
  competitors: {
    avgEngagement: number;
    topTopics: string[];
    opportunities: string[]; // Oportunidades que tienen los competidores
  };
  recommendations: string[]; // Recomendaciones basadas en la comparación
}

interface AnalysisComparativeResponse {
  success: boolean;
  analysisId: string;
  summary: {
    totalVideos?: number;
    analyzedVideos?: number;
    competitorsAnalyzed?: number;
    processingTime?: number;
  };
  insights: Insights;
  suggestions: ContentSuggestion[];
  comparative: ComparativeResult;
}
```

**🎨 Cómo mostrar en el frontend:**
```typescript
// Comparativa Visual
<ComparativeDashboard>
  <ProfileComparison
    yourEngagement={comparative.yourProfile.avgEngagement}
    competitorEngagement={comparative.competitors.avgEngagement}
  />

  <StrengthsWeaknesses
    strengths={comparative.yourProfile.strengths}
    opportunities={comparative.competitors.opportunities}
  />

  <RecommendationsList
    recommendations={comparative.recommendations}
  />
</ComparativeDashboard>
```

---

### 5. GET `/competitor-analysis/history`
Obtiene historial de análisis de competencia

**Query Params:**
```typescript
interface HistoryQuery {
  type?: 'own_profile' | 'competitor_profile' | 'category' | 'comparative' | 'trending';
  page?: number; // default: 1
  limit?: number; // default: 10
}
```

**Response:**
```typescript
interface AnalysisHistory {
  id: string;
  analysisType: 'own_profile' | 'competitor_profile' | 'category' | 'comparative' | 'trending';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  parameters: any; // Parámetros con los que se hizo el análisis
  createdAt: Date;
  completedAt?: Date;
  scrapingMetadata?: any;
}

interface PaginatedHistoryResponse {
  data: AnalysisHistory[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

---

### 6. GET `/competitor-analysis/:id`
Obtiene análisis específico por ID

**Response:**
```typescript
interface AnalysisDetail {
  id: string;
  analysisType: string;
  status: string;
  parameters: any;
  createdAt: Date;
  completedAt?: Date;

  // Resultados completos
  insights: Insights;
  suggestions: ContentSuggestion[];
  comparative?: ComparativeResult;
  videos?: VideoResult[];
}
```

---

## Tipos Comunes

### Estados de Análisis

```typescript
// Profile Analysis
type ProfileAnalysisStatus =
  | 'scraping'
  | 'scraped'
  | 'filtering'
  | 'analyzing'
  | 'completed'
  | 'failed';

// Video Analysis Job
type VideoAnalysisJobStatus =
  | 'queued'
  | 'downloading'
  | 'analyzing_videos'
  | 'generating_insights'
  | 'completed'
  | 'failed';

// Competitor Analysis
type CompetitorAnalysisStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed';
```

---

### Códigos de Error HTTP

```typescript
interface ErrorResponse {
  message: string;
  error?: string;
  statusCode: number;
}
```

**Códigos comunes:**
- `200`: OK - Operación exitosa
- `400`: Bad Request - Parámetros inválidos
- `401`: Unauthorized - No autenticado
- `403`: Forbidden - No autorizado
- `404`: Not Found - Recurso no encontrado
- `500`: Internal Server Error - Error del servidor

---

## Autenticación

Todos los endpoints de **Profile Analysis** y **Competitor Analysis** requieren autenticación JWT.

**Header:**
```typescript
{
  "Authorization": "Bearer <JWT_TOKEN>"
}
```

**Payload del token:**
```typescript
interface JwtPayload {
  userId: string;
  email: string;
  iat: number; // Issued at
  exp: number; // Expiration
}
```

---

## Ejemplos de Integración Frontend

### Ejemplo 1: Flujo completo de Profile Analysis

```typescript
// 1. Scrape
const scrapeResponse = await fetch('/profile-analysis/scrape', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    profileUrl: 'https://www.tiktok.com/@username',
    resultsPerPage: 50
  })
});
const { analysisId } = await scrapeResponse.json();

// 2. Filter
const filterResponse = await fetch(`/profile-analysis/${analysisId}/filter`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` }
});
const { insights, estadisticas } = await filterResponse.json();

// 3. Get Filtered Videos
const videosResponse = await fetch(`/profile-analysis/${analysisId}/filtered-videos`, {
  headers: { 'Authorization': `Bearer ${token}` }
});
const { videos, recomendados } = await videosResponse.json();

// 4. User selects videos in UI
const selectedIds = ['video1', 'video2', 'video3'];

// 5. Analyze Videos
const analyzeResponse = await fetch(`/profile-analysis/${analysisId}/analyze-videos`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ selectedVideoIds: selectedIds })
});
const { jobId } = await analyzeResponse.json();

// 6. Poll Status
const pollStatus = async () => {
  const statusResponse = await fetch(
    `/profile-analysis/${analysisId}/video-analysis-status/${jobId}`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  const status = await statusResponse.json();

  if (status.status === 'completed') {
    // 7. Get Final Insights
    const insightsResponse = await fetch(
      `/profile-analysis/${analysisId}/insights`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    const finalInsights = await insightsResponse.json();
    return finalInsights;
  } else if (status.status === 'failed') {
    throw new Error(status.errorMessage);
  } else {
    // Continue polling
    setTimeout(pollStatus, 3000);
  }
};

pollStatus();
```

---

### Ejemplo 2: Análisis de Competidores

```typescript
const response = await fetch('/competitor-analysis/competitors', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    competitorProfiles: ['@competitor1', '@competitor2'],
    videosPerProfile: 50,
    analyzeTop: 20,
    filters: {
      minViews: 1000,
      minEngagementRate: 0.02
    }
  })
});

const { insights, suggestions, comparative } = await response.json();

// Mostrar en UI
displayInsights(insights);
displaySuggestions(suggestions);
```

---

### Ejemplo 3: Análisis de Trending

```typescript
const response = await fetch('/competitor-analysis/trending', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    region: 'US',
    numberOfVideos: 100,
    analyzeTop: 20
  })
});

const { insights, suggestions } = await response.json();

// Mostrar tendencias
displayTrendingTopics(insights.topTopics);
displayTrendingHashtags(insights.topHashtags);
displayContentSuggestions(suggestions);
```

---

## Notas Importantes

1. **Todos los IDs son UUIDs** (formato: `550e8400-e29b-41d4-a716-446655440000`)

2. **Las fechas están en formato ISO 8601** (ej: `2025-01-01T12:00:00Z`)

3. **Los números de engagement rate son decimales** (0.02 = 2%, 0.15 = 15%)

4. **Polling recomendado:** Cada 3-5 segundos para status de jobs

5. **Límites de videos:**
   - Profile Analysis: hasta 200 videos por scraping
   - Competitor Analysis: hasta 100 videos por perfil
   - Category Analysis: hasta 500 videos totales
   - Trending Analysis: hasta 200 videos

6. **Tiempos estimados:**
   - Scraping: ~30 segundos
   - Filtrado: ~5 segundos
   - Análisis de video: ~30 segundos por video
   - Generación de insights con Gemini: ~10 segundos

---

## Recursos Adicionales

- Swagger/OpenAPI docs: Disponible en `/api-docs` cuando el servidor está corriendo
- Postman Collection: Disponible en el repositorio
- Variables de entorno necesarias: Ver `.env.example`

---

**Última actualización:** 2025-01-01
**Versión de la API:** 1.0.0
