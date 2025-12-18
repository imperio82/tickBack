import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Request,
  HttpException,
  HttpStatus,
  Logger,
  UseGuards,
  Query,
  Delete,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/autGuard';
import { ProfileAnalysisService } from './services/profile-analysis.service';
import { VideoAnalysisJobService } from './services/video-analysis-job.service';
import { VideoAnalysisProcessor } from './processors/video-analysis.processor';
import { TikTokApifyService } from '../apify/apify.service';
import { CreditService } from '../credits/credit.service';
import { analizarDatosTikTok, obtenerInsightsParaIA } from '../apify/util/dataAnaliticsWhitInsigth';
import { ProfileAnalysisStatus } from './entities/profile-analysis.entity';
import { VideoAnalysisJobStatus } from './entities/video-analysis-job.entity';
import {
  ScrapeProfileDto,
  AnalyzeVideosDto,
  ScrapeProfileResponseDto,
  FilteredDataResponseDto,
  FilteredVideosResponseDto,
  AnalyzeVideosResponseDto,
  VideoAnalysisStatusResponseDto,
  InsightsResponseDto,
  RegenerateInsightsDto,
} from './dto/profile-analysis.dto';

@ApiTags('Profile Analysis')
@Controller('profile-analysis')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProfileAnalysisController {
  private readonly logger = new Logger(ProfileAnalysisController.name);

  constructor(
    private readonly profileAnalysisService: ProfileAnalysisService,
    private readonly videoAnalysisJobService: VideoAnalysisJobService,
    private readonly videoAnalysisProcessor: VideoAnalysisProcessor,
    private readonly tikTokService: TikTokApifyService,
    private readonly creditService: CreditService,
  ) {}

  // ====== ENDPOINT 1: Scrapear perfil ======
  @Post('scrape')
  @ApiOperation({
    summary: 'Paso 1: Scrapear perfil de TikTok',
    description: 'Inicia el scraping de un perfil de TikTok y guarda los datos en la base de datos',
  })
  @ApiResponse({
    status: 200,
    description: 'Scraping iniciado exitosamente',
    type: ScrapeProfileResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Parámetros inválidos' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor' })
  async scrapeProfile(
    @Body() dto: ScrapeProfileDto,
    @Request() req
  ): Promise<ScrapeProfileResponseDto> {
    try {
      const userId: string = req.user.userId;
      this.logger.log(`[${userId}] Iniciando scraping de perfil: ${dto.profileUrl}`);

      // ====== VERIFICAR Y CONSUMIR CRÉDITOS ======
      // 1 crédito = 50 videos scrapeados
      const videosAScrappear = dto.resultsPerPage || 50;
      const creditosNecesarios = Math.ceil(videosAScrappear / 50);

      const tieneCreditos = await this.creditService.verificarCreditos(userId, creditosNecesarios);

      if (!tieneCreditos) {
        const balance = await this.creditService.obtenerBalance(userId);
        throw new HttpException(
          {
            statusCode: HttpStatus.PAYMENT_REQUIRED,
            message: `Créditos insuficientes. Necesitas ${creditosNecesarios} crédito(s) para scrapear ${videosAScrappear} videos pero solo tienes ${balance.creditosDisponibles}.`,
            error: 'Insufficient Credits',
            creditosDisponibles: balance.creditosDisponibles,
            creditosNecesarios: creditosNecesarios,
            videosAScrappear: videosAScrappear,
            action: 'buy_credits',
          },
          HttpStatus.PAYMENT_REQUIRED
        );
      }

      // Consumir créditos basado en cantidad de videos a scrapear
      await this.creditService.consumirCreditos(
        userId,
        creditosNecesarios,
        `Scraping de perfil: ${dto.profileUrl} (${videosAScrappear} videos)`,
        undefined
      );

      this.logger.log(`[${userId}] ${creditosNecesarios} crédito(s) consumido(s). Iniciando scraping de ${videosAScrappear} videos...`);
      // ==========================================

      // 1. Crear ProfileAnalysis
      const profileAnalysis = await this.profileAnalysisService.create({
        userId,
        profileUrl: dto.profileUrl,
        status: ProfileAnalysisStatus.SCRAPING,
      });

      // 2. Ejecutar scraping con TikTokApifyService
      const scrapingResult = await this.tikTokService.scrapeProfiles(
        {
          profiles: [dto.profileUrl],
          resultsPerPage: dto.resultsPerPage || 50,
        },
        userId
      );

      if (!scrapingResult.success) {
        await this.profileAnalysisService.updateStatus(
          profileAnalysis.id,
          ProfileAnalysisStatus.FAILED,
          scrapingResult.error
        );

        throw new HttpException(
          `Error en el scraping: ${scrapingResult.error}`,
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      }

      // 3. Actualizar ProfileAnalysis con el ID de los datos scrapeados
      // El analysisId viene del resultado del scraping
      await this.profileAnalysisService.update(profileAnalysis.id, {
        scrapedDataId: scrapingResult.analysisId || null,
        status: ProfileAnalysisStatus.SCRAPED,
        scrapingMetadata: {
          apifyRunId: scrapingResult.runId,
          totalVideosScraped: scrapingResult.totalResults,
          scrapedAt: new Date(),
        },
      });

      this.logger.log(
        `[${userId}] Scraping completado - Analysis ID: ${profileAnalysis.id}, Videos: ${scrapingResult.totalResults}`
      );

      return {
        analysisId: profileAnalysis.id,
        totalVideos: scrapingResult.totalResults || 0,
        runId: scrapingResult.runId || '',
        status: ProfileAnalysisStatus.SCRAPED,
        message: `Scraping completado exitosamente. ${scrapingResult.totalResults} videos obtenidos.`,
      };
    } catch (error) {
      this.logger.error('Error en scrapeProfile:', error);
      throw new HttpException(
        error.message || 'Error al scrapear el perfil',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // ====== ENDPOINT 2: Filtrar datos scrapeados ======
  @Post(':analysisId/filter')
  @ApiOperation({
    summary: 'Paso 2: Filtrar datos scrapeados',
    description: 'Aplica filtros a los datos scrapeados usando analizarDatosTikTok y genera insights preliminares',
  })
  @ApiParam({ name: 'analysisId', description: 'ID del análisis de perfil' })
  @ApiResponse({
    status: 200,
    description: 'Datos filtrados exitosamente',
    type: FilteredDataResponseDto,
  })
  async filterData(
    @Param('analysisId') analysisId: string,
    @Request() req
  ): Promise<FilteredDataResponseDto> {
    try {
      const userId: string = req.user.userId;
      this.logger.log(`[${userId}] Filtrando datos para analysis: ${analysisId}`);

      // 1. Obtener ProfileAnalysis y validar que pertenece al usuario
      const profileAnalysis = await this.profileAnalysisService.findById(analysisId, userId);

      if (profileAnalysis.status !== ProfileAnalysisStatus.SCRAPED) {
        throw new HttpException(
          'El perfil debe estar en estado SCRAPED. Ejecuta el scraping primero.',
          HttpStatus.BAD_REQUEST
        );
      }

      // 2. Actualizar status
      await this.profileAnalysisService.updateStatus(
        analysisId,
        ProfileAnalysisStatus.FILTERING
      );

      // 3. Obtener datos scrapeados
      const scrapedData = await this.profileAnalysisService.getScrapedData(analysisId);

      // 4. Aplicar filtro con analizarDatosTikTok
      this.logger.log(`[${userId}] Aplicando filtros con analizarDatosTikTok...`);
      const filteredData: any = analizarDatosTikTok({ data: scrapedData });

      if (filteredData.error) {
        throw new HttpException(
          `Error al filtrar datos: ${filteredData.error}`,
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      }

      // 5. Obtener insights preliminares
      const preliminaryInsights = obtenerInsightsParaIA(filteredData);

      // 6. Guardar datos filtrados
      await this.profileAnalysisService.saveFilteredData(
        analysisId,
        filteredData,
        preliminaryInsights
      );

      this.logger.log(
        `[${userId}] Filtrado completado - ${filteredData.top5EngagementOptimo.videosCompletos.length} videos óptimos`
      );

      return {
        filteredDataId: analysisId,
        top5EngagementOptimo: filteredData.top5EngagementOptimo.videosCompletos,
        insights: preliminaryInsights,
        estadisticas: filteredData.estadisticasGenerales,
        message: 'Datos filtrados exitosamente',
      };
    } catch (error) {
      this.logger.error('Error en filterData:', error);
      throw new HttpException(
        error.message || 'Error al filtrar los datos',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // ====== ENDPOINT 3: Obtener videos filtrados ======
  @Get(':analysisId/filtered-videos')
  @ApiOperation({
    summary: 'Paso 3: Obtener videos filtrados para selección',
    description: 'Retorna los videos filtrados para que el usuario seleccione cuáles analizar',
  })
  @ApiParam({ name: 'analysisId', description: 'ID del análisis de perfil' })
  @ApiResponse({
    status: 200,
    description: 'Videos filtrados obtenidos exitosamente',
    type: FilteredVideosResponseDto,
  })
  async getFilteredVideos(
    @Param('analysisId') analysisId: string,
    @Request() req
  ): Promise<FilteredVideosResponseDto> {
    try {
      const userId: string = req.user.userId;
      this.logger.log(`[${userId}] Obteniendo videos filtrados: ${analysisId}`);

      // 1. Obtener ProfileAnalysis
      const profileAnalysis = await this.profileAnalysisService.findById(analysisId, userId);

      if (!profileAnalysis.filteredData) {
        throw new HttpException(
          'No hay datos filtrados. Ejecuta el filtrado primero.',
          HttpStatus.BAD_REQUEST
        );
      }

      // 2. Extraer videos óptimos
      const videos = profileAnalysis.filteredData.top5EngagementOptimo.videosCompletos || [];

      // 3. Formatear para el frontend
      const formattedVideos = videos.map((video: any) => ({
        id: video.id,
        videoUrl: video.multimedia?.webVideoUrl || '',
        texto: video.texto || '',
        vistas: video.vistas || 0,
        likes: video.likes || 0,
        comentarios: video.comentarios || 0,
        compartidos: video.compartidos || 0,
        metricas: video.metricas || {},
        hashtags: video.hashtags || [],
        thumbnail: video.multimedia?.coverUrl || video.multimedia?.originalCoverUrl || '',
        autor: video.autor || {},
        multimedia: video.multimedia || {},
      }));

      // 4. Videos recomendados (top 3 por engagement)
      const recomendados = formattedVideos.slice(0, 3).map((v) => v.id);

      this.logger.log(`[${userId}] ${formattedVideos.length} videos filtrados retornados`);

      return {
        videos: formattedVideos,
        recomendados,
        totalVideos: formattedVideos.length,
      };
    } catch (error) {
      this.logger.error('Error en getFilteredVideos:', error);
      throw new HttpException(
        error.message || 'Error al obtener videos filtrados',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // ====== ENDPOINT 4: Analizar videos seleccionados ======
  @Post(':analysisId/analyze-videos')
  @ApiOperation({
    summary: 'Paso 4: Analizar videos seleccionados',
    description: 'Inicia el análisis de los videos seleccionados (descarga, análisis con Google AI, insights con Gemini)',
  })
  @ApiParam({ name: 'analysisId', description: 'ID del análisis de perfil' })
  @ApiResponse({
    status: 200,
    description: 'Análisis iniciado exitosamente',
    type: AnalyzeVideosResponseDto,
  })
  async analyzeVideos(
    @Param('analysisId') analysisId: string,
    @Body() dto: AnalyzeVideosDto,
    @Request() req
  ): Promise<AnalyzeVideosResponseDto> {
    try {
      const userId: string = req.user.userId;
      this.logger.log(`[${userId}] Iniciando análisis de videos: ${analysisId}`);

      // ====== VERIFICAR Y CONSUMIR CRÉDITOS ======
      // 1 crédito = 4 videos analizados con IA
      const videosAAnalizar = dto.selectedVideoIds.length;
      const creditosNecesarios = Math.ceil(videosAAnalizar / 4);

      const tieneCreditos = await this.creditService.verificarCreditos(
        userId,
        creditosNecesarios
      );

      if (!tieneCreditos) {
        const balance = await this.creditService.obtenerBalance(userId);
        throw new HttpException(
          {
            statusCode: HttpStatus.PAYMENT_REQUIRED,
            message: `Créditos insuficientes. Necesitas ${creditosNecesarios} crédito(s) para analizar ${videosAAnalizar} video(s) pero solo tienes ${balance.creditosDisponibles}.`,
            error: 'Insufficient Credits',
            creditosDisponibles: balance.creditosDisponibles,
            creditosNecesarios: creditosNecesarios,
            videosAAnalizar: videosAAnalizar,
            action: 'buy_credits',
          },
          HttpStatus.PAYMENT_REQUIRED
        );
      }

      // Consumir créditos (1 crédito por cada 4 videos)
      await this.creditService.consumirCreditos(
        userId,
        creditosNecesarios,
        `Análisis con IA de ${videosAAnalizar} video(s) - Perfil: ${analysisId}`,
        analysisId
      );

      this.logger.log(
        `[${userId}] ${creditosNecesarios} crédito(s) consumido(s) para análisis de ${videosAAnalizar} video(s)`
      );
      // ==========================================

      // 1. Validar ProfileAnalysis
      const profileAnalysis = await this.profileAnalysisService.findById(analysisId, userId);

      if (!profileAnalysis.filteredData) {
        throw new HttpException(
          'No hay datos filtrados. Ejecuta el filtrado primero.',
          HttpStatus.BAD_REQUEST
        );
      }

      // 2. Validar que los IDs existen en los datos filtrados
      const availableVideoIds = profileAnalysis.filteredData.top5EngagementOptimo.videosCompletos.map(
        (v) => v.id
      );

      const invalidIds = dto.selectedVideoIds.filter((id) => !availableVideoIds.includes(id));
      if (invalidIds.length > 0) {
        throw new HttpException(
          `IDs de video inválidos: ${invalidIds.join(', ')}`,
          HttpStatus.BAD_REQUEST
        );
      }

      // 3. Crear VideoAnalysisJob
      const job = await this.videoAnalysisJobService.create({
        profileAnalysisId: analysisId,
        userId,
        selectedVideoIds: dto.selectedVideoIds,
      });

      // 4. Actualizar status del ProfileAnalysis
      await this.profileAnalysisService.updateStatus(
        analysisId,
        ProfileAnalysisStatus.ANALYZING
      );

      // 5. TODO: Aquí deberías encolar el job en un sistema de colas (Bull, BullMQ)
      // Por ahora, retornamos el jobId para que el cliente pueda hacer polling
      // this.queueService.add('analyze-videos', { jobId: job.id });

      this.logger.log(
        `[${userId}] Job de análisis creado: ${job.id} - Videos a analizar: ${dto.selectedVideoIds.length}`
      );

      // Estimación: 30 segundos por video (descarga + análisis)
      const estimatedTime = dto.selectedVideoIds.length * 30;

      return {
        jobId: job.id,
        status: VideoAnalysisJobStatus.QUEUED,
        estimatedTime,
        videosToAnalyze: dto.selectedVideoIds.length,
        message: `Análisis iniciado. Job ID: ${job.id}. Se procesarán ${dto.selectedVideoIds.length} videos.`,
      };
    } catch (error) {
      this.logger.error('Error en analyzeVideos:', error);
      throw new HttpException(
        error.message || 'Error al iniciar el análisis',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // ====== ENDPOINT 5: Obtener estado del análisis ======
  @Get(':analysisId/video-analysis-status/:jobId')
  @ApiOperation({
    summary: 'Paso 5: Obtener estado del análisis de videos',
    description: 'Retorna el progreso del análisis de videos',
  })
  @ApiParam({ name: 'analysisId', description: 'ID del análisis de perfil' })
  @ApiParam({ name: 'jobId', description: 'ID del job de análisis' })
  @ApiResponse({
    status: 200,
    description: 'Estado del análisis obtenido exitosamente',
    type: VideoAnalysisStatusResponseDto,
  })
  async getVideoAnalysisStatus(
    @Param('analysisId') analysisId: string,
    @Param('jobId') jobId: string,
    @Request() req
  ): Promise<VideoAnalysisStatusResponseDto> {
    try {
      const userId: string = req.user.userId;

      // 1. Obtener job
      const job = await this.videoAnalysisJobService.findById(jobId);

      // 2. Validar que pertenece al usuario
      if (job.userId !== userId) {
        throw new HttpException('No autorizado', HttpStatus.FORBIDDEN);
      }

      // 3. Validar que pertenece al análisis
      if (job.profileAnalysisId !== analysisId) {
        throw new HttpException(
          'El job no pertenece a este análisis',
          HttpStatus.BAD_REQUEST
        );
      }

      // 4. Retornar status
      return {
        jobId: job.id,
        status: job.status,
        progress: job.progress,
        currentStep: job.currentStep || this.getStepDescription(job.status),
        videosProcessed: job.processingMetadata?.videosProcessed || 0,
        videosTotal: job.selectedVideoIds.length,
        currentVideo: job.currentStep,
        errorMessage: job.errorMessage,
      };
    } catch (error) {
      this.logger.error('Error en getVideoAnalysisStatus:', error);
      throw new HttpException(
        error.message || 'Error al obtener el estado del análisis',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // ====== ENDPOINT 6: Obtener insights finales ======
  @Get(':analysisId/insights')
  @ApiOperation({
    summary: 'Paso 6: Obtener insights finales',
    description: 'Retorna los resultados completos del análisis incluyendo insights de Gemini',
  })
  @ApiParam({ name: 'analysisId', description: 'ID del análisis de perfil' })
  @ApiResponse({
    status: 200,
    description: 'Insights obtenidos exitosamente',
    type: InsightsResponseDto,
  })
  async getInsights(
    @Param('analysisId') analysisId: string,
    @Request() req
  ): Promise<InsightsResponseDto> {
    try {
      const userId: string = req.user.userId;
      this.logger.log(`[${userId}] Obteniendo insights: ${analysisId}`);

      // 1. Obtener el último job del análisis
      const latestJob = await this.videoAnalysisJobService.getLatestJob(analysisId);

      if (!latestJob) {
        throw new HttpException(
          'No hay análisis de videos para este perfil',
          HttpStatus.NOT_FOUND
        );
      }

      // 2. Validar que pertenece al usuario
      if (latestJob.userId !== userId) {
        throw new HttpException('No autorizado', HttpStatus.FORBIDDEN);
      }

      // 3. Verificar que el análisis está completo
      if (latestJob.status !== VideoAnalysisJobStatus.COMPLETED) {
        throw new HttpException(
          `El análisis aún no está completo. Status actual: ${latestJob.status}`,
          HttpStatus.BAD_REQUEST
        );
      }

      // 4. Retornar insights
      const videoAnalysis = latestJob.videoAnalysisResults || [];
      const geminiInsights = latestJob.geminiInsights || {};

      // 5. Extraer recomendaciones y patrones del análisis de Gemini
      const recommendations = this.extractRecommendations(geminiInsights);
      const patterns = this.extractPatterns(videoAnalysis);

      return {
        videoAnalysis,
        geminiInsights,
        recommendations,
        patterns,
        status: latestJob.status,
      };
    } catch (error) {
      this.logger.error('Error en getInsights:', error);
      throw new HttpException(
        error.message || 'Error al obtener los insights',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // ====== ENDPOINTS ADICIONALES ======

  @Get('user/history')
  @ApiOperation({
    summary: 'Obtener historial de análisis del usuario',
    description: 'Retorna todos los análisis de perfil del usuario',
  })
  async getUserHistory(@Request() req, @Query('limit') limit?: number) {
    const userId: string = req.user.userId;
    console.log("cargando analisis", userId)
    const analyses = await this.profileAnalysisService.findByUserId(userId, limit || 20);
    return { analyses, total: analyses.length };
  }

  @Get('user/stats')
  @ApiOperation({
    summary: 'Obtener estadísticas del usuario',
    description: 'Retorna estadísticas de uso del servicio',
  })
  async getUserStats(@Request() req) {
    const userId: string = req.user.userId;
    return this.profileAnalysisService.getUserStats(userId);
  }

  // ====== ENDPOINT 7: Regenerar insights de Gemini ======
  @Post(':analysisId/regenerate-insights/:jobId')
  @ApiOperation({
    summary: 'Paso 7 (alternativo): Regenerar insights de Gemini',
    description: 'Regenera solo el análisis final con Gemini IA usando los videos ya analizados. Útil para: 1) Recuperar errores en el análisis, 2) Generar variantes con diferentes enfoques (creativo, viral, educativo), 3) Obtener más ideas de contenido.',
  })
  @ApiParam({ name: 'analysisId', description: 'ID del análisis de perfil' })
  @ApiParam({ name: 'jobId', description: 'ID del job de análisis' })
  @ApiResponse({
    status: 200,
    description: 'Insights regenerados exitosamente',
  })
  @ApiResponse({ status: 400, description: 'No hay análisis de videos disponibles' })
  @ApiResponse({ status: 404, description: 'Job no encontrado' })
  async regenerateInsights(
    @Param('analysisId') analysisId: string,
    @Param('jobId') jobId: string,
    @Body() dto: RegenerateInsightsDto,
    @Request() req
  ): Promise<any> {
    try {
      const userId: string = req.user.userId;
      this.logger.log(`[${userId}] Regenerando insights para job: ${jobId}`);

      // 1. Validar que el job existe y pertenece al usuario
      const job = await this.videoAnalysisJobService.findById(jobId);
      if (job.userId !== userId) {
        throw new HttpException('No autorizado', HttpStatus.FORBIDDEN);
      }

      // 2. Validar que el job pertenece al análisis
      if (job.profileAnalysisId !== analysisId) {
        throw new HttpException(
          'El job no pertenece a este análisis',
          HttpStatus.BAD_REQUEST
        );
      }

      // 3. Validar que hay análisis de videos disponibles
      if (!job.videoAnalysisResults || job.videoAnalysisResults.length === 0) {
        throw new HttpException(
          'No hay análisis de videos disponibles. Debes ejecutar el análisis de videos primero.',
          HttpStatus.BAD_REQUEST
        );
      }

      this.logger.log(
        `[${userId}] Regenerando insights usando ${job.videoAnalysisResults.length} videos ya analizados`
      );

      // Configurar opciones
      const options = {
        temperature: dto.temperature,
        enfoque: dto.enfoque,
        numeroIdeas: dto.numeroIdeas,
        guardarVariante: dto.guardarVariante,
        nombreVariante: dto.nombreVariante,
      };

      this.logger.log(
        `[${userId}] Opciones: enfoque=${options.enfoque}, temp=${options.temperature}, ideas=${options.numeroIdeas}, variante=${options.guardarVariante}`
      );

      // 4. Ejecutar regeneración (en background)
      this.videoAnalysisProcessor
        .regenerateGeminiInsights(jobId, options)
        .catch((error) => {
          this.logger.error(`Error regenerando insights para job ${jobId}:`, error);
        });

      return {
        success: true,
        message: `Regeneración de insights iniciada para job ${jobId} con enfoque ${options.enfoque || 'analítico'}. Usa el endpoint de status para ver el progreso.`,
        jobId,
        videosAnalizados: job.videoAnalysisResults.length,
        opciones: {
          enfoque: options.enfoque || 'analitico',
          temperature: options.temperature || 0.7,
          numeroIdeas: options.numeroIdeas || 3,
          guardarVariante: options.guardarVariante ?? true,
        },
      };
    } catch (error) {
      this.logger.error('Error en regenerateInsights:', error);
      throw new HttpException(
        error.message || 'Error al regenerar los insights',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // ====== ENDPOINT PARA TESTING: Ejecutar processor manualmente ======
  @Post('jobs/:jobId/process')
  @ApiOperation({
    summary: '[TESTING] Ejecutar processor manualmente',
    description: 'Ejecuta el análisis de videos de un job manualmente. Útil para testing sin sistema de colas.',
  })
  @ApiParam({ name: 'jobId', description: 'ID del job a procesar' })
  async processJobManually(@Param('jobId') jobId: string, @Request() req) {
    try {
      const userId: string = req.user.userId;
      this.logger.log(`[${userId}] Ejecutando processor manualmente para job: ${jobId}`);

      // Validar que el job pertenece al usuario
      const job = await this.videoAnalysisJobService.findById(jobId);
      if (job.userId !== userId) {
        throw new HttpException('No autorizado', HttpStatus.FORBIDDEN);
      }

      // Ejecutar en background (no esperar)
      this.videoAnalysisProcessor
        .processJob(jobId)
        .catch((error) => {
          this.logger.error(`Error procesando job ${jobId}:`, error);
        });

      return {
        success: true,
        message: `Procesamiento iniciado para job ${jobId}. Usa el endpoint de status para ver el progreso.`,
        jobId,
      };
    } catch (error) {
      this.logger.error('Error en processJobManually:', error);
      throw new HttpException(
        error.message || 'Error al ejecutar el procesamiento',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Delete(':analysisId')
  @ApiOperation({
    summary: 'Eliminar análisis de perfil',
    description: 'Elimina un análisis de perfil y todos sus jobs asociados',
  })
  @ApiParam({ name: 'analysisId', description: 'ID del análisis a eliminar' })
  async deleteAnalysis(@Param('analysisId') analysisId: string, @Request() req) {
    try {
      const userId: string = req.user.userId;
      await this.profileAnalysisService.delete(analysisId, userId);
      return {
        success: true,
        message: `Análisis ${analysisId} eliminado exitosamente`,
      };
    } catch (error) {
      this.logger.error('Error en deleteAnalysis:', error);
      throw new HttpException(
        error.message || 'Error al eliminar el análisis',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // ====== MÉTODOS AUXILIARES ======

  private getStepDescription(status: VideoAnalysisJobStatus): string {
    const descriptions = {
      [VideoAnalysisJobStatus.QUEUED]: 'En cola, esperando procesamiento',
      [VideoAnalysisJobStatus.DOWNLOADING]: 'Descargando videos',
      [VideoAnalysisJobStatus.ANALYZING_VIDEOS]: 'Analizando videos con Google AI',
      [VideoAnalysisJobStatus.GENERATING_INSIGHTS]: 'Generando insights con Gemini',
      [VideoAnalysisJobStatus.COMPLETED]: 'Análisis completado',
      [VideoAnalysisJobStatus.FAILED]: 'Análisis fallido',
    };

    return descriptions[status] || 'Procesando';
  }

  private extractRecommendations(geminiInsights: any): string[] {
    if (!geminiInsights || !geminiInsights.parsedInsights) {
      return [];
    }

    return geminiInsights.parsedInsights.recomendaciones || [];
  }

  private extractPatterns(videoAnalysis: any[]): any {
    if (!videoAnalysis || videoAnalysis.length === 0) {
      return {};
    }

    // Extraer patrones comunes de los análisis
    const allLabels = videoAnalysis
      .flatMap((v) => v.videoAnalysis?.labels || [])
      .map((l) => l.entity);

    const labelCounts = {};
    allLabels.forEach((label) => {
      labelCounts[label] = (labelCounts[label] || 0) + 1;
    });

    const topLabels = Object.entries(labelCounts)
      .sort((a: any, b: any) => b[1] - a[1])
      .slice(0, 10)
      .map(([label, count]) => ({ label, count }));

    return {
      topLabels,
      totalVideosAnalyzed: videoAnalysis.length,
    };
  }
}
