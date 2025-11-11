import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApifyClient } from 'apify-client';
import { AnalysisService } from './Analisys.services';
import { QueryType } from './entity/apify.entity';


export interface TikTokScrapingResult {
  success: boolean;
  data?: any[];
  error?: string;
  runId?: string;
  totalResults?: number;
}

export interface TikTokHashtagOptions {
  hashtags: string[];
  resultsPerPage?: number; // 1-200, default 20
  shouldDownloadCovers?: boolean;
  shouldDownloadSlideshowImages?: boolean;
  shouldDownloadSubtitles?: boolean;
  shouldDownloadVideos?: boolean;
  proxyConfiguration?: {
    useApifyProxy?: boolean;
    apifyProxyGroups?: string[];
  };
}

export interface TikTokProfileOptions {
  profiles: string[]; // Usernames or profile URLs
  resultsPerPage?: number;
  shouldDownloadCovers?: boolean;
  shouldDownloadSlideshowImages?: boolean;
  shouldDownloadSubtitles?: boolean;
  shouldDownloadVideos?: boolean;
  proxyConfiguration?: {
    useApifyProxy?: boolean;
    apifyProxyGroups?: string[];
  };
}

export interface TikTokSearchOptions {
  search: string; // Keywords to search
  resultsPerPage?: number;
  shouldDownloadCovers?: boolean;
  shouldDownloadSlideshowImages?: boolean;
  shouldDownloadSubtitles?: boolean;
  shouldDownloadVideos?: boolean;
  proxyConfiguration?: {
    useApifyProxy?: boolean;
    apifyProxyGroups?: string[];
  };
}

export interface TikTokVideoOptions {
  videoUrls: string[]; // Specific TikTok video URLs
  shouldDownloadCovers?: boolean;
  shouldDownloadSlideshowImages?: boolean;
  shouldDownloadSubtitles?: boolean;
  shouldDownloadVideos?: boolean;
  proxyConfiguration?: {
    useApifyProxy?: boolean;
    apifyProxyGroups?: string[];
  };
}

export interface TikTokAdvancedScrapingOptions {
  type: 'HASHTAG' | 'PROFILE' | 'SEARCH' | 'VIDEO' | 'TREND' | 'MUSIC';
  hashtags?: string[];
  profiles?: string[];
  search?: string;
  videoUrls?: string[];
  musicUrls?: string[];
  resultsPerPage?: number; // 1-1000 for some actors
  maxResults?: number; // Maximum total results
  region?: string; // US, GB, DE, FR, etc. for trending
  language?: string; // en, es, fr, de, etc.

  // Download options
  shouldDownloadCovers?: boolean;
  shouldDownloadSlideshowImages?: boolean;
  shouldDownloadSubtitles?: boolean;
  shouldDownloadVideos?: boolean;

  // Filters
  minLikes?: number;
  maxLikes?: number;
  minComments?: number;
  maxComments?: number;
  minShares?: number;
  maxShares?: number;
  minViews?: number;
  maxViews?: number;

  // Date filters
  createdAfter?: string; // ISO date
  createdBefore?: string; // ISO date

  // Additional options
  includeVideoDetails?: boolean;
  includeAuthorDetails?: boolean;
  includeMusicDetails?: boolean;
  includeHashtagDetails?: boolean;

  // Proxy configuration
  proxyConfiguration?: {
    useApifyProxy?: boolean;
    apifyProxyGroups?: string[];
    apifyProxyCountry?: string;
  };

  // Performance
  maxConcurrency?: number; // 1-50
  requestDelay?: number; // Delay between requests in ms
  timeout?: number; // Timeout in seconds
}

@Injectable()
export class TikTokApifyService {
  private readonly logger = new Logger(TikTokApifyService.name);
  private readonly apifyClient: ApifyClient;

  // Actor IDs for different TikTok scrapers
  private readonly ACTORS = {
    DATA_EXTRACTOR: 'clockworks/free-tiktok-scraper',
    PROFILE_SCRAPER: 'clockworks/tiktok-profile-scraper',
    VIDEO_SCRAPER: 'clockworks/tiktok-video-scraper',
    HASHTAG_SCRAPER: 'clockworks/tiktok-hashtag-scraper',
    SEARCH_SCRAPER: 'epctex/tiktok-search-scraper',
    ADVANCED_SCRAPER: 'apidojo/tiktok-scraper', // Pay per result
    FAST_SCRAPER: 'novi/fast-tiktok-scraper', // Pay per video
    COMMENTS_SCRAPER: 'clockworks/tiktok-comments-scraper',
    SOUND_SCRAPER: 'clockworks/tiktok-sound-scraper',
  };

  constructor(
    private entitySreaperAnalisys: AnalysisService,
    private configService: ConfigService) {
    const token = this.configService.get<string>('APIFY_TOKEN');
    if (!token) {
      throw new Error('APIFY_TOKEN no está configurado en las variables de entorno');
    }

    this.apifyClient = new ApifyClient({ token });
  }

