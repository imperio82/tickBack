import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsDate,
  IsEnum,
  IsOptional,
  IsArray,
  IsBoolean,
  IsNumber,
  Min,
  Max,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  PostStatus,
  PostPlatform,
} from '../entities/scheduled-post.entity';
import { CalendarGenerationStrategy } from '../entities/content-calendar.entity';

// ============== Scheduled Post DTOs ==============

export class CreateScheduledPostDto {
  @ApiProperty({ example: 'Mi próximo video sobre marketing' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ example: 'Explicaré las 5 mejores estrategias...' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: ['#marketing', '#tips', '#viral'] })
  @IsOptional()
  @IsArray()
  hashtags?: string[];

  @ApiPropertyOptional({ enum: PostPlatform, default: PostPlatform.TIKTOK })
  @IsOptional()
  @IsEnum(PostPlatform)
  platform?: PostPlatform;

  @ApiProperty({ example: '2026-07-15T18:00:00Z' })
  @Type(() => Date)
  @IsDate()
  scheduledDate: Date;

  @ApiPropertyOptional({ enum: PostStatus, default: PostStatus.SCHEDULED })
  @IsOptional()
  @IsEnum(PostStatus)
  status?: PostStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: {
    videoUrl?: string;
    coverImageUrl?: string;
    duration?: number;
    category?: string;
    targetAudience?: string;
    notes?: string;
  };

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  inspirationAnalysisId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  inspirationVideoId?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  sendReminder?: boolean;

  @ApiPropertyOptional({ default: 30 })
  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(1440)
  reminderMinutesBefore?: number;
}

export class UpdateScheduledPostDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  hashtags?: string[];

  @ApiPropertyOptional({ enum: PostPlatform })
  @IsOptional()
  @IsEnum(PostPlatform)
  platform?: PostPlatform;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  scheduledDate?: Date;

  @ApiPropertyOptional({ enum: PostStatus })
  @IsOptional()
  @IsEnum(PostStatus)
  status?: PostStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  sendReminder?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  reminderMinutesBefore?: number;
}

// ============== Calendar Generation DTOs ==============

export class GenerateCalendarDto {
  @ApiProperty({ example: 'Calendario Enero 2026' })
  @IsString()
  calendarName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: '2026-01-01' })
  @Type(() => Date)
  @IsDate()
  startDate: Date;

  @ApiProperty({ example: '2026-01-31' })
  @Type(() => Date)
  @IsDate()
  endDate: Date;

  @ApiProperty({ example: 5, description: 'Publicaciones por semana' })
  @IsNumber()
  @Min(1)
  @Max(21)
  postsPerWeek: number;

  @ApiPropertyOptional({
    enum: CalendarGenerationStrategy,
    default: CalendarGenerationStrategy.BALANCED,
  })
  @IsOptional()
  @IsEnum(CalendarGenerationStrategy)
  strategy?: CalendarGenerationStrategy;

  @ApiPropertyOptional({
    example: [1, 3, 5],
    description: 'Días preferidos (0=Dom, 1=Lun, ...)',
  })
  @IsOptional()
  @IsArray()
  preferredDays?: number[];

  @ApiPropertyOptional({
    example: [9, 12, 18, 21],
    description: 'Horas preferidas (formato 24h)',
  })
  @IsOptional()
  @IsArray()
  preferredHours?: number[];

  @ApiPropertyOptional({
    description: 'ID del análisis para extraer horarios óptimos',
  })
  @IsOptional()
  @IsString()
  referenceAnalysisId?: string;

  @ApiPropertyOptional({
    example: { educational: 50, entertaining: 30, promotional: 20 },
  })
  @IsOptional()
  @IsObject()
  contentMix?: {
    educational?: number;
    entertaining?: number;
    promotional?: number;
  };
}

export class GetOptimalHoursDto {
  @ApiPropertyOptional({
    description: 'ID del análisis de competencia o propio perfil',
  })
  @IsOptional()
  @IsString()
  analysisId?: string;

  @ApiPropertyOptional({
    example: 10,
    description: 'Top N horas con mejor engagement',
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(24)
  topHours?: number;
}

export class BulkCreatePostsDto {
  @ApiProperty({ type: [CreateScheduledPostDto] })
  @IsArray()
  posts: CreateScheduledPostDto[];
}

// ============== Response DTOs ==============

export class OptimalHourResponse {
  @ApiProperty()
  hour: number; // 0-23

  @ApiProperty()
  dayOfWeek: number; // 0=Sunday, 1=Monday, ...

  @ApiProperty()
  averageEngagement: number;

  @ApiProperty()
  sampleSize: number; // Cuántos videos se analizaron en este horario

  @ApiProperty()
  score: number; // 0-100, score normalizado
}

export class CalendarStatisticsResponse {
  @ApiProperty()
  totalPosts: number;

  @ApiProperty()
  distributionByDay: Record<string, number>;

  @ApiProperty()
  distributionByHour: Record<string, number>;

  @ApiProperty()
  averagePostsPerWeek: number;

  @ApiProperty()
  optimalHoursUsed: string[];

  @ApiProperty()
  upcomingPosts: number;

  @ApiProperty()
  publishedPosts: number;

  @ApiProperty()
  draftPosts: number;
}
