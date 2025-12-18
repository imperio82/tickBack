import { Injectable, Logger } from '@nestjs/common';
import { ProfileAnalysisService } from '../services/profile-analysis.service';
import { VideoAnalysisJobService } from '../services/video-analysis-job.service';
import { VideoDownloaderService } from '../../apify/downloaderVideo/downloadFile';
import { GoogleVideoIntelligenceService } from '../../googleAi/google-video-intelligence.service';
import { GoogleAIService } from '../../googleAi/iaLenguageGeneta';
import { prompsSystem } from '../../googleAi/util/promps';
import { VideoAnalysisJobStatus } from '../entities/video-analysis-job.entity';
import { ProfileAnalysisStatus } from '../entities/profile-analysis.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VideoAnalysisCache } from '../../competitor-analysis/entities/video-analysis-cache.entity';

/**
 * Processor para análisis de videos
 * Este servicio procesa jobs de análisis de videos de forma asíncrona
 */
@Injectable()
export class VideoAnalysisProcessor {
  private readonly logger = new Logger(VideoAnalysisProcessor.name);

  constructor(
    private readonly profileAnalysisService: ProfileAnalysisService,
    private readonly videoAnalysisJobService: VideoAnalysisJobService,
    private readonly videoDownloaderService: VideoDownloaderService,
    private readonly googleVideoService: GoogleVideoIntelligenceService,
    private readonly googleAIService: GoogleAIService,
    @InjectRepository(VideoAnalysisCache)
    private readonly videoAnalysisCacheRepository: Repository<VideoAnalysisCache>,
  ) {}

