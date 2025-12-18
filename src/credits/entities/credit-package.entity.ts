import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { TipoPaqueteCredito } from '../../user/dto/enums';

/**
 * Entidad para los paquetes de créditos disponibles
 */
@Entity('credit_packages')
@Index(['tipo'], { unique: true })
export class CreditPackage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: TipoPaqueteCredito,
    unique: true,
  })
  tipo: TipoPaqueteCredito;

  @Column({ type: 'varchar', length: 100 })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string;

  @Column({ type: 'int' })
  creditos: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  precio: number;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  // Metadata adicional
  @Column({ type: 'json', nullable: true })
  metadata: {
    destacado?: boolean;
    etiqueta?: string; // ej: "Más popular", "Mejor valor"
    descuento?: number; // porcentaje de descuento
    caracteristicas?: string[]; // características adicionales
  };

  @CreateDateColumn()
  creadoEn: Date;

  @UpdateDateColumn()
  actualizadoEn: Date;
}
