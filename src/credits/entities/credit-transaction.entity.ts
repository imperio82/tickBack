import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Usuario } from '../../user/user.Entity/user.Entity';
import { CreditPackage } from './credit-package.entity';
import { TipoTransaccionCredito, EstadoTransaccion } from '../../user/dto/enums';

/**
 * Entidad para el historial de transacciones de créditos
 */
@Entity('credit_transactions')
@Index(['usuarioId', 'creadoEn'])
@Index(['tipo', 'estado'])
@Index(['creadoEn'])
export class CreditTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  usuarioId: string;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuarioId' })
  usuario: Usuario;

  @Column({
    type: 'enum',
    enum: TipoTransaccionCredito,
  })
  tipo: TipoTransaccionCredito;

  @Column({ type: 'int' })
  cantidad: number; // Positivo para compra/regalo, negativo para consumo

  @Column({ type: 'int' })
  balanceAnterior: number;

  @Column({ type: 'int' })
  balanceResultante: number;

  @Column({ type: 'text' })
  descripcion: string;

  @Column({
    type: 'enum',
    enum: EstadoTransaccion,
    default: EstadoTransaccion.COMPLETADA,
  })
  estado: EstadoTransaccion;

  // Relación opcional con el paquete comprado
  @Column({ type: 'uuid', nullable: true })
  paqueteId: string;

  @ManyToOne(() => CreditPackage, { nullable: true })
  @JoinColumn({ name: 'paqueteId' })
  paquete: CreditPackage;

  // Metadata de la transacción
  @Column({ type: 'json', nullable: true })
  metadata: {
    pagoId?: string; // ID de la transacción de pago
    metodoPago?: string; // stripe, paypal, etc.
    recursoId?: string; // ID del análisis relacionado
    usuarioOrigenId?: string; // Para regalos de créditos
    precio?: number; // Precio pagado (para compras)
    notas?: string; // Notas adicionales
    ajusteManual?: boolean; // Para ajustes manuales del admin
  };

  @CreateDateColumn()
  creadoEn: Date;
}
