import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  HttpStatus,
  HttpException,
  Logger,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import {
  TikTokApifyService,
  TikTokScrapingResult,
  TikTokHashtagOptions,
  TikTokProfileOptions,
  TikTokSearchOptions,
  TikTokVideoOptions,
  TikTokAdvancedScrapingOptions,
} from './apify.service';
import { AdvancedScrapingDto, CommentScrapingDto, HashtagScrapingDto, ProfileScrapingDto, RunStatusDto, ScrapingResponseDto, SearchScrapingDto, SoundScrapingDto, VideoScrapingDto } from './apify.dto';


@ApiTags('TikTok Scraping')
@Controller('tiktok')
export class TikTokController {
  private readonly logger = new Logger(TikTokController.name);

  constructor(private readonly tikTokService: TikTokApifyService) {}

  @Post('scrape/hashtags')
  @ApiOperation({ 
    summary: 'Scrape videos por hashtags',
    description: 'Obtiene videos de TikTok basados en hashtags específicos'
  })
  @ApiResponse({
    status: 200,
    description: 'Scraping exitoso',
    type: ScrapingResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Parámetros inválidos',
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor',
  })
  @ApiBody({ type: HashtagScrapingDto })
  async scrapeByHashtags(@Body() dto: HashtagScrapingDto): Promise<TikTokScrapingResult> {
    try {
      this.logger.log(`Iniciando scraping por hashtags: ${dto.hashtags.join(', ')}`);
      const result = await this.tikTokService.scrapeByHashtags(dto as TikTokHashtagOptions);
      
      if (!result.success) {
        throw new HttpException(
          `Error en el scraping: ${result.error}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      return result;
    } catch (error) {
      this.logger.error('Error en scrapeByHashtags:', error);
      throw new HttpException(
        error.message || 'Error interno del servidor',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('scrape/profiles')
  @ApiOperation({
    summary: 'Scrape videos de perfiles',
    description: 'Obtiene videos de perfiles específicos de TikTok'
  })
  @ApiResponse({
    status: 200,
    description: 'Scraping exitoso',
    type: ScrapingResponseDto,
  })
  @ApiBody({ type: ProfileScrapingDto })
  async scrapeProfiles(@Request() req ,@Body() dto: ProfileScrapingDto): Promise<TikTokScrapingResult> {
    try {
      const id: string= "123" //req.user.userId 
      this.logger.log(`Iniciando scraping de perfiles: ${dto.profiles.join(', ')}`);
      const result = await this.tikTokService.scrapeProfiles(dto as TikTokProfileOptions, id);
      
      if (!result.success) {
        throw new HttpException(
          `Error en el scraping: ${result.error}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      return result;
    } catch (error) {
      this.logger.error('Error en scrapeProfiles:', error);
      throw new HttpException(
        error.message || 'Error interno del servidor',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('scrape/search')
  @ApiOperation({
    summary: 'Scrape videos por búsqueda',
    description: 'Busca y obtiene videos de TikTok usando palabras clave'
  })
  @ApiResponse({
    status: 200,
    description: 'Búsqueda exitosa',
    type: ScrapingResponseDto,
  })
  @ApiBody({ type: SearchScrapingDto })
  async scrapeBySearch(@Body() dto: SearchScrapingDto): Promise<TikTokScrapingResult> {
    try {
      this.logger.log(`Iniciando búsqueda: ${dto.search}`);
      const result = await this.tikTokService.scrapeBySearch(dto as TikTokSearchOptions);
      
      if (!result.success) {
        throw new HttpException(
          `Error en la búsqueda: ${result.error}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      return result;
    } catch (error) {
      this.logger.error('Error en scrapeBySearch:', error);
      throw new HttpException(
        error.message || 'Error interno del servidor',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('scrape/videos')
  @ApiOperation({
    summary: 'Scrape videos específicos',
    description: 'Obtiene información de videos específicos usando sus URLs'
  })
  @ApiResponse({
    status: 200,
    description: 'Scraping exitoso',
    type: ScrapingResponseDto,
  })
  @ApiBody({ type: VideoScrapingDto })
  async scrapeVideos(@Body() dto: VideoScrapingDto): Promise<TikTokScrapingResult> {
    try {
      this.logger.log(`Scraping de ${dto.videoUrls.length} videos específicos`);
      const result = await this.tikTokService.scrapeVideos(dto as TikTokVideoOptions);
      
      if (!result.success) {
        throw new HttpException(
          `Error en el scraping: ${result.error}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      return result;
    } catch (error) {
      this.logger.error('Error en scrapeVideos:', error);
      throw new HttpException(
        error.message || 'Error interno del servidor',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('scrape/advanced')
  @ApiOperation({
    summary: 'Scraping avanzado',
    description: 'Realiza scraping avanzado con filtros y opciones personalizadas'
  })
  @ApiResponse({
    status: 200,
    description: 'Scraping avanzado exitoso',
    type: ScrapingResponseDto,
  })
  @ApiBody({ type: AdvancedScrapingDto })
  async scrapeAdvanced(@Body() dto: AdvancedScrapingDto): Promise<TikTokScrapingResult> {
    try {
      this.logger.log(`Iniciando scraping avanzado tipo: ${dto.type}`);
      const result = await this.tikTokService.scrapeAdvanced(dto as TikTokAdvancedScrapingOptions);
      
      if (!result.success) {
        throw new HttpException(
          `Error en el scraping avanzado: ${result.error}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      return result;
    } catch (error) {
      this.logger.error('Error en scrapeAdvanced:', error);
      throw new HttpException(
        error.message || 'Error interno del servidor',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('scrape/comments')
  @ApiOperation({
    summary: 'Scrape comentarios',
    description: 'Obtiene comentarios de videos específicos'
  })
  @ApiResponse({
    status: 200,
    description: 'Comentarios obtenidos exitosamente',
    type: ScrapingResponseDto,
  })
  @ApiBody({ type: CommentScrapingDto })
  async scrapeComments(@Body() dto: CommentScrapingDto): Promise<TikTokScrapingResult> {
    try {
      this.logger.log(`Scraping de comentarios de ${dto.videoUrls.length} videos`);
      const result = await this.tikTokService.scrapeComments(
        dto.videoUrls,
        dto.maxComments || 100
      );
      
      if (!result.success) {
        throw new HttpException(
          `Error obteniendo comentarios: ${result.error}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      return result;
    } catch (error) {
      this.logger.error('Error en scrapeComments:', error);
      throw new HttpException(
        error.message || 'Error interno del servidor',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('scrape/sounds')
  @ApiOperation({
    summary: 'Scrape información de sonidos',
    description: 'Obtiene información de sonidos/música de TikTok'
  })
  @ApiResponse({
    status: 200,
    description: 'Información de sonidos obtenida exitosamente',
    type: ScrapingResponseDto,
  })
  @ApiBody({ type: SoundScrapingDto })
  async scrapeSounds(@Body() dto: SoundScrapingDto): Promise<TikTokScrapingResult> {
    try {
      this.logger.log(`Scraping de información de ${dto.soundUrls.length} sonidos`);
      const result = await this.tikTokService.scrapeSounds(dto.soundUrls);
      
      if (!result.success) {
        throw new HttpException(
          `Error obteniendo información de sonidos: ${result.error}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      return result;
    } catch (error) {
      this.logger.error('Error en scrapeSounds:', error);
      throw new HttpException(
        error.message || 'Error interno del servidor',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('trending')
  @ApiOperation({
    summary: 'Obtener videos en tendencia',
    description: 'Obtiene los videos más populares por región'
  })
  @ApiQuery({ name: 'region', required: false, description: 'Código de región (ej: US, GB, DE)', example: 'US' })
  @ApiQuery({ name: 'maxResults', required: false, description: 'Máximo número de resultados', example: 100 })
  @ApiResponse({
    status: 200,
    description: 'Videos en tendencia obtenidos exitosamente',
    type: ScrapingResponseDto,
  })
  async scrapeTrending(
    @Query('region') region: string = 'US',
    @Query('maxResults') maxResults: number = 100,
  ): Promise<TikTokScrapingResult> {
    try {
      this.logger.log(`Obteniendo tendencias para región: ${region}`);
      const result = await this.tikTokService.scrapeTrending(region, maxResults);
      
      if (!result.success) {
        throw new HttpException(
          `Error obteniendo tendencias: ${result.error}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      return result;
    } catch (error) {
      this.logger.error('Error en scrapeTrending:', error);
      throw new HttpException(
        error.message || 'Error interno del servidor',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('run/:runId/status')
  @ApiOperation({
    summary: 'Obtener estado de ejecución',
    description: 'Consulta el estado de una ejecución de scraping por su ID'
  })
  @ApiParam({ name: 'runId', description: 'ID de la ejecución', example: 'abc123def456' })
  @ApiResponse({
    status: 200,
    description: 'Estado de ejecución obtenido exitosamente',
    type: RunStatusDto,
  })
  async getRunStatus(@Param('runId') runId: string) {
    try {
      this.logger.log(`Consultando estado del run: ${runId}`);
      return await this.tikTokService.getRunStatus(runId);
    } catch (error) {
      this.logger.error(`Error consultando estado del run ${runId}:`, error);
      throw new HttpException(
        error.message || 'Error consultando estado de la ejecución',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}