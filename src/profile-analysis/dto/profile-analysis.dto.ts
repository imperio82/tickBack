import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsUrl, IsArray, IsOptional, IsNumber, Min, Max, IsEnum } from 'class-validator';

// DTO para iniciar scraping de perfil
export class ScrapeProfileDto {
  @ApiProperty({
    description: 'URL del perfil de TikTok a analizar',
    example: 'https://www.tiktok.com/@username'
  })
  @IsString()
  @IsNotEmpty()
  profileUrl: string;

  @ApiPropertyOptional({
    description: 'Número de videos a scrapear',
    example: 50,
    default: 50
  })
  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(200)
  resultsPerPage?: number;
}

// DTO para analizar videos seleccionados
export class AnalyzeVideosDto {
  @ApiProperty({
    description: 'IDs de los videos filtrados que el usuario seleccionó para analizar',
    example: ['7244920758097497350', '7244920758097497351'],
    type: [String]
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  selectedVideoIds: string[];

  @ApiPropertyOptional({
    description: 'Tipo de análisis',
    example: 'detailed',
    enum: ['quick', 'detailed'],
    default: 'detailed'
  })
  @IsOptional()
  @IsEnum(['quick', 'detailed'])
  analysisType?: 'quick' | 'detailed';

  @ApiPropertyOptional({
    description: 'Incluir transcripción de audio',
    example: true,
    default: true
  })
  @IsOptional()
  includeTranscription?: boolean;
}

// Response DTOs
export class ScrapeProfileResponseDto {
  @ApiProperty()
  analysisId: string;

  @ApiProperty()
  totalVideos: number;

  @ApiProperty()
  runId: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  message: string;
}

export class FilteredDataResponseDto {
  @ApiProperty()
  filteredDataId: string;

  @ApiProperty()
  top5EngagementOptimo: any[];

  @ApiProperty()
  insights: any;

  @ApiProperty()
  estadisticas: any;

  @ApiProperty()
  message: string;
}

export class FilteredVideosResponseDto {
  @ApiProperty()
  videos: Array<{
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
  }>;

  @ApiProperty()
  recomendados: string[];

  @ApiProperty()
  totalVideos: number;
}

export class AnalyzeVideosResponseDto {
  @ApiProperty()
  jobId: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  estimatedTime: number;

  @ApiProperty()
  videosToAnalyze: number;

  @ApiProperty()
  message: string;
}

export class VideoAnalysisStatusResponseDto {
  @ApiProperty()
  jobId: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  progress: number;

  @ApiProperty()
  currentStep: string;

  @ApiProperty()
  videosProcessed: number;

  @ApiProperty()
  videosTotal: number;

  @ApiProperty({ required: false })
  currentVideo?: string;

  @ApiProperty({ required: false })
  errorMessage?: string;
}

export class InsightsResponseDto {
  @ApiProperty()
  videoAnalysis: any[];

  @ApiProperty()
  geminiInsights: {
    rawResponse: string;
    parsedInsights?: any;
  };

  @ApiProperty()
  recommendations: string[];

  @ApiProperty()
  patterns: any;

  @ApiProperty()
  status: string;
}

// DTO para regenerar insights con opciones
export class RegenerateInsightsDto {
  @ApiPropertyOptional({
    description: 'Temperatura para la generación (0.0-1.0). Mayor = más creativo',
    example: 0.8,
    default: 0.7,
    minimum: 0,
    maximum: 1
  })
  @IsOptional()
  @IsNumber()
  temperature?: number;

  @ApiPropertyOptional({
    description: 'Enfoque del análisis',
    example: 'creativo',
    enum: ['creativo', 'conservador', 'analitico', 'viral', 'educativo'],
    default: 'analitico'
  })
  @IsOptional()
  @IsEnum(['creativo', 'conservador', 'analitico', 'viral', 'educativo'])
  enfoque?: 'creativo' | 'conservador' | 'analitico' | 'viral' | 'educativo';

  @ApiPropertyOptional({
    description: 'Número de ideas de contenido a generar',
    example: 5,
    default: 3,
    minimum: 1,
    maximum: 10
  })
  @IsOptional()
  @IsNumber()
  numeroIdeas?: number;

  @ApiPropertyOptional({
    description: 'Guardar como variante en lugar de sobrescribir',
    example: true,
    default: true
  })
  @IsOptional()
  guardarVariante?: boolean;

  @ApiPropertyOptional({
    description: 'Nombre/etiqueta para esta variante',
    example: 'Variante creativa'
  })
  @IsOptional()
  @IsString()
  nombreVariante?: string;
}
