import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, Between } from 'typeorm';
import { Analysis, QueryType, AnalysisStatus, CreateAnalysisDto, UpdateAnalysisDto } from './entity/apify.entity';

@Injectable()
export class AnalysisService {
  constructor(
    @InjectRepository(Analysis)
    private readonly analysisRepository: Repository<Analysis>,
  ) {}

  // Crear un nuevo análisis
  async create(createAnalysisDto: CreateAnalysisDto): Promise<Analysis> {
    try {
      const analysis = this.analysisRepository.create(createAnalysisDto);
      return await this.analysisRepository.save(analysis);
    } catch (error) {
      throw new BadRequestException('Error al crear el análisis');
    }
  }

  // Obtener todos los análisis con paginación y filtros
  async findAll(
    page: number = 1,
    limit: number = 10,
    userId?: string,
    queryType?: QueryType,
    status?: AnalysisStatus,
  ): Promise<{
    data: Analysis[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;
    
    const where: FindOptionsWhere<Analysis> = {};
    if (userId) where.userId = userId;
    if (queryType) where.queryType = queryType;
    if (status) where.status = status;

    const [data, total] = await this.analysisRepository.findAndCount({
      where,
      relations: ['user'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Obtener un análisis por ID
  async findOne(id: string): Promise<Analysis> {
    const analysis = await this.analysisRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!analysis) {
      throw new NotFoundException(`Análisis con ID ${id} no encontrado`);
    }

    return analysis;
  }

  // Obtener análisis por usuario
  async findByUser(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    data: Analysis[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    return this.findAll(page, limit, userId);
  }

  // Obtener análisis por tipo de consulta
  async findByQueryType(
    queryType: QueryType,
    page: number = 1,
    limit: number = 10,
  ): Promise<Analysis[]> {
    return await this.analysisRepository.find({
      where: { queryType },
      relations: ['user'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  // Obtener análisis por rango de fechas
  async findByDateRange(
    startDate: Date,
    endDate: Date,
    userId?: string,
  ): Promise<Analysis[]> {
    const where: FindOptionsWhere<Analysis> = {
      createdAt: Between(startDate, endDate),
    };

    if (userId) {
      where.userId = userId;
    }

    return await this.analysisRepository.find({
      where,
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  // Actualizar un análisis
  async update(id: string, updateAnalysisDto: UpdateAnalysisDto): Promise<Analysis> {
    const analysis = await this.findOne(id);
    
    Object.assign(analysis, updateAnalysisDto);
    
    try {
      return await this.analysisRepository.save(analysis);
    } catch (error) {
      throw new BadRequestException('Error al actualizar el análisis');
    }
  }

  // Actualizar solo el resultado del análisis
  async updateResult(id: string, analysisResult: Record<string, any>): Promise<Analysis> {
    const analysis = await this.findOne(id);
    analysis.analysisResult = analysisResult;
    
    return await this.analysisRepository.save(analysis);
  }

  // Actualizar status del análisis
  async updateStatus(id: string, status: AnalysisStatus): Promise<Analysis> {
    const analysis = await this.findOne(id);
    analysis.status = status;
    
    return await this.analysisRepository.save(analysis);
  }

  // Eliminar un análisis
  async remove(id: string): Promise<void> {
    const analysis = await this.findOne(id);
    await this.analysisRepository.remove(analysis);
  }

  // Eliminar múltiples análisis
  async removeMultiple(ids: number[]): Promise<void> {
    await this.analysisRepository.delete(ids);
  }

  // Obtener estadísticas básicas
  async getStats(userId?: string): Promise<{
    total: number;
    byType: Record<QueryType, number>;
    byStatus: Record<AnalysisStatus, number>;
    recent: number; // últimos 7 días
  }> {
    const where: FindOptionsWhere<Analysis> = {};
    if (userId) where.userId = userId;

    // Total
    const total = await this.analysisRepository.count({ where });

    // Por tipo
    const byType = {} as Record<QueryType, number>;
    for (const type of Object.values(QueryType)) {
      byType[type] = await this.analysisRepository.count({
        where: { ...where, queryType: type },
      });
    }

    // Por status
    const byStatus = {} as Record<AnalysisStatus, number>;
    for (const status of Object.values(AnalysisStatus)) {
      byStatus[status] = await this.analysisRepository.count({
        where: { ...where, status },
      });
    }

    // Recientes (últimos 7 días)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recent = await this.analysisRepository.count({
      where: {
        ...where,
        createdAt: Between(sevenDaysAgo, new Date()),
      },
    });

    return { total, byType, byStatus, recent };
  }

  // Buscar en el contenido JSON del resultado
  async searchInResults(
    searchTerm: string,
    userId?: number,
  ): Promise<Analysis[]> {
    const queryBuilder = this.analysisRepository
      .createQueryBuilder('analysis')
      .leftJoinAndSelect('analysis.user', 'user')
      .where('JSON_SEARCH(analysis.analysis_result, "all", :searchTerm) IS NOT NULL', {
        searchTerm: `%${searchTerm}%`,
      });

    if (userId) {
      queryBuilder.andWhere('analysis.userId = :userId', { userId });
    }

    return await queryBuilder
      .orderBy('analysis.createdAt', 'DESC')
      .getMany();
  }

  // Obtener análisis duplicados (mismo resultado)
  async findDuplicates(): Promise<Analysis[][]> {
    const duplicates = await this.analysisRepository
      .createQueryBuilder('analysis')
      .select('analysis.analysis_result')
      .addSelect('COUNT(*)', 'count')
      .groupBy('analysis.analysis_result')
      .having('COUNT(*) > 1')
      .getRawMany();

    const duplicateGroups: Analysis[][] = [];
    
    for (const duplicate of duplicates) {
      const analyses = await this.analysisRepository.find({
        where: { analysisResult: duplicate.analysis_result },
        relations: ['user'],
        order: { createdAt: 'ASC' },
      });
      duplicateGroups.push(analyses);
    }

    return duplicateGroups;
  }
}