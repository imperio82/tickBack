import { SectorEconomico, TipoProducto } from 'src/user/dto/enums';
import {Usuario } from 'src/user/user.Entity/user.Entity';
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
// ========== ENTIDAD CONFIGURACIÓN DE ANÁLISIS ==========
@Entity('configuraciones_analisis')
export class ConfiguracionAnalisis {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Configuración geográfica
  @Column({ default: 'CO' }) // Código ISO del país
  pais: string;

  @Column({ nullable: true })
  region: string; // Estado/Provincia/Departamento

  @Column({ nullable: true })
  ciudad: string;

  @Column({ default: 'es' }) // Código ISO del idioma
  idiomaPrincipal: string;

  @Column({ type: 'simple-array', nullable: true })
  idiomasSecundarios: string[]; // ['en', 'pt']

  // Configuración de producto/negocio
  @Column({
    type: 'enum',
    enum: SectorEconomico,
    default: SectorEconomico.OTRO,
  })
  sectorEconomico: SectorEconomico;

  @Column({
    type: 'enum',
    enum: TipoProducto,
    default: TipoProducto.SERVICIO,
  })
  tipoProducto: TipoProducto;

  @Column({ nullable: true })
  nombreProducto: string;

  @Column({ type: 'text', nullable: true })
  descripcionProducto: string;

  @Column({ type: 'simple-array', nullable: true })
  palabrasClave: string[]; // Keywords relacionadas con el producto

  @Column({ type: 'simple-array', nullable: true })
  hashtags: string[]; // Hashtags a monitorear

  @Column({ type: 'simple-array', nullable: true })
  competidores: string[]; // Usuarios de TikTok competidores

  // Configuración específica para Apify TikTok Scraper
  @Column({ nullable: true })
  apifyToken: string; // Token API de Apify del usuario

  @Column({ default: 20 })
  maxResultados: number; // Máximo de resultados por búsqueda

  @Column({ default: 7 })
  diasAnalisis: number; // Días hacia atrás para analizar

  @Column({ default: 1000 })
  minVisualizaciones: number; // Mínimo de views para considerar

  @Column({ default: 10 })
  minLikes: number; // Mínimo de likes para considerar

  @Column({ default: false })
  incluirComentarios: boolean; // Si incluir análisis de comentarios

  @Column({ default: 5 })
  maxComentariosPorVideo: number;

  @Column({ default: false })
  analizarPerfil: boolean; // Si analizar perfil completo del usuario

  // Filtros de contenido
  @Column({ type: 'simple-array', nullable: true })
  efectosFiltros: string[]; // Efectos/filtros específicos a buscar

  @Column({ type: 'simple-array', nullable: true })
  musicaFiltros: string[]; // Música específica a filtrar

  @Column({ default: false })
  soloVerificados: boolean; // Solo usuarios verificados

  @Column({ type: 'simple-array', nullable: true })
  excluirUsuarios: string[]; // Usuarios a excluir del análisis

  // Configuración de reportes
  @Column({ default: 'semanal' })
  frecuenciaReportes: string; // 'diario', 'semanal', 'mensual'

  @Column({ default: true })
  incluirTendencias: boolean;

  @Column({ default: true })
  incluirMetricas: boolean;

  @Column({ default: false })
  incluirSentimientos: boolean; // Análisis de sentimientos

  // Configuración de alertas
  @Column({ default: false })
  alertasViralidad: boolean; // Alertas cuando algo se vuelve viral

  @Column({ default: 10000 })
  umbralViralidad: number; // Umbral de views para considerar viral

  @Column({ default: false })
  alertasCompetencia: boolean; // Alertas de actividad de competencia

  @Column({ default: false })
  alertasMencion: boolean; // Alertas cuando mencionan tu marca/producto

  // Timestamps
  @CreateDateColumn()
  creadoEn: Date;

  @UpdateDateColumn()
  actualizadoEn: Date;

  // Relación con Usuario
  @OneToOne(() => Usuario, (usuario) => usuario.configuracion)
  @JoinColumn()
  usuario: Usuario;
}
