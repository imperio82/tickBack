# MVP - Análisis de Competencia y Tendencias

## Objetivo del MVP

Permitir a los usuarios analizar:
1. **Su propio perfil** (ya propuesto)
2. **Perfiles de competencia** (múltiples competidores)
3. **Categorías/Hashtags** (tendencias del mercado)
4. **Comparativas** (tu perfil vs competencia)

Todo esto generando sugerencias de contenido personalizadas y guardando en BD.

---

## Estructura de Base de Datos Mejorada

### 1. Nueva Entidad: CompetitorAnalysis

```typescript
// src/analysis/entities/competitor-analysis.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Usuario } from '../../user/user.Entity/user.Entity';

export enum AnalysisType {
  OWN_PROFILE = 'own_profile',           // Análisis propio
  COMPETITOR_PROFILE = 'competitor_profile', // Perfil competidor
  CATEGORY = 'category',                 // Análisis por categoría/hashtag
  COMPARATIVE = 'comparative',           // Comparativo
  TRENDING = 'trending',                 // Tendencias por región
}

export enum AnalysisStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('competitor_analysis')
@Index(['userId', 'createdAt'])
@Index(['analysisType', 'status'])
export class CompetitorAnalysis {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  userId: string;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  user: Usuario;

  @Column({
    type: 'enum',
    enum: AnalysisType,
  })
  analysisType: AnalysisType;

  @Column({
    type: 'enum',
    enum: AnalysisStatus,
    default: AnalysisStatus.PENDING,
  })
  status: AnalysisStatus;

  // Parámetros del análisis
  @Column({ type: 'json' })
  parameters: {
    // Para análisis de perfil
    profiles?: string[];

    // Para análisis de categoría
    hashtags?: string[];
    keywords?: string[];

    // Para trending
    region?: string;

    // Filtros comunes
    numberOfVideos?: number;
    minViews?: number;
    minEngagementRate?: number;
    dateRange?: {
      from: string;
      to: string;
    };
  };

  // Metadata del scraping
  @Column({ type: 'json', nullable: true })
  scrapingMetadata: {
    totalVideosScraped: number;
    videosAfterFilter: number;
    videosAnalyzedWithAI: number;
    apifyRunId?: string;
    scrapingDuration?: number;
  };

  // Resultados del análisis
  @Column({ type: 'json', nullable: true })
  results: {
    // Videos procesados
    videos: Array<{
      videoId: string;
      videoUrl: string;
      profile: string;
      description: string;
      hashtags: string[];
      metrics: {
        views: number;
        likes: number;
        comments: number;
        shares: number;
        engagementRate: number;
      };
      aiAnalysis?: {
        topics: string[];
        transcript: string;
        sentimentScore?: number;
        keyPhrases?: string[];
      };
    }>;

    // Insights agregados
    insights: {
      topTopics: Array<{
        topic: string;
        frequency: number;
        avgEngagement: number;
      }>;
      topHashtags: Array<{
        hashtag: string;
        usage: number;
        avgViews: number;
        avgEngagement: number;
      }>;
      topProfiles?: Array<{
        username: string;
        avgEngagement: number;
        totalVideos: number;
        topTopic: string;
      }>;
      durationAnalysis: {
        optimal: { min: number; max: number; median: number };
        avgDuration: number;
      };
      bestPractices: string[];
      trendingPatterns: string[];
    };

    // Sugerencias generadas
    contentSuggestions: Array<{
      title: string;
      description: string;
      suggestedHashtags: string[];
      targetAudience?: string;
      estimatedEngagement: 'high' | 'medium-high' | 'medium' | 'low';
      reasoning: string;
      inspirationFrom?: string; // Perfil o video que inspiró la idea
    }>;

    // Análisis comparativo (si aplica)
    comparative?: {
      yourProfile: {
        avgEngagement: number;
        topTopics: string[];
        strengths: string[];
      };
      competitors: {
        avgEngagement: number;
        topTopics: string[];
        opportunities: string[];
      };
      recommendations: string[];
    };
  };

  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  @Column({ type: 'int', default: 0 })
  estimatedCost: number; // En centavos

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt?: Date;
}
```

### 2. Nueva Entidad: VideoAnalysisCache

```typescript
// src/analysis/entities/video-analysis-cache.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('video_analysis_cache')
@Index(['videoId'], { unique: true })
@Index(['createdAt'])
export class VideoAnalysisCache {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  videoId: string; // TikTok video ID

  @Column({ type: 'varchar' })
  videoUrl: string;

  @Column({ type: 'varchar' })
  profile: string;

  // Datos básicos del video
  @Column({ type: 'json' })
  metadata: {
    description: string;
    hashtags: string[];
    musicTitle?: string;
    duration: number;
    uploadDate?: string;
  };

  // Métricas (pueden desactualizarse)
  @Column({ type: 'json' })
  metrics: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
    engagementRate: number;
  };

  // Análisis IA (no cambia)
  @Column({ type: 'json' })
  aiAnalysis: {
    topics: string[];
    transcript: string;
    labels: any[];
    shotChanges: number;
    sentiment?: string;
    keyPhrases?: string[];
  };

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  lastUsed: Date;
}
```