  /**
   * Procesar job de análisis de videos
   * Este es el método principal que orquesta todo el flujo
   */
  async processVideoAnalysisJob(jobId: string): Promise<void> {
    this.logger.log(`[Job ${jobId}] Iniciando procesamiento`);

    try {
      // 1. Obtener el job
      const job = await this.videoAnalysisJobService.findById(jobId);
      const profileAnalysis = await this.profileAnalysisService.findById(job.profileAnalysisId);

      // 2. Actualizar status a processing
      await this.videoAnalysisJobService.updateStatus(
        jobId,
        VideoAnalysisJobStatus.DOWNLOADING,
        'Iniciando descarga de videos',
      );

      // 3. Obtener datos de los videos filtrados
      const videosData = this.getSelectedVideosData(
        profileAnalysis.filteredData,
        job.selectedVideoIds
      );

      this.logger.log(`[Job ${jobId}] Videos a procesar: ${videosData.length}`);

      // 4. Procesar cada video
      const videoAnalysisResults: any[] = [];
      const videosDownloaded: any[] = [];

      for (let i = 0; i < videosData.length; i++) {
        const videoData = videosData[i];
        const videoId = videoData.id;

        try {
          this.logger.log(
            `[Job ${jobId}] Procesando video ${i + 1}/${videosData.length}: ${videoId}`
          );

          // 4.1. Verificar si ya está en caché
          const cached = await this.checkVideoCache(videoId);
          if (cached) {
            this.logger.log(`[Job ${jobId}] Video ${videoId} encontrado en caché`);

            // Normalizar estructura del caché al formato esperado
            const normalizedAnalysis = {
              labels: cached.aiAnalysis.labels || [],
              speechTranscriptions: cached.aiAnalysis.transcript
                ? [{ alternatives: [{ transcript: cached.aiAnalysis.transcript }] }]
                : [],
              shotChanges: Array.from({ length: cached.aiAnalysis.shotChanges || 0 }),
              processingTime: 0,
            };

            videoAnalysisResults.push({
              videoId,
              videoData,
              videoAnalysis: normalizedAnalysis,
              analyzedAt: new Date(),
              fromCache: true,
            });

            // Actualizar progreso
            const progress = Math.floor(((i + 1) / videosData.length) * 70);
            await this.videoAnalysisJobService.updateProgress(
              jobId,
              progress,
              `Procesado ${i + 1}/${videosData.length} videos (desde caché)`
            );

            continue;
          }

          // 4.2. Descargar video
          await this.videoAnalysisJobService.updateProgress(
            jobId,
            Math.floor((i / videosData.length) * 70),
            `Descargando video ${i + 1}/${videosData.length}`
          );

          const videoUrl = videoData.multimedia?.webVideoUrl;
          if (!videoUrl) {
            throw new Error(`Video ${videoId} no tiene URL`);
          }

          this.logger.log(`[Job ${jobId}] Descargando video: ${videoUrl}`);

          const downloadResult = await this.videoDownloaderService.downloadVideo(videoUrl, {
            fileName: `${videoId}.mp4`,
            quality: 'worst', // Usar la menor calidad para ahorrar tiempo y costos
            onProgress: (progress) => {
              this.logger.debug(
                `[Job ${jobId}] Descarga progreso: ${progress.percent.toFixed(1)}%`
              );
            },
          });

          // Guardar info de descarga
          videosDownloaded.push({
            videoId,
            videoUrl,
            gcsUrl: downloadResult.publicUrl,
            gcsPath: downloadResult.gcsPath,
            fileName: downloadResult.fileName,
            downloadedAt: new Date(),
          });

          await this.videoAnalysisJobService.addDownloadedVideo(jobId, {
            videoId,
            videoUrl,
            gcsUrl: downloadResult.publicUrl,
            gcsPath: downloadResult.gcsPath,
            fileName: downloadResult.fileName,
          });

          this.logger.log(`[Job ${jobId}] Video descargado: ${downloadResult.gcsPath}`);

          // 4.3. Analizar video con Google Video Intelligence
          await this.videoAnalysisJobService.updateStatus(
            jobId,
            VideoAnalysisJobStatus.ANALYZING_VIDEOS,
            `Analizando video ${i + 1}/${videosData.length}`
          );

          this.logger.log(
            `[Job ${jobId}] Analizando video con Google Video Intelligence: ${downloadResult.gcsPath}`
          );

          const videoAnalysis = await this.googleVideoService.analyzeVideo({
            videoUrl: downloadResult.gcsPath, // gs://bucket/filename
          });

          this.logger.log(
            `[Job ${jobId}] Análisis completado - Labels: ${videoAnalysis.labels.length}, Transcripciones: ${videoAnalysis.speechTranscriptions.length}`
          );

          // 4.4. Guardar en caché
          await this.saveToCache(videoId, videoData, videoAnalysis);

          // 4.5. Guardar resultado
          videoAnalysisResults.push({
            videoId,
            videoData: {
              id: videoData.id,
              texto: videoData.texto,
              vistas: videoData.vistas,
              likes: videoData.likes,
              comentarios: videoData.comentarios,
              compartidos: videoData.compartidos,
              hashtags: videoData.hashtags,
              metricas: videoData.metricas,
              autor: videoData.autor,
            },
            videoAnalysis: {
              labels: videoAnalysis.labels,
              speechTranscriptions: videoAnalysis.speechTranscriptions,
              shotChanges: videoAnalysis.shotChanges,
              processingTime: videoAnalysis.processingTime,
            },
            analyzedAt: new Date(),
            fromCache: false,
          });

          // Actualizar job con resultado
          await this.videoAnalysisJobService.addVideoAnalysisResult(jobId, {
            videoId,
            videoData,
            videoAnalysis,
          });

          // Actualizar progreso (70% para análisis de videos)
          const progress = Math.floor(((i + 1) / videosData.length) * 70);
          await this.videoAnalysisJobService.updateProgress(
            jobId,
            progress,
            `Procesado ${i + 1}/${videosData.length} videos`
          );

          this.logger.log(`[Job ${jobId}] Video ${videoId} procesado exitosamente`);
        } catch (error) {
          this.logger.error(`[Job ${jobId}] Error procesando video ${videoId}:`, error);

          // Marcar como fallido pero continuar con los demás
          await this.videoAnalysisJobService.markVideoFailed(jobId, videoId, error.message);

          // Opcional: si falla más del 50%, cancelar el job
          const job = await this.videoAnalysisJobService.findById(jobId);
          const failureRate =
            (job.processingMetadata?.videosFailed || 0) / job.selectedVideoIds.length;

          if (failureRate > 0.5) {
            throw new Error(
              `Más del 50% de los videos fallaron. Cancelando análisis.`
            );
          }
        }
      }

      // 5. Generar insights con Gemini
      this.logger.log(`[Job ${jobId}] Generando insights con Gemini...`);

      await this.videoAnalysisJobService.updateStatus(
        jobId,
        VideoAnalysisJobStatus.GENERATING_INSIGHTS,
        'Generando insights con Gemini IA'
      );

      await this.videoAnalysisJobService.updateProgress(jobId, 75, 'Generando insights con IA');

      const geminiInsights = await this.generateGeminiInsights(
        jobId,
        profileAnalysis.filteredData,
        videoAnalysisResults
      );

      // 6. Guardar insights finales
      await this.videoAnalysisJobService.saveGeminiInsights(jobId, geminiInsights);

      // 7. Actualizar ProfileAnalysis como completado
      await this.profileAnalysisService.updateStatus(
        job.profileAnalysisId,
        ProfileAnalysisStatus.COMPLETED
      );

      this.logger.log(`[Job ${jobId}] ✅ Análisis completado exitosamente`);
    } catch (error) {
      this.logger.error(`[Job ${jobId}] ❌ Error en el procesamiento:`, error);

      // Marcar job como fallido
      await this.videoAnalysisJobService.updateStatus(
        jobId,
        VideoAnalysisJobStatus.FAILED,
        undefined,
        error.message
      );

      // Marcar ProfileAnalysis como fallido
      const job = await this.videoAnalysisJobService.findById(jobId);
      await this.profileAnalysisService.updateStatus(
        job.profileAnalysisId,
        ProfileAnalysisStatus.FAILED,
        error.message
      );

      throw error;
    }
  }

