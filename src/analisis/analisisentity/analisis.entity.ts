import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index
} from 'typeorm';
import { Usuario } from '../../user/user.Entity/user.Entity'; // Asume que tienes una entidad User

// Interfaces para tipar los JSON
export interface VideoAnalysisData {
  videoId: string;
  videoTitle: string;
  duration: number;
  analyzedSegments: {
    startTime: number;
    endTime: number;
    content: string;
    keywords: string[];
    sentiment?: 'positive' | 'negative' | 'neutral';
  }[];
  metadata?: {
    resolution?: string;
    format?: string;
    fileSize?: number;
    [key: string]: any;
  };
}

export interface AIAnalysisData {
  model: string;
  version: string;
  confidence: number;
  results: {
    summary: string;
    keyPoints: string[];
    categories: string[];
    topics: string[];
    emotions?: {
      emotion: string;
      confidence: number;
    }[];
    recommendations?: string[];
  };
  processingTime: number;
  timestamp: Date;
}

export interface FilteredAnalysisData {
  appliedFilters: {
    sentiment?: 'positive' | 'negative' | 'neutral'[];
    categories?: string[];
    timeRange?: {
      start: Date;
      end: Date;
    };
    keywords?: string[];
    confidenceThreshold?: number;
  };
  filteredResults: {
    matchingSegments: number;
    relevantKeywords: string[];
    avgConfidence: number;
    filteredSummary: string;
    insights: string[];
  };
  filterMetadata: {
    totalProcessed: number;
    matchingResults: number;
    filterEfficiency: number;
  };
}

@Entity('analyses')
@Index(['userId', 'createdAt'])
@Index(['createdAt'])
export class Analysis {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => Usuario, user => user.analyses, {
    onDelete: 'CASCADE',
    nullable: false
  })
  @JoinColumn({ name: 'user_id' })
  user: Usuario;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({
    type: 'jsonb', // Para PostgreSQL, usa 'json' para MySQL
    name: 'video_analysis',
    comment: 'JSON con el análisis de los videos analizados'
  })
  videoAnalysis: VideoAnalysisData[];

  @Column({
    type: 'jsonb', // Para PostgreSQL, usa 'json' para MySQL
    name: 'ai_analysis',
    comment: 'JSON con el análisis realizado por la IA'
  })
  aiAnalysis: AIAnalysisData;

  @Column({
    type: 'jsonb', // Para PostgreSQL, usa 'json' para MySQL
    name: 'filtered_analysis',
    comment: 'JSON con el análisis filtrado procesado por la IA'
  })
  filteredAnalysis: FilteredAnalysisData;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'Nombre o título del análisis'
  })
  title?: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Descripción opcional del análisis'
  })
  description?: string;

  @Column({
    type: 'enum',
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
    comment: 'Estado del análisis'
  })
  status: 'pending' | 'processing' | 'completed' | 'failed';

  @Column({
    type: 'jsonb',
    nullable: true,
    name: 'processing_metadata',
    comment: 'Metadatos adicionales del procesamiento'
  })
  processingMetadata?: {
    startTime?: Date;
    endTime?: Date;
    processingDuration?: number;
    errors?: string[];
    warnings?: string[];
  };

  // Método helper para validar que el análisis está completo
  isComplete(): boolean {
    //@ts-ignore
    return this.status === 'completed' && 
           this.videoAnalysis && 
           this.aiAnalysis && 
           this.filteredAnalysis;
  }

  // Método helper para obtener un resumen rápido
  getSummary(): {
    totalVideos: number;
    avgConfidence: number;
    mainTopics: string[];
    createdAt: Date;
  } {
    return {
      totalVideos: this.videoAnalysis?.length || 0,
      avgConfidence: this.aiAnalysis?.confidence || 0,
      mainTopics: this.aiAnalysis?.results?.topics || [],
      createdAt: this.createdAt
    };
  }
}