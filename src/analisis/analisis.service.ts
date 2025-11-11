import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, Between, In } from 'typeorm';
import { Analysis, VideoAnalysisData, AIAnalysisData, FilteredAnalysisData } from './analisisentity/analisis.entity';
import { CreateAnalysisDto } from './dto/analisis.dto';

// DTOs
export interface AnalisisService {
    userId: string;
    videoAnalysis: VideoAnalysisData[];
    aiAnalysis: AIAnalysisData;
    filteredAnalysis: FilteredAnalysisData;
    title?: string;
    description?: string;
}

export interface UpdateAnalysisDto {
    videoAnalysis?: VideoAnalysisData[];
    aiAnalysis?: AIAnalysisData;
    filteredAnalysis?: FilteredAnalysisData;
    title?: string;
    description?: string;
    status?: 'pending' | 'processing' | 'completed' | 'failed';
    processingMetadata?: {
        startTime?: Date;
        endTime?: Date;
        processingDuration?: number;
        errors?: string[];
        warnings?: string[];
    };
}

export interface AnalysisFilterOptions {
    userId?: string;
    status?: 'pending' | 'processing' | 'completed' | 'failed';
    dateFrom?: Date;
    dateTo?: Date;
    title?: string;
    categories?: string[];
    confidenceThreshold?: number;
    limit?: number;
    offset?: number;
}

@Injectable()
export class AnalysisService {
    constructor(
        @InjectRepository(Analysis)
        private readonly analysisRepository: Repository<Analysis>,
    ) { }

