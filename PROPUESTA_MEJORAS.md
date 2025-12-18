# Propuesta de Mejoras - TikMark Backend

## Análisis del Flujo Actual

### Estado Actual
1. **Scraping de Perfil**: Se obtienen videos del perfil del usuario usando Apify
2. **Almacenamiento**: Los datos se guardan en la tabla `Analysis`
3. **Problema**: Los datos NO se analizan con IA ni se generan sugerencias

### Servicios Disponibles Pero No Integrados
- ✅ Google Video Intelligence API (análisis de videos)
- ✅ Google Gemini (generación de texto e insights)
- ❌ NO hay integración entre scraping y análisis de IA
- ❌ NO hay generación de sugerencias de contenido

---

## Propuesta de Mejora: Flujo Completo de Análisis

### Objetivo
Crear un flujo automatizado que:
1. Scrapee el perfil del usuario de TikTok
2. Filtre y seleccione los videos más exitosos
3. Analice el contenido con Google Video Intelligence
4. Genere sugerencias de contenido con Gemini
5. Retorne insights accionables al frontend

---

## Nuevo Flujo Propuesto

```
┌─────────────────────────────────────────────────────────────┐
│                    FLUJO MEJORADO                            │
└─────────────────────────────────────────────────────────────┘

1. SCRAPING DE PERFIL
   ├── Usuario proporciona: @username de TikTok
   ├── Apify scrapea: últimos 50-100 videos del perfil
   └── Datos obtenidos:
       ├── Metadata: likes, views, comments, shares
       ├── URLs de videos
       ├── Descriptions y hashtags
       └── Información del audio/música

2. FILTRADO INTELIGENTE
   ├── Calcular engagement rate: (likes + comments + shares) / views
   ├── Seleccionar top 10 videos por engagement
   ├── Filtrar videos con subtítulos disponibles
   └── Priorizar videos con más de X visualizaciones

3. ANÁLISIS CON IA (Para cada video seleccionado)
   ├── Google Video Intelligence:
   │   ├── Detección de etiquetas/temas
   │   ├── Transcripción de audio
   │   └── Detección de cambios de escena
   └── Procesamiento de datos:
       ├── Extraer temas recurrentes
       ├── Identificar palabras clave
       └── Analizar estructura de videos exitosos

4. GENERACIÓN DE INSIGHTS (Con Gemini)
   ├── Analizar patrones en videos exitosos:
   │   ├── Temas más populares
   │   ├── Hashtags más efectivos
   │   ├── Duración óptima de videos
   │   └── Estructura narrativa común
   └── Generar sugerencias de contenido:
       ├── 5-10 ideas de contenido similares
       ├── Hashtags recomendados
       ├── Mejores prácticas identificadas
       └── Temas trending en el perfil

5. RESPUESTA AL FRONTEND
   └── JSON estructurado con:
       ├── Resumen del análisis
       ├── Top videos analizados
       ├── Insights clave
       ├── Sugerencias de contenido
       └── Métricas de engagement
```

---

## Implementación: Nuevos Endpoints

### 1. Endpoint Principal: Análisis Completo de Perfil

**POST /api/analysis/profile-complete**

Request:
```json
{
  "tiktokUsername": "@username",
  "numberOfVideos": 50,
  "analyzeTop": 10,
  "filters": {
    "minViews": 1000,
    "minEngagementRate": 0.02,
    "includeSubtitles": true
  }
}
```

Response:
```json
{
  "success": true,
  "analysisId": "uuid",
  "profileData": {
    "username": "@username",
    "totalVideos": 50,
    "analyzedVideos": 10,
    "avgEngagementRate": 0.045
  },
  "topVideos": [
    {
      "videoUrl": "https://tiktok.com/...",
      "views": 50000,
      "likes": 2500,
      "engagementRate": 0.05,
      "topics": ["marketing", "tips", "business"],
      "transcript": "Texto completo del video...",
      "keyHashtags": ["#marketing", "#tips"]
    }
  ],
  "insights": {
    "topTopics": [
      {
        "topic": "Marketing Digital",
        "frequency": 7,
        "avgEngagement": 0.048
      }
    ],
    "topHashtags": [
      {
        "hashtag": "#marketing",
        "usage": 8,
        "avgViews": 45000
      }
    ],
    "bestPractices": [
      "Los videos entre 15-30 segundos tienen mejor engagement",
      "El uso de subtítulos aumenta el engagement en 25%",
      "Videos educativos superan a los de entretenimiento"
    ]
  },
  "contentSuggestions": [
    {
      "title": "5 errores comunes en marketing digital",
      "description": "Basado en tu contenido exitoso sobre tips...",
      "suggestedHashtags": ["#marketing", "#tips", "#digitalmarketing"],
      "estimatedEngagement": "high",
      "reasoning": "Similar a tu video más exitoso que obtuvo 50k views"
    },
    {
      "title": "Herramientas gratuitas para emprendedores",
      "description": "Crea una serie sobre herramientas...",
      "suggestedHashtags": ["#emprendimiento", "#herramientas"],
      "estimatedEngagement": "medium-high"
    }
  ]
}
```

