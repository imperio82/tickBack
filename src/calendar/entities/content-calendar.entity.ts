import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Usuario } from '../../user/user.Entity/user.Entity';

export enum CalendarGenerationStrategy {
  OPTIMAL_HOURS = 'optimal_hours', // Basado en mejores horarios de análisis
  COMPETITOR_PATTERN = 'competitor_pattern', // Copia patrón de competidor
  CUSTOM = 'custom', // Personalizado por usuario
  BALANCED = 'balanced', // Balanceado entre todos los factores
}

@Entity('content_calendars')
export class ContentCalendar {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  userId: string;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  user: Usuario;

  @Column({ type: 'varchar', length: 200 })
  name: string; // "Calendario Enero 2026", "Plan Q1", etc.

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: CalendarGenerationStrategy,
    default: CalendarGenerationStrategy.BALANCED,
  })
  strategy: CalendarGenerationStrategy;

  // Configuración de generación automática
  @Column({ type: 'json' })
  configuration: {
    // Frecuencia de publicación
    postsPerWeek: number; // 3, 5, 7, etc.

    // Días preferidos (0=Domingo, 1=Lunes, ..., 6=Sábado)
    preferredDays?: number[];

    // Horarios preferidos (formato 24h)
    preferredHours?: number[]; // [9, 12, 18, 21]

    // Evitar estos días/horarios
    excludedDays?: number[];
    excludedHours?: number[];

    // Análisis de referencia (para extraer horarios óptimos)
    referenceAnalysisId?: string;

    // Distribución de categorías de contenido
    contentMix?: {
      educational?: number; // % de contenido educativo
      entertaining?: number; // % de entretenimiento
      promotional?: number; // % promocional
    };
  };

  // Estadísticas del calendario generado
  @Column({ type: 'json', nullable: true })
  statistics?: {
    totalPosts: number;
    distributionByDay: Record<string, number>; // {"monday": 5, "tuesday": 3, ...}
    distributionByHour: Record<string, number>; // {"9": 2, "18": 4, ...}
    averagePostsPerWeek: number;
    optimalHoursUsed: string[]; // ["18:00", "21:00"]
  };

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