---

## Servicio Principal: CompetitorAnalysisService

```typescript
// src/competitor-analysis/competitor-analysis.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TikTokApifyService } from '../apify/apify.service';
import { GoogleVideoIntelligenceService } from '../googleAi/google-video-intelligence.service';
import { GoogleAIService } from '../googleAi/iaLenguageGeneta';
import {
  CompetitorAnalysis,
  AnalysisType,
  AnalysisStatus,
} from './entities/competitor-analysis.entity';
import { VideoAnalysisCache } from './entities/video-analysis-cache.entity';

interface AnalysisRequest {
  userId: string;
  analysisType: AnalysisType;
  parameters: any;
}

@Injectable()
export class CompetitorAnalysisService {
  private readonly logger = new Logger(CompetitorAnalysisService.name);

  constructor(
    @InjectRepository(CompetitorAnalysis)
    private readonly analysisRepo: Repository<CompetitorAnalysis>,
    @InjectRepository(VideoAnalysisCache)
    private readonly cacheRepo: Repository<VideoAnalysisCache>,
    private readonly tiktokService: TikTokApifyService,
    private readonly videoIntelligence: GoogleVideoIntelligenceService,
    private readonly geminiService: GoogleAIService,
  ) {}

  /**
   * ANÁLISIS 1: Perfiles de Competencia
   */
  async analyzeCompetitors(request: {
    userId: string;
    competitorProfiles: string[]; // [@user1, @user2, @user3]
    videosPerProfile?: number; // Default: 50
    analyzeTop?: number; // Default: 20 (total entre todos)
    filters?: {
      minViews?: number;
      minEngagementRate?: number;
      dateRange?: { from: Date; to: Date };
    };
  }) {
    this.logger.log(`Iniciando análisis de ${request.competitorProfiles.length} competidores`);

    // Crear registro de análisis
    const analysis = this.analysisRepo.create({
      userId: request.userId,
      analysisType: AnalysisType.COMPETITOR_PROFILE,
      status: AnalysisStatus.PROCESSING,
      parameters: {
        profiles: request.competitorProfiles,
        numberOfVideos: request.videosPerProfile || 50,
        ...request.filters,
      },
    });
    await this.analysisRepo.save(analysis);

    try {
      const startTime = Date.now();
      const allVideos = [];

      // PASO 1: Scrapear cada perfil de competencia
      for (const profile of request.competitorProfiles) {
        this.logger.log(`Scrapeando perfil: ${profile}`);

        const scrapingResult = await this.tiktokService.scrapeProfiles(
          {
            profiles: [profile],
            resultsPerPage: request.videosPerProfile || 50,
            shouldDownloadSubtitles: true,
            shouldDownloadCovers: false,
            includeVideoDetails: true,
            includeAuthorDetails: true,
            includeHashtagDetails: true,
          },
          request.userId,
        );

        if (scrapingResult.success && scrapingResult.data) {
          const processed = this.processVideos(scrapingResult.data, profile);
          allVideos.push(...processed);
        }
      }

      this.logger.log(`Total videos scrapeados: ${allVideos.length}`);

      // PASO 2: Aplicar filtros
      const filtered = this.applyFilters(allVideos, request.filters);
      this.logger.log(`Videos después de filtros: ${filtered.length}`);

      // PASO 3: Seleccionar top videos por engagement (distribuyendo entre perfiles)
      const topVideos = this.selectTopVideosDistributed(
        filtered,
        request.analyzeTop || 20,
        request.competitorProfiles.length,
      );

      // PASO 4: Analizar con IA (con caché)
      const analyzedVideos = await this.analyzeVideosWithCache(topVideos);

      // PASO 5: Generar insights
      const insights = await this.generateCompetitorInsights(
        analyzedVideos,
        filtered,
        request.competitorProfiles,
      );

      // PASO 6: Generar sugerencias basadas en competencia
      const suggestions = await this.generateCompetitorBasedSuggestions(
        analyzedVideos,
        insights,
        request.userId,
      );

      // Actualizar registro con resultados
      analysis.status = AnalysisStatus.COMPLETED;
      analysis.completedAt = new Date();
      analysis.scrapingMetadata = {
        totalVideosScraped: allVideos.length,
        videosAfterFilter: filtered.length,
        videosAnalyzedWithAI: topVideos.length,
        scrapingDuration: Date.now() - startTime,
      };
      analysis.results = {
        videos: analyzedVideos.map((v) => ({
          videoId: v.videoId,
          videoUrl: v.videoUrl,
          profile: v.profile,
          description: v.description,
          hashtags: v.hashtags,
          metrics: {
            views: v.views,
            likes: v.likes,
            comments: v.comments,
            shares: v.shares,
            engagementRate: v.engagementRate,
          },
          aiAnalysis: v.aiAnalysis,
        })),
        insights,
        contentSuggestions: suggestions,
      };

      await this.analysisRepo.save(analysis);

      return {
        success: true,
        analysisId: analysis.id,
        summary: {
          competitorsAnalyzed: request.competitorProfiles.length,
          totalVideos: allVideos.length,
          analyzedVideos: topVideos.length,
          processingTime: Date.now() - startTime,
        },
        insights,
        suggestions,
      };
    } catch (error) {
      this.logger.error('Error en análisis de competidores:', error);
      analysis.status = AnalysisStatus.FAILED;
      analysis.errorMessage = error.message;
      await this.analysisRepo.save(analysis);
      throw error;
    }
  }

  /**
   * ANÁLISIS 2: Por Categoría/Hashtags
   */
  async analyzeCategory(request: {
    userId: string;
    hashtags?: string[]; // [#marketing, #emprendimiento]
    keywords?: string[]; // ["marketing digital", "tips"]
    numberOfVideos?: number; // Default: 200
    analyzeTop?: number; // Default: 30
    region?: string; // US, MX, ES, etc.
    filters?: {
      minViews?: number;
      minEngagementRate?: number;
      dateRange?: { from: Date; to: Date };
    };
  }) {
    this.logger.log('Iniciando análisis de categoría/hashtags');

    const analysis = this.analysisRepo.create({
      userId: request.userId,
      analysisType: AnalysisType.CATEGORY,
      status: AnalysisStatus.PROCESSING,
      parameters: {
        hashtags: request.hashtags,
        keywords: request.keywords,
        numberOfVideos: request.numberOfVideos || 200,
        region: request.region,
        ...request.filters,
      },
    });
    await this.analysisRepo.save(analysis);

    try {
      const startTime = Date.now();
      const allVideos = [];

      // PASO 1: Scrapear por hashtags
      if (request.hashtags && request.hashtags.length > 0) {
        this.logger.log(`Scrapeando hashtags: ${request.hashtags.join(', ')}`);

        const hashtagResult = await this.tiktokService.scrapeByHashtags({
          hashtags: request.hashtags,
          resultsPerPage: Math.floor((request.numberOfVideos || 200) / request.hashtags.length),
          shouldDownloadSubtitles: true,
          includeVideoDetails: true,
          includeAuthorDetails: true,
          includeHashtagDetails: true,
        });

        if (hashtagResult.success && hashtagResult.data) {
          const processed = this.processVideos(hashtagResult.data);
          allVideos.push(...processed);
        }
      }

      // PASO 2: Scrapear por keywords
      if (request.keywords && request.keywords.length > 0) {
        for (const keyword of request.keywords) {
          this.logger.log(`Scrapeando keyword: ${keyword}`);

          const searchResult = await this.tiktokService.scrapeBySearch({
            search: keyword,
            resultsPerPage: Math.floor((request.numberOfVideos || 200) / request.keywords.length),
            shouldDownloadSubtitles: true,
            includeVideoDetails: true,
            includeAuthorDetails: true,
          });

          if (searchResult.success && searchResult.data) {
            const processed = this.processVideos(searchResult.data);
            allVideos.push(...processed);
          }
        }
      }

      // Eliminar duplicados por videoId
      const uniqueVideos = this.removeDuplicates(allVideos);
      this.logger.log(`Videos únicos: ${uniqueVideos.length}`);

      // PASO 3: Aplicar filtros
      const filtered = this.applyFilters(uniqueVideos, request.filters);

      // PASO 4: Seleccionar top videos
      const topVideos = this.selectTopVideos(filtered, request.analyzeTop || 30);

      // PASO 5: Analizar con IA
      const analyzedVideos = await this.analyzeVideosWithCache(topVideos);

      // PASO 6: Generar insights de categoría
      const insights = await this.generateCategoryInsights(analyzedVideos, filtered);

      // PASO 7: Generar sugerencias
      const suggestions = await this.generateCategoryBasedSuggestions(
        analyzedVideos,
        insights,
        request.hashtags,
        request.keywords,
      );

      // Guardar resultados
      analysis.status = AnalysisStatus.COMPLETED;
      analysis.completedAt = new Date();
      analysis.scrapingMetadata = {
        totalVideosScraped: uniqueVideos.length,
        videosAfterFilter: filtered.length,
        videosAnalyzedWithAI: topVideos.length,
        scrapingDuration: Date.now() - startTime,
      };
      analysis.results = {
        videos: analyzedVideos.map(this.mapVideoToResult),
        insights,
        contentSuggestions: suggestions,
      };

      await this.analysisRepo.save(analysis);

      return {
        success: true,
        analysisId: analysis.id,
        summary: {
          totalVideos: uniqueVideos.length,
          analyzedVideos: topVideos.length,
          processingTime: Date.now() - startTime,
        },
        insights,
        suggestions,
      };
    } catch (error) {
      this.logger.error('Error en análisis de categoría:', error);
      analysis.status = AnalysisStatus.FAILED;
      analysis.errorMessage = error.message;
      await this.analysisRepo.save(analysis);
      throw error;
    }
  }

  /**
   * ANÁLISIS 3: Trending por Región
   */
  async analyzeTrending(request: {
    userId: string;
    region?: string; // US, MX, ES, etc.
    numberOfVideos?: number; // Default: 100
    analyzeTop?: number; // Default: 20
  }) {
    this.logger.log(`Iniciando análisis de trending en ${request.region || 'US'}`);

    const analysis = this.analysisRepo.create({
      userId: request.userId,
      analysisType: AnalysisType.TRENDING,
      status: AnalysisStatus.PROCESSING,
      parameters: {
        region: request.region || 'US',
        numberOfVideos: request.numberOfVideos || 100,
      },
    });
    await this.analysisRepo.save(analysis);

    try {
      const startTime = Date.now();

      // Scrapear trending
      const trendingResult = await this.tiktokService.scrapeTrending(
        request.region || 'US',
        request.numberOfVideos || 100,
      );

      if (!trendingResult.success || !trendingResult.data) {
        throw new Error('Error al obtener videos trending');
      }

      const processedVideos = this.processVideos(trendingResult.data);
      const topVideos = this.selectTopVideos(processedVideos, request.analyzeTop || 20);
      const analyzedVideos = await this.analyzeVideosWithCache(topVideos);
      const insights = await this.generateTrendingInsights(analyzedVideos, processedVideos);
      const suggestions = await this.generateTrendingBasedSuggestions(
        analyzedVideos,
        insights,
        request.region,
      );

      // Guardar resultados
      analysis.status = AnalysisStatus.COMPLETED;
      analysis.completedAt = new Date();
      analysis.scrapingMetadata = {
        totalVideosScraped: processedVideos.length,
        videosAfterFilter: processedVideos.length,
        videosAnalyzedWithAI: topVideos.length,
        scrapingDuration: Date.now() - startTime,
      };
      analysis.results = {
        videos: analyzedVideos.map(this.mapVideoToResult),
        insights,
        contentSuggestions: suggestions,
      };

      await this.analysisRepo.save(analysis);

      return {
        success: true,
        analysisId: analysis.id,
        summary: {
          region: request.region || 'US',
          totalVideos: processedVideos.length,
          analyzedVideos: topVideos.length,
          processingTime: Date.now() - startTime,
        },
        insights,
        suggestions,
      };
    } catch (error) {
      this.logger.error('Error en análisis de trending:', error);
      analysis.status = AnalysisStatus.FAILED;
      analysis.errorMessage = error.message;
      await this.analysisRepo.save(analysis);
      throw error;
    }
  }

  /**
   * ANÁLISIS 4: Comparativo (Tu perfil vs Competencia)
   */
  async analyzeComparative(request: {
    userId: string;
    yourProfile: string;
    competitorProfiles: string[];
    videosPerProfile?: number;
  }) {
    this.logger.log('Iniciando análisis comparativo');

    // Analizar tu perfil
    const yourAnalysis = await this.analyzeCompetitors({
      userId: request.userId,
      competitorProfiles: [request.yourProfile],
      videosPerProfile: request.videosPerProfile,
      analyzeTop: 15,
    });

    // Analizar competencia
    const competitorAnalysis = await this.analyzeCompetitors({
      userId: request.userId,
      competitorProfiles: request.competitorProfiles,
      videosPerProfile: request.videosPerProfile,
      analyzeTop: 15,
    });

    // Generar comparativa con IA
    const comparative = await this.generateComparative(yourAnalysis, competitorAnalysis);

    // Crear análisis comparativo
    const analysis = this.analysisRepo.create({
      userId: request.userId,
      analysisType: AnalysisType.COMPARATIVE,
      status: AnalysisStatus.COMPLETED,
      parameters: {
        yourProfile: request.yourProfile,
        competitorProfiles: request.competitorProfiles,
      },
      results: {
        videos: [],
        insights: comparative.insights,
        contentSuggestions: comparative.suggestions,
        comparative: comparative.comparison,
      },
      completedAt: new Date(),
    });

    await this.analysisRepo.save(analysis);

    return {
      success: true,
      analysisId: analysis.id,
      comparison: comparative.comparison,
      suggestions: comparative.suggestions,
    };
  }

  // ============== MÉTODOS AUXILIARES ==============

  private processVideos(rawVideos: any[], profile?: string) {
    return rawVideos.map((video) => {
      const views = video.playCount || video.stats?.playCount || 0;
      const likes = video.diggCount || video.stats?.diggCount || 0;
      const comments = video.commentCount || video.stats?.commentCount || 0;
      const shares = video.shareCount || video.stats?.shareCount || 0;

      return {
        videoId: video.id,
        videoUrl: video.webVideoUrl || video.videoUrl,
        downloadUrl: video.downloadAddr || video.video?.downloadAddr,
        profile: profile || video.authorMeta?.name || video.author?.uniqueId,
        description: video.text || video.description || '',
        hashtags: this.extractHashtags(video.text || video.description || ''),
        views,
        likes,
        comments,
        shares,
        engagementRate: views > 0 ? (likes + comments + shares) / views : 0,
        duration: video.videoMeta?.duration || video.video?.duration || 0,
        musicTitle: video.musicMeta?.musicName || video.music?.title,
        uploadDate: video.createTime || video.createTimeISO,
      };
    });
  }

  private applyFilters(videos: any[], filters?: any) {
    if (!filters) return videos;

    return videos.filter((video) => {
      if (filters.minViews && video.views < filters.minViews) return false;
      if (filters.minEngagementRate && video.engagementRate < filters.minEngagementRate) {
        return false;
      }
      if (filters.dateRange) {
        const uploadDate = new Date(video.uploadDate);
        if (uploadDate < filters.dateRange.from || uploadDate > filters.dateRange.to) {
          return false;
        }
      }
      return true;
    });
  }

  private selectTopVideos(videos: any[], topN: number) {
    return videos
      .sort((a, b) => b.engagementRate - a.engagementRate)
      .slice(0, topN);
  }

  private selectTopVideosDistributed(
    videos: any[],
    total: number,
    profileCount: number,
  ) {
    const perProfile = Math.ceil(total / profileCount);
    const grouped = this.groupByProfile(videos);
    const selected = [];

    for (const [profile, profileVideos] of Object.entries(grouped)) {
      const sorted = (profileVideos as any[]).sort(
        (a, b) => b.engagementRate - a.engagementRate,
      );
      selected.push(...sorted.slice(0, perProfile));
    }

    return selected.slice(0, total);
  }

  private groupByProfile(videos: any[]) {
    return videos.reduce((acc, video) => {
      if (!acc[video.profile]) acc[video.profile] = [];
      acc[video.profile].push(video);
      return acc;
    }, {});
  }

  private removeDuplicates(videos: any[]) {
    const seen = new Set();
    return videos.filter((video) => {
      if (seen.has(video.videoId)) return false;
      seen.add(video.videoId);
      return true;
    });
  }

  /**
   * Analiza videos con caché para ahorrar costos
   */
  private async analyzeVideosWithCache(videos: any[]) {
    const analyzed = [];

    for (const video of videos) {
      // Verificar si ya existe en caché
      let cached = await this.cacheRepo.findOne({
        where: { videoId: video.videoId },
      });

      if (cached) {
        this.logger.log(`Video ${video.videoId} encontrado en caché`);

        // Actualizar lastUsed
        cached.lastUsed = new Date();
        await this.cacheRepo.save(cached);

        analyzed.push({
          ...video,
          aiAnalysis: cached.aiAnalysis,
        });
        continue;
      }

      // Si no está en caché, analizar con IA
      try {
        this.logger.log(`Analizando video ${video.videoId} con IA`);

        const aiAnalysis = await this.videoIntelligence.analyzeVideo({
          videoUrl: video.downloadUrl || video.videoUrl,
          features: ['LABEL_DETECTION', 'SPEECH_TRANSCRIPTION', 'SHOT_CHANGE_DETECTION'],
        });

        const topics = aiAnalysis.labels.map((label) => label.entity);
        const transcript = aiAnalysis.speechTranscriptions
          .map((t) => t.alternatives?.[0]?.transcript)
          .join(' ');

        const analysisData = {
          topics,
          transcript,
          labels: aiAnalysis.labels.slice(0, 10),
          shotChanges: aiAnalysis.shotChanges.length,
        };

        // Guardar en caché
        await this.cacheRepo.save({
          videoId: video.videoId,
          videoUrl: video.videoUrl,
          profile: video.profile,
          metadata: {
            description: video.description,
            hashtags: video.hashtags,
            musicTitle: video.musicTitle,
            duration: video.duration,
            uploadDate: video.uploadDate,
          },
          metrics: {
            views: video.views,
            likes: video.likes,
            comments: video.comments,
            shares: video.shares,
            engagementRate: video.engagementRate,
          },
          aiAnalysis: analysisData,
          lastUsed: new Date(),
        });

        analyzed.push({
          ...video,
          aiAnalysis: analysisData,
        });
      } catch (error) {
        this.logger.error(`Error analizando video ${video.videoId}:`, error.message);
        analyzed.push({
          ...video,
          aiAnalysis: null,
        });
      }
    }

    return analyzed;
  }

  private async generateCompetitorInsights(
    analyzedVideos: any[],
    allVideos: any[],
    profiles: string[],
  ) {
    // Análisis por perfil
    const profileStats = profiles.map((profile) => {
      const profileVideos = allVideos.filter((v) => v.profile === profile);
      const avgEngagement =
        profileVideos.reduce((sum, v) => sum + v.engagementRate, 0) /
        profileVideos.length;

      const topics = new Map<string, number>();
      analyzedVideos
        .filter((v) => v.profile === profile && v.aiAnalysis)
        .forEach((v) => {
          v.aiAnalysis.topics.forEach((topic) => {
            topics.set(topic, (topics.get(topic) || 0) + 1);
          });
        });

      const topTopic = Array.from(topics.entries()).sort((a, b) => b[1] - a[1])[0];

      return {
        username: profile,
        avgEngagement,
        totalVideos: profileVideos.length,
        topTopic: topTopic?.[0] || 'N/A',
      };
    });

    // Insights generales (reutilizar lógica anterior)
    return {
      topProfiles: profileStats.sort((a, b) => b.avgEngagement - a.avgEngagement),
      topTopics: this.extractTopTopics(analyzedVideos),
      topHashtags: this.extractTopHashtags(allVideos),
      durationAnalysis: this.analyzeDuration(allVideos),
      bestPractices: await this.generateBestPracticesAI(analyzedVideos),
      trendingPatterns: await this.identifyPatterns(analyzedVideos),
    };
  }

  private async generateCategoryInsights(analyzedVideos: any[], allVideos: any[]) {
    return {
      topTopics: this.extractTopTopics(analyzedVideos),
      topHashtags: this.extractTopHashtags(allVideos),
      topCreators: this.extractTopCreators(allVideos),
      durationAnalysis: this.analyzeDuration(allVideos),
      bestPractices: await this.generateBestPracticesAI(analyzedVideos),
      trendingPatterns: await this.identifyPatterns(analyzedVideos),
    };
  }

  private async generateTrendingInsights(analyzedVideos: any[], allVideos: any[]) {
    return {
      topTopics: this.extractTopTopics(analyzedVideos),
      topHashtags: this.extractTopHashtags(allVideos),
      topCreators: this.extractTopCreators(allVideos),
      viralPatterns: await this.identifyViralPatterns(analyzedVideos),
      emergingTrends: await this.identifyEmergingTrends(analyzedVideos),
      bestPractices: await this.generateBestPracticesAI(analyzedVideos),
    };
  }

  private async generateCompetitorBasedSuggestions(
    analyzedVideos: any[],
    insights: any,
    userId: string,
  ) {
    const prompt = `
