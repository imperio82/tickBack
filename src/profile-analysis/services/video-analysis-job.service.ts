import { Injectable, NotFoundException, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VideoAnalysisJob, VideoAnalysisJobStatus } from '../entities/video-analysis-job.entity';

// Interfaces exportadas para reutilización
export interface VideoDownloadedData {
  videoId: string;
  videoUrl: string;
  gcsUrl: string;
  gcsPath: string;
  fileName: string;
  downloadedAt?: Date;
}

export interface VideoData {
  id: string;
  texto: string;
  vistas: number;
  likes: number;
  hashtags: string[];
  metricas: Record<string, unknown>;
}

export interface VideoAnalysisData {
  labels: unknown[];
  speechTranscriptions: unknown[];
  shotChanges: unknown[];
  processingTime: number;
}

export interface VideoAnalysisResult {
  videoId: string;
  videoData: VideoData;
  videoAnalysis: VideoAnalysisData;
  analyzedAt?: Date;
}

export interface GeminiUsage {
  promptTokenCount: number;
  candidatesTokenCount: number;
  totalTokenCount: number;
}

export interface ParsedInsights {
  resumenGeneral: string;
  patronesIdentificados: string[];
  recomendaciones: string[];
  oportunidadesContenido: Array<Record<string, unknown>>;
  analisisPorVideo: Array<Record<string, unknown>>;
}

export interface GeminiInsights {
  rawResponse: string;
  parsedInsights?: ParsedInsights;
  usage?: GeminiUsage;
  generatedAt?: Date;
}

export interface ProcessingMetadata {
  videosToProcess: number;
  videosProcessed: number;
  videosFailed: number;
  totalDownloadTime?: number;
  totalAnalysisTime?: number;
  totalGeminiTime?: number;
  estimatedCost?: number;
  insightsVariantes?: InsightsVariant[];
  totalVariantes?: number;
}

export interface InsightsVariant {
  nombre: string;
  enfoque: string;
  temperature: number;
  insights: {
    rawResponse: string;
    parsedInsights?: ParsedInsights;
    usage?: GeminiUsage;
  };
  generatedAt: Date;
}

export interface JobUpdateData {
  status?: VideoAnalysisJobStatus;
  progress?: number;
  currentStep?: string;
  videosDownloaded?: VideoDownloadedData[];
  videoAnalysisResults?: VideoAnalysisResult[];
  geminiInsights?: GeminiInsights;
  errorMessage?: string;
  processingMetadata?: ProcessingMetadata;
  startedAt?: Date;
  completedAt?: Date;
}

@Injectable()
export class VideoAnalysisJobService {
  private readonly logger = new Logger(VideoAnalysisJobService.name);

  constructor(
    @InjectRepository(VideoAnalysisJob)
    private readonly videoAnalysisJobRepository: Repository<VideoAnalysisJob>,
  ) {}