  /**
   * Obtener datos de videos seleccionados
   */
  private getSelectedVideosData(filteredData: any, selectedVideoIds: string[]): any[] {
    if (!filteredData || !filteredData.top5EngagementOptimo) {
      return [];
    }

    const allVideos = filteredData.top5EngagementOptimo.videosCompletos || [];

    return allVideos.filter((video) => selectedVideoIds.includes(video.id));
  }

  /**
   * Verificar si el video ya está en caché
   */
  private async checkVideoCache(videoId: string): Promise<VideoAnalysisCache | null> {
    try {
      const cached = await this.videoAnalysisCacheRepository.findOne({
        where: { videoId },
      });

      if (cached) {
        // Actualizar lastUsed
        cached.lastUsed = new Date();
        await this.videoAnalysisCacheRepository.save(cached);
      }

      return cached;
    } catch (error) {
      this.logger.warn(`Error checking cache for video ${videoId}:`, error);
      return null;
    }
  }

  /**
   * Guardar análisis en caché
   */
  private async saveToCache(videoId: string, videoData: any, videoAnalysis: any): Promise<void> {
    try {
      // Verificar si ya existe
      const existing = await this.videoAnalysisCacheRepository.findOne({
        where: { videoId },
      });

      if (existing) {
        // Actualizar
        existing.aiAnalysis = {
          topics: videoAnalysis.labels.map((l) => l.entity),
          transcript: videoAnalysis.speechTranscriptions
            .map((t) => t.alternatives?.[0]?.transcript || '')
            .join(' '),
          labels: videoAnalysis.labels,
          shotChanges: videoAnalysis.shotChanges.length,
        };
        existing.lastUsed = new Date();
        await this.videoAnalysisCacheRepository.save(existing);
      } else {
        // Crear nuevo
        const cacheEntry = this.videoAnalysisCacheRepository.create({
          videoId,
          videoUrl: videoData.multimedia?.webVideoUrl || '',
          profile: videoData.autor?.nombre || '',
          metadata: {
            description: videoData.texto || '',
            hashtags: videoData.hashtags || [],
            musicTitle: videoData.multimedia?.musica?.nombre || '',
            duration: videoData.duracion || 0,
            uploadDate: videoData.fecha || '',
          },
          metrics: {
            views: videoData.vistas || 0,
            likes: videoData.likes || 0,
            comments: videoData.comentarios || 0,
            shares: videoData.compartidos || 0,
            engagementRate: parseFloat(videoData.metricas?.tasaEngagement || '0'),
          },
          aiAnalysis: {
            topics: videoAnalysis.labels.map((l) => l.entity),
            transcript: videoAnalysis.speechTranscriptions
              .map((t) => t.alternatives?.[0]?.transcript || '')
              .join(' '),
            labels: videoAnalysis.labels,
            shotChanges: videoAnalysis.shotChanges.length,
          },
        });

        await this.videoAnalysisCacheRepository.save(cacheEntry);
      }

      this.logger.log(`Video ${videoId} guardado en caché`);
    } catch (error) {
      this.logger.error(`Error saving to cache for video ${videoId}:`, error);
      // No lanzar error, el análisis puede continuar sin caché
    }
  }