Eres un estratega de contenido para TikTok. Analiza estos datos de COMPETIDORES exitosos y genera sugerencias.

PERFIL TOP: ${insights.topProfiles?.[0]?.username} (${(insights.topProfiles?.[0]?.avgEngagement * 100).toFixed(2)}% engagement)

TOP TEMAS DE COMPETIDORES:
${insights.topTopics.slice(0, 5).map((t) => `- ${t.topic} (${t.frequency} videos)`).join('\n')}

HASHTAGS MÁS EFECTIVOS:
${insights.topHashtags.slice(0, 5).map((h) => `- ${h.hashtag} (${h.avgViews} views)`).join('\n')}

MEJORES PRÁCTICAS:
${insights.bestPractices.join('\n')}

TAREA:
Genera 8 sugerencias de contenido que:
1. Aprovechen los temas exitosos de la competencia
2. Sean únicas y diferenciadas
3. Incluyan hashtags comprobados
4. Expliquen qué competidor inspiró la idea

Responde en JSON:
{
  "suggestions": [
    {
      "title": "...",
      "description": "...",
      "suggestedHashtags": ["..."],
      "targetAudience": "...",
      "estimatedEngagement": "high|medium-high|medium",
      "reasoning": "...",
      "inspirationFrom": "@competitor"
    }
  ]
}
`;

    return await this.callGeminiForSuggestions(prompt);
  }

  private async generateCategoryBasedSuggestions(
    analyzedVideos: any[],
    insights: any,
    hashtags?: string[],
    keywords?: string[],
  ) {
    const prompt = `
