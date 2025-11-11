import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsObject,
  IsNumber,
  IsArray,
  ValidateNested,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { QueryType, AnalysisStatus } from '../entity/apify.entity';

// DTO para crear análisis
export class CreateAnalysisRequest {
  @ApiProperty({
    description: 'Consulta SQL o texto del análisis',
    example: 'SELECT * FROM products WHERE price > 100',
  })
  @IsString()
  query: string;

  @ApiProperty({
    description: 'Tipo de consulta',
    enum: QueryType,
    example: QueryType.SQL_QUERY,
  })
  @IsEnum(QueryType)
  queryType: QueryType;

  @ApiPropertyOptional({
    description: 'Parámetros adicionales para el análisis',
    type: 'object',
    additionalProperties: true,
    example: { filters: ['category'], sortBy: 'price' },
  })
  @IsOptional()
  @IsObject()
  parameters?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Descripción del análisis',
    example: 'Análisis de productos con precio mayor a $100',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Estado inicial del análisis',
    enum: AnalysisStatus,
    example: AnalysisStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(AnalysisStatus)
  status?: AnalysisStatus;

  
  analysisResult?: any
}

// DTO para actualizar análisis
export class UpdateAnalysisRequest extends PartialType(CreateAnalysisRequest) {}

// DTO para actualizar solo el estado
export class UpdateAnalysisStatusRequest {
  @ApiProperty({
    description: 'Nuevo estado del análisis',
    enum: AnalysisStatus,
    example: AnalysisStatus.COMPLETED,
  })
  @IsEnum(AnalysisStatus)
  status: AnalysisStatus;
}

// DTO para actualizar solo el resultado
export class UpdateAnalysisResultRequest {
  @ApiProperty({
    description: 'Resultado del análisis',
    type: 'object',
    additionalProperties: true,
    example: {
      totalProducts: 150,
      averagePrice: 250.50,
      categories: ['electronics', 'clothing']
    },
  })
  @IsObject()
  analysisResult: Record<string, any>;
}

// Respuesta de usuario para las relaciones
export class UserResponse {
  @ApiProperty({ example: 'user123' })
  id: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  email: string;

  @ApiProperty({ example: 'John Doe' })
  name: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt: Date;
}

// Respuesta principal de análisis
export class AnalysisResponse {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'user123' })
  userId: string;

  @ApiProperty({
    example: 'SELECT * FROM products WHERE price > 100',
  })
  query: string;

  @ApiProperty({
    enum: QueryType,
    example: QueryType.SQL_QUERY,
  })
  queryType: QueryType;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    example: { filters: ['category'], sortBy: 'price' },
  })
  parameters?: Record<string, any>;

  @ApiPropertyOptional({
    example: 'Análisis de productos con precio mayor a $100',
  })
  description?: string;

  @ApiProperty({
    enum: AnalysisStatus,
    example: AnalysisStatus.COMPLETED,
  })
  status: AnalysisStatus;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    example: {
      totalProducts: 150,
      averagePrice: 250.50,
      categories: ['electronics', 'clothing']
    },
  })
  analysisResult?: Record<string, any>;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt: Date;

  @ApiPropertyOptional({ type: UserResponse })
  user?: UserResponse;
}

// Respuesta paginada
export class PaginatedAnalysisResponse {
  @ApiProperty({ type: [AnalysisResponse] })
  data: AnalysisResponse[];

  @ApiProperty({ example: 100 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: 10 })
  totalPages: number;
}

// Respuesta de array simple
export class AnalysisArrayResponse {
  @ApiProperty({ type: [AnalysisResponse] })
  data: AnalysisResponse[];
}

// Respuesta de estadísticas por tipo
export class StatsByTypeResponse {
  @ApiProperty({ example: 25 })
  [QueryType.SQL_QUERY]: number;

  @ApiProperty({ example: 15 })
  [QueryType.INVESTIGACION]: any;

  @ApiProperty({ example: 5 })
  [QueryType.PROPIA]: number;
}

// Respuesta de estadísticas por estado
export class StatsByStatusResponse {
  @ApiProperty({ example: 10 })
  [AnalysisStatus.PENDING]: number;

  @ApiProperty({ example: 35 })
  [AnalysisStatus.COMPLETED]: number;

  @ApiProperty({ example: 5 })
  [AnalysisStatus.FAILED]: number;
}

// Respuesta de estadísticas completas
export class AnalysisStatsResponse {
  @ApiProperty({ example: 55 })
  total: number;

  @ApiProperty({ type: StatsByTypeResponse })
  byType: Record<QueryType, number>;

  @ApiProperty({ type: StatsByStatusResponse })
  byStatus: Record<AnalysisStatus, number>;

  @ApiProperty({ 
    example: 12,
    description: 'Análisis creados en los últimos 7 días'
  })
  recent: number;
}

// Grupo de análisis duplicados
export class DuplicateGroup {
  @ApiProperty({ 
    type: [AnalysisResponse],
    description: 'Análisis duplicados en este grupo'
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnalysisResponse)
  analyses: AnalysisResponse[];

  @ApiProperty({ 
    example: 3,
    description: 'Cantidad de análisis duplicados en este grupo'
  })
  @IsNumber()
  count: number;
}

// Respuesta de duplicados
export class DuplicatesResponse {
  @ApiProperty({ 
    type: [DuplicateGroup],
    description: 'Grupos de análisis duplicados'
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DuplicateGroup)
  groups: DuplicateGroup[];

  @ApiProperty({ 
    example: 5,
    description: 'Número total de grupos de duplicados encontrados'
  })
  @IsNumber()
  totalGroups: number;

  @ApiProperty({ 
    example: 15,
    description: 'Número total de análisis duplicados'
  })
  @IsNumber()
  totalDuplicates: number;
}

// DTO para eliminar múltiples análisis
export class DeleteMultipleAnalysisRequest {
  @ApiProperty({
    example: [1, 2, 3, 4],
    description: 'Array de IDs de análisis a eliminar',
    type: [Number],
  })
  @IsArray()
  @IsNumber({}, { each: true })
  ids: number[];
}

// Respuesta de eliminación múltiple
export class DeleteMultipleResponse {
  @ApiProperty({ example: 'Análisis eliminados correctamente' })
  message: string;

  @ApiProperty({ example: 4 })
  deletedCount: number;
}

// Respuesta de eliminación simple
export class DeleteResponse {
  @ApiProperty({ example: 'Análisis eliminado correctamente' })
  message: string;
}