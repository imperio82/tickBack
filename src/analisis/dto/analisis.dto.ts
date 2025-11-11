import {
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
  IsArray,
  IsObject,
  ValidateNested,
  IsNumber,
  Min,
  Max
} from 'class-validator';
import { Type } from 'class-transformer';
import { VideoAnalysisData, AIAnalysisData, FilteredAnalysisData } from '../analisisentity/analisis.entity';

export class CreateAnalysisDto {
  @IsUUID()
  userId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Object)
  videoAnalysis: VideoAnalysisData[];

  @IsObject()
  @ValidateNested()
  @Type(() => Object)
  aiAnalysis: AIAnalysisData;

  @IsObject()
  @ValidateNested()
  @Type(() => Object)
  filteredAnalysis: FilteredAnalysisData;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(['pending', 'processing', 'completed', 'failed'])
  status?: 'pending' | 'processing' | 'completed' | 'failed';
}

export class UpdateAnalysisDto {
  @IsOptional()
  @IsArray()
  videoAnalysis?: VideoAnalysisData[];

  @IsOptional()
  @IsObject()
  aiAnalysis?: AIAnalysisData;

  @IsOptional()
  @IsObject()
  filteredAnalysis?: FilteredAnalysisData;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(['pending', 'processing', 'completed', 'failed'])
  status?: 'pending' | 'processing' | 'completed' | 'failed';

  @IsOptional()
  @IsObject()
  processingMetadata?: any;
}

export class AnalysisQueryDto {
  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsEnum(['pending', 'processing', 'completed', 'failed'])
  status?: 'pending' | 'processing' | 'completed' | 'failed';

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  sortBy?: 'createdAt' | 'updatedAt' | 'title' = 'createdAt';

  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