Analiza estos videos trending de la categoría y genera sugerencias de contenido.

CATEGORÍA: ${hashtags?.join(', ') || keywords?.join(', ')}

TOP TEMAS:
${insights.topTopics.slice(0, 7).map((t) => `- ${t.topic}`).join('\n')}

TOP HASHTAGS:
${insights.topHashtags.slice(0, 7).map((h) => h.hashtag).join(', ')}

CREADORES TOP:
${insights.topCreators?.slice(0, 5).map((c) => c.username).join(', ')}

Genera 10 sugerencias de contenido únicas para esta categoría en JSON.
`;

    return await this.callGeminiForSuggestions(prompt);
  }

  private async generateTrendingBasedSuggestions(
    analyzedVideos: any[],
    insights: any,
    region?: string,
  ) {
    const prompt = `
Analiza los videos TRENDING actuales en ${region} y genera sugerencias.

TENDENCIAS EMERGENTES:
${insights.emergingTrends?.join('\n')}

PATRONES VIRALES:
${insights.viralPatterns?.join('\n')}

Genera 10 ideas de contenido que capitalicen estas tendencias AHORA.
`;

    return await this.callGeminiForSuggestions(prompt);
  }

  private async generateComparative(yourAnalysis: any, competitorAnalysis: any) {
    const prompt = `
