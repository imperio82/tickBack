import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import {
  ScheduledPost,
  PostStatus,
  PostPlatform,
} from './entities/scheduled-post.entity';
import {
  ContentCalendar,
  CalendarGenerationStrategy,
} from './entities/content-calendar.entity';
import { CompetitorAnalysis } from '../competitor-analysis/entities/competitor-analysis.entity';
import { ProfileAnalysis } from '../profile-analysis/entities/profile-analysis.entity';
import {
  CreateScheduledPostDto,
  UpdateScheduledPostDto,
  GenerateCalendarDto,
  OptimalHourResponse,
  CalendarStatisticsResponse,
} from './dto/calendar.dto';

interface TimeSlot {
  hour: number;
  dayOfWeek: number;
  engagementSum: number;
  count: number;
}

@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);

  constructor(
    @InjectRepository(ScheduledPost)
    private readonly postRepo: Repository<ScheduledPost>,
    @InjectRepository(ContentCalendar)
    private readonly calendarRepo: Repository<ContentCalendar>,
    @InjectRepository(CompetitorAnalysis)
    private readonly competitorAnalysisRepo: Repository<CompetitorAnalysis>,
    @InjectRepository(ProfileAnalysis)
    private readonly profileAnalysisRepo: Repository<ProfileAnalysis>,
  ) {}

  // ============== CRUD DE POSTS ==============

  /**
   * Crear un post programado
   */
  async createPost(
    userId: string,
    dto: CreateScheduledPostDto,
  ): Promise<ScheduledPost> {
    const post = this.postRepo.create({
      userId,
      ...dto,
      status: dto.status || PostStatus.SCHEDULED,
      platform: dto.platform || PostPlatform.TIKTOK,
      sendReminder: dto.sendReminder !== false,
      reminderMinutesBefore: dto.reminderMinutesBefore || 30,
    });

    return await this.postRepo.save(post);
  }

  /**
   * Obtener posts del usuario con filtros
   */
  async getPosts(
    userId: string,
    filters?: {
      startDate?: Date;
      endDate?: Date;
      status?: PostStatus;
      platform?: PostPlatform;
    },
  ): Promise<ScheduledPost[]> {
    const where: any = { userId };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.platform) {
      where.platform = filters.platform;
    }

    if (filters?.startDate && filters?.endDate) {
      where.scheduledDate = Between(filters.startDate, filters.endDate);
    }

    return await this.postRepo.find({
      where,
      order: { scheduledDate: 'ASC' },
    });
  }

  /**
   * Obtener un post específico
   */
  async getPostById(postId: string, userId: string): Promise<ScheduledPost> {
    const post = await this.postRepo.findOne({
      where: { id: postId, userId },
    });

    if (!post) {
      throw new NotFoundException('Post no encontrado');
    }

    return post;
  }

  /**
   * Actualizar post
   */
  async updatePost(
    postId: string,
    userId: string,
    dto: UpdateScheduledPostDto,
  ): Promise<ScheduledPost> {
    const post = await this.getPostById(postId, userId);

    Object.assign(post, dto);

    return await this.postRepo.save(post);
  }

  /**
   * Eliminar post
   */
  async deletePost(postId: string, userId: string): Promise<void> {
    const post = await this.getPostById(postId, userId);
    await this.postRepo.remove(post);
  }

  /**
   * Crear múltiples posts a la vez
   */
  async bulkCreatePosts(
    userId: string,
    posts: CreateScheduledPostDto[],
  ): Promise<ScheduledPost[]> {
    const created = posts.map((dto) =>
      this.postRepo.create({
        userId,
        ...dto,
        status: dto.status || PostStatus.SCHEDULED,
        platform: dto.platform || PostPlatform.TIKTOK,
      }),
    );

    return await this.postRepo.save(created);
  }

  // ============== ANÁLISIS DE HORARIOS ÓPTIMOS ==============

  /**
   * Extrae horarios óptimos de análisis previos (Competitor + Profile Analysis)
   */
  async getOptimalHours(
    userId: string,
    analysisId?: string,
    topN: number = 10,
  ): Promise<OptimalHourResponse[]> {
    this.logger.log(`Obteniendo horarios óptimos para usuario: ${userId}`);

    // Extraer datos de horarios de los videos
    const timeSlots = new Map<string, TimeSlot>();

    if (analysisId) {
      // Buscar el análisis específico en ambas tablas
      const competitorAnalysis = await this.competitorAnalysisRepo.findOne({
        where: { id: analysisId, userId },
      });

      const profileAnalysis = await this.profileAnalysisRepo.findOne({
        where: { id: analysisId, userId },
      });

      if (!competitorAnalysis && !profileAnalysis) {
        throw new NotFoundException('Análisis no encontrado');
      }

      // Procesar el análisis encontrado
      if (competitorAnalysis) {
        this.extractTimeSlotsFromCompetitorAnalysis(competitorAnalysis, timeSlots);
      }

      if (profileAnalysis) {
        this.extractTimeSlotsFromProfileAnalysis(profileAnalysis, timeSlots);
      }
    } else {
      // Usar todos los análisis completados del usuario

      // Obtener análisis de competidores
      const competitorAnalyses = await this.competitorAnalysisRepo.find({
        where: { userId, status: 'completed' as any },
        order: { createdAt: 'DESC' },
        take: 10,
      });

      // Obtener análisis de perfiles
      const profileAnalyses = await this.profileAnalysisRepo.find({
        where: { userId, status: 'completed' as any },
        order: { createdAt: 'DESC' },
        take: 10,
      });

      if (competitorAnalyses.length === 0 && profileAnalyses.length === 0) {
        throw new BadRequestException(
          'No tienes análisis completados. Realiza al menos un análisis primero.',
        );
      }

      this.logger.log(
        `Procesando ${competitorAnalyses.length} análisis de competidores y ${profileAnalyses.length} análisis de perfiles`,
      );

      // Procesar análisis de competidores
      for (const analysis of competitorAnalyses) {
        this.extractTimeSlotsFromCompetitorAnalysis(analysis, timeSlots);
      }

      // Procesar análisis de perfiles
      for (const analysis of profileAnalyses) {
        this.extractTimeSlotsFromProfileAnalysis(analysis, timeSlots);
      }
    }

    if (timeSlots.size === 0) {
      throw new BadRequestException(
        'No se pudieron extraer horarios de publicación de los análisis. Asegúrate de que los videos tengan fecha de publicación.',
      );
    }

    // Calcular promedios y scores
    const results: OptimalHourResponse[] = [];
    let maxEngagement = 0;

    for (const slot of timeSlots.values()) {
      const avgEngagement = slot.engagementSum / slot.count;
      if (avgEngagement > maxEngagement) {
        maxEngagement = avgEngagement;
      }

      results.push({
        hour: slot.hour,
        dayOfWeek: slot.dayOfWeek,
        averageEngagement: avgEngagement,
        sampleSize: slot.count,
        score: 0, // Se calculará después
      });
    }

    // Normalizar scores (0-100)
    results.forEach((r) => {
      r.score = maxEngagement > 0 ? (r.averageEngagement / maxEngagement) * 100 : 0;
    });

    this.logger.log(`Se encontraron ${results.length} horarios únicos`);

    // Ordenar por score descendente y retornar top N
    return results.sort((a, b) => b.score - a.score).slice(0, topN);
  }

  /**
   * Extrae time slots de un análisis de competidores
   */
  private extractTimeSlotsFromCompetitorAnalysis(
    analysis: CompetitorAnalysis,
    timeSlots: Map<string, TimeSlot>,
  ): void {
    const videos = analysis.results?.videos || [];

    for (const video of videos) {
      const uploadDate = this.extractUploadDate(video);
      if (!uploadDate) continue;

      const hour = uploadDate.getHours();
      const dayOfWeek = uploadDate.getDay();
      const engagement = video.metrics?.engagementRate || 0;

      this.addToTimeSlot(timeSlots, hour, dayOfWeek, engagement);
    }
  }

  /**
   * Extrae time slots de un análisis de perfil
   */
  private extractTimeSlotsFromProfileAnalysis(
    analysis: ProfileAnalysis,
    timeSlots: Map<string, TimeSlot>,
  ): void {
    // Los videos están en filteredData.top5EngagementOptimo.videosCompletos
    const videos = analysis.filteredData?.top5EngagementOptimo?.videosCompletos || [];

    for (const video of videos) {
      if (!video.fecha) continue;

      const uploadDate = new Date(video.fecha);
      if (isNaN(uploadDate.getTime())) continue;

      const hour = uploadDate.getHours();
      const dayOfWeek = uploadDate.getDay();

      // Calcular engagement rate del video de profile analysis
      const engagement = this.calculateEngagementFromProfileVideo(video);

      this.addToTimeSlot(timeSlots, hour, dayOfWeek, engagement);
    }
  }

  /**
   * Calcula engagement rate de un video de profile analysis
   */
  private calculateEngagementFromProfileVideo(video: any): number {
    const vistas = video.vistas || 0;
    if (vistas === 0) return 0;

    const likes = video.likes || 0;
    const comentarios = video.comentarios || 0;
    const compartidos = video.compartidos || 0;
    const saves = video.saves || 0;

    const totalEngagement = likes + comentarios + compartidos + saves;
    return totalEngagement / vistas;
  }

  /**
   * Agrega o actualiza un time slot
   */
  private addToTimeSlot(
    timeSlots: Map<string, TimeSlot>,
    hour: number,
    dayOfWeek: number,
    engagement: number,
  ): void {
    const key = `${dayOfWeek}-${hour}`;
    const existing = timeSlots.get(key);

    if (existing) {
      existing.engagementSum += engagement;
      existing.count += 1;
    } else {
      timeSlots.set(key, {
        hour,
        dayOfWeek,
        engagementSum: engagement,
        count: 1,
      });
    }
  }

  /**
   * Intenta extraer fecha de publicación de un video
   */
  private extractUploadDate(video: any): Date | null {
    // Diferentes campos que pueden contener la fecha
    const dateFields = [
      video.uploadDate,
      video.createTime,
      video.createTimeISO,
      video.metadata?.uploadDate,
    ];

    for (const field of dateFields) {
      if (field) {
        const date = new Date(field);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
    }

    return null;
  }

  // ============== GENERACIÓN AUTOMÁTICA DE CALENDARIO ==============

  /**
   * Genera un calendario completo automáticamente
   */
  async generateCalendar(
    userId: string,
    dto: GenerateCalendarDto,
  ): Promise<{
    calendar: ContentCalendar;
    posts: ScheduledPost[];
  }> {
    this.logger.log(`🔹 Iniciando generación de calendario para usuario ${userId}`);
    this.logger.log(`📅 Período: ${dto.startDate} - ${dto.endDate}`);
    this.logger.log(`📊 Posts por semana: ${dto.postsPerWeek}`);
    this.logger.log(`🎯 Estrategia: ${dto.strategy}`);

    // Convertir fechas de string a Date
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    // Validar fechas
    if (startDate >= endDate) {
      throw new BadRequestException('La fecha de inicio debe ser anterior a la fecha de fin');
    }

    // Obtener horarios óptimos si hay un análisis de referencia
    let optimalHours: OptimalHourResponse[] = [];
    if (dto.referenceAnalysisId || dto.strategy === CalendarGenerationStrategy.OPTIMAL_HOURS) {
      try {
        optimalHours = await this.getOptimalHours(userId, dto.referenceAnalysisId, 15);
        this.logger.log(`✅ Horarios óptimos obtenidos: ${optimalHours.length}`);
      } catch (error) {
        this.logger.warn('⚠️ No se pudieron obtener horarios óptimos, usando defaults');
        optimalHours = this.getDefaultOptimalHours();
      }
    }

    // Crear registro de calendario
    const calendar = await this.calendarRepo.save({
      userId,
      name: dto.calendarName,
      description: dto.description,
      strategy: dto.strategy || CalendarGenerationStrategy.BALANCED,
      configuration: {
        postsPerWeek: dto.postsPerWeek,
        preferredDays: dto.preferredDays,
        preferredHours: dto.preferredHours,
        referenceAnalysisId: dto.referenceAnalysisId,
        contentMix: dto.contentMix,
      },
      isActive: true,
    });

    // Generar slots de tiempo para publicaciones
    const timeSlots = this.generateTimeSlots(
      startDate,
      endDate,
      dto.postsPerWeek,
      optimalHours,
      dto.preferredDays,
      dto.preferredHours,
    );

    this.logger.log(`📅 Se generaron ${timeSlots.length} time slots para publicaciones`);

    if (timeSlots.length === 0) {
      this.logger.error(`❌ No se pudieron generar time slots. El calendario tendrá 0 posts.`);
      this.logger.error(`   Parámetros recibidos:`, {
        startDate: dto.startDate,
        endDate: dto.endDate,
        postsPerWeek: dto.postsPerWeek,
        strategy: dto.strategy,
        preferredDays: dto.preferredDays,
        preferredHours: dto.preferredHours,
        optimalHoursCount: optimalHours.length,
      });
    }

    // Crear posts programados
    const posts: ScheduledPost[] = [];
    const contentTypes = this.getContentTypesFromMix(dto.contentMix);

    for (let i = 0; i < timeSlots.length; i++) {
      const slot = timeSlots[i];
      const contentType = contentTypes[i % contentTypes.length];

      const post = this.postRepo.create({
        userId,
        title: this.generatePostTitle(contentType, i + 1),
        description: this.generatePostDescription(contentType),
        hashtags: [],
        platform: PostPlatform.TIKTOK,
        scheduledDate: slot,
        status: PostStatus.DRAFT,
        metadata: {
          category: contentType,
          notes: 'Generado automáticamente',
        },
        sendReminder: true,
        reminderMinutesBefore: 30,
      });

      posts.push(post);
    }

    const savedPosts = await this.postRepo.save(posts);

    // Calcular estadísticas del calendario
    const statistics = this.calculateCalendarStatistics(savedPosts);
    calendar.statistics = statistics;
    await this.calendarRepo.save(calendar);

    this.logger.log(`Calendario generado con ${savedPosts.length} posts`);

    return {
      calendar,
      posts: savedPosts,
    };
  }

  /**
   * Genera slots de tiempo óptimos para publicaciones
   */
  private generateTimeSlots(
    startDate: Date,
    endDate: Date,
    postsPerWeek: number,
    optimalHours: OptimalHourResponse[],
    preferredDays?: number[],
    preferredHours?: number[],
  ): Date[] {
    const slots: Date[] = [];
    const current = new Date(startDate);
    const end = new Date(endDate);

    // Determinar horarios a usar
    const hoursToUse =
      preferredHours ||
      optimalHours.map((h) => h.hour) ||
      [9, 12, 15, 18, 21]; // Defaults

    // Determinar días a usar
    const daysToUse = preferredDays || [1, 2, 3, 4, 5, 6, 0]; // Todos los días por defecto

    this.logger.debug(`🕒 Generando time slots:`);
    this.logger.debug(`   - Período: ${startDate.toISOString()} a ${endDate.toISOString()}`);
    this.logger.debug(`   - Posts por semana: ${postsPerWeek}`);
    this.logger.debug(`   - Días preferidos: [${daysToUse.join(', ')}]`);
    this.logger.debug(`   - Horarios disponibles: [${hoursToUse.join(', ')}]`);
    this.logger.debug(`   - Horarios óptimos disponibles: ${optimalHours.length}`);

    let postsThisWeek = 0;
    let weekStart = this.getWeekStart(current);

    while (current <= end) {
      const dayOfWeek = current.getDay();

      // Resetear contador semanal
      const currentWeekStart = this.getWeekStart(current);
      if (currentWeekStart.getTime() !== weekStart.getTime()) {
        postsThisWeek = 0;
        weekStart = currentWeekStart;
      }

      // Si ya alcanzamos el límite de posts esta semana, saltar al siguiente día
      if (postsThisWeek >= postsPerWeek) {
        current.setDate(current.getDate() + 1);
        current.setHours(0, 0, 0, 0);
        continue;
      }

      // Si es un día válido
      if (daysToUse.includes(dayOfWeek)) {
        // Seleccionar hora óptima para este día
        const optimalForDay = optimalHours.find((h) => h.dayOfWeek === dayOfWeek);
        const hour = optimalForDay
          ? optimalForDay.hour
          : hoursToUse[postsThisWeek % hoursToUse.length];

        const slot = new Date(current);
        slot.setHours(hour, 0, 0, 0);

        // Solo agregar si la fecha está dentro del rango especificado
        if (slot >= startDate && slot <= end) {
          slots.push(slot);
          postsThisWeek++;
        }
      }

      current.setDate(current.getDate() + 1);
      current.setHours(0, 0, 0, 0);
    }

    this.logger.debug(`✅ Time slots generados: ${slots.length}`);
    if (slots.length === 0) {
      this.logger.warn(`⚠️ No se generaron slots. Verificar:
        - Rango de fechas: ${startDate.toISOString()} - ${endDate.toISOString()}
        - Días preferidos: [${daysToUse.join(', ')}]
        - Posts por semana: ${postsPerWeek}`);
    }

    return slots.sort((a, b) => a.getTime() - b.getTime());
  }

  /**
   * Obtiene el inicio de la semana (lunes)
   */
  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Ajustar cuando es domingo
    const weekStart = new Date(d.setDate(diff));
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
  }

  /**
   * Horarios óptimos por defecto (basados en estudios de TikTok)
   */
  private getDefaultOptimalHours(): OptimalHourResponse[] {
    // Basado en estudios generales de engagement en TikTok
    const defaults = [
      { hour: 18, dayOfWeek: 1, score: 100 }, // Lunes 6pm
      { hour: 21, dayOfWeek: 1, score: 95 }, // Lunes 9pm
      { hour: 12, dayOfWeek: 2, score: 90 }, // Martes 12pm
      { hour: 18, dayOfWeek: 3, score: 95 }, // Miércoles 6pm
      { hour: 9, dayOfWeek: 4, score: 85 }, // Jueves 9am
      { hour: 18, dayOfWeek: 4, score: 100 }, // Jueves 6pm
      { hour: 21, dayOfWeek: 5, score: 98 }, // Viernes 9pm
      { hour: 11, dayOfWeek: 6, score: 92 }, // Sábado 11am
      { hour: 19, dayOfWeek: 0, score: 96 }, // Domingo 7pm
    ];

    return defaults.map((d) => ({
      ...d,
      averageEngagement: d.score / 100,
      sampleSize: 50,
    }));
  }

  /**
   * Genera tipos de contenido según el mix especificado
   */
  private getContentTypesFromMix(mix?: {
    educational?: number;
    entertaining?: number;
    promotional?: number;
  }): string[] {
    const types: string[] = [];

    if (!mix) {
      // Mix balanceado por defecto
      return ['educational', 'entertaining', 'educational', 'entertaining', 'promotional'];
    }

    const total = (mix.educational || 0) + (mix.entertaining || 0) + (mix.promotional || 0);

    if (total === 0) {
      return ['educational', 'entertaining'];
    }

    // Calcular distribución
    const eduCount = Math.round((mix.educational || 0) / total * 10);
    const entCount = Math.round((mix.entertaining || 0) / total * 10);
    const proCount = Math.round((mix.promotional || 0) / total * 10);

    for (let i = 0; i < eduCount; i++) types.push('educational');
    for (let i = 0; i < entCount; i++) types.push('entertaining');
    for (let i = 0; i < proCount; i++) types.push('promotional');

    // Shuffle para distribuir mejor
    return this.shuffle(types);
  }

  private shuffle<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Genera título para post según tipo
   */
  private generatePostTitle(contentType: string, index: number): string {
    const titles = {
      educational: [
        `Tutorial ${index}: Tips prácticos`,
        `Guía ${index}: Cómo mejorar tu estrategia`,
        `Aprende ${index}: Técnicas avanzadas`,
        `Lección ${index}: Lo que debes saber`,
      ],
      entertaining: [
        `Video ${index}: Contenido divertido`,
        `Momento ${index}: Behind the scenes`,
        `Día ${index}: Mi experiencia`,
        `Historia ${index}: Anécdota interesante`,
      ],
      promotional: [
        `Promo ${index}: No te lo pierdas`,
        `Oferta ${index}: Algo especial`,
        `Anuncio ${index}: Novedad importante`,
        `Lanzamiento ${index}: Conoce más`,
      ],
    };

    const options = titles[contentType] || titles.educational;
    return options[Math.floor(Math.random() * options.length)];
  }

  /**
   * Genera descripción para post según tipo
   */
  private generatePostDescription(contentType: string): string {
    const descriptions = {
      educational:
        'Comparte conocimiento valioso con tu audiencia. Recuerda: aportar valor genera confianza.',
      entertaining:
        'Conecta emocionalmente con tu audiencia. El entretenimiento genera engagement y viralidad.',
      promotional:
        'Promociona tus productos/servicios de forma natural. Recuerda el balance: 80% valor, 20% promo.',
    };

    return descriptions[contentType] || descriptions.educational;
  }

  // ============== ESTADÍSTICAS ==============

  /**
   * Calcula estadísticas de un conjunto de posts
   */
  private calculateCalendarStatistics(posts: ScheduledPost[]): CalendarStatisticsResponse {
    const distributionByDay: Record<string, number> = {
      sunday: 0,
      monday: 0,
      tuesday: 0,
      wednesday: 0,
      thursday: 0,
      friday: 0,
      saturday: 0,
    };

    const distributionByHour: Record<string, number> = {};
    const hourSet = new Set<string>();

    posts.forEach((post) => {
      const date = new Date(post.scheduledDate);
      const dayOfWeek = date.getDay();
      const hour = date.getHours();

      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      distributionByDay[dayNames[dayOfWeek]]++;

      const hourKey = hour.toString();
      distributionByHour[hourKey] = (distributionByHour[hourKey] || 0) + 1;
      hourSet.add(`${hour}:00`);
    });

    // Calcular promedio de posts por semana
    const sortedPosts = [...posts].sort(
      (a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime(),
    );
    const firstPost = sortedPosts[0]?.scheduledDate;
    const lastPost = sortedPosts[sortedPosts.length - 1]?.scheduledDate;

    let averagePostsPerWeek = 0;
    if (firstPost && lastPost) {
      const weeks = Math.ceil(
        (new Date(lastPost).getTime() - new Date(firstPost).getTime()) / (7 * 24 * 60 * 60 * 1000),
      );
      averagePostsPerWeek = weeks > 0 ? posts.length / weeks : posts.length;
    }

    return {
      totalPosts: posts.length,
      distributionByDay,
      distributionByHour,
      averagePostsPerWeek: Math.round(averagePostsPerWeek * 10) / 10,
      optimalHoursUsed: Array.from(hourSet).sort(),
      upcomingPosts: posts.filter((p) => p.status === PostStatus.SCHEDULED).length,
      publishedPosts: posts.filter((p) => p.status === PostStatus.PUBLISHED).length,
      draftPosts: posts.filter((p) => p.status === PostStatus.DRAFT).length,
    };
  }

  /**
   * Obtiene estadísticas generales del calendario del usuario
   */
  async getCalendarStatistics(
    userId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<CalendarStatisticsResponse> {
    const where: any = { userId };

    if (startDate && endDate) {
      where.scheduledDate = Between(startDate, endDate);
    }

    const posts = await this.postRepo.find({ where });

    return this.calculateCalendarStatistics(posts);
  }

  /**
   * Obtiene posts próximos (siguientes 7 días)
   */
  async getUpcomingPosts(userId: string, days: number = 7): Promise<ScheduledPost[]> {
    const now = new Date();
    const future = new Date();
    future.setDate(future.getDate() + days);

    return await this.postRepo.find({
      where: {
        userId,
        scheduledDate: Between(now, future),
        status: In([PostStatus.SCHEDULED, PostStatus.DRAFT]),
      },
      order: { scheduledDate: 'ASC' },
    });
  }

  /**
   * Obtiene todos los calendarios del usuario
   */
  async getUserCalendars(userId: string): Promise<ContentCalendar[]> {
    return await this.calendarRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Obtiene un calendario específico
   */
  async getCalendarById(calendarId: string, userId: string): Promise<ContentCalendar> {
    const calendar = await this.calendarRepo.findOne({
      where: { id: calendarId, userId },
    });

    if (!calendar) {
      throw new NotFoundException('Calendario no encontrado');
    }

    return calendar;
  }

  /**
   * Elimina un calendario
   */
  async deleteCalendar(calendarId: string, userId: string): Promise<void> {
    const calendar = await this.getCalendarById(calendarId, userId);
    await this.calendarRepo.remove(calendar);
  }
}