  /**
   * Generar insights con Gemini
   */
  private async generateGeminiInsights(
    jobId: string,
    filteredData: any,
    videoAnalysisResults: any[],
    options?: {
      temperature?: number;
      enfoque?: string;
      numeroIdeas?: number;
    }
  ): Promise<any> {
    try {
      const opts = {
        temperature: options?.temperature ?? 0.7,
        enfoque: options?.enfoque ?? 'analitico',
        numeroIdeas: options?.numeroIdeas ?? 3,
      };

      this.logger.log(`[Job ${jobId}] Preparando prompt para Gemini (${opts.enfoque})...`);

      // Construir prompt comprehensivo con enfoque específico
      const prompt = this.buildGeminiPrompt(
        filteredData,
        videoAnalysisResults,
        opts.enfoque,
        opts.numeroIdeas
      );

      this.logger.log(
        `[Job ${jobId}] Enviando ${prompt.length} caracteres a Gemini Pro...`
      );

      // Llamar a Gemini con temperatura personalizada
      const response = await this.googleAIService.generateText({
        prompt,
        systemInstruction: this.getSystemInstructionByEnfoque(opts.enfoque),
        model: 'gemini-flash-latest', // Modelo más económico con mayor cuota
        temperature: opts.temperature,
        maxOutputTokens: 4096,
      });

      this.logger.log(
        `[Job ${jobId}] Respuesta de Gemini recibida - Tokens: ${response.usage?.totalTokenCount || 'N/A'}`
      );

      // Intentar parsear la respuesta si está en JSON
      let parsedInsights;
      try {
        parsedInsights = JSON.parse(response.text);
      } catch {
        // Si no es JSON, dejar como texto
        parsedInsights = null;
      }

      return {
        rawResponse: response.text,
        parsedInsights,
        usage: response.usage,
        generatedAt: new Date(),
        enfoque: opts.enfoque,
        temperature: opts.temperature,
      };
    } catch (error) {
      this.logger.error(`[Job ${jobId}] Error generando insights con Gemini:`, error);
      throw error;
    }
  }

  /**
   * Obtener instrucciones del sistema según el enfoque
   */
  private getSystemInstructionByEnfoque(enfoque: string): string {
    const instrucciones = {
      creativo: `${prompsSystem}\n\nENFOQUE CREATIVO: Genera ideas innovadoras, atrevidas y originales. Prioriza la creatividad y el impacto visual. Sugiere tendencias emergentes y formatos únicos que puedan destacar.`,

      conservador: `${prompsSystem}\n\nENFOQUE CONSERVADOR: Genera recomendaciones probadas y de bajo riesgo. Prioriza estrategias que han funcionado consistentemente. Enfócate en mejoras incrementales y contenido evergreen.`,

      analitico: `${prompsSystem}\n\nENFOQUE ANALÍTICO: Genera insights basados en datos. Prioriza métricas, patrones estadísticos y evidencia cuantitativa. Proporciona análisis profundo con justificaciones numéricas.`,

      viral: `${prompsSystem}\n\nENFOQUE VIRAL: Genera ideas con alto potencial de viralidad. Prioriza elementos que maximicen el engagement, shares y alcance. Enfócate en tendencias actuales, hooks emocionales y formatos compartibles.`,

      educativo: `${prompsSystem}\n\nENFOQUE EDUCATIVO: Genera contenido educativo y de valor. Prioriza la claridad, utilidad y aprendizaje del usuario. Enfócate en tutoriales, tips prácticos y contenido instructivo.`,
    };

    return instrucciones[enfoque] || prompsSystem;
  }