Compara estos dos análisis y genera insights:

TU PERFIL:
- Engagement: ${yourAnalysis.insights.topTopics[0]?.avgEngagement || 0}
- Top temas: ${yourAnalysis.insights.topTopics.slice(0, 3).map((t) => t.topic).join(', ')}

COMPETENCIA:
- Engagement promedio: ${competitorAnalysis.insights.topProfiles?.[0]?.avgEngagement || 0}
- Top temas: ${competitorAnalysis.insights.topTopics.slice(0, 3).map((t) => t.topic).join(', ')}

Genera:
1. Fortalezas de tu perfil
2. Oportunidades (qué hace la competencia que tú no)
3. Recomendaciones específicas
4. 5 sugerencias de contenido basadas en gaps

Responde en JSON.
`;

    const response = await this.geminiService.generateText({
      prompt,
      model: 'gemini-1.5-flash',
      temperature: 0.7,
    });

    return JSON.parse(this.extractJSON(response.text));
  }

  // Métodos auxiliares adicionales
  private extractTopTopics(videos: any[]) {
    const topicFreq = new Map();
    videos.forEach((v) => {
      if (v.aiAnalysis?.topics) {
        v.aiAnalysis.topics.forEach((topic) => {
          const current = topicFreq.get(topic) || { count: 0, totalEng: 0 };
          topicFreq.set(topic, {
            count: current.count + 1,
            totalEng: current.totalEng + v.engagementRate,
          });
        });
      }
    });

    return Array.from(topicFreq.entries())
      .map(([topic, data]: any) => ({
        topic,
        frequency: data.count,
        avgEngagement: data.totalEng / data.count,
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 15);
  }

  private extractTopHashtags(videos: any[]) {
    const hashtagStats = new Map();
    videos.forEach((v) => {
      v.hashtags.forEach((tag) => {
        const current = hashtagStats.get(tag) || { usage: 0, totalViews: 0, totalEng: 0 };
        hashtagStats.set(tag, {
          usage: current.usage + 1,
          totalViews: current.totalViews + v.views,
          totalEng: current.totalEng + v.engagementRate,
        });
      });
    });

    return Array.from(hashtagStats.entries())
      .map(([hashtag, data]: any) => ({
        hashtag,
        usage: data.usage,
        avgViews: Math.round(data.totalViews / data.usage),
        avgEngagement: data.totalEng / data.usage,
      }))
      .sort((a, b) => b.usage - a.usage)
      .slice(0, 15);
  }

  private extractTopCreators(videos: any[]) {
    const creatorStats = new Map();
    videos.forEach((v) => {
      const current = creatorStats.get(v.profile) || { videos: 0, totalEng: 0 };
      creatorStats.set(v.profile, {
        videos: current.videos + 1,
        totalEng: current.totalEng + v.engagementRate,
      });
    });

    return Array.from(creatorStats.entries())
      .map(([username, data]: any) => ({
        username,
        videoCount: data.videos,
        avgEngagement: data.totalEng / data.videos,
      }))
      .sort((a, b) => b.avgEngagement - a.avgEngagement)
      .slice(0, 10);
  }

  private analyzeDuration(videos: any[]) {
    const sorted = videos.sort((a, b) => b.engagementRate - a.engagementRate);
    const top20 = sorted.slice(0, Math.ceil(videos.length * 0.2));
    const durations = top20.map((v) => v.duration).sort((a, b) => a - b);

    return {
      optimal: {
        min: durations[0],
        max: durations[durations.length - 1],
        median: durations[Math.floor(durations.length / 2)],
      },
      avgDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length,
    };
  }

  private async generateBestPracticesAI(videos: any[]) {
    // Implementar con Gemini
    return [
      'Videos entre 15-30 segundos tienen mejor engagement',
      'Uso de subtítulos aumenta engagement en 25%',
      'Hooks en los primeros 3 segundos son críticos',
    ];
  }

  private async identifyPatterns(videos: any[]) {
    // Implementar con Gemini
    return [
      'Videos educativos superan entretenimiento',
      'Formato "problema-solución" es recurrente',
    ];
  }

  private async identifyViralPatterns(videos: any[]) {
    return ['Reacciones a tendencias actuales', 'Challenges participativos'];
  }

  private async identifyEmergingTrends(videos: any[]) {
    return ['IA en marketing', 'Herramientas nocode'];
  }

  private async callGeminiForSuggestions(prompt: string) {
    try {
      const response = await this.geminiService.generateText({
        prompt,
        model: 'gemini-1.5-flash',
        systemInstruction: 'Eres un estratega de TikTok. Responde SIEMPRE en JSON válido.',
        temperature: 0.8,
        maxOutputTokens: 2048,
      });

      const json = this.extractJSON(response.text);
      const parsed = JSON.parse(json);
      return parsed.suggestions || [];
    } catch (error) {
      this.logger.error('Error generando sugerencias:', error);
      return [];
    }
  }

  private extractJSON(text: string): string {
    const match = text.match(/\{[\s\S]*\}/);
    return match ? match[0] : '{"suggestions":[]}';
  }

  private extractHashtags(text: string): string[] {
    const regex = /#[\w\u00C0-\u017F]+/g;
    return (text.match(regex) || []).map((tag) => tag.toLowerCase());
  }

  private mapVideoToResult(video: any) {
    return {
      videoId: video.videoId,
      videoUrl: video.videoUrl,
      profile: video.profile,
      description: video.description,
      hashtags: video.hashtags,
      metrics: {
        views: video.views,
        likes: video.likes,
        comments: video.comments,
        shares: video.shares,
        engagementRate: video.engagementRate,
      },
      aiAnalysis: video.aiAnalysis,
    };
  }

  /**
   * Obtener historial de análisis del usuario
   */
  async getUserAnalysisHistory(
    userId: string,
    type?: AnalysisType,
    page: number = 1,
    limit: number = 10,
  ) {
    const where: any = { userId };
    if (type) where.analysisType = type;

    const [data, total] = await this.analysisRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Obtener un análisis específico
   */
  async getAnalysisById(id: string, userId: string) {
    const analysis = await this.analysisRepo.findOne({
      where: { id, userId },
    });

    if (!analysis) {
      throw new Error('Análisis no encontrado');
    }

    return analysis;
  }
}
```

