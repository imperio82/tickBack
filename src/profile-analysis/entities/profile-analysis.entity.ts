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
import { Usuario } from '../../user/user.Entity/user.Entity';
import { Analysis } from '../../apify/entity/apify.entity';

export enum ProfileAnalysisStatus {
  PENDING = 'pending',
  SCRAPING = 'scraping',
  SCRAPED = 'scraped',
  FILTERING = 'filtering',
  FILTERED = 'filtered',
  ANALYZING = 'analyzing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('profile_analysis')
@Index(['userId', 'createdAt'])
@Index(['status'])
export class ProfileAnalysis {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  userId: string;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: Usuario;

  @Column({ type: 'varchar' })
  profileUrl: string;

  @Column({ type: 'varchar', nullable: true })
  profileUsername: string;

  // Relación con los datos scrapeados
  @Column({ type: 'uuid', nullable: true })
  scrapedDataId: string;

  @ManyToOne(() => Analysis, { nullable: true })
  @JoinColumn({ name: 'scrapedDataId' })
  scrapedData: Analysis;

  // Datos filtrados con analizarDatosTikTok
  @Column({ type: 'json', nullable: true })
  filteredData: {
    resumen: {
      totalVideos: number;
      videosConLikes: number;
      videosConComentarios: number;
      videosConShares: number;
    };
    top5EngagementOptimo: {
      titulo: string;
      descripcion: string;
      videosCompletos: Array<{
        id: string;
        texto: string;
        vistas: number;
        likes: number;
        comentarios: number;
        compartidos: number;
        saves: number;
        duracion: number;
        fecha: string;
        hashtags: string[];
        multimedia: {
          coverUrl: string;
          webVideoUrl: string;
          musica: {
            nombre: string;
            autor: string;
            esOriginal: boolean;
          };
        };
        metricas: {
          engagementTotal: number;
          tasaEngagement: string;
          tasaLikes: string;
        };
        autor: {
          nombre: string;
          nickName: string;
          followers: number;
        };
      }>;
    };
    analisisContenido: any;
    estadisticasGenerales: any;
  };

  // Insights preliminares obtenidos con obtenerInsightsParaIA
  @Column({ type: 'json', nullable: true })
  preliminaryInsights: {
    recomendacionesContenido: any[];
    estrategiaHashtags: any[];
    estrategiaMusical: any;
    patronesOptimos: any;
    accionesRecomendadas: any[];
  };

  @Column({
    type: 'enum',
    enum: ProfileAnalysisStatus,
    default: ProfileAnalysisStatus.PENDING,
  })
  status: ProfileAnalysisStatus;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  // Metadata del scraping
  @Column({ type: 'json', nullable: true })
  scrapingMetadata: {
    apifyRunId?: string;
    totalVideosScraped?: number;
    scrapingDuration?: number;
    scrapedAt?: Date;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;
}