---

## Código de Implementación

### 1. Nuevo Servicio: ContentSuggestionsService

```typescript
// src/content-suggestions/content-suggestions.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { TikTokApifyService } from '../apify/apify.service';
import { GoogleVideoIntelligenceService } from '../googleAi/google-video-intelligence.service';
import { GoogleAIService } from '../googleAi/iaLenguageGeneta';
import { AnalysisService } from '../apify/Analisys.services';

export interface ProfileAnalysisFilters {
  minViews?: number;
  minEngagementRate?: number;
  includeSubtitles?: boolean;
  dateRange?: {
    from: Date;
    to: Date;
  };
}

export interface VideoWithMetrics {
  videoUrl: string;
  videoId: string;
  description: string;
  hashtags: string[];
  views: number;
  likes: number;
  comments: number;
  shares: number;
  engagementRate: number;
  duration: number;
  musicTitle?: string;
  hasSubtitles: boolean;
}

@Injectable()
export class ContentSuggestionsService {
  private readonly logger = new Logger(ContentSuggestionsService.name);

  constructor(
    private readonly tiktokService: TikTokApifyService,
    private readonly videoIntelligence: GoogleVideoIntelligenceService,
    private readonly geminiService: GoogleAIService,
    private readonly analysisService: AnalysisService,
  ) {}

  /**
   * Análisis completo de perfil con generación de sugerencias
   */
  async analyzeProfileComplete(
    userId: string,
    tiktokUsername: string,
    numberOfVideos: number = 50,
    analyzeTop: number = 10,
    filters?: ProfileAnalysisFilters,
  ) {
    this.logger.log(`Iniciando análisis completo para ${tiktokUsername}`);

    // PASO 1: Scraping de perfil
    const scrapingResult = await this.tiktokService.scrapeProfiles(
      {
        profiles: [tiktokUsername],
        resultsPerPage: numberOfVideos,
        shouldDownloadSubtitles: true,
        shouldDownloadCovers: true,
        includeVideoDetails: true,
        includeAuthorDetails: true,
        includeHashtagDetails: true,
      },
      userId,
    );

    if (!scrapingResult.success || !scrapingResult.data) {
      throw new Error('Error al obtener datos del perfil');
    }

    // PASO 2: Procesar y filtrar videos
    const processedVideos = this.processVideos(scrapingResult.data);
    const filteredVideos = this.applyFilters(processedVideos, filters);
    const topVideos = this.selectTopVideos(filteredVideos, analyzeTop);

    this.logger.log(`Seleccionados ${topVideos.length} videos para análisis IA`);

    // PASO 3: Análisis con IA de los top videos
    const analyzedVideos = await this.analyzeVideosWithAI(topVideos);

    // PASO 4: Extraer insights
    const insights = await this.extractInsights(analyzedVideos, processedVideos);

    // PASO 5: Generar sugerencias de contenido
    const suggestions = await this.generateContentSuggestions(
      analyzedVideos,
      insights,
      tiktokUsername,
    );

    // PASO 6: Guardar análisis completo en BD
    const analysisRecord = await this.analysisService.create({
      userId,
      queryType: 'PROPIA' as any,
      status: 'COMPLETED' as any,
      analysisResult: {
        profileData: {
          username: tiktokUsername,
          totalVideos: processedVideos.length,
          analyzedVideos: topVideos.length,
          avgEngagementRate: this.calculateAvgEngagement(processedVideos),
        },
        topVideos: analyzedVideos,
        insights,
        suggestions,
        generatedAt: new Date(),
      },
    });

    return {
      success: true,
      analysisId: analysisRecord.id,
      profileData: {
        username: tiktokUsername,
        totalVideos: processedVideos.length,
        analyzedVideos: topVideos.length,
        avgEngagementRate: this.calculateAvgEngagement(processedVideos),
      },
      topVideos: analyzedVideos,
      insights,
      contentSuggestions: suggestions,
    };
  }

  /**
   * Procesa los videos scrapeados a un formato uniforme
   */
  private processVideos(rawVideos: any[]): VideoWithMetrics[] {
    return rawVideos.map((video) => {
      const views = video.playCount || video.stats?.playCount || 0;
      const likes = video.diggCount || video.stats?.diggCount || 0;
      const comments = video.commentCount || video.stats?.commentCount || 0;
      const shares = video.shareCount || video.stats?.shareCount || 0;

      const engagementRate = views > 0
        ? (likes + comments + shares) / views
        : 0;

      return {
        videoUrl: video.webVideoUrl || video.videoUrl,
        videoId: video.id,
        description: video.text || video.description || '',
        hashtags: this.extractHashtags(video.text || video.description || ''),
        views,
        likes,
        comments,
        shares,
        engagementRate,
        duration: video.videoMeta?.duration || 0,
        musicTitle: video.musicMeta?.musicName || video.music?.title,
        hasSubtitles: !!video.subtitleUrl || !!video.subtitles,
      };
    });
  }

  /**
   * Aplica filtros a los videos
   */
  private applyFilters(
    videos: VideoWithMetrics[],
    filters?: ProfileAnalysisFilters,
  ): VideoWithMetrics[] {
    if (!filters) return videos;

    return videos.filter((video) => {
      if (filters.minViews && video.views < filters.minViews) return false;
      if (filters.minEngagementRate && video.engagementRate < filters.minEngagementRate) {
        return false;
      }
      if (filters.includeSubtitles && !video.hasSubtitles) return false;
      return true;
    });
  }

  /**
   * Selecciona los top N videos por engagement
   */
  private selectTopVideos(
    videos: VideoWithMetrics[],
    topN: number,
  ): VideoWithMetrics[] {
    return videos
      .sort((a, b) => b.engagementRate - a.engagementRate)
      .slice(0, topN);
  }

  /**
   * Analiza videos con Google Video Intelligence
   */
  private async analyzeVideosWithAI(videos: VideoWithMetrics[]) {
    const analyzed = [];

    for (const video of videos) {
      try {
        this.logger.log(`Analizando video: ${video.videoId}`);

        // Análisis con Video Intelligence
        const aiAnalysis = await this.videoIntelligence.analyzeVideo({
          videoUrl: video.videoUrl,
          features: [
            'LABEL_DETECTION',
            'SPEECH_TRANSCRIPTION',
            'SHOT_CHANGE_DETECTION',
          ],
        });

        // Extraer información relevante
        const topics = aiAnalysis.labels.map((label) => label.entity);
        const transcript = aiAnalysis.speechTranscriptions
          .map((t) => t.alternatives?.[0]?.transcript)
          .join(' ');

        analyzed.push({
          ...video,
          aiAnalysis: {
            topics,
            transcript,
            shotChanges: aiAnalysis.shotChanges.length,
            labels: aiAnalysis.labels.slice(0, 10), // Top 10 labels
          },
        });
      } catch (error) {
        this.logger.error(`Error analizando video ${video.videoId}:`, error.message);
        // Incluir el video sin análisis IA
        analyzed.push({
          ...video,
          aiAnalysis: null,
        });
      }
    }

    return analyzed;
  }

  /**
   * Extrae insights de los videos analizados
   */
  private async extractInsights(analyzedVideos: any[], allVideos: VideoWithMetrics[]) {
    // Análisis de temas
    const topicFrequency = new Map<string, { count: number; totalEngagement: number }>();

    analyzedVideos.forEach((video) => {
      if (video.aiAnalysis?.topics) {
        video.aiAnalysis.topics.forEach((topic: string) => {
          const current = topicFrequency.get(topic) || { count: 0, totalEngagement: 0 };
          topicFrequency.set(topic, {
            count: current.count + 1,
            totalEngagement: current.totalEngagement + video.engagementRate,
          });
        });
      }
    });

    const topTopics = Array.from(topicFrequency.entries())
      .map(([topic, data]) => ({
        topic,
        frequency: data.count,
        avgEngagement: data.count > 0 ? data.totalEngagement / data.count : 0,
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10);

    // Análisis de hashtags
    const hashtagStats = new Map<string, { usage: number; totalViews: number }>();

    allVideos.forEach((video) => {
      video.hashtags.forEach((hashtag) => {
        const current = hashtagStats.get(hashtag) || { usage: 0, totalViews: 0 };
        hashtagStats.set(hashtag, {
          usage: current.usage + 1,
          totalViews: current.totalViews + video.views,
        });
      });
    });

    const topHashtags = Array.from(hashtagStats.entries())
      .map(([hashtag, data]) => ({
        hashtag,
        usage: data.usage,
        avgViews: Math.round(data.totalViews / data.usage),
      }))
      .sort((a, b) => b.usage - a.usage)
      .slice(0, 10);

    // Análisis de duración óptima
    const durationAnalysis = this.analyzeDurationPatterns(allVideos);

    // Generar mejores prácticas con IA
    const bestPractices = await this.generateBestPractices(
      analyzedVideos,
      topTopics,
      durationAnalysis,
    );

    return {
      topTopics,
      topHashtags,
      durationAnalysis,
      bestPractices,
    };
  }

  /**
   * Genera sugerencias de contenido usando Gemini
   */
  private async generateContentSuggestions(
    analyzedVideos: any[],
    insights: any,
    username: string,
  ) {
    const prompt = `