---

## Controlador con Todos los Endpoints

```typescript
// src/competitor-analysis/competitor-analysis.controller.ts
import { Controller, Post, Get, Body, Query, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/autGuard';
import { CompetitorAnalysisService } from './competitor-analysis.service';
import { AnalysisType } from './entities/competitor-analysis.entity';

@ApiTags('Competitor Analysis')
@Controller('competitor-analysis')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CompetitorAnalysisController {
  constructor(private readonly service: CompetitorAnalysisService) {}

  /**
   * 1. Analizar perfiles de competencia
   */
  @Post('competitors')
  @ApiOperation({
    summary: 'Analizar perfiles de competidores',
    description: 'Scrapea y analiza múltiples perfiles competidores para generar sugerencias',
  })
  async analyzeCompetitors(@Body() dto: any, @Request() req) {
    return await this.service.analyzeCompetitors({
      userId: req.user.userId,
      ...dto,
    });
  }

  /**
   * 2. Analizar por categoría/hashtags
   */
  @Post('category')
  @ApiOperation({
    summary: 'Analizar categoría o hashtags',
    description: 'Analiza videos por hashtags o keywords para identificar tendencias',
  })
  async analyzeCategory(@Body() dto: any, @Request() req) {
    return await this.service.analyzeCategory({
      userId: req.user.userId,
      ...dto,
    });
  }

  /**
   * 3. Analizar trending
   */
  @Post('trending')
  @ApiOperation({
    summary: 'Analizar videos trending',
    description: 'Analiza videos en tendencia por región',
  })
  async analyzeTrending(@Body() dto: any, @Request() req) {
    return await this.service.analyzeTrending({
      userId: req.user.userId,
      ...dto,
    });
  }

  /**
   * 4. Análisis comparativo
   */
  @Post('comparative')
  @ApiOperation({
    summary: 'Análisis comparativo',
    description: 'Compara tu perfil con competidores y genera insights',
  })
  async analyzeComparative(@Body() dto: any, @Request() req) {
    return await this.service.analyzeComparative({
      userId: req.user.userId,
      ...dto,
    });
  }

  /**
   * Obtener historial de análisis
   */
  @Get('history')
  @ApiOperation({ summary: 'Obtener historial de análisis del usuario' })
  @ApiQuery({ name: 'type', required: false, enum: AnalysisType })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getHistory(
    @Request() req,
    @Query('type') type?: AnalysisType,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return await this.service.getUserAnalysisHistory(
      req.user.userId,
      type,
      page,
      limit,
    );
  }

  /**
   * Obtener análisis específico
   */
  @Get(':id')
  @ApiOperation({ summary: 'Obtener análisis específico por ID' })
  async getAnalysis(@Param('id') id: string, @Request() req) {
    return await this.service.getAnalysisById(id, req.user.userId);
  }
}
```

