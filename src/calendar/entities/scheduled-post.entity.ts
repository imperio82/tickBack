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

export enum PostStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  PUBLISHED = 'published',
  CANCELLED = 'cancelled',
}

export enum PostPlatform {
  TIKTOK = 'tiktok',
  INSTAGRAM = 'instagram',
  YOUTUBE = 'youtube',
}

@Entity('scheduled_posts')
@Index(['userId', 'scheduledDate'])
@Index(['userId', 'status'])
export class ScheduledPost {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  userId: string;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  user: Usuario;

  @Column({ type: 'varchar', length: 500 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'json', nullable: true })
  hashtags: string[];

  @Column({
    type: 'enum',
    enum: PostPlatform,
    default: PostPlatform.TIKTOK,
  })
  platform: PostPlatform;

  @Column({ type: 'timestamp' })
  scheduledDate: Date;

  @Column({
    type: 'enum',
    enum: PostStatus,
    default: PostStatus.DRAFT,
  })
  status: PostStatus;

  // Metadata adicional
  @Column({ type: 'json', nullable: true })
  metadata: {
    videoUrl?: string;
    coverImageUrl?: string;
    duration?: number;
    category?: string;
    targetAudience?: string;
    notes?: string;
  };

  // Datos del análisis que inspiró este post (si aplica)
  @Column({ type: 'varchar', nullable: true })
  inspirationAnalysisId?: string;

  @Column({ type: 'varchar', nullable: true })
  inspirationVideoId?: string;

  // Recordatorios
  @Column({ type: 'boolean', default: true })
  sendReminder: boolean;

  @Column({ type: 'int', default: 30 })
  reminderMinutesBefore: number; // 30 minutos antes por defecto

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  publishedAt?: Date;
}