  /**
   * Construir prompt para Gemini
   */
  private buildGeminiPrompt(
    filteredData: any,
    videoAnalysisResults: any[],
    enfoque: string = 'analitico',
    numeroIdeas: number = 3
  ): string {
    return `
# ANÁLISIS COMPLETO DE PERFIL DE TIKTOK

## 1. DATOS FILTRADOS DEL PERFIL

### Resumen General
- Total de videos analizados: ${filteredData.resumen?.totalVideos || 0}
- Videos con likes: ${filteredData.resumen?.videosConLikes || 0}
- Videos con comentarios: ${filteredData.resumen?.videosConComentarios || 0}
- Videos con shares: ${filteredData.resumen?.videosConShares || 0}

### Estadísticas Generales
${JSON.stringify(filteredData.estadisticasGenerales, null, 2)}

### Análisis de Contenido
${JSON.stringify(filteredData.analisisContenido, null, 2)}

## 2. ANÁLISIS DETALLADO DE VIDEOS CON GOOGLE AI

Total de videos analizados con IA: ${videoAnalysisResults.length}

${videoAnalysisResults
  .map(
    (result, index) => `
### Video ${index + 1}: ${result.videoData.id}

**Métricas:**
- Vistas: ${result.videoData.vistas}
- Likes: ${result.videoData.likes}
- Comentarios: ${result.videoData.comentarios}
- Compartidos: ${result.videoData.compartidos}
- Engagement Rate: ${result.videoData.metricas?.tasaEngagement}%

**Descripción:** ${result.videoData.texto}

**Hashtags:** ${result.videoData.hashtags?.join(', ') || 'N/A'}

**Análisis de Google AI:**
- Labels detectados: ${result.videoAnalysis?.labels?.map((l) => l.entity).join(', ') || 'N/A'}
- Transcripción: ${
      result.videoAnalysis?.speechTranscriptions
        ?.map((t) => t.alternatives?.[0]?.transcript || '')
        .filter(Boolean)
        .join(' ')
        .substring(0, 200) || 'N/A'
    }...
- Cambios de escena: ${result.videoAnalysis?.shotChanges?.length || 0}

`
  )
  .join('\n')}

## 3. TU TAREA

Por favor, analiza toda esta información y proporciona:

1. **Resumen General**: Un resumen conciso del perfil y su contenido
2. **Patrones Identificados**: Qué patrones de éxito encuentras en los videos más exitosos
3. **Temas Principales**: Los temas/topics más recurrentes y efectivos
4. **Análisis de Engagement**: Qué factores contribuyen al mayor engagement
5. **Recomendaciones Específicas**: Al menos 5 recomendaciones accionables para mejorar el contenido (enfoque: ${enfoque})
6. **Ideas de Contenido**: Exactamente ${numeroIdeas} ideas específicas de videos con:
   - Título sugerido
   - Concepto/descripción
   - Hashtags recomendados
   - Por qué funcionaría (basado en los datos)
7. **Estrategia de Hashtags**: Los hashtags más efectivos a usar
8. **Estrategia Musical**: Recomendaciones sobre el uso de música
9. **Formato Óptimo**: Duración, estilo, y formato de video recomendado

**IMPORTANTE:** Responde en formato JSON con la siguiente estructura:

\`\`\`json
{
  "resumenGeneral": "...",
  "patronesIdentificados": ["...", "..."],
  "temasprincipales": [
    {"tema": "...", "frecuencia": X, "avgEngagement": X}
  ],
  "analisisEngagement": {
    "factoresClave": ["...", "..."],
    "recomendaciones": ["...", "..."]
  },
  "recomendaciones": ["...", "...", "..."],
  "ideasContenido": [
    {
      "titulo": "...",
      "concepto": "...",
      "hashtags": ["...", "..."],
      "razonamiento": "..."
    }
  ],
  "estrategiaHashtags": {
    "topHashtags": ["...", "..."],
    "evitar": ["...", "..."]
  },
  "estrategiaMusical": {
    "recomendacion": "...",
    "tiposMusica": ["...", "..."]
  },
  "formatoOptimo": {
    "duracion": "...",
    "estilo": "...",
    "elementos": ["...", "..."]
  }
}
\`\`\`
`;
  }