  /**
   * Ejecuta un actor de Apify específico para TikTok
   */
  private async runTikTokActor(
    actorId: string,
    input: any,
    options?: { timeout?: number; memory?: number }
  ): Promise<TikTokScrapingResult> {
    try {
      this.logger.log(`Iniciando TikTok actor: ${actorId}`);

      const run = await this.apifyClient.actor(actorId).call(input, {
        timeout: options?.timeout || 300,
        memory: options?.memory || 4096,
        build: 'latest',
      });

      this.logger.log(`TikTok actor ejecutado exitosamente. Run ID: ${run.id}`);

      const { items } = await this.apifyClient.dataset(run.defaultDatasetId).listItems();

      return {
        success: true,
        data: items,
        runId: run.id,
        totalResults: items.length,
      };
    } catch (error) {
      this.logger.error(`Error ejecutando TikTok actor ${actorId}:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Scraping básico por hashtags
   */
  async scrapeByHashtags(options: TikTokHashtagOptions): Promise<TikTokScrapingResult> {
    const input = {
      hashtags: options.hashtags,
      resultsPerPage: options.resultsPerPage || 20,
      shouldDownloadCovers: options.shouldDownloadCovers || false,
      shouldDownloadSlideshowImages: options.shouldDownloadSlideshowImages || false,
      shouldDownloadSubtitles: options.shouldDownloadSubtitles || false,
      shouldDownloadVideos: options.shouldDownloadVideos || false,
      proxyConfiguration: options.proxyConfiguration || { useApifyProxy: true },
    };

    return this.runTikTokActor(this.ACTORS.DATA_EXTRACTOR, input);
  }

  /**
   * Scraping de perfiles de usuario
   */
  async scrapeProfiles(options: TikTokProfileOptions, id: string): Promise<TikTokScrapingResult > {
    const input = {
      profiles: options.profiles,
      resultsPerPage: options.resultsPerPage || 50,
      shouldDownloadCovers: options.shouldDownloadCovers || false,
      shouldDownloadSlideshowImages: options.shouldDownloadSlideshowImages || false,
      shouldDownloadSubtitles: options.shouldDownloadSubtitles || false,
      shouldDownloadVideos: options.shouldDownloadVideos || false,
      proxyConfiguration: options.proxyConfiguration || { useApifyProxy: true },
    };

    try {
      const resultScraper = await this.runTikTokActor(this.ACTORS.PROFILE_SCRAPER, input);

      this.entitySreaperAnalisys.create({
        userId: id,
        analysisResult: resultScraper.data as any,
        queryType: QueryType.PROPIA
      })
      return resultScraper
    } catch (error) {
      console.log("error");
      throw error;
    }

  }

  /**
   * Scraping por búsqueda de palabras clave
   */
  async scrapeBySearch(options: TikTokSearchOptions): Promise<TikTokScrapingResult> {
    const input = {
      search: options.search,
      resultsPerPage: options.resultsPerPage || 50,
      shouldDownloadCovers: options.shouldDownloadCovers || false,
      shouldDownloadSlideshowImages: options.shouldDownloadSlideshowImages || false,
      shouldDownloadSubtitles: options.shouldDownloadSubtitles || false,
      shouldDownloadVideos: options.shouldDownloadVideos || false,
      proxyConfiguration: options.proxyConfiguration || { useApifyProxy: true },
    };

    return this.runTikTokActor(this.ACTORS.DATA_EXTRACTOR, input);
  }

  /**
   * Scraping de videos específicos
   */
  async scrapeVideos(options: TikTokVideoOptions): Promise<TikTokScrapingResult> {
    const input = {
      videoUrls: options.videoUrls,
      shouldDownloadCovers: options.shouldDownloadCovers || false,
      shouldDownloadSlideshowImages: options.shouldDownloadSlideshowImages || false,
      shouldDownloadSubtitles: options.shouldDownloadSubtitles || false,
      shouldDownloadVideos: options.shouldDownloadVideos || false,
      proxyConfiguration: options.proxyConfiguration || { useApifyProxy: true },
    };

    return this.runTikTokActor(this.ACTORS.VIDEO_SCRAPER, input);
  }

  /**
   * Scraping avanzado con todas las opciones de filtrado
   */
  async scrapeAdvanced(options: TikTokAdvancedScrapingOptions): Promise<TikTokScrapingResult> {
    let input: any = {
      resultsPerPage: options.resultsPerPage || 50,
      shouldDownloadCovers: options.shouldDownloadCovers || false,
      shouldDownloadSlideshowImages: options.shouldDownloadSlideshowImages || false,
      shouldDownloadSubtitles: options.shouldDownloadSubtitles || false,
      shouldDownloadVideos: options.shouldDownloadVideos || false,
      proxyConfiguration: options.proxyConfiguration || { useApifyProxy: true },
    };

    // Configurar según el tipo de scraping
    switch (options.type) {
      case 'HASHTAG':
        input.hashtags = options.hashtags;
        break;
      case 'PROFILE':
        input.profiles = options.profiles;
        break;
      case 'SEARCH':
        input.search = options.search;
        break;
      case 'VIDEO':
        input.videoUrls = options.videoUrls;
        break;
      case 'TREND':
        input = {
          ...input,
          type: 'TREND',
          region: options.region || 'US',
          maxResults: options.maxResults || 100,
        };
        break;
      case 'MUSIC':
        input.musicUrls = options.musicUrls;
        break;
    }

    // Agregar filtros de engagement si están presentes
    if (options.minLikes !== undefined) input.minLikes = options.minLikes;
    if (options.maxLikes !== undefined) input.maxLikes = options.maxLikes;
    if (options.minComments !== undefined) input.minComments = options.minComments;
    if (options.maxComments !== undefined) input.maxComments = options.maxComments;
    if (options.minShares !== undefined) input.minShares = options.minShares;
    if (options.maxShares !== undefined) input.maxShares = options.maxShares;
    if (options.minViews !== undefined) input.minViews = options.minViews;
    if (options.maxViews !== undefined) input.maxViews = options.maxViews;

    // Agregar filtros de fecha
    if (options.createdAfter) input.createdAfter = options.createdAfter;
    if (options.createdBefore) input.createdBefore = options.createdBefore;

    // Opciones adicionales de detalle
    if (options.includeVideoDetails !== undefined) input.includeVideoDetails = options.includeVideoDetails;
    if (options.includeAuthorDetails !== undefined) input.includeAuthorDetails = options.includeAuthorDetails;
    if (options.includeMusicDetails !== undefined) input.includeMusicDetails = options.includeMusicDetails;
    if (options.includeHashtagDetails !== undefined) input.includeHashtagDetails = options.includeHashtagDetails;

    // Configuración de rendimiento
    if (options.maxConcurrency !== undefined) input.maxConcurrency = options.maxConcurrency;
    if (options.requestDelay !== undefined) input.requestDelay = options.requestDelay;

    // Usar el actor más apropiado según el tipo
    let actorId = this.ACTORS.DATA_EXTRACTOR;

    if (options.type === 'TREND' || options.maxResults && options.maxResults > 200) {
      actorId = this.ACTORS.ADVANCED_SCRAPER;
    } else if (options.type === 'SEARCH') {
      actorId = this.ACTORS.SEARCH_SCRAPER;
    }

    return this.runTikTokActor(actorId, input, {
      timeout: options.timeout || 600,
      memory: 8192,
    });
  }

  /**
   * Obtener comentarios de videos específicos
   */
  async scrapeComments(videoUrls: string[], maxComments: number = 100): Promise<TikTokScrapingResult> {
    const input = {
      videoUrls,
      maxComments,
      proxyConfiguration: { useApifyProxy: true },
    };

    return this.runTikTokActor(this.ACTORS.COMMENTS_SCRAPER, input);
  }

  /**
   * Obtener información de música/sonidos
   */
  async scrapeSounds(soundUrls: string[]): Promise<TikTokScrapingResult> {
    const input = {
      soundUrls,
      proxyConfiguration: { useApifyProxy: true },
    };

    return this.runTikTokActor(this.ACTORS.SOUND_SCRAPER, input);
  }

  /**
   * Scraping de tendencias por región
   */
  async scrapeTrending(region: string = 'US', maxResults: number = 100): Promise<TikTokScrapingResult> {
    const input = {
      type: 'TREND',
      region,
      maxResults,
      includeVideoDetails: true,
      includeAuthorDetails: true,
      proxyConfiguration: { useApifyProxy: true },
    };

    return this.runTikTokActor(this.ACTORS.FAST_SCRAPER, input);
  }

  /**
   * Obtener estado de una ejecución
   */
  async getRunStatus(runId: string) {
    try {
      const run = await this.apifyClient.run(runId).get();

      if (!run) {
        throw new Error(`No se pudo obtener información del run ${runId}`);
      }

      return {
        status: run.status,
        startedAt: run.startedAt,
        finishedAt: run.finishedAt,
        stats: run.stats,
        computeUnits: run.stats?.computeUnits ?? 0,
      };
    } catch (error) {
      this.logger.error(`Error obteniendo estado del run ${runId}:`, error);
      throw error;
    }
  }


  /**
   * Obtener métricas de uso
   
  async getUsageMetrics() {
    try {
      const user = await this.apifyClient.user().get();
      return {
        monthlyUsageUsd: user.monthlyUsageUsd,
        usageCycle: user.usageCycle,
      };
    } catch (error) {
      this.logger.error('Error obteniendo métricas de uso:', error);
      throw error;
    }
  }*/
}