import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Request,
  UseGuards,
  ParseIntPipe,
  ParseArrayPipe,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiQuery,
  ApiParam,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { AnalysisService } from '../Analisys.services';
import { QueryType, AnalysisStatus } from '../entity/apify.entity';
import {
  CreateAnalysisRequest,
  UpdateAnalysisRequest,
  AnalysisResponse,
  PaginatedAnalysisResponse,
  AnalysisStatsResponse,
  UpdateAnalysisStatusRequest,
  UpdateAnalysisResultRequest,
  AnalysisArrayResponse,
  DuplicatesResponse,
} from './analysis.dto';
import { JwtAuthGuard } from 'src/auth/guards/autGuard';

@ApiTags('Analysis')
@Controller('analysis')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  @Post()
  @ApiOperation({
    summary: 'Crear un nuevo análisis',
    description: 'Crea un nuevo análisis asociado al usuario autenticado',
  })
  @ApiResponse({
    status: 201,
    description: 'Análisis creado correctamente',
    type: AnalysisResponse,
  })
  @ApiBadRequestResponse({ description: 'Error en los datos proporcionados' })
  @ApiUnauthorizedResponse({ description: 'Token inválido o expirado' })
  async create(
    @Body() createAnalysisDto: CreateAnalysisRequest,
    @Request() req,
  ): Promise<any> {
    const analysisData = {
      ...createAnalysisDto,
      userId: req.user.userId,
      
    };
    return await this.analysisService.create(analysisData as any);
  }

  @Get()
  @ApiOperation({
    summary: 'Obtener todos los análisis del usuario',
    description: 'Retorna una lista paginada de análisis del usuario autenticado con filtros opcionales',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Número de página (por defecto: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Elementos por página (por defecto: 10)' })
  @ApiQuery({ name: 'queryType', required: false, enum: QueryType, description: 'Filtrar por tipo de consulta' })
  @ApiQuery({ name: 'status', required: false, enum: AnalysisStatus, description: 'Filtrar por estado' })
  @ApiResponse({
    status: 200,
    description: 'Lista de análisis obtenida correctamente',
    type: PaginatedAnalysisResponse,
  })
  @ApiUnauthorizedResponse({ description: 'Token inválido o expirado' })
  async findAll(
      @Request() req,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('queryType') queryType?: QueryType,
    @Query('status') status?: AnalysisStatus,
  ): Promise<any> {
 
    return await this.analysisService.findAll(
      page,
      limit,
      req.user.userId,
      queryType,
      status,
    );
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Obtener estadísticas de análisis',
    description: 'Retorna estadísticas de análisis del usuario autenticado',
  })
  @ApiResponse({
    status: 200,
    description: 'Estadísticas obtenidas correctamente',
    type: AnalysisStatsResponse,
  })
  @ApiUnauthorizedResponse({ description: 'Token inválido o expirado' })
  async getStats(@Request() req): Promise<any> {
    return await this.analysisService.getStats(req.user.userId);
  }

  @Get('search')
  @ApiOperation({
    summary: 'Buscar en resultados de análisis',
    description: 'Busca un término específico en los resultados JSON de los análisis del usuario',
  })
  @ApiQuery({ name: 'term', required: true, type: String, description: 'Término a buscar en los resultados' })
  @ApiResponse({
    status: 200,
    description: 'Búsqueda completada correctamente',
    type: AnalysisArrayResponse,
  })
  @ApiUnauthorizedResponse({ description: 'Token inválido o expirado' })
  async searchInResults(
    @Query('term') searchTerm: string,
    @Request() req,
  ): Promise<any> {
    if (!searchTerm || searchTerm.trim().length === 0) {
      throw new BadRequestException('El término de búsqueda es requerido');
    }
    return await this.analysisService.searchInResults(searchTerm, req.user.userId);
  }

  @Get('duplicates')
  @ApiOperation({
    summary: 'Obtener análisis duplicados',
    description: 'Retorna grupos de análisis con resultados duplicados (solo para administradores)',
  })
  @ApiResponse({
    status: 200,
    description: 'Duplicados obtenidos correctamente',
    type: DuplicatesResponse,
  })
  @ApiUnauthorizedResponse({ description: 'Token inválido o expirado' })
  async findDuplicates(): Promise<any> {
    return await this.analysisService.findDuplicates();
  }

  @Get('by-query-type/:queryType')
  @ApiOperation({
    summary: 'Obtener análisis por tipo de consulta',
    description: 'Retorna análisis filtrados por tipo de consulta específico',
  })
  @ApiParam({ name: 'queryType', enum: QueryType, description: 'Tipo de consulta' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Número de página (por defecto: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Elementos por página (por defecto: 10)' })
  @ApiResponse({
    status: 200,
    description: 'Análisis obtenidos correctamente',
    type: AnalysisArrayResponse,
  })
  @ApiUnauthorizedResponse({ description: 'Token inválido o expirado' })
  async findByQueryType(
    @Param('queryType') queryType: QueryType,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ): Promise<any> {
    return await this.analysisService.findByQueryType(queryType, page, limit);
  }

  @Get('date-range')
  @ApiOperation({
    summary: 'Obtener análisis por rango de fechas',
    description: 'Retorna análisis del usuario dentro de un rango de fechas específico',
  })
  @ApiQuery({ name: 'startDate', required: true, type: String, description: 'Fecha de inicio (ISO string)' })
  @ApiQuery({ name: 'endDate', required: true, type: String, description: 'Fecha de fin (ISO string)' })
  @ApiResponse({
    status: 200,
    description: 'Análisis obtenidos correctamente',
    type: AnalysisArrayResponse,
  })
  @ApiBadRequestResponse({ description: 'Formato de fecha inválido' })
  @ApiUnauthorizedResponse({ description: 'Token inválido o expirado' })
  async findByDateRange(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Request() req,
  ): Promise<any> {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Formato de fecha inválido');
    }

    if (start >= end) {
      throw new BadRequestException('La fecha de inicio debe ser anterior a la fecha de fin');
    }

    return await this.analysisService.findByDateRange(start, end, req.user.userId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener un análisis específico',
    description: 'Retorna un análisis específico por su ID',
  })
  @ApiParam({ name: 'id', type: Number, description: 'ID del análisis' })
  @ApiResponse({
    status: 200,
    description: 'Análisis obtenido correctamente',
    type: AnalysisResponse,
  })
  @ApiNotFoundResponse({ description: 'Análisis no encontrado' })
  @ApiUnauthorizedResponse({ description: 'Token inválido o expirado' })
  async findOne(@Param('id', ParseIntPipe) id: string): Promise<any> {
    return await this.analysisService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Actualizar un análisis',
    description: 'Actualiza un análisis existente',
  })
  @ApiParam({ name: 'id', type: Number, description: 'ID del análisis' })
  @ApiResponse({
    status: 200,
    description: 'Análisis actualizado correctamente',
    type: AnalysisResponse,
  })
  @ApiNotFoundResponse({ description: 'Análisis no encontrado' })
  @ApiBadRequestResponse({ description: 'Error en los datos proporcionados' })
  @ApiUnauthorizedResponse({ description: 'Token inválido o expirado' })
  async update(
    @Param('id', ParseIntPipe) id: string,
    @Body() updateAnalysisDto: UpdateAnalysisRequest,
  ): Promise<any> {
    return await this.analysisService.update(id, updateAnalysisDto);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Actualizar estado de análisis',
    description: 'Actualiza únicamente el estado de un análisis',
  })
  @ApiParam({ name: 'id', type: Number, description: 'ID del análisis' })
  @ApiResponse({
    status: 200,
    description: 'Estado actualizado correctamente',
    type: AnalysisResponse,
  })
  @ApiNotFoundResponse({ description: 'Análisis no encontrado' })
  @ApiUnauthorizedResponse({ description: 'Token inválido o expirado' })
  async updateStatus(
    @Param('id', ParseIntPipe) id: string,
    @Body() updateStatusDto: UpdateAnalysisStatusRequest,
  ): Promise<any> {
    return await this.analysisService.updateStatus(id, updateStatusDto.status);
  }

  @Patch(':id/result')
  @ApiOperation({
    summary: 'Actualizar resultado de análisis',
    description: 'Actualiza únicamente el resultado de un análisis',
  })
  @ApiParam({ name: 'id', type: Number, description: 'ID del análisis' })
  @ApiResponse({
    status: 200,
    description: 'Resultado actualizado correctamente',
    type: AnalysisResponse,
  })
  @ApiNotFoundResponse({ description: 'Análisis no encontrado' })
  @ApiUnauthorizedResponse({ description: 'Token inválido o expirado' })
  async updateResult(
    @Param('id', ParseIntPipe) id: string,
    @Body() updateResultDto: UpdateAnalysisResultRequest,
  ): Promise<any> {
    return await this.analysisService.updateResult(id, updateResultDto.analysisResult);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Eliminar un análisis',
    description: 'Elimina un análisis específico',
  })
  @ApiParam({ name: 'id', type: Number, description: 'ID del análisis' })
  @ApiResponse({
    status: 200,
    description: 'Análisis eliminado correctamente',
  })
  @ApiNotFoundResponse({ description: 'Análisis no encontrado' })
  @ApiUnauthorizedResponse({ description: 'Token inválido o expirado' })
  async remove(@Param('id', ParseIntPipe) id: string): Promise<{ message: string }> {
    await this.analysisService.remove(id);
    return { message: 'Análisis eliminado correctamente' };
  }

  @Delete('bulk/multiple')
  @ApiOperation({
    summary: 'Eliminar múltiples análisis',
    description: 'Elimina múltiples análisis por sus IDs',
  })
  @ApiResponse({
    status: 200,
    description: 'Análisis eliminados correctamente',
  })
  @ApiBadRequestResponse({ description: 'Lista de IDs inválida' })
  @ApiUnauthorizedResponse({ description: 'Token inválido o expirado' })
  async removeMultiple(
    @Body('ids', new ParseArrayPipe({ items: Number })) ids: number[],
  ): Promise<{ message: string; deletedCount: number }> {
    if (!ids || ids.length === 0) {
      throw new BadRequestException('Se debe proporcionar al menos un ID');
    }

    await this.analysisService.removeMultiple(ids);
    return { 
      message: 'Análisis eliminados correctamente',
      deletedCount: ids.length 
    };
  }
}