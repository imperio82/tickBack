import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/autGuard';
import { CalendarService } from './calendar.service';
import {
  CreateScheduledPostDto,
  UpdateScheduledPostDto,
  GenerateCalendarDto,
  GetOptimalHoursDto,
  BulkCreatePostsDto,
} from './dto/calendar.dto';
import { PostStatus, PostPlatform } from './entities/scheduled-post.entity';

@ApiTags('Calendar & Content Planning')
@Controller('calendar')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  // ============== POSTS PROGRAMADOS ==============

  /**
   * Crear un post programado
   */
  @Post('posts')
  @ApiOperation({
    summary: 'Crear un post programado',
    description: 'Crea una publicación programada en el calendario',
  })
  async createPost(@Body() dto: CreateScheduledPostDto, @Request() req) {
    return await this.calendarService.createPost(req.user.userId, dto);
  }

  /**
   * Crear múltiples posts a la vez
   */
  @Post('posts/bulk')
  @ApiOperation({
    summary: 'Crear múltiples posts',
    description: 'Crea varias publicaciones programadas de una vez',
  })
  async bulkCreatePosts(@Body() dto: BulkCreatePostsDto, @Request() req) {
    return await this.calendarService.bulkCreatePosts(
      req.user.userId,
      dto.posts,
    );
  }

  /**
   * Obtener posts del usuario
   */
  @Get('posts')
  @ApiOperation({
    summary: 'Obtener posts programados',
    description: 'Lista todos los posts programados del usuario con filtros opcionales',
  })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: PostStatus })
  @ApiQuery({ name: 'platform', required: false, enum: PostPlatform })
  async getPosts(
    @Request() req,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: PostStatus,
    @Query('platform') platform?: PostPlatform,
  ) {
    const filters: any = {};

    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);
    if (status) filters.status = status;
    if (platform) filters.platform = platform;

    return await this.calendarService.getPosts(req.user.userId, filters);
  }

  /**
   * Obtener posts próximos (siguientes 7 días)
   */
  @Get('posts/upcoming')
  @ApiOperation({
    summary: 'Obtener posts próximos',
    description: 'Lista los posts programados para los próximos N días',
  })
  @ApiQuery({ name: 'days', required: false, type: Number, example: 7 })
  async getUpcomingPosts(
    @Request() req,
    @Query('days') days?: number,
  ) {
    return await this.calendarService.getUpcomingPosts(
      req.user.userId,
      days ? parseInt(days.toString()) : 7,
    );
  }

  /**
   * Obtener un post específico
   */
  @Get('posts/:id')
  @ApiOperation({ summary: 'Obtener post por ID' })
  @ApiParam({ name: 'id', description: 'ID del post' })
  async getPostById(@Param('id') id: string, @Request() req) {
    return await this.calendarService.getPostById(id, req.user.userId);
  }

  /**
   * Actualizar un post
   */
  @Put('posts/:id')
  @ApiOperation({ summary: 'Actualizar post programado' })
  @ApiParam({ name: 'id', description: 'ID del post' })
  async updatePost(
    @Param('id') id: string,
    @Body() dto: UpdateScheduledPostDto,
    @Request() req,
  ) {
    return await this.calendarService.updatePost(id, req.user.userId, dto);
  }

  /**
   * Eliminar un post
   */
  @Delete('posts/:id')
  @ApiOperation({ summary: 'Eliminar post programado' })
  @ApiParam({ name: 'id', description: 'ID del post' })
  async deletePost(@Param('id') id: string, @Request() req) {
    await this.calendarService.deletePost(id, req.user.userId);
    return { success: true, message: 'Post eliminado correctamente' };
  }

  // ============== ANÁLISIS DE HORARIOS ÓPTIMOS ==============

  /**
   * Obtener horarios óptimos basados en análisis previos
   */
  @Get('optimal-hours')
  @ApiOperation({
    summary: 'Obtener horarios óptimos de publicación',
    description:
      'Analiza tus scraping previos para identificar los mejores horarios para publicar',
  })
  @ApiQuery({ name: 'analysisId', required: false, type: String })
  @ApiQuery({ name: 'topHours', required: false, type: Number, example: 10 })
  async getOptimalHours(
    @Request() req,
    @Query('analysisId') analysisId?: string,
    @Query('topHours') topHours?: number,
  ) {
    console.log("este es el id de l usuario", req.user.userId,
      analysisId,)
    return await this.calendarService.getOptimalHours(
      req.user.userId,
      analysisId,
      topHours ? parseInt(topHours.toString()) : 10,
    );
  }

  // ============== GENERACIÓN AUTOMÁTICA DE CALENDARIO ==============

  /**
   * Generar calendario completo automáticamente
   */
  @Post('generate')
  @ApiOperation({
    summary: 'Generar calendario automático',
    description:
      'Genera un calendario completo de publicaciones basándose en tus análisis previos y preferencias',
  })
  async generateCalendar(@Body() dto: GenerateCalendarDto, @Request() req) {
    return await this.calendarService.generateCalendar(req.user.userId, dto);
  }

  /**
   * Obtener todos los calendarios del usuario
   */
  @Get('calendars')
  @ApiOperation({
    summary: 'Obtener calendarios creados',
    description: 'Lista todos los calendarios que has generado',
  })
  async getUserCalendars(@Request() req) {
    return await this.calendarService.getUserCalendars(req.user.userId);
  }

  /**
   * Obtener un calendario específico
   */
  @Get('calendars/:id')
  @ApiOperation({ summary: 'Obtener calendario por ID' })
  @ApiParam({ name: 'id', description: 'ID del calendario' })
  async getCalendarById(@Param('id') id: string, @Request() req) {
    return await this.calendarService.getCalendarById(id, req.user.userId);
  }

  /**
   * Eliminar un calendario
   */
  @Delete('calendars/:id')
  @ApiOperation({ summary: 'Eliminar calendario' })
  @ApiParam({ name: 'id', description: 'ID del calendario' })
  async deleteCalendar(@Param('id') id: string, @Request() req) {
    await this.calendarService.deleteCalendar(id, req.user.userId);
    return { success: true, message: 'Calendario eliminado correctamente' };
  }

  // ============== ESTADÍSTICAS ==============

  /**
   * Obtener estadísticas del calendario
   */
  @Get('statistics')
  @ApiOperation({
    summary: 'Obtener estadísticas del calendario',
    description:
      'Retorna estadísticas sobre distribución de posts, horarios, etc.',
  })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  async getStatistics(
    @Request() req,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return await this.calendarService.getCalendarStatistics(
      req.user.userId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }
}
