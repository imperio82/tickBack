import { ConfiguracionAnalisis } from 'src/config/entity/config.Entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { EstadoUsuario, TipoSuscripcion } from '../dto/enums';
import { Analysis } from 'src/apify/entity/apify.entity';


// ========== ENTIDAD USUARIO ==========
@Entity('usuarios')
@Index(['email'], { unique: true })
@Index(['username'], { unique: true })
export class Usuario {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Datos de autenticación
  @Column({ unique: true })
  email: string;

  @Column({ unique: true })
  username: string;

  @Column()
  password: string; // Hasheado con bcrypt

  // Datos personales
  @Column()
  nombre: string;

  @Column()
  apellido: string;

  @Column({ nullable: true })
  telefono: string;

  @Column({ type: 'date', nullable: true })
  fechaNacimiento: Date;

  // Información profesional
  @Column({ nullable: true })
  empresa: string;

  @Column({ nullable: true })
  cargo: string;

  @Column({ nullable: true })
  sitioWeb: string;

  // Estado de la cuenta
  @Column({
    type: 'enum',
    enum: EstadoUsuario,
    default: EstadoUsuario.ACTIVO,
  })
  estado: EstadoUsuario;

  @Column({ default: false })
  emailVerificado: boolean;

  @OneToMany(() => Analysis, (analisis) => analisis.user)
  analyses: Analysis

  @Column({
    type: 'enum',
    enum: TipoSuscripcion,
    default: TipoSuscripcion.GRATUITA,
  })
  tipoSuscripcion: TipoSuscripcion;

  @Column({ type: 'timestamp', nullable: true })
  fechaVencimientoSuscripcion: Date;

  // Límites por suscripción
  @Column({ default: 10 })
  limiteBusquedasMes: number;

  @Column({ default: 0 })
  busquedasUtilizadasMes: number;

  @Column({ default: 5 })
  limitePerfilesSeguimiento: number;

  // Configuración de notificaciones
  @Column({ default: true })
  notificacionesEmail: boolean;

  @Column({ default: false })
  notificacionesPush: boolean;

  // Timestamps
  @CreateDateColumn()
  creadoEn: Date;

  @UpdateDateColumn()
  actualizadoEn: Date;

  @Column({ type: 'timestamp', nullable: true })
  ultimoAcceso: Date;

  // Relaciones
  @OneToOne(() => ConfiguracionAnalisis, (config) => config.usuario)
  configuracion: ConfiguracionAnalisis;

  @OneToMany(() => Analysis, (analisis) => analisis.user)
  data:Analysis
}