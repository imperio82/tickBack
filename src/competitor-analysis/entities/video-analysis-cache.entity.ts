import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('video_analysis_cache')
@Index(['videoId'], { unique: true })
@Index(['createdAt'])
@Index(['lastUsed'])
export class VideoAnalysisCache {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  videoId: string;

  @Column({ type: 'varchar' })
  videoUrl: string;

  @Column({ type: 'varchar' })
  profile: string;

  @Column({ type: 'json' })
  metadata: {
    description: string;
    hashtags: string[];
    musicTitle?: string;
    duration: number;
    uploadDate?: string;
  };

  @Column({ type: 'json' })
  metrics: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
    engagementRate: number;
  };

  @Column({ type: 'json' })
  aiAnalysis: {
    topics: string[];
    transcript: string;
    labels: any[];
    shotChanges: number;
    sentiment?: string;
    keyPhrases?: string[];
  };

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  lastUsed: Date;
}
