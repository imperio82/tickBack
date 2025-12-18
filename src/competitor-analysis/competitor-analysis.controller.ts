import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/autGuard';
import { CompetitorAnalysisService } from './competitor-analysis.service';
import { CreditService } from '../credits/credit.service';
import { AnalysisType } from './entities/competitor-analysis.entity';
import {
  AnalyzeCompetitorsDto,
  AnalyzeCategoryDto,
  AnalyzeTrendingDto,
  AnalyzeComparativeDto,
  AnalysisResponseDto,
  PaginatedHistoryResponseDto,
  AnalysisHistoryDto,
} from './dto/competitor-analysis.dto';

@ApiTags('Competitor Analysis')
@Controller('competitor-analysis')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CompetitorAnalysisController {
  constructor(
    private readonly service: CompetitorAnalysisService,
    private readonly creditService: CreditService,
  ) {}

  /**
   * 1. Analizar perfiles de competencia
   */
  @Post('competitors')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Analizar perfiles de competidores',
    description:
      'Scrapea y analiza múltiples perfiles competidores (hasta 200 videos) para generar insights y sugerencias de contenido basadas en su éxito',
  })
  @ApiResponse({
    status: 200,
    description: 'Análisis completado exitosamente',
    type: AnalysisResponseDto,
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 402, description: 'Créditos insuficientes' })
  @ApiResponse({ status: 500, description: 'Error en el análisis' })
  async analyzeCompetitors(
    @Body() dto: AnalyzeCompetitorsDto,
    @Request() req,
  ): Promise<AnalysisResponseDto> {
    const userId = req.user.userId;

    // ====== CALCULAR Y VERIFICAR CRÉDITOS ======
    // 1 crédito = 50 videos scrapeados + 4 videos analizados con IA
    const videosPerProfile = dto.videosPerProfile || 50;
    const totalVideosAScrappear = dto.competitorProfiles.length * videosPerProfile;
    const videosAAnalizar = dto.analyzeTop || 20;

    const creditosScraping = Math.ceil(totalVideosAScrappear / 50);
    const creditosAnalisis = Math.ceil(videosAAnalizar / 4);
    const creditosNecesarios = creditosScraping + creditosAnalisis;

    const tieneCreditos = await this.creditService.verificarCreditos(userId, creditosNecesarios);

    if (!tieneCreditos) {
      const balance = await this.creditService.obtenerBalance(userId);
      throw new HttpException(
        {
          statusCode: HttpStatus.PAYMENT_REQUIRED,
          message: `Créditos insuficientes. Necesitas ${creditosNecesarios} crédito(s) (${creditosScraping} scraping + ${creditosAnalisis} análisis) pero solo tienes ${balance.creditosDisponibles}.`,
          error: 'Insufficient Credits',
          creditosDisponibles: balance.creditosDisponibles,
          creditosNecesarios: creditosNecesarios,
          desglose: {
            scraping: creditosScraping,
            analisis: creditosAnalisis,
            totalVideosAScrappear,
            videosAAnalizar,
          },
          action: 'buy_credits',
        },
        HttpStatus.PAYMENT_REQUIRED
      );
    }

    // Consumir créditos
    await this.creditService.consumirCreditos(
      userId,
      creditosNecesarios,
      `Análisis de competidores: ${dto.competitorProfiles.length} perfil(es), ${totalVideosAScrappear} videos scrapeados, ${videosAAnalizar} videos analizados`,
    );
    // ==========================================

    return await this.service.analyzeCompetitors({
      userId: req.user.userId,
      competitorProfiles: dto.competitorProfiles,
      videosPerProfile: dto.videosPerProfile,
      analyzeTop: dto.analyzeTop,
      filters: dto.filters,
    });
  }

  /**
   * 2. Analizar por categoría/hashtags
   */
  @Post('category')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Analizar categoría o hashtags',
    description:
      'Analiza videos por hashtags o keywords (hasta 500 videos) para identificar tendencias del mercado y generar sugerencias',
  })
  @ApiResponse({
    status: 200,
    description: 'Análisis de categoría completado',
    type: AnalysisResponseDto,
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 402, description: 'Créditos insuficientes' })
  async analyzeCategory(
    @Body() dto: AnalyzeCategoryDto,
    @Request() req,
  ): Promise<AnalysisResponseDto> {
    const userId = req.user.userId;

    // ====== CALCULAR Y VERIFICAR CRÉDITOS ======
    // 1 crédito = 50 videos scrapeados + 4 videos analizados con IA
    const videosAScrappear = dto.numberOfVideos || 200;
    const videosAAnalizar = dto.analyzeTop || 30;

    const creditosScraping = Math.ceil(videosAScrappear / 50);
    const creditosAnalisis = Math.ceil(videosAAnalizar / 4);
    const creditosNecesarios = creditosScraping + creditosAnalisis;

    const tieneCreditos = await this.creditService.verificarCreditos(userId, creditosNecesarios);

    if (!tieneCreditos) {
      const balance = await this.creditService.obtenerBalance(userId);
      throw new HttpException(
        {
          statusCode: HttpStatus.PAYMENT_REQUIRED,
          message: `Créditos insuficientes. Necesitas ${creditosNecesarios} crédito(s) (${creditosScraping} scraping + ${creditosAnalisis} análisis) pero solo tienes ${balance.creditosDisponibles}.`,
          error: 'Insufficient Credits',
          creditosDisponibles: balance.creditosDisponibles,
          creditosNecesarios: creditosNecesarios,
          desglose: {
            scraping: creditosScraping,
            analisis: creditosAnalisis,
            videosAScrappear,
            videosAAnalizar,
          },
          action: 'buy_credits',
        },
        HttpStatus.PAYMENT_REQUIRED
      );
    }

    // Consumir créditos
    const categorias = [...(dto.hashtags || []), ...(dto.keywords || [])].join(', ');
    await this.creditService.consumirCreditos(
      userId,
      creditosNecesarios,
      `Análisis de categoría: ${categorias}, ${videosAScrappear} videos scrapeados, ${videosAAnalizar} videos analizados`,
    );
    // ==========================================

    return await this.service.analyzeCategory({
      userId: req.user.userId,
      hashtags: dto.hashtags,
      keywords: dto.keywords,
      numberOfVideos: dto.numberOfVideos,
      analyzeTop: dto.analyzeTop,
      region: dto.region,
      filters: dto.filters,
    });
  }

  /**
   * 3. Analizar trending
   */
  @Post('trending')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Analizar videos trending',
    description:
      'Analiza videos en tendencia por región (hasta 100 videos) para identificar qué está funcionando ahora',
  })
  @ApiResponse({
    status: 200,
    description: 'Análisis de trending completado',
    type: AnalysisResponseDto,
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 402, description: 'Créditos insuficientes' })
  async analyzeTrending(
    @Body() dto: AnalyzeTrendingDto,
    @Request() req,
  ): Promise<AnalysisResponseDto> {
    const userId = req.user.userId;

    // ====== CALCULAR Y VERIFICAR CRÉDITOS ======
    // 1 crédito = 50 videos scrapeados + 4 videos analizados con IA
    const videosAScrappear = dto.numberOfVideos || 100;
    const videosAAnalizar = dto.analyzeTop || 20;

    const creditosScraping = Math.ceil(videosAScrappear / 50);
    const creditosAnalisis = Math.ceil(videosAAnalizar / 4);
    const creditosNecesarios = creditosScraping + creditosAnalisis;

    const tieneCreditos = await this.creditService.verificarCreditos(userId, creditosNecesarios);

    if (!tieneCreditos) {
      const balance = await this.creditService.obtenerBalance(userId);
      throw new HttpException(
        {
          statusCode: HttpStatus.PAYMENT_REQUIRED,
          message: `Créditos insuficientes. Necesitas ${creditosNecesarios} crédito(s) (${creditosScraping} scraping + ${creditosAnalisis} análisis) pero solo tienes ${balance.creditosDisponibles}.`,
          error: 'Insufficient Credits',
          creditosDisponibles: balance.creditosDisponibles,
          creditosNecesarios: creditosNecesarios,
          desglose: {
            scraping: creditosScraping,
            analisis: creditosAnalisis,
            videosAScrappear,
            videosAAnalizar,
          },
          action: 'buy_credits',
        },
        HttpStatus.PAYMENT_REQUIRED
      );
    }

    // Consumir créditos
    await this.creditService.consumirCreditos(
      userId,
      creditosNecesarios,
      `Análisis trending ${dto.region || 'US'}: ${videosAScrappear} videos scrapeados, ${videosAAnalizar} videos analizados`,
    );
    // ==========================================

    return await this.service.analyzeTrending({
      userId: req.user.userId,
      region: dto.region,
      numberOfVideos: dto.numberOfVideos,
      analyzeTop: dto.analyzeTop,
    });
  }

  /**
   * 4. Análisis comparativo
   */
  @Post('comparative')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Análisis comparativo',
    description:
      'Compara tu perfil con competidores y genera insights sobre fortalezas, debilidades y oportunidades',
  })
  @ApiResponse({
    status: 200,
    description: 'Análisis comparativo completado',
    type: AnalysisResponseDto,
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 402, description: 'Créditos insuficientes' })
  async analyzeComparative(
    @Body() dto: AnalyzeComparativeDto,
    @Request() req,
  ): Promise<any> {
    const userId = req.user.userId;

    // ====== CALCULAR Y VERIFICAR CRÉDITOS ======
    // Este análisis hace 2 análisis internos: tu perfil + competidores
    // 1 crédito = 50 videos scrapeados + 4 videos analizados con IA
    const videosPerProfile = dto.videosPerProfile || 50;
    const totalProfiles = 1 + dto.competitorProfiles.length; // Tu perfil + competidores
    const totalVideosAScrappear = totalProfiles * videosPerProfile;
    const videosAAnalizar = 15 * 2; // 15 por análisis, hace 2 análisis

    const creditosScraping = Math.ceil(totalVideosAScrappear / 50);
    const creditosAnalisis = Math.ceil(videosAAnalizar / 4);
    const creditosNecesarios = creditosScraping + creditosAnalisis;

    const tieneCreditos = await this.creditService.verificarCreditos(userId, creditosNecesarios);

    if (!tieneCreditos) {
      const balance = await this.creditService.obtenerBalance(userId);
      throw new HttpException(
        {
          statusCode: HttpStatus.PAYMENT_REQUIRED,
          message: `Créditos insuficientes. Necesitas ${creditosNecesarios} crédito(s) (${creditosScraping} scraping + ${creditosAnalisis} análisis) pero solo tienes ${balance.creditosDisponibles}.`,
          error: 'Insufficient Credits',
          creditosDisponibles: balance.creditosDisponibles,
          creditosNecesarios: creditosNecesarios,
          desglose: {
            scraping: creditosScraping,
            analisis: creditosAnalisis,
            totalProfiles,
            totalVideosAScrappear,
            videosAAnalizar,
          },
          action: 'buy_credits',
        },
        HttpStatus.PAYMENT_REQUIRED
      );
    }

    // Consumir créditos
    await this.creditService.consumirCreditos(
      userId,
      creditosNecesarios,
      `Análisis comparativo: ${dto.yourProfile} vs ${dto.competitorProfiles.length} competidor(es), ${totalVideosAScrappear} videos scrapeados, ${videosAAnalizar} videos analizados`,
    );
    // ==========================================

    return await this.service.analyzeComparative({
      userId: req.user.userId,
      yourProfile: dto.yourProfile,
      competitorProfiles: dto.competitorProfiles,
      videosPerProfile: dto.videosPerProfile,
    });
  }

  /**
   * Obtener historial de análisis
   */
  @Get('history')
  @ApiOperation({
    summary: 'Obtener historial de análisis del usuario',
    description: 'Retorna todos los análisis realizados por el usuario con paginación',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: AnalysisType,
    description: 'Filtrar por tipo de análisis',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Número de página (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Resultados por página (default: 10)',
  })
  @ApiResponse({
    status: 200,
    description: 'Historial obtenido exitosamente',
    type: PaginatedHistoryResponseDto,
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  async getHistory(
    @Request() req,
    @Query('type') type?: AnalysisType,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<PaginatedHistoryResponseDto> {
    return await this.service.getUserAnalysisHistory(
      req.user.userId,
      type,
      page ? Number(page) : 1,
      limit ? Number(limit) : 10,
    );
  }

  /**
   * Obtener análisis específico
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Obtener análisis específico por ID',
    description: 'Retorna todos los detalles de un análisis incluyendo videos, insights y sugerencias',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'ID del análisis (UUID)',
  })
  @ApiResponse({
    status: 200,
    description: 'Análisis encontrado',
    type: AnalysisHistoryDto,
  })
  @ApiResponse({ status: 404, description: 'Análisis no encontrado' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  async getAnalysis(@Param('id') id: string, @Request() req): Promise<any> {
    return await this.service.getAnalysisById(id, req.user.userId);
  }
}
