import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Usuario } from '../../user/user.Entity/user.Entity';

export enum AnalysisType {
  OWN_PROFILE = 'own_profile',
  COMPETITOR_PROFILE = 'competitor_profile',
  CATEGORY = 'category',
  COMPARATIVE = 'comparative',
  TRENDING = 'trending',
}

export enum AnalysisStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('competitor_analysis')
@Index(['userId', 'createdAt'])
@Index(['analysisType', 'status'])
export class CompetitorAnalysis {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  userId: string;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  user: Usuario;

  @Column({
    type: 'enum',
    enum: AnalysisType,
  })
  analysisType: AnalysisType;

  @Column({
    type: 'enum',
    enum: AnalysisStatus,
    default: AnalysisStatus.PENDING,
  })
  status: AnalysisStatus;

  @Column({ type: 'json' })
  parameters: {
    profiles?: string[];
    hashtags?: string[];
    keywords?: string[];
    region?: string;
    numberOfVideos?: number;
    minViews?: number;
    minEngagementRate?: number;
    dateRange?: {
      from: string;
      to: string;
    };
  };

  @Column({ type: 'json', nullable: true })
  scrapingMetadata: {
    totalVideosScraped: number;
    videosAfterFilter: number;
    videosAnalyzedWithAI: number;
    apifyRunId?: string;
    scrapingDuration?: number;
  };

  @Column({ type: 'json', nullable: true })
  results: {
    videos: Array<{
      videoId: string;
      videoUrl: string;
      profile: string;
      description: string;
      hashtags: string[];
      metrics: {
        views: number;
        likes: number;
        comments: number;
        shares: number;
        engagementRate: number;
      };
      aiAnalysis?: {
        topics: string[];
        transcript: string;
        sentimentScore?: number;
        keyPhrases?: string[];
      };
    }>;
    insights: {
      topTopics: Array<{
        topic: string;
        frequency: number;
        avgEngagement: number;
      }>;
      topHashtags: Array<{
        hashtag: string;
        usage: number;
        avgViews: number;
        avgEngagement: number;
      }>;
      topProfiles?: Array<{
        username: string;
        avgEngagement: number;
        totalVideos: number;
        topTopic: string;
      }>;
      topCreators?: Array<{
        username: string;
        videoCount: number;
        avgEngagement: number;
      }>;
      durationAnalysis: {
        optimal: { min: number; max: number; median: number };
        avgDuration: number;
      };
      bestPractices: string[];
      trendingPatterns?: string[];
      viralPatterns?: string[];
      emergingTrends?: string[];
    };
    contentSuggestions: Array<{
      title: string;
      description: string;
      suggestedHashtags: string[];
      targetAudience?: string;
      estimatedEngagement: 'high' | 'medium-high' | 'medium' | 'low';
      reasoning: string;
      inspirationFrom?: string;
    }>;
    comparative?: {
      yourProfile: {
        avgEngagement: number;
        topTopics: string[];
        strengths: string[];
      };
      competitors: {
        avgEngagement: number;
        topTopics: string[];
        opportunities: string[];
      };
      recommendations: string[];
    };
  };

  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  @Column({ type: 'int', default: 0 })
  estimatedCost: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt?: Date;
}
