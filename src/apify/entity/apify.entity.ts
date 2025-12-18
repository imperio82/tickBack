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
import { Usuario } from '../../user/user.Entity/user.Entity'; // Ajusta la ruta según tu estructura
import { UUID } from 'crypto';

export enum QueryType {
  PROPIA = 'propia',
  INVESTIGACION = 'investigacion',
  SQL_QUERY = "SQL_QUERY",
  HASHTAG = 'hashtag',
  SEARCH = 'search',
  VIDEO = 'video',
  ADVANCED = 'advanced',
  COMMENT = 'comment',
  SOUND = 'sound',
  TRENDING = 'trending',
}

export enum AnalysisStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('analysis')
@Index(['userId'])
@Index(['createdAt'])
@Index(['queryType'])
export class Analysis {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({type: "varchar", default: null})
  userId: string;

  @Column({ name: 'analysis_result', type: 'json' })
  analysisResult: Record<string, any>;

  @Column({
    name: 'query_type',
    type: 'enum',
    enum: QueryType,
  })
  queryType: QueryType;

  @Column({
    type: 'enum',
    enum: AnalysisStatus,
    default: AnalysisStatus.COMPLETED,
  })
  status: AnalysisStatus;

  @Column({ nullable: true, length: 255 })
  title?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relación con el usuario
  @ManyToOne(() => Usuario,(user) => user.data , { onDelete: 'CASCADE' })
  user: Usuario;
}

// DTO para crear análisis
export class CreateAnalysisDto {
  userId: string;
  analysisResult: Record<string, any>;
  queryType: QueryType;
  title?: string;
  description?: string;
  status?: AnalysisStatus;
}

// DTO para actualizar análisis
export class UpdateAnalysisDto {
  analysisResult?: Record<string, any>;
  queryType?: QueryType;
  title?: string;
  description?: string;
  status?: AnalysisStatus;
}