  /**
   * Crear un nuevo job de análisis
   */
  async create(data: {
    profileAnalysisId: string;
    userId: string;
    selectedVideoIds: string[];
  }): Promise<VideoAnalysisJob> {
    try {
      const job = this.videoAnalysisJobRepository.create({
        profileAnalysisId: data.profileAnalysisId,
        userId: data.userId,
        selectedVideoIds: data.selectedVideoIds,
        status: VideoAnalysisJobStatus.QUEUED,
        progress: 0,
        processingMetadata: {
          videosToProcess: data.selectedVideoIds.length,
          videosProcessed: 0,
          videosFailed: 0,
        },
      });

      const saved = await this.videoAnalysisJobRepository.save(job);
      this.logger.log(`VideoAnalysisJob creado: ${saved.id} - Videos: ${data.selectedVideoIds.length}`);
      return saved;
    } catch (error) {
      this.logger.error('Error creando VideoAnalysisJob:', error);
      throw new HttpException(
        'Error al crear el job de análisis',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Buscar por ID
   */
  async findById(id: string): Promise<VideoAnalysisJob> {
    const job = await this.videoAnalysisJobRepository.findOne({
      where: { id },
      relations: ['profileAnalysis'],
    });

    if (!job) {
      throw new NotFoundException(`VideoAnalysisJob con ID ${id} no encontrado`);
    }

    return job;
  }

  /**
   * Buscar por ProfileAnalysisId
   */
  async findByProfileAnalysisId(profileAnalysisId: string): Promise<VideoAnalysisJob[]> {
    return this.videoAnalysisJobRepository.find({
      where: { profileAnalysisId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Obtener el último job de un perfil
   */
  async getLatestJob(profileAnalysisId: string): Promise<VideoAnalysisJob | null> {
    const jobs = await this.findByProfileAnalysisId(profileAnalysisId);
    return jobs[0] || null;
  }

  /**
   * Buscar por usuario
   */
  async findByUserId(userId: string, limit: number = 20): Promise<VideoAnalysisJob[]> {
    return this.videoAnalysisJobRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
      relations: ['profileAnalysis'],
    });
  }

  /**
   * Actualizar job
   */
  async update(
    id: string,
    data: Partial<JobUpdateData>
  ): Promise<VideoAnalysisJob> {
    try {
      const job = await this.findById(id);

      Object.assign(job, data);

      const updated = await this.videoAnalysisJobRepository.save(job);
      this.logger.log(`VideoAnalysisJob actualizado: ${updated.id} - Progress: ${updated.progress}%`);
      return updated;
    } catch (error) {
      this.logger.error(`Error actualizando VideoAnalysisJob ${id}:`, error);
      throw error;
    }
  }

  /**
   * Actualizar status
   */
  async updateStatus(
    id: string,
    status: VideoAnalysisJobStatus,
    currentStep?: string,
    errorMessage?: string
  ): Promise<VideoAnalysisJob> {
    const updateData: Partial<JobUpdateData> = { status };

    if (currentStep) {
      updateData.currentStep = currentStep;
    }

    if (errorMessage) {
      updateData.errorMessage = errorMessage;
    }

    if (status === VideoAnalysisJobStatus.QUEUED) {
      updateData.startedAt = new Date();
    }

    if (status === VideoAnalysisJobStatus.COMPLETED || status === VideoAnalysisJobStatus.FAILED) {
      updateData.completedAt = new Date();
      updateData.progress = status === VideoAnalysisJobStatus.COMPLETED ? 100 : updateData.progress;
    }

    return this.update(id, updateData);
  }

  /**
   * Actualizar progreso
   */
  async updateProgress(id: string, progress: number, currentStep?: string): Promise<VideoAnalysisJob> {
    const updateData: Partial<JobUpdateData> = { progress: Math.min(100, Math.max(0, progress)) };

    if (currentStep) {
      updateData.currentStep = currentStep;
    }

    return this.update(id, updateData);
  }

  /**
   * Agregar video descargado
   */
  async addDownloadedVideo(
    id: string,
    videoData: Omit<VideoDownloadedData, 'downloadedAt'>
  ): Promise<VideoAnalysisJob> {
    const job = await this.findById(id);

    const videosDownloaded = job.videosDownloaded || [];
    videosDownloaded.push({
      ...videoData,
      downloadedAt: new Date(),
    });

    return this.update(id, { videosDownloaded });
  }

  /**
   * Agregar resultado de análisis de video
   */
  async addVideoAnalysisResult(
    id: string,
    analysisResult: Omit<VideoAnalysisResult, 'analyzedAt'>
  ): Promise<VideoAnalysisJob> {
    const job = await this.findById(id);

    const videoAnalysisResults = job.videoAnalysisResults || [];
    videoAnalysisResults.push({
      ...analysisResult,
      analyzedAt: new Date(),
    });

    // Actualizar metadata
    const processingMetadata = job.processingMetadata || {
      videosToProcess: job.selectedVideoIds.length,
      videosProcessed: 0,
      videosFailed: 0,
    };
    processingMetadata.videosProcessed = videoAnalysisResults.length;

    // Calcular progreso (70% para análisis de videos, 30% para Gemini)
    const progress = Math.floor((videoAnalysisResults.length / job.selectedVideoIds.length) * 70);

    return this.update(id, {
      videoAnalysisResults,
      processingMetadata,
      progress,
    });
  }

  /**
   * Guardar insights de Gemini
   */
  async saveGeminiInsights(
    id: string,
    geminiInsights: Omit<GeminiInsights, 'generatedAt'>
  ): Promise<VideoAnalysisJob> {
    return this.update(id, {
      geminiInsights: {
        ...geminiInsights,
        generatedAt: new Date(),
      },
      progress: 100,
      status: VideoAnalysisJobStatus.COMPLETED,
      completedAt: new Date(),
    });
  }

  /**
   * Guardar insights de Gemini como variante (sin sobrescribir el principal)
   */
  async saveGeminiInsightsVariant(
    id: string,
    geminiInsights: Omit<GeminiInsights, 'generatedAt'> & {
      enfoque?: string;
      temperature?: number;
    },
    nombreVariante: string
  ): Promise<VideoAnalysisJob> {
    const job = await this.findById(id);

    // Inicializar array de variantes si no existe
    const variantes: InsightsVariant[] = job.processingMetadata?.insightsVariantes || [];

    // Agregar nueva variante
    variantes.push({
      nombre: nombreVariante,
      enfoque: geminiInsights.enfoque || 'analitico',
      temperature: geminiInsights.temperature || 0.7,
      insights: {
        rawResponse: geminiInsights.rawResponse,
        parsedInsights: geminiInsights.parsedInsights,
        usage: geminiInsights.usage,
      },
      generatedAt: new Date(),
    });

    // Actualizar processingMetadata con las variantes
    const processingMetadata = {
      ...job.processingMetadata,
      insightsVariantes: variantes,
      totalVariantes: variantes.length,
    };

    // Si no hay insights principales aún, usar esta variante como principal
    const geminiInsightsUpdate = job.geminiInsights
      ? job.geminiInsights
      : {
          ...geminiInsights,
          generatedAt: new Date(),
        };

    return this.update(id, {
      geminiInsights: geminiInsightsUpdate,
      processingMetadata,
      progress: 100,
      status: VideoAnalysisJobStatus.COMPLETED,
      completedAt: new Date(),
    });
  }

  /**
   * Marcar video como fallido
   */
  async markVideoFailed(id: string, videoId: string, error: string): Promise<VideoAnalysisJob> {
    const job = await this.findById(id);

    const processingMetadata = job.processingMetadata || {
      videosToProcess: job.selectedVideoIds.length,
      videosProcessed: 0,
      videosFailed: 0,
    };
    processingMetadata.videosFailed = (processingMetadata.videosFailed || 0) + 1;

    this.logger.warn(`Video ${videoId} falló en job ${id}: ${error}`);

    return this.update(id, { processingMetadata });
  }

  /**
   * Eliminar job
   */
  async delete(id: string): Promise<void> {
    const job = await this.findById(id);
    await this.videoAnalysisJobRepository.remove(job);
    this.logger.log(`VideoAnalysisJob eliminado: ${id}`);
  }

  /**
   * Obtener jobs en cola o procesando
   */
  async getActiveJobs(): Promise<VideoAnalysisJob[]> {
    return this.videoAnalysisJobRepository.find({
      where: [
        { status: VideoAnalysisJobStatus.QUEUED },
        { status: VideoAnalysisJobStatus.DOWNLOADING },
        { status: VideoAnalysisJobStatus.ANALYZING_VIDEOS },
        { status: VideoAnalysisJobStatus.GENERATING_INSIGHTS },
      ],
      order: { createdAt: 'ASC' },
    });
  }
}