Eres un experto en estrategia de contenido para TikTok. Analiza los siguientes datos de un perfil exitoso y genera sugerencias de contenido.

PERFIL ANALIZADO: ${username}

TOP TEMAS IDENTIFICADOS:
${insights.topTopics.map((t) => `- ${t.topic} (${t.frequency} videos, engagement: ${t.avgEngagement.toFixed(3)})`).join('\n')}

HASHTAGS MÁS EFECTIVOS:
${insights.topHashtags.map((h) => `- ${h.hashtag} (${h.usage} usos, ${h.avgViews} views promedio)`).join('\n')}

MEJORES PRÁCTICAS IDENTIFICADAS:
${insights.bestPractices.join('\n')}

VIDEOS MÁS EXITOSOS:
${analyzedVideos.slice(0, 5).map((v) => `
- ${v.description.substring(0, 100)}
  Views: ${v.views}, Engagement: ${(v.engagementRate * 100).toFixed(2)}%
  Temas: ${v.aiAnalysis?.topics?.slice(0, 3).join(', ') || 'N/A'}
`).join('\n')}

TAREA:
Genera 7 sugerencias de contenido específicas que:
1. Sigan los patrones de éxito identificados
2. Sean accionables y específicas
3. Incluyan hashtags recomendados
4. Expliquen por qué probablemente tendrán buen engagement

