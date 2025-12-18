import { Injectable, Logger, NotFoundException } from '@nestjs/common';
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

interface VideoWithMetrics {
  videoId: string;
  videoUrl: string;
  downloadUrl?: string;
  profile: string;
  description: string;
  hashtags: string[];
  views: number;
  likes: number;
  comments: number;
  shares: number;
  engagementRate: number;
  duration: number;
  musicTitle?: string;
  uploadDate?: string;
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
    competitorProfiles: string[];
    videosPerProfile?: number;
    analyzeTop?: number;
    filters?: any;
  }) {
    this.logger.log(`Iniciando análisis de ${request.competitorProfiles.length} competidores`);

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
      const allVideos: VideoWithMetrics[] = [];

      // PASO 1: Scrapear cada perfil
      for (const profile of request.competitorProfiles) {
        this.logger.log(`Scrapeando perfil: ${profile}`);

        const scrapingResult = await this.tiktokService.scrapeProfiles(
          {
            profiles: [profile],
            resultsPerPage: request.videosPerProfile || 50,
            shouldDownloadSubtitles: true,
            shouldDownloadCovers: false,
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

      // PASO 3: Seleccionar top videos
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

      // PASO 6: Generar sugerencias
      const suggestions = await this.generateCompetitorBasedSuggestions(
        analyzedVideos,
        insights,
      );

      // Actualizar análisis
      analysis.status = AnalysisStatus.COMPLETED;
      analysis.completedAt = new Date();
      analysis.scrapingMetadata = {
        totalVideosScraped: allVideos.length,
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
    hashtags?: string[];
    keywords?: string[];
    numberOfVideos?: number;
    analyzeTop?: number;
    region?: string;
    filters?: any;
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
      const allVideos: VideoWithMetrics[] = [];

      // PASO 1: Scrapear por hashtags
      if (request.hashtags && request.hashtags.length > 0) {
        this.logger.log(`Scrapeando hashtags: ${request.hashtags.join(', ')}`);

        const hashtagResult = await this.tiktokService.scrapeByHashtags({
          hashtags: request.hashtags,
          resultsPerPage: Math.floor((request.numberOfVideos || 200) / request.hashtags.length),
          shouldDownloadSubtitles: true,
        }, request.userId);

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
          }, request.userId);

          if (searchResult.success && searchResult.data) {
            const processed = this.processVideos(searchResult.data);
            allVideos.push(...processed);
          }
        }
      }

      const uniqueVideos = this.removeDuplicates(allVideos);
      const filtered = this.applyFilters(uniqueVideos, request.filters);
      const topVideos = this.selectTopVideos(filtered, request.analyzeTop || 30);
      const analyzedVideos = await this.analyzeVideosWithCache(topVideos);
      const insights = await this.generateCategoryInsights(analyzedVideos, filtered);
      const suggestions = await this.generateCategoryBasedSuggestions(
        analyzedVideos,
        insights,
        request.hashtags,
        request.keywords,
      );

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
    region?: string;
    numberOfVideos?: number;
    analyzeTop?: number;
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

      const trendingResult = await this.tiktokService.scrapeTrending(
        request.region || 'US',
        request.numberOfVideos || 100,
        request.userId,
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
   * ANÁLISIS 4: Comparativo
   */
  async analyzeComparative(request: {
    userId: string;
    yourProfile: string;
    competitorProfiles: string[];
    videosPerProfile?: number;
  }) {
    this.logger.log('Iniciando análisis comparativo');

    const yourAnalysis = await this.analyzeCompetitors({
      userId: request.userId,
      competitorProfiles: [request.yourProfile],
      videosPerProfile: request.videosPerProfile,
      analyzeTop: 15,
    });

    const competitorAnalysis = await this.analyzeCompetitors({
      userId: request.userId,
      competitorProfiles: request.competitorProfiles,
      videosPerProfile: request.videosPerProfile,
      analyzeTop: 15,
    });

    const comparative = await this.generateComparative(yourAnalysis, competitorAnalysis);

    const analysis = this.analysisRepo.create({
      userId: request.userId,
      analysisType: AnalysisType.COMPARATIVE,
      status: AnalysisStatus.COMPLETED,
      parameters: {
        profiles: [request.yourProfile, ...request.competitorProfiles],
      },
      results: {
        videos: [],
        insights: {
          topTopics: yourAnalysis.insights.topTopics,
          topHashtags: yourAnalysis.insights.topHashtags,
          durationAnalysis: yourAnalysis.insights.durationAnalysis,
          bestPractices: yourAnalysis.insights.bestPractices,
          trendingPatterns: yourAnalysis.insights.trendingPatterns || [],
        },
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

  private processVideos(rawVideos: any[], profile?: string): VideoWithMetrics[] {
    return rawVideos.map((video) => {
      const views = video.playCount || video.stats?.playCount || 0;
      const likes = video.diggCount || video.stats?.diggCount || 0;
      const comments = video.commentCount || video.stats?.commentCount || 0;
      const shares = video.shareCount || video.stats?.shareCount || 0;

      return {
        videoId: video.id,
        videoUrl: video.webVideoUrl || video.videoUrl,
        downloadUrl: video.downloadAddr || video.video?.downloadAddr,
        profile: profile || video.authorMeta?.name || video.author?.uniqueId || 'unknown',
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

  private applyFilters(videos: VideoWithMetrics[], filters?: any): VideoWithMetrics[] {
    if (!filters) return videos;

    return videos.filter((video) => {
      if (filters.minViews && video.views < filters.minViews) return false;
      if (filters.minEngagementRate && video.engagementRate < filters.minEngagementRate) {
        return false;
      }
      if (filters.dateRange && video.uploadDate) {
        const uploadDate = new Date(video.uploadDate);
        const from = new Date(filters.dateRange.from);
        const to = new Date(filters.dateRange.to);
        if (uploadDate < from || uploadDate > to) return false;
      }
      return true;
    });
  }

  private selectTopVideos(videos: VideoWithMetrics[], topN: number): VideoWithMetrics[] {
    return videos
      .sort((a, b) => b.engagementRate - a.engagementRate)
      .slice(0, topN);
  }

  private selectTopVideosDistributed(
    videos: VideoWithMetrics[],
    total: number,
    profileCount: number,
  ): VideoWithMetrics[] {
    const perProfile = Math.ceil(total / profileCount);
    const grouped = this.groupByProfile(videos);
    const selected: VideoWithMetrics[] = [];

    for (const profileVideos of Object.values(grouped)) {
      const sorted = (profileVideos as VideoWithMetrics[]).sort(
        (a, b) => b.engagementRate - a.engagementRate,
      );
      selected.push(...sorted.slice(0, perProfile));
    }

    return selected.slice(0, total);
  }

  private groupByProfile(videos: VideoWithMetrics[]): Record<string, VideoWithMetrics[]> {
    return videos.reduce((acc, video) => {
      if (!acc[video.profile]) acc[video.profile] = [];
      acc[video.profile].push(video);
      return acc;
    }, {} as Record<string, VideoWithMetrics[]>);
  }

  private removeDuplicates(videos: VideoWithMetrics[]): VideoWithMetrics[] {
    const seen = new Set<string>();
    return videos.filter((video) => {
      if (seen.has(video.videoId)) return false;
      seen.add(video.videoId);
      return true;
    });
  }

  private async analyzeVideosWithCache(videos: VideoWithMetrics[]) {
    const analyzed: any[] = [];

    for (const video of videos) {
      let cached = await this.cacheRepo.findOne({
        where: { videoId: video.videoId },
      });

      if (cached) {
        this.logger.log(`Video ${video.videoId} encontrado en caché`);
        cached.lastUsed = new Date();
        await this.cacheRepo.save(cached);

        analyzed.push({
          ...video,
          aiAnalysis: cached.aiAnalysis,
        });
        continue;
      }

      try {
        this.logger.log(`Analizando video ${video.videoId} con IA`);

        const aiAnalysis = await this.videoIntelligence.analyzeVideo({
          videoUrl: video.downloadUrl || video.videoUrl,
          userId: '',
        });

        const topics = aiAnalysis.labels.map((label) => label.entity);
        const transcript = aiAnalysis.speechTranscriptions
          .map((t) => t.alternatives?.[0]?.transcript)
          .filter(Boolean)
          .join(' ');

        const analysisData = {
          topics,
          transcript,
          labels: aiAnalysis.labels.slice(0, 10),
          shotChanges: aiAnalysis.shotChanges.length,
        };

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
    allVideos: VideoWithMetrics[],
    profiles: string[],
  ) {
    const profileStats = profiles.map((profile) => {
      const profileVideos = allVideos.filter((v) => v.profile === profile);
      const avgEngagement =
        profileVideos.length > 0
          ? profileVideos.reduce((sum, v) => sum + v.engagementRate, 0) / profileVideos.length
          : 0;

      const topics = new Map<string, number>();
      analyzedVideos
        .filter((v) => v.profile === profile && v.aiAnalysis)
        .forEach((v) => {
          v.aiAnalysis.topics.forEach((topic: string) => {
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

    return {
      topProfiles: profileStats.sort((a, b) => b.avgEngagement - a.avgEngagement),
      topTopics: this.extractTopTopics(analyzedVideos),
      topHashtags: this.extractTopHashtags(allVideos),
      durationAnalysis: this.analyzeDuration(allVideos),
      bestPractices: await this.generateBestPracticesAI(analyzedVideos),
      trendingPatterns: await this.identifyPatterns(analyzedVideos),
    };
  }

  private async generateCategoryInsights(analyzedVideos: any[], allVideos: VideoWithMetrics[]) {
    return {
      topTopics: this.extractTopTopics(analyzedVideos),
      topHashtags: this.extractTopHashtags(allVideos),
      topCreators: this.extractTopCreators(allVideos),
      durationAnalysis: this.analyzeDuration(allVideos),
      bestPractices: await this.generateBestPracticesAI(analyzedVideos),
      trendingPatterns: await this.identifyPatterns(analyzedVideos),
    };
  }

  private async generateTrendingInsights(analyzedVideos: any[], allVideos: VideoWithMetrics[]) {
    return {
      topTopics: this.extractTopTopics(analyzedVideos),
      topHashtags: this.extractTopHashtags(allVideos),
      topCreators: this.extractTopCreators(allVideos),
      durationAnalysis: this.analyzeDuration(allVideos),
      viralPatterns: ['Reacciones a tendencias actuales', 'Challenges participativos'],
      emergingTrends: ['IA en marketing', 'Herramientas nocode'],
      bestPractices: await this.generateBestPracticesAI(analyzedVideos),
    };
  }

  private async generateCompetitorBasedSuggestions(analyzedVideos: any[], insights: any) {
    const prompt = `
Eres un estratega de contenido para TikTok. Analiza estos datos de COMPETIDORES exitosos y genera sugerencias.

TOP TEMAS DE COMPETIDORES:
${insights.topTopics.slice(0, 5).map((t: any) => `- ${t.topic} (${t.frequency} videos)`).join('\n')}

HASHTAGS MÁS EFECTIVOS:
${insights.topHashtags.slice(0, 5).map((h: any) => `- ${h.hashtag} (${h.avgViews} views)`).join('\n')}

MEJORES PRÁCTICAS:
${insights.bestPractices.join('\n')}

TAREA:
Genera 7 sugerencias de contenido que:
1. Aprovechen los temas exitosos de la competencia
2. Sean únicas y diferenciadas
3. Incluyan hashtags comprobados

Responde en JSON:
{
  "suggestions": [
    {
      "title": "...",
      "description": "...",
      "suggestedHashtags": ["..."],
      "targetAudience": "...",
      "estimatedEngagement": "high",
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
${insights.topTopics.slice(0, 7).map((t: any) => `- ${t.topic}`).join('\n')}

TOP HASHTAGS:
${insights.topHashtags.slice(0, 7).map((h: any) => h.hashtag).join(', ')}

Genera 8 sugerencias de contenido únicas para esta categoría en JSON.
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
${insights.emergingTrends?.join('\n') || 'Contenido viral actual'}

PATRONES VIRALES:
${insights.viralPatterns?.join('\n') || 'Challenges y reacciones'}

Genera 8 ideas de contenido que capitalicen estas tendencias AHORA en JSON.
`;

    return await this.callGeminiForSuggestions(prompt);
  }

  private async generateComparative(yourAnalysis: any, competitorAnalysis: any) {
    const comparison = {
      yourProfile: {
        avgEngagement: yourAnalysis.insights.topTopics[0]?.avgEngagement || 0,
        topTopics: yourAnalysis.insights.topTopics.slice(0, 3).map((t: any) => t.topic),
        strengths: ['Alto engagement en contenido motivacional'],
      },
      competitors: {
        avgEngagement: competitorAnalysis.insights.topProfiles?.[0]?.avgEngagement || 0,
        topTopics: competitorAnalysis.insights.topTopics.slice(0, 3).map((t: any) => t.topic),
        opportunities: ['Contenido más técnico', 'Tips prácticos'],
      },
      recommendations: [
        'Incorporar más contenido educativo técnico',
        'Reducir duración de videos a 15-25 segundos',
      ],
    };

    return {
      insights: comparison,
      comparison,
      suggestions: yourAnalysis.suggestions.concat(competitorAnalysis.suggestions).slice(0, 10),
    };
  }

  private extractTopTopics(videos: any[]) {
    const topicFreq = new Map();
    videos.forEach((v) => {
      if (v.aiAnalysis?.topics) {
        v.aiAnalysis.topics.forEach((topic: string) => {
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

  private extractTopHashtags(videos: VideoWithMetrics[]) {
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

  private extractTopCreators(videos: VideoWithMetrics[]) {
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

  private analyzeDuration(videos: VideoWithMetrics[]) {
    const sorted = [...videos].sort((a, b) => b.engagementRate - a.engagementRate);
    const top20 = sorted.slice(0, Math.ceil(videos.length * 0.2));
    const durations = top20.map((v) => v.duration).sort((a, b) => a - b);

    if (durations.length === 0) {
      return {
        optimal: { min: 15, max: 30, median: 20 },
        avgDuration: 20,
      };
    }

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
    return [
      'Videos entre 15-30 segundos tienen mejor engagement',
      'Uso de subtítulos aumenta engagement en 25%',
      'Hooks en los primeros 3 segundos son críticos',
      'Contenido educativo genera mayor retención',
      'Llamados a la acción claros mejoran interacción',
    ];
  }

  private async identifyPatterns(videos: any[]) {
    return [
      'Videos educativos superan entretenimiento',
      'Formato "problema-solución" es recurrente',
      'Contenido de valor genera más shares',
    ];
  }

  private async callGeminiForSuggestions(prompt: string) {
    try {
      const response = await this.geminiService.generateText({
        prompt,
        model: 'gemini-flash-latest',
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
   * Historial de análisis del usuario
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
   * Obtener análisis específico
   */
  async getAnalysisById(id: string, userId: string) {
    const analysis = await this.analysisRepo.findOne({
      where: { id, userId },
    });

    if (!analysis) {
      throw new NotFoundException('Análisis no encontrado');
    }

    return analysis;
  }
}
