import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsArray,
  IsNumber,
  IsOptional,
  Min,
  Max,
  IsEnum,
  ValidateNested,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

// ============== REQUEST DTOs ==============

export class DateRangeDto {
  @ApiProperty({ example: '2025-01-01' })
  @IsDateString()
  from: string;

  @ApiProperty({ example: '2025-01-31' })
  @IsDateString()
  to: string;
}

export class AnalysisFilters {
  @ApiPropertyOptional({ example: 1000, description: 'Mínimo de views' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minViews?: number;

  @ApiPropertyOptional({ example: 0.02, description: 'Engagement rate mínimo (0-1)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  minEngagementRate?: number;

  @ApiPropertyOptional({ description: 'Rango de fechas' })
  @IsOptional()
  @ValidateNested()
  @Type(() => DateRangeDto)
  dateRange?: DateRangeDto;
}

export class AnalyzeCompetitorsDto {
  @ApiProperty({
    example: ['@competitor1', '@competitor2'],
    description: 'Lista de perfiles de TikTok a analizar',
  })
  @IsArray()
  @IsString({ each: true })
  competitorProfiles: string[];

  @ApiPropertyOptional({ default: 50, minimum: 10, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(100)
  videosPerProfile?: number;

  @ApiPropertyOptional({ default: 20, minimum: 5, maximum: 50 })
  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(50)
  analyzeTop?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => AnalysisFilters)
  filters?: AnalysisFilters;
}

export class AnalyzeCategoryDto {
  @ApiPropertyOptional({
    example: ['#marketing', '#emprendimiento'],
    description: 'Lista de hashtags a analizar',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  hashtags?: string[];

  @ApiPropertyOptional({
    example: ['marketing digital', 'redes sociales'],
    description: 'Palabras clave a buscar',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @ApiPropertyOptional({ default: 200, minimum: 50, maximum: 500 })
  @IsOptional()
  @IsNumber()
  @Min(50)
  @Max(500)
  numberOfVideos?: number;

  @ApiPropertyOptional({ default: 30, minimum: 10, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(100)
  analyzeTop?: number;

  @ApiPropertyOptional({ example: 'US', description: 'Código de región (US, MX, ES, etc.)' })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => AnalysisFilters)
  filters?: AnalysisFilters;
}

export class AnalyzeTrendingDto {
  @ApiPropertyOptional({ default: 'US', example: 'US' })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional({ default: 100, minimum: 20, maximum: 200 })
  @IsOptional()
  @IsNumber()
  @Min(20)
  @Max(200)
  numberOfVideos?: number;

  @ApiPropertyOptional({ default: 20, minimum: 10, maximum: 50 })
  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(50)
  analyzeTop?: number;
}

export class AnalyzeComparativeDto {
  @ApiProperty({ example: '@mi_usuario', description: 'Tu perfil de TikTok' })
  @IsString()
  yourProfile: string;

  @ApiProperty({
    example: ['@competitor1', '@competitor2'],
    description: 'Perfiles competidores',
  })
  @IsArray()
  @IsString({ each: true })
  competitorProfiles: string[];

  @ApiPropertyOptional({ default: 50, minimum: 20, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(20)
  @Max(100)
  videosPerProfile?: number;
}

// ============== RESPONSE DTOs ==============

export class VideoMetricsDto {
  @ApiProperty()
  views: number;

  @ApiProperty()
  likes: number;

  @ApiProperty()
  comments: number;

  @ApiProperty()
  shares: number;

  @ApiProperty()
  engagementRate: number;
}

export class VideoAIAnalysisDto {
  @ApiProperty({ type: [String] })
  topics: string[];

  @ApiProperty()
  transcript: string;

  @ApiProperty({ required: false })
  sentimentScore?: number;

  @ApiProperty({ type: [String], required: false })
  keyPhrases?: string[];
}

export class VideoResultDto {
  @ApiProperty()
  videoId: string;

  @ApiProperty()
  videoUrl: string;

  @ApiProperty()
  profile: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ type: [String] })
  hashtags: string[];

  @ApiProperty()
  metrics: VideoMetricsDto;

  @ApiProperty({ required: false })
  aiAnalysis?: VideoAIAnalysisDto;
}

export class TopicInsightDto {
  @ApiProperty()
  topic: string;

  @ApiProperty()
  frequency: number;

  @ApiProperty()
  avgEngagement: number;
}

export class HashtagInsightDto {
  @ApiProperty()
  hashtag: string;

  @ApiProperty()
  usage: number;

  @ApiProperty()
  avgViews: number;

  @ApiProperty()
  avgEngagement: number;
}

export class ProfileInsightDto {
  @ApiProperty()
  username: string;

  @ApiProperty()
  avgEngagement: number;

  @ApiProperty()
  totalVideos: number;

  @ApiProperty()
  topTopic: string;
}

export class CreatorInsightDto {
  @ApiProperty()
  username: string;

  @ApiProperty()
  videoCount: number;

  @ApiProperty()
  avgEngagement: number;
}

export class DurationAnalysisDto {
  @ApiProperty()
  optimal: { min: number; max: number; median: number };

  @ApiProperty()
  avgDuration: number;
}

export class InsightsDto {
  @ApiProperty({ type: [TopicInsightDto] })
  topTopics: TopicInsightDto[];

  @ApiProperty({ type: [HashtagInsightDto] })
  topHashtags: HashtagInsightDto[];

  @ApiProperty({ type: [ProfileInsightDto], required: false })
  topProfiles?: ProfileInsightDto[];

  @ApiProperty({ type: [CreatorInsightDto], required: false })
  topCreators?: CreatorInsightDto[];

  @ApiProperty()
  durationAnalysis: DurationAnalysisDto;

  @ApiProperty({ type: [String] })
  bestPractices: string[];

  @ApiProperty({ type: [String], required: false })
  trendingPatterns?: string[];

  @ApiProperty({ type: [String], required: false })
  viralPatterns?: string[];

  @ApiProperty({ type: [String], required: false })
  emergingTrends?: string[];
}

export class ContentSuggestionDto {
  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ type: [String] })
  suggestedHashtags: string[];

  @ApiProperty({ required: false })
  targetAudience?: string;

  @ApiProperty({ enum: ['high', 'medium-high', 'medium', 'low'] })
  estimatedEngagement: string;

  @ApiProperty()
  reasoning: string;

  @ApiProperty({ required: false })
  inspirationFrom?: string;
}

export class ComparativeResultDto {
  @ApiProperty()
  yourProfile: {
    avgEngagement: number;
    topTopics: string[];
    strengths: string[];
  };

  @ApiProperty()
  competitors: {
    avgEngagement: number;
    topTopics: string[];
    opportunities: string[];
  };

  @ApiProperty({ type: [String] })
  recommendations: string[];
}

export class AnalysisResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  analysisId: string;

  @ApiProperty()
  summary: {
    totalVideos?: number;
    analyzedVideos?: number;
    competitorsAnalyzed?: number;
    region?: string;
    processingTime?: number;
  };

  @ApiProperty()
  insights: InsightsDto;

  @ApiProperty({ type: [ContentSuggestionDto] })
  suggestions: ContentSuggestionDto[];

  @ApiProperty({ required: false })
  comparative?: ComparativeResultDto;
}

export class AnalysisHistoryDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: ['own_profile', 'competitor_profile', 'category', 'comparative', 'trending'] })
  analysisType: string;

  @ApiProperty({ enum: ['pending', 'processing', 'completed', 'failed'] })
  status: string;

  @ApiProperty()
  parameters: any;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ required: false })
  completedAt?: Date;

  @ApiProperty({ required: false })
  scrapingMetadata?: any;
}

export class PaginatedHistoryResponseDto {
  @ApiProperty({ type: [AnalysisHistoryDto] })
  data: AnalysisHistoryDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}
