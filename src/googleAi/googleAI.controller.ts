// src/controllers/ai-services.controller.ts
import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
  Logger,
  Get,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiQuery,
  ApiConsumes,
  ApiProperty,
} from '@nestjs/swagger';
import { GoogleVideoIntelligenceService } from './google-video-intelligence.service';
import { GoogleAIService, GenerateTextDto, GenerateResponse, ConversationMessage, GenerateConversationDto } from './/iaLenguageGeneta';
import {  CountTokensDto, GenerateMultipleCandidatesDto, GenerateTextRequestDto, VideoAnalysisRequestDto, VideoAnalysisResult } from './dto/googleDto'



@ApiTags('AI Services')
@Controller('ai-services')
export class AIServicesController {
  private readonly logger = new Logger(AIServicesController.name);

  constructor(
    private readonly googleVideoIntelligenceService: GoogleVideoIntelligenceService,
    private readonly googleAIService: GoogleAIService,
  ) {}

  // === ENDPOINTS DE ANÁLISIS DE VIDEO ===

  @Post('video/analyze')
  @ApiOperation({
    summary: 'Analizar video con Google Video Intelligence',
    description: 'Analiza un video utilizando Google Cloud Video Intelligence API para detectar etiquetas, transcribir audio y detectar cambios de escena'
  })
  @ApiResponse({
    status: 200,
    description: 'Video analizado exitosamente',
    schema: {
      type: 'object',
      properties: {
        labels: { type: 'array', items: { type: 'object' } },
        speechTranscriptions: { type: 'array', items: { type: 'object' } },
        shotChanges: { type: 'array', items: { type: 'object' } },
        processingTime: { type: 'number' },
        videoUri: { type: 'string' }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Datos de entrada inválidos'
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor'
  })
  async analyzeVideo(@Body() videoAnalysisDto: VideoAnalysisRequestDto): Promise<VideoAnalysisResult> {
    try {
      this.logger.log(`Iniciando análisis de video: ${videoAnalysisDto.videoUrl}`);
      
      const result = await this.googleVideoIntelligenceService.analyzeVideo(videoAnalysisDto);
      
      this.logger.log(`Análisis completado para video: ${videoAnalysisDto.videoUrl}`);
      return result;
    } catch (error) {
      this.logger.error(`Error analizando video: ${error.message}`);
      throw new HttpException(
        {
          message: 'Error al analizar el video',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('video/cost-estimate')
  @ApiOperation({
    summary: 'Estimar costo de análisis de video',
    description: 'Calcula el costo estimado para analizar un video basado en su duración'
  })
  @ApiQuery({
    name: 'duration',
    description: 'Duración del video en segundos',
    type: Number,
    example: 120
  })
  @ApiResponse({
    status: 200,
    description: 'Costo estimado calculado',
    schema: {
      type: 'object',
      properties: {
        duration: { type: 'number', description: 'Duración en segundos' },
        estimatedCost: { type: 'number', description: 'Costo estimado en USD' },
        breakdown: {
          type: 'object',
          properties: {
            labelDetection: { type: 'number' },
            speechTranscription: { type: 'number' },
            shotDetection: { type: 'number' }
          }
        }
      }
    }
  })
  async getAnalysisCost(@Query('duration') duration: number) {
    try {
      if (!duration || duration <= 0) {
        throw new HttpException('Duration must be a positive number', HttpStatus.BAD_REQUEST);
      }

      const estimatedCost = await this.googleVideoIntelligenceService.getAnalysisCost(duration);
      
      return {
        duration,
        estimatedCost,
        breakdown: {
          labelDetection: Math.ceil(duration / 60) * 0.10,
          speechTranscription: Math.ceil(duration / 60) * 0.048,
          shotDetection: Math.ceil(duration / 60) * 0.05,
        }
      };
    } catch (error) {
      this.logger.error(`Error calculando costo: ${error.message}`);
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  // === ENDPOINTS DE GENERACIÓN DE TEXTO ===

  @Post('text/generate')
  @ApiOperation({
    summary: 'Generar texto con IA',
    description: 'Genera texto utilizando modelos de Google Gemini con soporte para instrucciones del sistema'
  })
  @ApiResponse({
    status: 200,
    description: 'Texto generado exitosamente',
    schema: {
      type: 'object',
      properties: {
        text: { type: 'string' },
        usage: {
          type: 'object',
          properties: {
            promptTokenCount: { type: 'number' },
            candidatesTokenCount: { type: 'number' },
            totalTokenCount: { type: 'number' }
          }
        }
      }
    }
  })
  async generateText(@Body() generateTextDto: GenerateTextRequestDto): Promise<GenerateResponse> {
    try {
      this.logger.log(`Generando texto con modelo: ${generateTextDto.model || 'gemini-flash-latest'}`);
      
      const result = await this.googleAIService.generateText(generateTextDto);
      
      this.logger.log(`Texto generado exitosamente. Tokens: ${result.usage?.totalTokenCount || 'N/A'}`);
      return result;
    } catch (error) {
      this.logger.error(`Error generando texto: ${error.message}`);
      throw new HttpException(
        {
          message: 'Error al generar texto',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('text/generate-with-image')
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Generar texto con imagen',
    description: 'Genera texto basado en una imagen usando Gemini Pro Vision'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'Prompt para analizar la imagen' },
        image: { type: 'string', format: 'binary', description: 'Archivo de imagen' },
        systemInstruction: { type: 'string', description: 'Instrucciones del sistema (opcional)' }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Texto generado con imagen exitosamente'
  })
  async generateTextWithImage(
    @UploadedFile() image: Express.Multer.File,
    @Body('prompt') prompt: string,
    @Body('systemInstruction') systemInstruction?: string,
  ): Promise<GenerateResponse> {
    try {
      if (!image) {
        throw new HttpException('Image file is required', HttpStatus.BAD_REQUEST);
      }

      if (!prompt) {
        throw new HttpException('Prompt is required', HttpStatus.BAD_REQUEST);
      }

      this.logger.log(`Generando texto con imagen. Tipo: ${image.mimetype}`);
      
      const result = await this.googleAIService.generateTextWithImage(
        prompt,
        image.buffer,
        image.mimetype,
        systemInstruction
      );
      
      this.logger.log(`Texto con imagen generado exitosamente`);
      return result;
    } catch (error) {
      this.logger.error(`Error generando texto con imagen: ${error.message}`);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('text/conversation')
  @ApiOperation({
    summary: 'Generar conversación',
    description: 'Genera respuesta en una conversación con historial de mensajes'
  })
  @ApiResponse({
    status: 200,
    description: 'Respuesta de conversación generada exitosamente'
  })
  async generateConversation(@Body() conversationDto: GenerateConversationDto): Promise<GenerateResponse> {
    try {
      this.logger.log(`Generando conversación con ${conversationDto.messages.length} mensajes`);
      
      const result = await this.googleAIService.generateConversation(conversationDto);
      
      this.logger.log(`Conversación generada exitosamente`);
      return result;
    } catch (error) {
      this.logger.error(`Error en conversación: ${error.message}`);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('text/multiple-candidates')
  @ApiOperation({
    summary: 'Generar múltiples candidatos',
    description: 'Genera múltiples respuestas candidatas para un prompt dado'
  })
  @ApiResponse({
    status: 200,
    description: 'Candidatos generados exitosamente',
    schema: {
      type: 'object',
      properties: {
        candidates: {
          type: 'array',
          items: { type: 'string' }
        }
      }
    }
  })
  async generateMultipleCandidates(@Body() dto: GenerateMultipleCandidatesDto): Promise<{ candidates: string[] }> {
    try {
      this.logger.log(`Generando ${dto.candidateCount || 3} candidatos`);
      
      const candidates = await this.googleAIService.generateMultipleCandidates(
        dto.prompt,
        dto.candidateCount,
        dto.model,
        dto.systemInstruction
      );
      
      this.logger.log(`${candidates.length} candidatos generados exitosamente`);
      return { candidates };
    } catch (error) {
      this.logger.error(`Error generando candidatos: ${error.message}`);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('text/count-tokens')
  @ApiOperation({
    summary: 'Contar tokens',
    description: 'Cuenta el número de tokens en un texto dado'
  })
  @ApiResponse({
    status: 200,
    description: 'Tokens contados exitosamente',
    schema: {
      type: 'object',
      properties: {
        text: { type: 'string' },
        tokenCount: { type: 'number' },
        model: { type: 'string' }
      }
    }
  })
  async countTokens(@Body() dto: CountTokensDto): Promise<{ text: string; tokenCount: number; model: string }> {
    try {
      const model = dto.model || 'gemini-flash-latest';
      
      this.logger.log(`Contando tokens para texto de ${dto.text.length} caracteres`);
      
      const tokenCount = await this.googleAIService.countTokens(dto.text, model, dto.systemInstruction);
      
      this.logger.log(`Tokens contados: ${tokenCount}`);
      return {
        text: dto.text,
        tokenCount,
        model
      };
    } catch (error) {
      this.logger.error(`Error contando tokens: ${error.message}`);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // === ENDPOINTS DE INFORMACIÓN ===

  @Get('models')
  @ApiOperation({
    summary: 'Obtener modelos disponibles',
    description: 'Lista todos los modelos de IA disponibles'
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de modelos disponibles',
    schema: {
      type: 'object',
      properties: {
        models: {
          type: 'array',
          items: { type: 'string' }
        }
      }
    }
  })
  getAvailableModels(): { models: string[] } {
    return {
      models: this.googleAIService.getAvailableModels()
    };
  }

  @Get('models/check')
  @ApiOperation({
    summary: 'Verificar disponibilidad de modelo',
    description: 'Verifica si un modelo específico está disponible'
  })
  @ApiQuery({
    name: 'model',
    description: 'Nombre del modelo a verificar',
    example: 'gemini-flash-latest'
  })
  @ApiResponse({
    status: 200,
    description: 'Estado de disponibilidad del modelo',
    schema: {
      type: 'object',
      properties: {
        model: { type: 'string' },
        available: { type: 'boolean' }
      }
    }
  })
  checkModelAvailability(@Query('model') model: string): { model: string; available: boolean } {
    if (!model) {
      throw new HttpException('Model parameter is required', HttpStatus.BAD_REQUEST);
    }

    return {
      model,
      available: this.googleAIService.isModelAvailable(model)
    };
  }
}