Formato de respuesta (JSON):
{
  "suggestions": [
    {
      "title": "Título corto y atractivo",
      "description": "Descripción detallada de la idea (2-3 frases)",
      "suggestedHashtags": ["#hashtag1", "#hashtag2"],
      "estimatedEngagement": "high|medium-high|medium",
      "reasoning": "Por qué esta idea funcionará basado en el análisis"
    }
  ]
}
`;

    try {
      const response = await this.geminiService.generateText({
        prompt,
        model: 'gemini-1.5-flash',
        systemInstruction: 'Eres un estratega de contenido para TikTok. Responde SIEMPRE en formato JSON válido.',
        temperature: 0.8,
        maxOutputTokens: 2048,
      });

      // Parsear la respuesta JSON
      const jsonMatch = response.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.suggestions || [];
      }

      throw new Error('No se pudo parsear la respuesta de Gemini');
    } catch (error) {
      this.logger.error('Error generando sugerencias:', error.message);
      return this.getFallbackSuggestions(insights);
    }
  }

  /**
   * Genera mejores prácticas usando IA
   */
  private async generateBestPractices(
    analyzedVideos: any[],
    topTopics: any[],
    durationAnalysis: any,
  ): Promise<string[]> {
    const prompt = `
Basándote en estos datos de videos exitosos de TikTok, identifica 5 mejores prácticas:

DURACIÓN ÓPTIMA: ${durationAnalysis.optimalRange.min}-${durationAnalysis.optimalRange.max} segundos
TEMAS PRINCIPALES: ${topTopics.slice(0, 5).map((t) => t.topic).join(', ')}
NÚMERO DE CAMBIOS DE ESCENA PROMEDIO: ${this.calculateAvgShotChanges(analyzedVideos)}

