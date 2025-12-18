import { Injectable, NotFoundException, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfileAnalysis, ProfileAnalysisStatus } from '../entities/profile-analysis.entity';
import { Analysis } from '../../apify/entity/apify.entity';

@Injectable()
export class ProfileAnalysisService {
  private readonly logger = new Logger(ProfileAnalysisService.name);

  constructor(
    @InjectRepository(ProfileAnalysis)
    private readonly profileAnalysisRepository: Repository<ProfileAnalysis>,
    @InjectRepository(Analysis)
    private readonly analysisRepository: Repository<Analysis>,
  ) {}

  /**
   * Crear un nuevo ProfileAnalysis
   */
  async create(data: {
    userId: string;
    profileUrl: string;
    profileUsername?: string;
    scrapedDataId?: string;
    status?: ProfileAnalysisStatus;
  }): Promise<ProfileAnalysis> {
    try {
      const profileAnalysis = this.profileAnalysisRepository.create({
        userId: data.userId,
        profileUrl: data.profileUrl,
        profileUsername: data.profileUsername,
        scrapedDataId: data.scrapedDataId,
        status: data.status || ProfileAnalysisStatus.PENDING,
      });

      const saved = await this.profileAnalysisRepository.save(profileAnalysis);
      this.logger.log(`ProfileAnalysis creado: ${saved.id}`);
      return saved;
    } catch (error) {
      this.logger.error('Error creando ProfileAnalysis:', error);
      throw new HttpException(
        'Error al crear el análisis de perfil',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Buscar por ID con validación de usuario
   */
  async findById(id: string, userId?: string): Promise<ProfileAnalysis> {
    const query = this.profileAnalysisRepository
      .createQueryBuilder('profileAnalysis')
      .leftJoinAndSelect('profileAnalysis.scrapedData', 'scrapedData')
      .where('profileAnalysis.id = :id', { id });

    if (userId) {
      query.andWhere('profileAnalysis.userId = :userId', { userId });
    }

    const profileAnalysis = await query.getOne();

    if (!profileAnalysis) {
      throw new NotFoundException(`ProfileAnalysis con ID ${id} no encontrado`);
    }

    return profileAnalysis;
  }

  /**
   * Buscar todos los análisis de un usuario
   */
  async findByUserId(userId: string, limit: number = 20): Promise<ProfileAnalysis[]> {
   try {
        return this.profileAnalysisRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
   } catch (error) {
    console.error("error", error)
    throw error
   }
  }

  /**
   * Actualizar ProfileAnalysis
   */
  async update(
    id: string,
    data: Partial<{
      status: ProfileAnalysisStatus;
      scrapedDataId: string | null;
      profileUsername: string;
      filteredData: any;
      preliminaryInsights: any;
      scrapingMetadata: any;
      errorMessage: string;
      completedAt: Date;
    }>
  ): Promise<ProfileAnalysis> {
    try {
      const profileAnalysis = await this.findById(id);

      Object.assign(profileAnalysis, data);

      const updated = await this.profileAnalysisRepository.save(profileAnalysis);
      this.logger.log(`ProfileAnalysis actualizado: ${updated.id} - Status: ${updated.status}`);
      return updated;
    } catch (error) {
      this.logger.error(`Error actualizando ProfileAnalysis ${id}:`, error);
      throw error;
    }
  }

  /**
   * Actualizar status
   */
  async updateStatus(id: string, status: ProfileAnalysisStatus, errorMessage?: string): Promise<ProfileAnalysis> {
    const updateData: any = { status };

    if (errorMessage) {
      updateData.errorMessage = errorMessage;
    }

    if (status === ProfileAnalysisStatus.COMPLETED) {
      updateData.completedAt = new Date();
    }

    return this.update(id, updateData);
  }

  /**
   * Obtener datos scrapeados del análisis
   */
  async getScrapedData(profileAnalysisId: string): Promise<any> {
    const profileAnalysis = await this.findById(profileAnalysisId);

    if (!profileAnalysis.scrapedDataId) {
      throw new NotFoundException('No hay datos scrapeados asociados a este análisis');
    }

    const scrapedData = await this.analysisRepository.findOne({
      where: { id: profileAnalysis.scrapedDataId },
    });

    if (!scrapedData) {
      throw new NotFoundException('Datos scrapeados no encontrados');
    }

    return scrapedData.analysisResult;
  }

  /**
   * Obtener datos filtrados
   */
  async getFilteredData(profileAnalysisId: string): Promise<any> {
    const profileAnalysis = await this.findById(profileAnalysisId);

    if (!profileAnalysis.filteredData) {
      throw new NotFoundException('No hay datos filtrados. Ejecuta el filtrado primero.');
    }

    return profileAnalysis.filteredData;
  }

  /**
   * Guardar datos filtrados
   */
  async saveFilteredData(
    profileAnalysisId: string,
    filteredData: any,
    preliminaryInsights: any
  ): Promise<ProfileAnalysis> {
    return this.update(profileAnalysisId, {
      filteredData,
      preliminaryInsights,
      status: ProfileAnalysisStatus.FILTERED,
    });
  }

  /**
   * Eliminar análisis
   */
  async delete(id: string, userId: string): Promise<void> {
    const profileAnalysis = await this.findById(id, userId);
    await this.profileAnalysisRepository.remove(profileAnalysis);
    this.logger.log(`ProfileAnalysis eliminado: ${id}`);
  }

  /**
   * Obtener estadísticas del usuario
   */
  async getUserStats(userId: string) {
    const total = await this.profileAnalysisRepository.count({ where: { userId } });
    const completed = await this.profileAnalysisRepository.count({
      where: { userId, status: ProfileAnalysisStatus.COMPLETED },
    });
    const inProgress = await this.profileAnalysisRepository.count({
      where: { userId, status: ProfileAnalysisStatus.ANALYZING },
    });
    const failed = await this.profileAnalysisRepository.count({
      where: { userId, status: ProfileAnalysisStatus.FAILED },
    });

    return {
      total,
      completed,
      inProgress,
      failed,
    };
  }
}
