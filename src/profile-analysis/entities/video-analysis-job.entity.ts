import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ProfileAnalysis } from './profile-analysis.entity';
import { Usuario } from '../../user/user.Entity/user.Entity';
import type {
  VideoDownloadedData,
  VideoAnalysisResult,
  GeminiInsights,
  ProcessingMetadata,
} from '../services/video-analysis-job.service';

export enum VideoAnalysisJobStatus {
  QUEUED = 'queued',
  DOWNLOADING = 'downloading',
  ANALYZING_VIDEOS = 'analyzing_videos',
  GENERATING_INSIGHTS = 'generating_insights',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('video_analysis_jobs')
@Index(['profileAnalysisId', 'createdAt'])
@Index(['userId', 'status'])
@Index(['status', 'createdAt'])
export class VideoAnalysisJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  profileAnalysisId: string;

  @ManyToOne(() => ProfileAnalysis, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'profileAnalysisId' })
  profileAnalysis: ProfileAnalysis;

  @Column({ type: 'varchar' })
  userId: string;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: Usuario;

  // IDs de los videos seleccionados del filtrado
  @Column({ type: 'json' })
  selectedVideoIds: string[];

  // Videos descargados y subidos a Google Cloud Storage
  @Column({ type: 'json', nullable: true })
  videosDownloaded: VideoDownloadedData[];

  // Resultados del análisis de cada video con Google Video Intelligence
  @Column({ type: 'json', nullable: true })
  videoAnalysisResults: VideoAnalysisResult[];

  // Insights finales generados por Gemini IA
  @Column({ type: 'json', nullable: true })
  geminiInsights: GeminiInsights;

  @Column({
    type: 'enum',
    enum: VideoAnalysisJobStatus,
    default: VideoAnalysisJobStatus.QUEUED,
  })
  status: VideoAnalysisJobStatus;

  // Progreso del 0 al 100
  @Column({ type: 'int', default: 0 })
  progress: number;

  @Column({ type: 'varchar', nullable: true })
  currentStep: string;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  // Metadata del procesamiento
  @Column({ type: 'json', nullable: true })
  processingMetadata: ProcessingMetadata;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;
}
