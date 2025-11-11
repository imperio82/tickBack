// DTOs para Swagger
import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, IsOptional, IsNumber, IsBoolean, IsIn, Min, Max } from 'class-validator';

export class ProxyConfigurationDto {
  @ApiProperty({ required: false, description: 'Usar proxy de Apify' })
  @IsOptional()
  @IsBoolean()
  useApifyProxy?: boolean;

  @ApiProperty({ required: false, description: 'Grupos de proxy', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  apifyProxyGroups?: string[];

  @ApiProperty({ required: false, description: 'País del proxy' })
  @IsOptional()
  @IsString()
  apifyProxyCountry?: string;
}

export class HashtagScrapingDto {
  @ApiProperty({ description: 'Lista de hashtags a scrapear', example: ['viral', 'trending'] })
  @IsArray()
  @IsString({ each: true })
  hashtags: string[];

  @ApiProperty({ required: false, description: 'Resultados por página (1-200)', minimum: 1, maximum: 200, default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(200)
  resultsPerPage?: number;

  @ApiProperty({ required: false, description: 'Descargar covers', default: false })
  @IsOptional()
  @IsBoolean()
  shouldDownloadCovers?: boolean;

  @ApiProperty({ required: false, description: 'Descargar imágenes de slideshow', default: false })
  @IsOptional()
  @IsBoolean()
  shouldDownloadSlideshowImages?: boolean;

  @ApiProperty({ required: false, description: 'Descargar subtítulos', default: false })
  @IsOptional()
  @IsBoolean()
  shouldDownloadSubtitles?: boolean;

  @ApiProperty({ required: false, description: 'Descargar videos', default: false })
  @IsOptional()
  @IsBoolean()
  shouldDownloadVideos?: boolean;

  @ApiProperty({ required: false, type: ProxyConfigurationDto })
  @IsOptional()
  proxyConfiguration?: ProxyConfigurationDto;
  numberOfVideos: number;
}

export class ProfileScrapingDto {
  @ApiProperty({ description: 'Lista de perfiles (usernames o URLs)', example: ['@username', 'https://tiktok.com/@user'] })
  @IsArray()
  @IsString({ each: true })
  profiles: string[];

  @ApiProperty({ required: false, description: 'Resultados por página', minimum: 1, maximum: 200, default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(200)
  resultsPerPage?: number;

  @ApiProperty({ required: false, description: 'Descargar covers', default: false })
  @IsOptional()
  @IsBoolean()
  shouldDownloadCovers?: boolean;

  @ApiProperty({ required: false, description: 'Descargar imágenes de slideshow', default: false })
  @IsOptional()
  @IsBoolean()
  shouldDownloadSlideshowImages?: boolean;

  @ApiProperty({ required: false, description: 'Descargar subtítulos', default: false })
  @IsOptional()
  @IsBoolean()
  shouldDownloadSubtitles?: boolean;

  @ApiProperty({ required: false, description: 'Descargar videos', default: false })
  @IsOptional()
  @IsBoolean()
  shouldDownloadVideos?: boolean;

  @ApiProperty({ required: false, type: ProxyConfigurationDto })
  @IsOptional()
  proxyConfiguration?: ProxyConfigurationDto;
  numberOfVideos: number;
}

export class SearchScrapingDto {
  @ApiProperty({ description: 'Palabras clave para buscar', example: 'funny cats' })
  @IsString()
  search: string;

  @ApiProperty({ required: false, description: 'Resultados por página', minimum: 1, maximum: 200, default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(200)
  resultsPerPage?: number;

  @ApiProperty({ required: false, description: 'Descargar covers', default: false })
  @IsOptional()
  @IsBoolean()
  shouldDownloadCovers?: boolean;

  @ApiProperty({ required: false, description: 'Descargar imágenes de slideshow', default: false })
  @IsOptional()
  @IsBoolean()
  shouldDownloadSlideshowImages?: boolean;

  @ApiProperty({ required: false, description: 'Descargar subtítulos', default: false })
  @IsOptional()
  @IsBoolean()
  shouldDownloadSubtitles?: boolean;

  @ApiProperty({ required: false, description: 'Descargar videos', default: false })
  @IsOptional()
  @IsBoolean()
  shouldDownloadVideos?: boolean;

  @ApiProperty({ required: false, type: ProxyConfigurationDto })
  @IsOptional()
  proxyConfiguration?: ProxyConfigurationDto;
  numberOfVideos: number;
}

export class VideoScrapingDto {
  @ApiProperty({ description: 'URLs de videos específicos', example: ['https://tiktok.com/@user/video/123'] })
  @IsArray()
  @IsString({ each: true })
  videoUrls: string[];

  @ApiProperty({ required: false, description: 'Descargar covers', default: false })
  @IsOptional()
  @IsBoolean()
  shouldDownloadCovers?: boolean;

  @ApiProperty({ required: false, description: 'Descargar imágenes de slideshow', default: false })
  @IsOptional()
  @IsBoolean()
  shouldDownloadSlideshowImages?: boolean;

  @ApiProperty({ required: false, description: 'Descargar subtítulos', default: false })
  @IsOptional()
  @IsBoolean()
  shouldDownloadSubtitles?: boolean;

  @ApiProperty({ required: false, description: 'Descargar videos', default: false })
  @IsOptional()
  @IsBoolean()
  shouldDownloadVideos?: boolean;

  @ApiProperty({ required: false, type: ProxyConfigurationDto })
  @IsOptional()
  proxyConfiguration?: ProxyConfigurationDto;
}

export class AdvancedScrapingDto {
  @ApiProperty({ 
    description: 'Tipo de scraping',
    enum: ['HASHTAG', 'PROFILE', 'SEARCH', 'VIDEO', 'TREND', 'MUSIC']
  })
  @IsIn(['HASHTAG', 'PROFILE', 'SEARCH', 'VIDEO', 'TREND', 'MUSIC'])
  type: 'HASHTAG' | 'PROFILE' | 'SEARCH' | 'VIDEO' | 'TREND' | 'MUSIC';

  @ApiProperty({ required: false, description: 'Hashtags (para tipo HASHTAG)', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  hashtags?: string[];

  @ApiProperty({ required: false, description: 'Perfiles (para tipo PROFILE)', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  profiles?: string[];

  @ApiProperty({ required: false, description: 'Término de búsqueda (para tipo SEARCH)' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ required: false, description: 'URLs de videos (para tipo VIDEO)', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  videoUrls?: string[];

  @ApiProperty({ required: false, description: 'URLs de música (para tipo MUSIC)', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  musicUrls?: string[];

  @ApiProperty({ required: false, description: 'Resultados por página (1-1000)', minimum: 1, maximum: 1000, default: 50 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  resultsPerPage?: number;

  @ApiProperty({ required: false, description: 'Máximo total de resultados' })
  @IsOptional()
  @IsNumber()
  maxResults?: number;

  @ApiProperty({ required: false, description: 'Región (para tendencias)', example: 'US' })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiProperty({ required: false, description: 'Idioma', example: 'en' })
  @IsOptional()
  @IsString()
  language?: string;

  // Opciones de descarga
  @ApiProperty({ required: false, description: 'Descargar covers', default: false })
  @IsOptional()
  @IsBoolean()
  shouldDownloadCovers?: boolean;

  @ApiProperty({ required: false, description: 'Descargar imágenes de slideshow', default: false })
  @IsOptional()
  @IsBoolean()
  shouldDownloadSlideshowImages?: boolean;

  @ApiProperty({ required: false, description: 'Descargar subtítulos', default: false })
  @IsOptional()
  @IsBoolean()
  shouldDownloadSubtitles?: boolean;

  @ApiProperty({ required: false, description: 'Descargar videos', default: false })
  @IsOptional()
  @IsBoolean()
  shouldDownloadVideos?: boolean;

  // Filtros de engagement
  @ApiProperty({ required: false, description: 'Mínimo de likes' })
  @IsOptional()
  @IsNumber()
  minLikes?: number;

  @ApiProperty({ required: false, description: 'Máximo de likes' })
  @IsOptional()
  @IsNumber()
  maxLikes?: number;

  @ApiProperty({ required: false, description: 'Mínimo de comentarios' })
  @IsOptional()
  @IsNumber()
  minComments?: number;

  @ApiProperty({ required: false, description: 'Máximo de comentarios' })
  @IsOptional()
  @IsNumber()
  maxComments?: number;

  @ApiProperty({ required: false, description: 'Mínimo de shares' })
  @IsOptional()
  @IsNumber()
  minShares?: number;

  @ApiProperty({ required: false, description: 'Máximo de shares' })
  @IsOptional()
  @IsNumber()
  maxShares?: number;

  @ApiProperty({ required: false, description: 'Mínimo de visualizaciones' })
  @IsOptional()
  @IsNumber()
  minViews?: number;

  @ApiProperty({ required: false, description: 'Máximo de visualizaciones' })
  @IsOptional()
  @IsNumber()
  maxViews?: number;

  // Filtros de fecha
  @ApiProperty({ required: false, description: 'Creado después de (ISO date)', example: '2024-01-01T00:00:00Z' })
  @IsOptional()
  @IsString()
  createdAfter?: string;

  @ApiProperty({ required: false, description: 'Creado antes de (ISO date)', example: '2024-12-31T23:59:59Z' })
  @IsOptional()
  @IsString()
  createdBefore?: string;

  // Opciones adicionales
  @ApiProperty({ required: false, description: 'Incluir detalles del video', default: true })
  @IsOptional()
  @IsBoolean()
  includeVideoDetails?: boolean;

  @ApiProperty({ required: false, description: 'Incluir detalles del autor', default: true })
  @IsOptional()
  @IsBoolean()
  includeAuthorDetails?: boolean;

  @ApiProperty({ required: false, description: 'Incluir detalles de la música', default: false })
  @IsOptional()
  @IsBoolean()
  includeMusicDetails?: boolean;

  @ApiProperty({ required: false, description: 'Incluir detalles de hashtags', default: false })
  @IsOptional()
  @IsBoolean()
  includeHashtagDetails?: boolean;

  @ApiProperty({ required: false, type: ProxyConfigurationDto })
  @IsOptional()
  proxyConfiguration?: ProxyConfigurationDto;

  // Configuración de rendimiento
  @ApiProperty({ required: false, description: 'Máxima concurrencia (1-50)', minimum: 1, maximum: 50 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  maxConcurrency?: number;

  @ApiProperty({ required: false, description: 'Delay entre requests (ms)' })
  @IsOptional()
  @IsNumber()
  requestDelay?: number;

  @ApiProperty({ required: false, description: 'Timeout en segundos' })
  @IsOptional()
  @IsNumber()
  timeout?: number;
}

export class CommentScrapingDto {
  @ApiProperty({ description: 'URLs de videos para obtener comentarios' })
  @IsArray()
  @IsString({ each: true })
  videoUrls: string[];

  @ApiProperty({ required: false, description: 'Máximo de comentarios por video', default: 100 })
  @IsOptional()
  @IsNumber()
  maxComments?: number;
}

export class SoundScrapingDto {
  @ApiProperty({ description: 'URLs de sonidos/música' })
  @IsArray()
  @IsString({ each: true })
  soundUrls: string[];
}

// Response DTOs
export class ScrapingResponseDto {
  @ApiProperty({ description: 'Indica si la operación fue exitosa' })
  success: boolean;

  @ApiProperty({ required: false, description: 'Datos scrapeados', type: [Object] })
  data?: any[];

  @ApiProperty({ required: false, description: 'Mensaje de error si falló' })
  error?: string;

  @ApiProperty({ required: false, description: 'ID de la ejecución en Apify' })
  runId?: string;

  @ApiProperty({ required: false, description: 'Total de resultados obtenidos' })
  totalResults?: number;
}

export class RunStatusDto {
  @ApiProperty({ description: 'Estado de la ejecución' })
  status: string;

  @ApiProperty({ description: 'Fecha de inicio' })
  startedAt: string;

  @ApiProperty({ required: false, description: 'Fecha de finalización' })
  finishedAt?: string;

  @ApiProperty({ description: 'Estadísticas de la ejecución' })
  stats: any;

  @ApiProperty({ description: 'Unidades de cómputo utilizadas' })
  computeUnits: number;
}