    /**
     * Crear un nuevo análisis
     */
    async createAnalysis(createAnalysisDto: CreateAnalysisDto): Promise<Analysis> {
        try {
            // optener datos guardados del scraper de la base de datos
            const analysis = this.analysisRepository.create({
                ...createAnalysisDto,
                status: 'pending',
                processingMetadata: {
                    startTime: new Date(),
                    errors: [],
                    warnings: []
                }
            });

            const savedAnalysis = await this.analysisRepository.save(analysis);

            return await this.findById(savedAnalysis.id);
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }
            console.error('Error creating analysis:', error);
            throw new InternalServerErrorException('Error al crear el análisis');
        }
    }

    /**
     * Obtener análisis por ID
     */
    async findById(id: string): Promise<Analysis> {
        try {
            const analysis = await this.analysisRepository.findOne({
                where: { id },
                relations: ['user']
            });

            if (!analysis) {
                throw new NotFoundException(`Análisis con ID ${id} no encontrado`);
            }

            return analysis;
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            console.error('Error finding analysis by ID:', error);
            throw new InternalServerErrorException('Error al buscar el análisis');
        }
    }

    /**
     * Obtener todos los análisis de un usuario
     */
    async findByUserId(userId: string, options?: AnalysisFilterOptions): Promise<Analysis[]> {
        try {
            const whereConditions: FindOptionsWhere<Analysis> = { userId };

            // Aplicar filtros opcionales
            if (options?.status) {
                whereConditions.status = options.status;
            }

            if (options?.dateFrom || options?.dateTo) {
                whereConditions.createdAt = Between(
                    options.dateFrom || new Date('1900-01-01'),
                    options.dateTo || new Date()
                );
            }

            const queryBuilder = this.analysisRepository.createQueryBuilder('analysis')
                .leftJoinAndSelect('analysis.user', 'user')
                .where(whereConditions)
                .orderBy('analysis.createdAt', 'DESC');

            // Filtrar por título si se proporciona
            if (options?.title) {
                queryBuilder.andWhere('analysis.title ILIKE :title', {
                    title: `%${options.title}%`
                });
            }

            // Filtrar por umbral de confianza
            if (options?.confidenceThreshold) {
                queryBuilder.andWhere("(analysis.aiAnalysis->>'confidence')::numeric >= :threshold", {
                    threshold: options.confidenceThreshold
                });
            }

            // Filtrar por categorías
            if (options?.categories && options.categories.length > 0) {
                queryBuilder.andWhere("analysis.aiAnalysis->'results'->>'categories' ?| array[:...categories]", {
                    categories: options.categories
                });
            }

            // Paginación
            if (options?.limit) {
                queryBuilder.limit(options.limit);
            }
            if (options?.offset) {
                queryBuilder.offset(options.offset);
            }

            return await queryBuilder.getMany();
        } catch (error) {
            console.error('Error finding analyses by user ID:', error);
            throw new InternalServerErrorException('Error al buscar los análisis del usuario');
        }
    }

    /**
     * Actualizar un análisis
     */
    async updateAnalysis(id: string, updateAnalysisDto: UpdateAnalysisDto): Promise<Analysis> {
        try {
            const existingAnalysis = await this.findById(id);

            // Actualizar metadatos de procesamiento si cambia el estado
            if (updateAnalysisDto.status) {
                const currentMetadata = existingAnalysis.processingMetadata || {};

                if (updateAnalysisDto.status === 'processing' && !currentMetadata.startTime) {
                    updateAnalysisDto.processingMetadata = {
                        ...currentMetadata,
                        startTime: new Date()
                    };
                } else if (updateAnalysisDto.status === 'completed' || updateAnalysisDto.status === 'failed') {
                    const endTime = new Date();
                    const startTime = currentMetadata.startTime || endTime;
                    const processingDuration = endTime.getTime() - startTime.getTime();

                    updateAnalysisDto.processingMetadata = {
                        ...currentMetadata,
                        endTime,
                        processingDuration
                    };
                }
            }

            await this.analysisRepository.update(id, updateAnalysisDto);
            return await this.findById(id);
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            console.error('Error updating analysis:', error);
            throw new InternalServerErrorException('Error al actualizar el análisis');
        }
    }

    /**
     * Eliminar un análisis
     */
    async deleteAnalysis(id: string): Promise<void> {
        try {
            const analysis = await this.findById(id);
            await this.analysisRepository.remove(analysis);
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            console.error('Error deleting analysis:', error);
            throw new InternalServerErrorException('Error al eliminar el análisis');
        }
    }

    /**
     * Obtener estadísticas de análisis de un usuario
     */
    async getUserAnalyticsStats(userId: string): Promise<{
        totalAnalyses: number;
        completedAnalyses: number;
        failedAnalyses: number;
        avgConfidence: number;
        totalVideosAnalyzed: number;
        mostCommonTopics: string[];
        recentAnalyses: Analysis[];
    }> {
        try {
            const analyses = await this.findByUserId(userId);

            const completedAnalyses = analyses.filter(a => a.status === 'completed');
            const failedAnalyses = analyses.filter(a => a.status === 'failed');

            const avgConfidence = completedAnalyses.length > 0
                ? completedAnalyses.reduce((sum, a) => sum + (a.aiAnalysis?.confidence || 0), 0) / completedAnalyses.length
                : 0;

            const totalVideosAnalyzed = completedAnalyses.reduce((sum, a) =>
                sum + (a.videoAnalysis?.length || 0), 0);

            // Obtener topics más comunes
            const allTopics = completedAnalyses.flatMap(a =>
                a.aiAnalysis?.results?.topics || []);
            const topicCounts = allTopics.reduce((counts, topic) => {
                counts[topic] = (counts[topic] || 0) + 1;
                return counts;
            }, {} as Record<string, number>);

            const mostCommonTopics = Object.entries(topicCounts)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)
                .map(([topic]) => topic);

            const recentAnalyses = analyses.slice(0, 5);

            return {
                totalAnalyses: analyses.length,
                completedAnalyses: completedAnalyses.length,
                failedAnalyses: failedAnalyses.length,
                avgConfidence,
                totalVideosAnalyzed,
                mostCommonTopics,
                recentAnalyses
            };
        } catch (error) {
            console.error('Error getting user analytics stats:', error);
            throw new InternalServerErrorException('Error al obtener estadísticas de análisis');
        }
    }

    /**
     * Buscar análisis por contenido de video
     */
    async searchByVideoContent(searchTerm: string, userId?: string): Promise<Analysis[]> {
        try {
            const queryBuilder = this.analysisRepository.createQueryBuilder('analysis')
                .leftJoinAndSelect('analysis.user', 'user')
                .where('analysis.status = :status', { status: 'completed' });

            if (userId) {
                queryBuilder.andWhere('analysis.userId = :userId', { userId });
            }

            // Buscar en contenido de segmentos de video
            queryBuilder.andWhere(`
        EXISTS (
          SELECT 1 
          FROM jsonb_array_elements(analysis.videoAnalysis) AS video_elem
          WHERE EXISTS (
            SELECT 1 
            FROM jsonb_array_elements(video_elem->'analyzedSegments') AS segment
            WHERE segment->>'content' ILIKE :searchTerm
          )
        )
      `, { searchTerm: `%${searchTerm}%` });

            return await queryBuilder
                .orderBy('analysis.createdAt', 'DESC')
                .getMany();
        } catch (error) {
            console.error('Error searching by video content:', error);
            throw new InternalServerErrorException('Error al buscar en el contenido de videos');
        }
    }

    /**
     * Actualizar estado de análisis
     */
    async updateAnalysisStatus(
        id: string,
        status: 'pending' | 'processing' | 'completed' | 'failed',
        error?: string
    ): Promise<Analysis> {
        try {
            const updateData: UpdateAnalysisDto = { status };

            if (error && status === 'failed') {
                const existingMetadata = (await this.findById(id)).processingMetadata || {};
                updateData.processingMetadata = {
                    ...existingMetadata,
                    errors: [...(existingMetadata.errors || []), error],
                    endTime: new Date()
                };
            }

            return await this.updateAnalysis(id, updateData);
        } catch (error) {
            console.error('Error updating analysis status:', error);
            throw new InternalServerErrorException('Error al actualizar el estado del análisis');
        }
    }

    /**
     * Validar datos de análisis
     */
    private validateAnalysisData(data: CreateAnalysisDto): void {
        if (!data.userId) {
            throw new BadRequestException('userId es requerido');
        }

        if (!data.videoAnalysis || !Array.isArray(data.videoAnalysis)) {
            throw new BadRequestException('videoAnalysis debe ser un array');
        }

        if (!data.aiAnalysis || typeof data.aiAnalysis !== 'object') {
            throw new BadRequestException('aiAnalysis es requerido');
        }

        if (!data.filteredAnalysis || typeof data.filteredAnalysis !== 'object') {
            throw new BadRequestException('filteredAnalysis es requerido');
        }

        // Validar estructura básica del aiAnalysis
        const { model, confidence, results } = data.aiAnalysis;
        if (!model || typeof confidence !== 'number' || !results) {
            throw new BadRequestException('Estructura de aiAnalysis inválida');
        }

        if (confidence < 0 || confidence > 1) {
            throw new BadRequestException('confidence debe estar entre 0 y 1');
        }
    }
}