  /**
   * Regenerar solo los insights de Gemini sin volver a procesar videos
   * Útil cuando el análisis de Gemini falló o se quiere regenerar con nuevos parámetros
   *
   * @param jobId - ID del job de análisis
   * @param options - Opciones para personalizar la regeneración
   */
  async regenerateGeminiInsights(
    jobId: string,
    options?: {
      temperature?: number;
      enfoque?: 'creativo' | 'conservador' | 'analitico' | 'viral' | 'educativo';
      numeroIdeas?: number;
      guardarVariante?: boolean;
      nombreVariante?: string;
    }
  ): Promise<any> {
    const opts = {
      temperature: options?.temperature ?? 0.7,
      enfoque: options?.enfoque ?? 'analitico',
      numeroIdeas: options?.numeroIdeas ?? 3,
      guardarVariante: options?.guardarVariante ?? true,
      nombreVariante: options?.nombreVariante ?? `Variante ${new Date().toISOString()}`,
    };

    this.logger.log(
      `[Job ${jobId}] 🔄 Regenerando insights de Gemini (${opts.enfoque}, temp: ${opts.temperature})...`
    );

    try {
      // 1. Obtener el job
      const job = await this.videoAnalysisJobService.findById(jobId);

      // 2. Validar que el job tiene resultados de análisis de videos
      if (!job.videoAnalysisResults || job.videoAnalysisResults.length === 0) {
        throw new Error(
          'No hay análisis de videos disponibles. Debes ejecutar el análisis de videos primero.'
        );
      }

      // 3. Obtener ProfileAnalysis para tener los datos filtrados
      const profileAnalysis = await this.profileAnalysisService.findById(job.profileAnalysisId);

      if (!profileAnalysis.filteredData) {
        throw new Error('No hay datos filtrados disponibles.');
      }

      // 4. Actualizar status
      await this.videoAnalysisJobService.updateStatus(
        jobId,
        VideoAnalysisJobStatus.GENERATING_INSIGHTS,
        `Regenerando insights con Gemini IA (${opts.enfoque})`
      );

      await this.videoAnalysisJobService.updateProgress(jobId, 80, 'Regenerando insights con IA');

      this.logger.log(
        `[Job ${jobId}] Usando ${job.videoAnalysisResults.length} análisis de videos existentes`
      );

      // 5. Generar insights con Gemini con opciones personalizadas
      const geminiInsights = await this.generateGeminiInsights(
        jobId,
        profileAnalysis.filteredData,
        job.videoAnalysisResults,
        {
          temperature: opts.temperature,
          enfoque: opts.enfoque,
          numeroIdeas: opts.numeroIdeas,
        }
      );

      // 6. Guardar insights finales
      if (opts.guardarVariante) {
        // Guardar como variante sin sobrescribir
        await this.videoAnalysisJobService.saveGeminiInsightsVariant(
          jobId,
          geminiInsights,
          opts.nombreVariante
        );
      } else {
        // Sobrescribir insights principales
        await this.videoAnalysisJobService.saveGeminiInsights(jobId, geminiInsights);
      }

      // 7. Actualizar ProfileAnalysis como completado
      await this.profileAnalysisService.updateStatus(
        job.profileAnalysisId,
        ProfileAnalysisStatus.COMPLETED
      );

      this.logger.log(
        `[Job ${jobId}] ✅ Insights regenerados exitosamente (${opts.guardarVariante ? 'guardado como variante' : 'sobrescrito'})`
      );

      return geminiInsights;
    } catch (error) {
      this.logger.error(`[Job ${jobId}] ❌ Error regenerando insights:`, error);

      // Marcar job como fallido
      await this.videoAnalysisJobService.updateStatus(
        jobId,
        VideoAnalysisJobStatus.FAILED,
        undefined,
        error.message
      );

      throw error;
    }
  }

  /**
   * Método público para ejecutar el procesamiento
   * Se puede llamar desde un endpoint para testing o desde un sistema de colas
   */
  async processJob(jobId: string): Promise<void> {
    return this.processVideoAnalysisJob(jobId);
  }
}
