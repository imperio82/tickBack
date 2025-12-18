
import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Usuario } from './user.Entity/user.Entity';
import { EstadoUsuario, TipoSuscripcion, RolUsuario } from './dto/enums';

// DTOs para operaciones CRUD
export interface CreateUsuarioDto {
  email: string;
  username: string;
  password: string;
  nombre: string;
  apellido: string;
  telefono?: string;
  fechaNacimiento?: Date;
  empresa?: string;
  cargo?: string;
  sitioWeb?: string;
}

export interface UpdateUsuarioDto {
  nombre?: string;
  apellido?: string;
  telefono?: string;
  fechaNacimiento?: Date;
  empresa?: string;
  cargo?: string;
  sitioWeb?: string;
  estado?: EstadoUsuario;
  tipoSuscripcion?: TipoSuscripcion;
  limiteBusquedasMes?: number;
  limitePerfilesSeguimiento?: number;
  notificacionesEmail?: boolean;
  notificacionesPush?: boolean;
}

export interface UsuarioResponseDto {
  id: string;
  email: string;
  username: string;
  nombre: string;
  apellido: string;
  estado: EstadoUsuario;
  rol: RolUsuario;
  tipoSuscripcion: TipoSuscripcion;
  creadoEn: Date;
  creditosDisponibles: number;
  totalCreditosComprados: number;
  totalCreditosConsumidos: number;
}

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(Usuario)
    private usuarioRepository: Repository<Usuario>,
  ) { }

  // ========== CREAR USUARIO ==========
  async crear(createUsuarioDto: CreateUsuarioDto): Promise<UsuarioResponseDto> {
    try {
      this.logger.log(`Creando usuario: ${createUsuarioDto.email}`);

      // Verificar si el email ya existe
      const existeEmail = await this.usuarioRepository.findOne({
        where: { email: createUsuarioDto.email }
      });

      if (existeEmail) {
        throw new ConflictException('El email ya está registrado');
      }

      // Verificar si el username ya existe
      const existeUsername = await this.usuarioRepository.findOne({
        where: { username: createUsuarioDto.username }
      });

      if (existeUsername) {
        throw new ConflictException('El nombre de usuario ya está registrado');
      }

      // Hashear la contraseña
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(createUsuarioDto.password, saltRounds);

      // Crear el usuario
      const nuevoUsuario = this.usuarioRepository.create({
        ...createUsuarioDto,
        password: hashedPassword,
        estado: EstadoUsuario.ACTIVO,
        tipoSuscripcion: TipoSuscripcion.GRATUITA,
      });

      const usuarioGuardado = await this.usuarioRepository.save(nuevoUsuario);

      this.logger.log(`Usuario creado exitosamente: ${usuarioGuardado.id}`);

      return this.mapearAResponse(usuarioGuardado);

    } catch (error) {
      this.logger.error(`Error al crear usuario: ${error.message}`, error.stack);

      if (error instanceof ConflictException || error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException('Error interno al crear el usuario');
    }
  }

  // ========== OBTENER USUARIO POR ID ==========
  async obtenerPorId(id: string): Promise<UsuarioResponseDto> {
    try {
      this.logger.log(`Buscando usuario por ID: ${id}`);

      const usuario = await this.usuarioRepository.findOne({
        where: { id },
        relations: ['configuracion']
      });

      if (!usuario) {
        throw new NotFoundException('Usuario no encontrado');
      }

      // Actualizar último acceso
      await this.actualizarUltimoAcceso(id);

      return this.mapearAResponse(usuario);

    } catch (error) {
      this.logger.error(`Error al obtener usuario por ID: ${error.message}`, error.stack);

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new BadRequestException('Error interno al obtener el usuario');
    }
  }

  // ========== OBTENER USUARIO POR EMAIL ==========
  async obtenerPorEmail(email: string): Promise<UsuarioResponseDto> {
    try {
      this.logger.log(`Buscando usuario por email: ${email}`);

      const usuario = await this.usuarioRepository.findOne({
        where: { email },
        relations: ['configuracion']
      });

      if (!usuario) {
        throw new NotFoundException('Usuario no encontrado');
      }

      return this.mapearAResponse(usuario);

    } catch (error) {
      this.logger.error(`Error al obtener usuario por email: ${error.message}`, error.stack);

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new BadRequestException('Error interno al obtener el usuario');
    }
  }

  // ========== ACTUALIZAR USUARIO ==========
  async actualizar(id: string, updateUsuarioDto: UpdateUsuarioDto): Promise<UsuarioResponseDto> {
    try {
      this.logger.log(`Actualizando usuario: ${id}`);

      const usuario = await this.usuarioRepository.findOne({ where: { id } });

      if (!usuario) {
        throw new NotFoundException('Usuario no encontrado');
      }

      // Actualizar campos
      Object.assign(usuario, updateUsuarioDto);

      const usuarioActualizado = await this.usuarioRepository.save(usuario);

      this.logger.log(`Usuario actualizado exitosamente: ${id}`);

      return this.mapearAResponse(usuarioActualizado);

    } catch (error) {
      this.logger.error(`Error al actualizar usuario: ${error.message}`, error.stack);

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new BadRequestException('Error interno al actualizar el usuario');
    }
  }

  // ========== ELIMINAR USUARIO ==========
  async eliminar(id: string): Promise<void> {
    try {
      this.logger.log(`Eliminando usuario: ${id}`);

      const usuario = await this.usuarioRepository.findOne({ where: { id } });

      if (!usuario) {
        throw new NotFoundException('Usuario no encontrado');
      }

      await this.usuarioRepository.remove(usuario);

      this.logger.log(`Usuario eliminado exitosamente: ${id}`);

    } catch (error) {
      this.logger.error(`Error al eliminar usuario: ${error.message}`, error.stack);

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new BadRequestException('Error interno al eliminar el usuario');
    }
  }

  // ========== LISTAR USUARIOS ==========
  async listar(page: number = 1, limit: number = 10): Promise<{ usuarios: UsuarioResponseDto[], total: number }> {
    try {
      this.logger.log(`Listando usuarios - Página: ${page}, Límite: ${limit}`);

      const [usuarios, total] = await this.usuarioRepository.findAndCount({
        skip: (page - 1) * limit,
        take: limit,
        order: { creadoEn: 'DESC' },
        relations: ['configuracion']
      });

      const usuariosResponse = usuarios.map(usuario => this.mapearAResponse(usuario));

      return {
        usuarios: usuariosResponse,
        total
      };

    } catch (error) {
      this.logger.error(`Error al listar usuarios: ${error.message}`, error.stack);
      throw new BadRequestException('Error interno al listar usuarios');
    }
  }

  // ========== ACTUALIZAR SUSCRIPCIÓN ==========
  async actualizarSuscripcion(id: string, tipoSuscripcion: TipoSuscripcion, fechaVencimiento?: Date): Promise<UsuarioResponseDto> {
    try {
      this.logger.log(`Actualizando suscripción del usuario: ${id} a ${tipoSuscripcion}`);

      const usuario = await this.usuarioRepository.findOne({ where: { id } });

      if (!usuario) {
        throw new NotFoundException('Usuario no encontrado');
      }

      // Actualizar límites según el tipo de suscripción
      let limites = this.obtenerLimitesPorSuscripcion(tipoSuscripcion);

      usuario.tipoSuscripcion = tipoSuscripcion;
      usuario.fechaVencimientoSuscripcion = fechaVencimiento ?? new Date();
      usuario.limiteBusquedasMes = limites.busquedasMes;
      usuario.limitePerfilesSeguimiento = limites.perfilesSeguimiento;

      const usuarioActualizado = await this.usuarioRepository.save(usuario);

      this.logger.log(`Suscripción actualizada exitosamente para usuario: ${id}`);

      return this.mapearAResponse(usuarioActualizado);

    } catch (error) {
      this.logger.error(`Error al actualizar suscripción: ${error.message}`, error.stack);

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new BadRequestException('Error interno al actualizar la suscripción');
    }
  }

  // ========== VERIFICAR EMAIL ==========
  async verificarEmail(id: string): Promise<UsuarioResponseDto> {
    try {
      this.logger.log(`Verificando email del usuario: ${id}`);

      const usuario = await this.usuarioRepository.findOne({ where: { id } });

      if (!usuario) {
        throw new NotFoundException('Usuario no encontrado');
      }

      usuario.emailVerificado = true;
      const usuarioActualizado = await this.usuarioRepository.save(usuario);

      this.logger.log(`Email verificado exitosamente para usuario: ${id}`);

      return this.mapearAResponse(usuarioActualizado);

    } catch (error) {
      this.logger.error(`Error al verificar email: ${error.message}`, error.stack);

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new BadRequestException('Error interno al verificar el email');
    }
  }

  // ========== INCREMENTAR BÚSQUEDAS ==========
  async incrementarBusquedas(id: string): Promise<void> {
    try {
      this.logger.log(`Incrementando búsquedas del usuario: ${id}`);

      const usuario = await this.usuarioRepository.findOne({ where: { id } });

      if (!usuario) {
        throw new NotFoundException('Usuario no encontrado');
      }

      if (usuario.busquedasUtilizadasMes >= usuario.limiteBusquedasMes) {
        throw new BadRequestException('Límite de búsquedas mensuales alcanzado');
      }

      usuario.busquedasUtilizadasMes++;
      await this.usuarioRepository.save(usuario);

      this.logger.log(`Búsquedas incrementadas para usuario: ${id}`);

    } catch (error) {
      this.logger.error(`Error al incrementar búsquedas: ${error.message}`, error.stack);

      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException('Error interno al incrementar búsquedas');
    }
  }

  // ========== MÉTODOS AUXILIARES ==========

  private async actualizarUltimoAcceso(id: string): Promise<void> {
    try {
      await this.usuarioRepository.update(id, { ultimoAcceso: new Date() });
    } catch (error) {
      this.logger.warn(`No se pudo actualizar último acceso para usuario: ${id}`);
    }
  }

  private obtenerLimitesPorSuscripcion(tipo: TipoSuscripcion) {
    const limites = {
      [TipoSuscripcion.GRATUITA]: { busquedasMes: 10, perfilesSeguimiento: 5 },
      [TipoSuscripcion.BASICA]: { busquedasMes: 50, perfilesSeguimiento: 20 },
      [TipoSuscripcion.PREMIUM]: { busquedasMes: 200, perfilesSeguimiento: 50 },
      [TipoSuscripcion.EMPRESARIAL]: { busquedasMes: 1000, perfilesSeguimiento: 200 },
    };

    return limites[tipo];
  }

  // ========== MÉTODOS DE CRÉDITOS ==========

  /**
   * Obtiene los créditos disponibles de un usuario
   */
  async obtenerCreditos(id: string): Promise<number> {
    const usuario = await this.usuarioRepository.findOne({ where: { id } });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return usuario.creditosDisponibles;
  }

  /**
   * Verifica si el usuario tiene créditos suficientes
   */
  async tieneCreditos(id: string, cantidad: number): Promise<boolean> {
    const creditosDisponibles = await this.obtenerCreditos(id);
    return creditosDisponibles >= cantidad;
  }

  /**
   * Otorga créditos gratuitos iniciales a un nuevo usuario (llamado desde crear)
   */
  private async otorgarCreditosIniciales(usuarioId: string): Promise<void> {
    try {
      const usuario = await this.usuarioRepository.findOne({ where: { id: usuarioId } });
      if (usuario) {
        usuario.creditosDisponibles = 3; // 3 créditos gratuitos
        await this.usuarioRepository.save(usuario);
        this.logger.log(`Créditos iniciales otorgados al usuario ${usuarioId}`);
      }
    } catch (error) {
      this.logger.warn(`No se pudieron otorgar créditos iniciales: ${error.message}`);
    }
  }

  private mapearAResponse(usuario: Usuario): UsuarioResponseDto {
    return {
      id: usuario.id,
      email: usuario.email,
      username: usuario.username,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      estado: usuario.estado,
      rol: usuario.rol,
      tipoSuscripcion: usuario.tipoSuscripcion,
      creadoEn: usuario.creadoEn,
      creditosDisponibles: usuario.creditosDisponibles,
      totalCreditosComprados: usuario.totalCreditosComprados,
      totalCreditosConsumidos: usuario.totalCreditosConsumidos,
    };
  }
}