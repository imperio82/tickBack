// src/dto/video-analysis.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUrl, IsOptional, IsArray, IsEnum, IsNumber, Max, Min } from 'class-validator';
import { GeminiModel, GEMINI_MODELS } from '../iaLenguageGeneta';


export class ScrapingRequestDto {
  @IsUrl()
  targetUrl: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  maxResults?: number;
}

// src/interfaces/video-analysis.interface.ts
export interface LabelDetection {
  entity: string;
  categoryEntities: string[];
  confidence: number;
  segments: Array<{
    startTime: string;
    endTime: string;
  }>;
}

export interface SpeechTranscription {
  alternatives: Array<{
    transcript: string;
    confidence: number;
    words: Array<{
      word: string;
      startTime: string;
      endTime: string;
      speakerTag?: number;
    }>;
  }>;
  languageCode: string;
}

export interface ShotChange {
  startTime: string;
  endTime: string;
}

export interface VideoAnalysisResult {
  labels: LabelDetection[];
  speechTranscriptions: SpeechTranscription[];
  shotChanges: ShotChange[];
  processingTime: number;
  videoUri: string;
}


// DTOs para Swagger
export class GenerateTextRequestDto {
  @ApiProperty({
    description: 'El prompt para generar texto',
    example: 'Escribe un resumen sobre inteligencia artificial'
  })
  @IsString()
  prompt: string;

  @ApiProperty({
    description: 'Modelo de IA a utilizar',
    enum: GEMINI_MODELS,
    default: 'gemini-flash-latest',
    required: false
  })
  @IsOptional()
  @IsEnum(GEMINI_MODELS)
  model?: GeminiModel;

  @ApiProperty({
    description: 'Instrucciones del sistema para guiar el comportamiento del modelo',
    example: 'Eres un experto en tecnología que explica conceptos de forma clara y concisa',
    required: false
  })
  @IsOptional()
  @IsString()
  systemInstruction?: string;

  @ApiProperty({
    description: 'Máximo número de tokens de salida',
    minimum: 1,
    maximum: 4096,
    default: 1024,
    required: false
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(4096)
  maxOutputTokens?: number;

  @ApiProperty({
    description: 'Temperatura para controlar la creatividad (0.0-1.0)',
    minimum: 0,
    maximum: 1,
    default: 0.7,
    required: false
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  temperature?: number;

  @ApiProperty({
    description: 'Top-K sampling parameter',
    minimum: 1,
    maximum: 100,
    default: 40,
    required: false
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  topK?: number;

  @ApiProperty({
    description: 'Top-P sampling parameter',
    minimum: 0,
    maximum: 1,
    default: 0.95,
    required: false
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  topP?: number;
}

 export class ConversationMessageDto {
  @ApiProperty({
    description: 'Rol del mensaje',
    enum: ['user', 'model'],
    example: 'user'
  })
  @IsEnum(['user', 'model'])
  role: 'user' | 'model';

  @ApiProperty({
    description: 'Contenido del mensaje',
    example: '¿Qué es la inteligencia artificial?'
  })
  @IsString()
  content: string;
}

export class GenerateConversationDto {
  @ApiProperty({
    description: 'Historial de mensajes de la conversación',
    type: [ConversationMessageDto]
  })
  @IsArray()
  messages: ConversationMessageDto[];

  @ApiProperty({
    description: 'Modelo de IA a utilizar',
    enum: GEMINI_MODELS,
    default: 'gemini-flash-latest',
    required: false
  })
  @IsOptional()
  @IsEnum(GEMINI_MODELS)
  model?: GeminiModel;

  @ApiProperty({
    description: 'Instrucciones del sistema',
    required: false
  })
  @IsOptional()
  @IsString()
  systemInstruction?: string;

  @ApiProperty({
    description: 'Máximo número de tokens de salida',
    default: 1024,
    required: false
  })
  @IsOptional()
  @IsNumber()
  maxOutputTokens?: number;

  @ApiProperty({
    description: 'Temperatura para controlar la creatividad',
    default: 0.7,
    required: false
  })
  @IsOptional()
  @IsNumber()
  temperature?: number;

  @ApiProperty({
    description: 'Top-K sampling parameter',
    default: 40,
    required: false
  })
  @IsOptional()
  @IsNumber()
  topK?: number;

  @ApiProperty({
    description: 'Top-P sampling parameter',
    default: 0.95,
    required: false
  })
  @IsOptional()
  @IsNumber()
  topP?: number;
}

export class GenerateMultipleCandidatesDto {
  @ApiProperty({
    description: 'El prompt para generar múltiples candidatos',
    example: 'Genera un título creativo para un artículo sobre tecnología'
  })
  @IsString()
  prompt: string;

  @ApiProperty({
    description: 'Número de candidatos a generar',
    minimum: 1,
    maximum: 5,
    default: 3
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  candidateCount?: number;

  @ApiProperty({
    description: 'Modelo de IA a utilizar',
    enum: GEMINI_MODELS,
    default: 'gemini-flash-latest',
    required: false
  })
  @IsOptional()
  @IsEnum(GEMINI_MODELS)
  model?: GeminiModel;

  @ApiProperty({
    description: 'Instrucciones del sistema',
    required: false
  })
  @IsOptional()
  @IsString()
  systemInstruction?: string;
}

export class CountTokensDto {
  @ApiProperty({
    description: 'Texto para contar tokens',
    example: 'Este es un texto de ejemplo para contar tokens'
  })
  @IsString()
  text: string;

  @ApiProperty({
    description: 'Modelo a utilizar para el conteo',
    enum: GEMINI_MODELS,
    default: 'gemini-flash-latest',
    required: false
  })
  @IsOptional()
  @IsEnum(GEMINI_MODELS)
  model?: GeminiModel;

  @ApiProperty({
    description: 'Instrucciones del sistema',
    required: false
  })
  @IsOptional()
  @IsString()
  systemInstruction?: string;
}

export class VideoAnalysisRequestDto  {
  @ApiProperty({
    description: 'URL del video a analizar',
    example: 'gs://bucket-name/video.mp4'
  })
  @IsUrl()
  videoUrl: string;

  @ApiProperty({
    description: 'ID del usuario que solicita el análisis',
    required: false,
    example: 'user123'
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiProperty({
    description: 'Características específicas a analizar en el video',
    required: false,
    example: ['labels', 'speech', 'shots']
  })
  @IsOptional()
  @IsArray()
  features?: string[];
}

export class VideoAnalysisDto {
  @IsUrl()
  videoUrl: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsArray()
  features?: string[];
}