Lista las 5 mejores prácticas más importantes en formato de bullet points.
`;

    try {
      const response = await this.geminiService.generateText({
        prompt,
        model: 'gemini-1.5-flash',
        temperature: 0.3,
        maxOutputTokens: 500,
      });

      return response.text
        .split('\n')
        .filter((line) => line.trim().startsWith('-') || line.trim().startsWith('•'))
        .map((line) => line.replace(/^[-•]\s*/, '').trim())
        .filter((line) => line.length > 10)
        .slice(0, 5);
    } catch (error) {
      this.logger.error('Error generando mejores prácticas:', error);
      return [
        'Mantén los videos entre 15-30 segundos para mejor engagement',
        'Usa subtítulos en todos tus videos',
        'Incluye llamados a la acción claros',
      ];
    }
  }

  // ============== MÉTODOS AUXILIARES ==============

  private extractHashtags(text: string): string[] {
    const hashtagRegex = /#[\w\u00C0-\u017F]+/g;
    return (text.match(hashtagRegex) || []).map((tag) => tag.toLowerCase());
  }

  private calculateAvgEngagement(videos: VideoWithMetrics[]): number {
    if (videos.length === 0) return 0;
    const total = videos.reduce((sum, v) => sum + v.engagementRate, 0);
    return total / videos.length;
  }

  private analyzeDurationPatterns(videos: VideoWithMetrics[]) {
    const sortedByEngagement = [...videos].sort((a, b) => b.engagementRate - a.engagementRate);
    const top20Percent = sortedByEngagement.slice(0, Math.ceil(videos.length * 0.2));

    const durations = top20Percent.map((v) => v.duration).sort((a, b) => a - b);

    return {
      optimalRange: {
        min: durations[0],
        max: durations[durations.length - 1],
        median: durations[Math.floor(durations.length / 2)],
      },
      avgDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length,
    };
  }

  private calculateAvgShotChanges(videos: any[]): number {
    const withShotData = videos.filter((v) => v.aiAnalysis?.shotChanges);
    if (withShotData.length === 0) return 0;

    const total = withShotData.reduce((sum, v) => sum + v.aiAnalysis.shotChanges, 0);
    return Math.round(total / withShotData.length);
  }

  private getFallbackSuggestions(insights: any) {
    return [
      {
        title: `Crea contenido sobre ${insights.topTopics[0]?.topic || 'tu tema principal'}`,
        description: 'Basado en tus videos más exitosos, este tema tiene alto potencial',
        suggestedHashtags: insights.topHashtags.slice(0, 3).map((h) => h.hashtag),
        estimatedEngagement: 'medium-high',
        reasoning: 'Tema recurrente en tus videos con mejor engagement',
      },
    ];
  }
}
```

---

## Nuevos DTOs

```typescript
// src/content-suggestions/dto/profile-analysis.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, Min, Max, IsBoolean } from 'class-validator';

export class ProfileAnalysisRequestDto {
  @ApiProperty({ example: '@username' })
  @IsString()
  tiktokUsername: string;

  @ApiPropertyOptional({ default: 50, minimum: 10, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(100)
  numberOfVideos?: number = 50;

  @ApiPropertyOptional({ default: 10, minimum: 3, maximum: 20 })
  @IsOptional()
  @IsNumber()
  @Min(3)
  @Max(20)
  analyzeTop?: number = 10;

  @ApiPropertyOptional()
  @IsOptional()
  filters?: {
    minViews?: number;
    minEngagementRate?: number;
    includeSubtitles?: boolean;
  };
}
```

---

## Nuevo Controlador

```typescript
// src/content-suggestions/content-suggestions.controller.ts
import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/autGuard';
import { ContentSuggestionsService } from './content-suggestions.service';
import { ProfileAnalysisRequestDto } from './dto/profile-analysis.dto';

@ApiTags('Content Suggestions')
@Controller('content-suggestions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ContentSuggestionsController {
  constructor(private readonly service: ContentSuggestionsService) {}

  @Post('analyze-profile')
  @ApiOperation({
    summary: 'Análisis completo de perfil con sugerencias de contenido',
    description: 'Scrapea, analiza con IA y genera sugerencias de contenido',
  })
  async analyzeProfile(
    @Body() dto: ProfileAnalysisRequestDto,
    @Request() req,
  ) {
    return await this.service.analyzeProfileComplete(
      req.user.userId,
      dto.tiktokUsername,
      dto.numberOfVideos,
      dto.analyzeTop,
      dto.filters,
    );
  }
}
```

---

## Filtros Clave Identificados