---

## Resumen del MVP

### Endpoints Disponibles

| Endpoint | Descripción | Scrapea |
|----------|-------------|---------|
| `POST /competitor-analysis/competitors` | Analiza perfiles competidores | 50-200 videos/perfil |
| `POST /competitor-analysis/category` | Analiza hashtags/categorías | 200+ videos |
| `POST /competitor-analysis/trending` | Analiza trending por región | 100-200 videos |
| `POST /competitor-analysis/comparative` | Compara tu perfil vs competencia | Variable |
| `GET /competitor-analysis/history` | Historial de análisis | - |
| `GET /competitor-analysis/:id` | Obtener análisis específico | - |

### Relación con Usuario

✅ **Todos los análisis quedan vinculados al usuario:**
- Campo `userId` en `CompetitorAnalysis`
- Relación `ManyToOne` con `Usuario`
- Consultas filtradas por `userId`
- Historial completo accesible

✅ **Cache de videos compartido:**
- `VideoAnalysisCache` reutiliza análisis IA
- Ahorro de costos significativo
- No requiere `userId` (es global)

### Flujo Completo

```
Usuario → Endpoint → Service → Apify (scraping) → Filtrado
   ↓
BD (Crear registro) → Análisis IA (con caché) → Insights
   ↓
Gemini (sugerencias) → Guardar resultados → Respuesta
```

### Costos Estimados

| Análisis | Videos | Costo IA | Total |
|----------|--------|----------|-------|
| 3 Competidores | 150 | ~$2.50 | ~$2.60 |
| Categoría | 200 | ~$5.00 | ~$5.10 |
| Trending | 100 | ~$1.50 | ~$1.60 |
| Comparativo | Variable | Variable | ~$3-5 |

**Con caché activo: -70% en análisis repetidos**