### 1. Filtros en el Scraping
```typescript
{
  profiles: [username],
  resultsPerPage: 50,
  shouldDownloadSubtitles: true,  // ✅ IMPORTANTE para transcripciones
  shouldDownloadCovers: true,     // Para análisis visual
  includeVideoDetails: true,      // ✅ CRÍTICO para métricas
  includeAuthorDetails: true,     // Info del creador
  includeHashtagDetails: true,    // ✅ Para análisis de hashtags
}
```

### 2. Filtros Post-Scraping
```typescript
{
  minViews: 1000,              // Videos con mínima tracción
  minEngagementRate: 0.02,     // 2% de engagement mínimo
  includeSubtitles: true,      // Solo videos con subtítulos (mejor para análisis)
}
```

### 3. Selección de Top Videos
- **Engagement Rate** = (likes + comments + shares) / views
- Ordenar por engagement descendente
- Seleccionar top 10 para análisis IA (ahorro de costos)

---

## URLs de Videos - ¿Se Necesita Descargar?

### Respuesta: **NO es necesario descargar** (en la mayoría de casos)

#### Google Video Intelligence puede analizar videos de 3 formas:

1. **Google Cloud Storage (GCS)** ✅ RECOMENDADO
   ```typescript
   videoUrl: 'gs://my-bucket/video.mp4'
   ```

2. **URL Pública** ✅ MÁS FÁCIL
   ```typescript
   videoUrl: 'https://tiktok.com/.../video.mp4'
   ```

3. **Video en Base64** ❌ NO RECOMENDADO (límite 10MB)

#### Flujo Recomendado:

1. Apify scrapea y te da:
   - `webVideoUrl`: URL del video en TikTok
   - `downloadAddr`: URL directa del MP4

2. Usar `downloadAddr` directamente con Video Intelligence
   - No necesitas descargar a tu servidor
   - Google descarga temporalmente para analizar
   - Ahorras espacio de almacenamiento

#### Cuándo SÍ descargar:

- Si necesitas almacenar videos para análisis histórico
- Si quieres cachear videos para reanálisis
- Si TikTok bloquea el acceso a Google

```typescript
// Opción con descarga (solo si es necesario)
async downloadAndUploadToGCS(videoUrl: string): Promise<string> {
  const response = await fetch(videoUrl);
  const buffer = await response.arrayBuffer();

  // Upload a Google Cloud Storage
  const bucket = storage.bucket('tikmark-videos');
  const fileName = `${Date.now()}-video.mp4`;
  const file = bucket.file(fileName);

  await file.save(Buffer.from(buffer));

  return `gs://tikmark-videos/${fileName}`;
}
```

---

## Consideraciones de Costos

### Google Video Intelligence Pricing
- **Label Detection**: $0.10 / minuto
- **Speech Transcription**: $0.048 / minuto
- **Shot Detection**: $0.05 / minuto

**Total por minuto**: ~$0.20

**Ejemplo**: 10 videos de 30 segundos = 5 minutos = **$1.00**

### Google Gemini Pricing
- **Gemini 1.5 Flash**: ~$0.00025 / 1K tokens
- Generación de sugerencias: ~2K tokens = **$0.0005**

### Costo Total por Análisis Completo
- Scraping (Apify): ~$0.05
- Video Intelligence: ~$1.00
- Gemini: ~$0.001
- **TOTAL**: ~$1.05 por análisis completo

---

## Resumen de Mejoras

| Aspecto | Antes | Después |
|---------|-------|---------|
| **Scraping** | ✅ Funcional | ✅ Optimizado con filtros |
| **Almacenamiento** | ✅ En BD | ✅ En BD + estructurado |
| **Análisis IA** | ❌ No existe | ✅ Video Intelligence |
| **Insights** | ❌ No | ✅ Temas, hashtags, patrones |
| **Sugerencias** | ❌ No | ✅ Gemini genera ideas |
| **Filtrado** | ❌ Básico | ✅ Por engagement, vistas |
| **ROI** | Bajo | Alto (insights accionables) |

---

## Próximos Pasos

1. **Fase 1**: Implementar `ContentSuggestionsService`
2. **Fase 2**: Crear endpoint `/content-suggestions/analyze-profile`
3. **Fase 3**: Probar con perfil real
4. **Fase 4**: Optimizar filtros basado en resultados
5. **Fase 5**: Añadir caché para análisis recientes
6. **Fase 6**: Dashboard en frontend con visualizaciones

