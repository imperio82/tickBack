import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CreditPackage } from './entities/credit-package.entity';
import { CreditTransaction } from './entities/credit-transaction.entity';
import { Usuario } from '../user/user.Entity/user.Entity';
import {
  TipoPaqueteCredito,
  TipoTransaccionCredito,
  EstadoTransaccion
} from '../user/dto/enums';

@Injectable()
export class CreditService {
  private readonly logger = new Logger(CreditService.name);

  constructor(
    @InjectRepository(CreditPackage)
    private readonly creditPackageRepository: Repository<CreditPackage>,
    @InjectRepository(CreditTransaction)
    private readonly creditTransactionRepository: Repository<CreditTransaction>,
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    private readonly dataSource: DataSource,
  ) {}

  // ========== INICIALIZACIÓN DE PAQUETES ==========

  /**
   * Inicializa los paquetes de créditos por defecto
   */
  async inicializarPaquetes(): Promise<void> {
    this.logger.log('Inicializando paquetes de créditos...');

    const paquetes = [
      {
        tipo: TipoPaqueteCredito.GRATIS,
        nombre: 'Paquete Gratuito',
        descripcion: 'Perfecto para probar la plataforma',
        creditos: 3,
        precio: 0,
        activo: true,
        metadata: {
          destacado: false,
          etiqueta: 'Gratis',
          caracteristicas: ['3 análisis completos', 'Soporte por email'],
        },
      },
      {
        tipo: TipoPaqueteCredito.BASICO,
        nombre: 'Paquete Básico',
        descripcion: 'Ideal para análisis esporádicos',
        creditos: 20,
        precio: 15,
        activo: true,
        metadata: {
          destacado: false,
          etiqueta: 'Ahorro 25%',
          caracteristicas: [
            '20 análisis completos',
            'Soporte prioritario',
            'Historial ilimitado',
          ],
        },
      },
      {
        tipo: TipoPaqueteCredito.ESTANDAR,
        nombre: 'Paquete Estándar',
        descripcion: 'Para análisis regulares de competencia',
        creditos: 60,
        precio: 40,
        activo: true,
        metadata: {
          destacado: true,
          etiqueta: 'Más Popular',
          caracteristicas: [
            '60 análisis completos',
            'Soporte prioritario',
            'Historial ilimitado',
            'Exportación de datos',
          ],
        },
      },
      {
        tipo: TipoPaqueteCredito.PREMIUM,
        nombre: 'Paquete Premium',
        descripcion: 'Máxima capacidad para análisis intensivos',
        creditos: 200,
        precio: 100,
        activo: true,
        metadata: {
          destacado: false,
          etiqueta: 'Mejor Valor',
          caracteristicas: [
            '200 análisis completos',
            'Soporte premium 24/7',
            'Historial ilimitado',
            'Exportación de datos',
            'API de integración',
          ],
        },
      },
    ];

    for (const paqueteData of paquetes) {
      const existe = await this.creditPackageRepository.findOne({
        where: { tipo: paqueteData.tipo },
      });

      if (!existe) {
        const paquete = this.creditPackageRepository.create(paqueteData);
        await this.creditPackageRepository.save(paquete);
        this.logger.log(`Paquete creado: ${paqueteData.nombre}`);
      }
    }

    this.logger.log('Paquetes de créditos inicializados');
  }

  // ========== GESTIÓN DE PAQUETES ==========

  /**
   * Obtiene todos los paquetes activos
   */
  async obtenerPaquetesActivos(): Promise<CreditPackage[]> {
    return this.creditPackageRepository.find({
      where: { activo: true },
      order: { precio: 'ASC' },
    });
  }

  /**
   * Obtiene un paquete por tipo
   */
  async obtenerPaquetePorTipo(tipo: TipoPaqueteCredito): Promise<CreditPackage> {
    const paquete = await this.creditPackageRepository.findOne({
      where: { tipo },
    });

    if (!paquete) {
      throw new NotFoundException(`Paquete de tipo ${tipo} no encontrado`);
    }

    return paquete;
  }

  // ========== COMPRA DE CRÉDITOS ==========

  /**
   * Compra un paquete de créditos
   */
  async comprarCreditos(
    usuarioId: string,
    tipoPaquete: TipoPaqueteCredito,
    pagoId?: string,
    metodoPago?: string,
  ): Promise<CreditTransaction> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Obtener usuario
      const usuario = await queryRunner.manager.findOne(Usuario, {
        where: { id: usuarioId },
      });

      if (!usuario) {
        throw new NotFoundException('Usuario no encontrado');
      }

      // Obtener paquete
      const paquete = await queryRunner.manager.findOne(CreditPackage, {
        where: { tipo: tipoPaquete, activo: true },
      });

      if (!paquete) {
        throw new NotFoundException('Paquete no encontrado o inactivo');
      }

      // Validar pago si no es paquete gratuito
      if (paquete.precio > 0 && !pagoId) {
        throw new BadRequestException(
          'Se requiere ID de pago para paquetes de pago',
        );
      }

      // Verificar si ya usó el paquete gratuito
      if (paquete.tipo === TipoPaqueteCredito.GRATIS) {
        const yaUsoGratis = await queryRunner.manager.findOne(CreditTransaction, {
          where: {
            usuarioId,
            tipo: TipoTransaccionCredito.COMPRA,
            paqueteId: paquete.id,
          },
        });

        if (yaUsoGratis) {
          throw new ConflictException(
            'Ya has utilizado tu paquete gratuito. Elige otro paquete.',
          );
        }
      }

      const balanceAnterior = usuario.creditosDisponibles;
      const nuevoBalance = balanceAnterior + paquete.creditos;

      // Actualizar créditos del usuario
      usuario.creditosDisponibles = nuevoBalance;
      usuario.totalCreditosComprados += paquete.creditos;
      await queryRunner.manager.save(usuario);

      // Crear transacción
      const transaccion = queryRunner.manager.create(CreditTransaction, {
        usuarioId,
        tipo: TipoTransaccionCredito.COMPRA,
        cantidad: paquete.creditos,
        balanceAnterior,
        balanceResultante: nuevoBalance,
        descripcion: `Compra de ${paquete.nombre} (${paquete.creditos} créditos)`,
        estado: EstadoTransaccion.COMPLETADA,
        paqueteId: paquete.id,
        metadata: {
          pagoId,
          metodoPago,
          precio: paquete.precio,
        },
      });

      const transaccionGuardada = await queryRunner.manager.save(transaccion);

      await queryRunner.commitTransaction();

      this.logger.log(
        `Usuario ${usuarioId} compró ${paquete.creditos} créditos. Nuevo balance: ${nuevoBalance}`,
      );

      return transaccionGuardada;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error comprando créditos: ${error.message}`, error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // ========== CONSUMO DE CRÉDITOS ==========

  /**
   * Consume créditos del usuario
   */
  async consumirCreditos(
    usuarioId: string,
    cantidad: number,
    descripcion: string,
    recursoId?: string,
  ): Promise<CreditTransaction> {
    if (cantidad <= 0) {
      throw new BadRequestException('La cantidad debe ser mayor a 0');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Obtener usuario
      const usuario = await queryRunner.manager.findOne(Usuario, {
        where: { id: usuarioId },
      });

      if (!usuario) {
        throw new NotFoundException('Usuario no encontrado');
      }

      // Verificar créditos suficientes
      if (usuario.creditosDisponibles < cantidad) {
        throw new BadRequestException(
          `Créditos insuficientes. Tienes ${usuario.creditosDisponibles} créditos, necesitas ${cantidad}`,
        );
      }

      const balanceAnterior = usuario.creditosDisponibles;
      const nuevoBalance = balanceAnterior - cantidad;

      // Actualizar créditos del usuario
      usuario.creditosDisponibles = nuevoBalance;
      usuario.totalCreditosConsumidos += cantidad;
      await queryRunner.manager.save(usuario);

      // Crear transacción
      const transaccion = queryRunner.manager.create(CreditTransaction, {
        usuarioId,
        tipo: TipoTransaccionCredito.CONSUMO,
        cantidad: -cantidad, // Negativo para consumo
        balanceAnterior,
        balanceResultante: nuevoBalance,
        descripcion,
        estado: EstadoTransaccion.COMPLETADA,
        metadata: {
          recursoId,
        },
      });

      const transaccionGuardada = await queryRunner.manager.save(transaccion);

      await queryRunner.commitTransaction();

      this.logger.log(
        `Usuario ${usuarioId} consumió ${cantidad} créditos. Nuevo balance: ${nuevoBalance}`,
      );

      return transaccionGuardada;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error consumiendo créditos: ${error.message}`, error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Verifica si el usuario tiene créditos suficientes
   */
  async verificarCreditos(usuarioId: string, cantidad: number): Promise<boolean> {
    const usuario = await this.usuarioRepository.findOne({
      where: { id: usuarioId },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return usuario.creditosDisponibles >= cantidad;
  }

  // ========== REGALOS Y REEMBOLSOS ==========

  /**
   * Regala créditos a otro usuario
   */
  async regalarCreditos(
    usuarioOrigenId: string,
    usuarioDestinoId: string,
    cantidad: number,
    mensaje?: string,
  ): Promise<{ transaccionOrigen: CreditTransaction; transaccionDestino: CreditTransaction }> {
    if (cantidad <= 0) {
      throw new BadRequestException('La cantidad debe ser mayor a 0');
    }

    if (usuarioOrigenId === usuarioDestinoId) {
      throw new BadRequestException('No puedes regalarte créditos a ti mismo');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Obtener usuarios
      const usuarioOrigen = await queryRunner.manager.findOne(Usuario, {
        where: { id: usuarioOrigenId },
      });

      const usuarioDestino = await queryRunner.manager.findOne(Usuario, {
        where: { id: usuarioDestinoId },
      });

      if (!usuarioOrigen || !usuarioDestino) {
        throw new NotFoundException('Usuario no encontrado');
      }

      // Verificar créditos suficientes
      if (usuarioOrigen.creditosDisponibles < cantidad) {
        throw new BadRequestException(
          `Créditos insuficientes para regalar. Tienes ${usuarioOrigen.creditosDisponibles} créditos`,
        );
      }

      // Restar créditos del origen
      const balanceOrigenAnterior = usuarioOrigen.creditosDisponibles;
      usuarioOrigen.creditosDisponibles -= cantidad;
      await queryRunner.manager.save(usuarioOrigen);

      // Sumar créditos al destino
      const balanceDestinoAnterior = usuarioDestino.creditosDisponibles;
      usuarioDestino.creditosDisponibles += cantidad;
      await queryRunner.manager.save(usuarioDestino);

      // Crear transacciones
      const transaccionOrigen = await queryRunner.manager.save(
        queryRunner.manager.create(CreditTransaction, {
          usuarioId: usuarioOrigenId,
          tipo: TipoTransaccionCredito.REGALO,
          cantidad: -cantidad,
          balanceAnterior: balanceOrigenAnterior,
          balanceResultante: usuarioOrigen.creditosDisponibles,
          descripcion: `Regalo de ${cantidad} créditos a ${usuarioDestino.username}`,
          estado: EstadoTransaccion.COMPLETADA,
          metadata: {
            usuarioOrigenId: usuarioDestinoId,
            notas: mensaje,
          },
        }),
      );

      const transaccionDestino = await queryRunner.manager.save(
        queryRunner.manager.create(CreditTransaction, {
          usuarioId: usuarioDestinoId,
          tipo: TipoTransaccionCredito.REGALO,
          cantidad: cantidad,
          balanceAnterior: balanceDestinoAnterior,
          balanceResultante: usuarioDestino.creditosDisponibles,
          descripcion: `Regalo de ${cantidad} créditos de ${usuarioOrigen.username}`,
          estado: EstadoTransaccion.COMPLETADA,
          metadata: {
            usuarioOrigenId: usuarioOrigenId,
            notas: mensaje,
          },
        }),
      );

      await queryRunner.commitTransaction();

      this.logger.log(
        `Usuario ${usuarioOrigenId} regaló ${cantidad} créditos a ${usuarioDestinoId}`,
      );

      return { transaccionOrigen, transaccionDestino };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error regalando créditos: ${error.message}`, error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // ========== CONSULTAS ==========

  /**
   * Obtiene el balance de créditos de un usuario
   */
  async obtenerBalance(usuarioId: string) {
    const usuario = await this.usuarioRepository.findOne({
      where: { id: usuarioId },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return {
      usuarioId: usuario.id,
      creditosDisponibles: usuario.creditosDisponibles,
      totalComprados: usuario.totalCreditosComprados,
      totalConsumidos: usuario.totalCreditosConsumidos,
    };
  }

  /**
   * Obtiene el historial de transacciones de un usuario
   */
  async obtenerHistorial(
    usuarioId: string,
    page: number = 1,
    limit: number = 10,
  ) {
    const [transacciones, total] = await this.creditTransactionRepository.findAndCount({
      where: { usuarioId },
      order: { creadoEn: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      relations: ['paquete'],
    });

    return {
      transacciones,
      total,
      pagina: page,
      limite: limit,
    };
  }

  /**
   * Obtiene estadísticas de créditos
   */
  async obtenerEstadisticas(usuarioId: string) {
    const balance = await this.obtenerBalance(usuarioId);

    const transacciones = await this.creditTransactionRepository.find({
      where: { usuarioId },
      order: { creadoEn: 'DESC' },
    });

    const ultimaCompra = transacciones.find(
      t => t.tipo === TipoTransaccionCredito.COMPRA
    );

    const ultimoConsumo = transacciones.find(
      t => t.tipo === TipoTransaccionCredito.CONSUMO
    );

    return {
      ...balance,
      ultimaCompra: ultimaCompra?.creadoEn || null,
      ultimoConsumo: ultimoConsumo?.creadoEn || null,
      totalTransacciones: transacciones.length,
    };
  }

  // ========== MÉTODOS DE ADMINISTRACIÓN ==========

  /**
   * Crea un nuevo paquete de créditos (solo admin)
   */
  async crearPaquete(data: {
    tipo: TipoPaqueteCredito;
    nombre: string;
    creditos: number;
    precio: number;
    descripcion: string;
    activo?: boolean;
    metadata?: any;
  }): Promise<CreditPackage> {
    // Verificar si ya existe un paquete con ese tipo
    const existe = await this.creditPackageRepository.findOne({
      where: { tipo: data.tipo },
    });

    if (existe) {
      throw new ConflictException(
        `Ya existe un paquete de tipo ${data.tipo}. Usa actualizar en su lugar.`,
      );
    }

    const paquete = this.creditPackageRepository.create({
      ...data,
      activo: data.activo !== undefined ? data.activo : true,
    });

    const paqueteGuardado = await this.creditPackageRepository.save(paquete);

    this.logger.log(`Paquete creado: ${paquete.nombre} (ID: ${paqueteGuardado.id})`);

    return paqueteGuardado;
  }

  /**
   * Actualiza un paquete existente (solo admin)
   */
  async actualizarPaquete(
    paqueteId: string,
    data: {
      nombre?: string;
      creditos?: number;
      precio?: number;
      descripcion?: string;
      activo?: boolean;
      metadata?: any;
    },
  ): Promise<CreditPackage> {
    const paquete = await this.creditPackageRepository.findOne({
      where: { id: paqueteId },
    });

    if (!paquete) {
      throw new NotFoundException('Paquete no encontrado');
    }

    // Actualizar solo los campos proporcionados
    Object.assign(paquete, data);

    const paqueteActualizado = await this.creditPackageRepository.save(paquete);

    this.logger.log(`Paquete actualizado: ${paquete.nombre} (ID: ${paqueteId})`);

    return paqueteActualizado;
  }

  /**
   * Elimina un paquete (solo admin)
   */
  async eliminarPaquete(paqueteId: string): Promise<void> {
    const paquete = await this.creditPackageRepository.findOne({
      where: { id: paqueteId },
    });

    if (!paquete) {
      throw new NotFoundException('Paquete no encontrado');
    }

    // Verificar si hay transacciones asociadas
    const transacciones = await this.creditTransactionRepository.count({
      where: { paqueteId },
    });

    if (transacciones > 0) {
      // En lugar de eliminar, desactivar
      paquete.activo = false;
      await this.creditPackageRepository.save(paquete);
      this.logger.warn(
        `Paquete ${paquete.nombre} desactivado en lugar de eliminado (tiene ${transacciones} transacciones)`,
      );
    } else {
      await this.creditPackageRepository.remove(paquete);
      this.logger.log(`Paquete eliminado: ${paquete.nombre} (ID: ${paqueteId})`);
    }
  }

  /**
   * Ajusta créditos de un usuario manualmente (solo admin)
   */
  async ajustarCreditos(
    usuarioId: string,
    cantidad: number,
    descripcion: string,
  ): Promise<CreditTransaction> {
    if (cantidad === 0) {
      throw new BadRequestException('La cantidad no puede ser 0');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const usuario = await queryRunner.manager.findOne(Usuario, {
        where: { id: usuarioId },
      });

      if (!usuario) {
        throw new NotFoundException('Usuario no encontrado');
      }

      const balanceAnterior = usuario.creditosDisponibles;
      const nuevoBalance = balanceAnterior + cantidad;

      if (nuevoBalance < 0) {
        throw new BadRequestException(
          `El ajuste resultaría en un balance negativo (${nuevoBalance})`,
        );
      }

      // Actualizar créditos del usuario
      usuario.creditosDisponibles = nuevoBalance;

      // Actualizar contadores según el tipo de ajuste
      if (cantidad > 0) {
        usuario.totalCreditosComprados += cantidad;
      } else {
        usuario.totalCreditosConsumidos += Math.abs(cantidad);
      }

      await queryRunner.manager.save(usuario);

      // Crear transacción
      const transaccion = queryRunner.manager.create(CreditTransaction, {
        usuarioId,
        tipo: TipoTransaccionCredito.REEMBOLSO, // Usamos REEMBOLSO para ajustes manuales
        cantidad,
        balanceAnterior,
        balanceResultante: nuevoBalance,
        descripcion: `[AJUSTE ADMIN] ${descripcion}`,
        estado: EstadoTransaccion.COMPLETADA,
        metadata: {
          ajusteManual: true,
        },
      });

      const transaccionGuardada = await queryRunner.manager.save(transaccion);

      await queryRunner.commitTransaction();

      this.logger.log(
        `Créditos ajustados para usuario ${usuarioId}: ${cantidad > 0 ? '+' : ''}${cantidad}. Nuevo balance: ${nuevoBalance}`,
      );

      return transaccionGuardada;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error ajustando créditos: ${error.message}`, error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Obtiene estadísticas generales del sistema (solo admin)
   */
  async obtenerEstadisticasAdmin() {
    // Total de usuarios
    const totalUsuarios = await this.usuarioRepository.count();

    // Total de créditos vendidos
    const ventasResult = await this.creditTransactionRepository
      .createQueryBuilder('t')
      .select('COALESCE(SUM(t.cantidad), 0)', 'total')
      .where('t.tipo = :tipo', { tipo: TipoTransaccionCredito.COMPRA })
      .andWhere('t.estado = :estado', { estado: EstadoTransaccion.COMPLETADA })
      .getRawOne();
    const totalCreditosVendidos = parseInt(ventasResult?.total || '0');

    // Total de créditos consumidos
    const consumoResult = await this.creditTransactionRepository
      .createQueryBuilder('t')
      .select('COALESCE(SUM(ABS(t.cantidad)), 0)', 'total')
      .where('t.tipo = :tipo', { tipo: TipoTransaccionCredito.CONSUMO })
      .andWhere('t.estado = :estado', { estado: EstadoTransaccion.COMPLETADA })
      .getRawOne();
    const totalCreditosConsumidos = parseInt(consumoResult?.total || '0');

    // Ingresos totales
    const ingresosResult = await this.creditTransactionRepository
      .createQueryBuilder('t')
      .leftJoin('credit_packages', 'p', 't.paqueteId = p.id')
      .select('COALESCE(SUM(p.precio), 0)', 'total')
      .where('t.tipo = :tipo', { tipo: TipoTransaccionCredito.COMPRA })
      .andWhere('t.estado = :estado', { estado: EstadoTransaccion.COMPLETADA })
      .getRawOne();
    const totalIngresos = parseFloat(ingresosResult?.total || '0');

    // Transacciones de hoy
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const manana = new Date(hoy);
    manana.setDate(manana.getDate() + 1);

    const transaccionesHoy = await this.creditTransactionRepository
      .createQueryBuilder('t')
      .where('t.creadoEn >= :hoy', { hoy })
      .andWhere('t.creadoEn < :manana', { manana })
      .getCount();

    // Paquete más popular
    const paquetePopularResult = await this.creditTransactionRepository
      .createQueryBuilder('t')
      .leftJoin('credit_packages', 'p', 't.paqueteId = p.id')
      .select('p.nombre', 'nombre')
      .addSelect('COUNT(*)', 'ventas')
      .where('t.tipo = :tipo', { tipo: TipoTransaccionCredito.COMPRA })
      .andWhere('t.estado = :estado', { estado: EstadoTransaccion.COMPLETADA })
      .andWhere('p.nombre IS NOT NULL')
      .groupBy('p.nombre')
      .orderBy('ventas', 'DESC')
      .limit(1)
      .getRawOne();

    const paqueteMasPopular = paquetePopularResult
      ? {
          nombre: paquetePopularResult.nombre,
          ventas: parseInt(paquetePopularResult.ventas),
        }
      : undefined;

    // Usuarios más activos
    const usuariosActivosResult = await this.creditTransactionRepository
      .createQueryBuilder('t')
      .leftJoin('usuarios', 'u', 't.usuarioId = u.id')
      .select('u.id', 'usuarioId')
      .addSelect('u.username', 'username')
      .addSelect('COUNT(*)', 'analisis')
      .where('t.tipo = :tipo', { tipo: TipoTransaccionCredito.CONSUMO })
      .andWhere('t.estado = :estado', { estado: EstadoTransaccion.COMPLETADA })
      .groupBy('u.id')
      .addGroupBy('u.username')
      .orderBy('analisis', 'DESC')
      .limit(5)
      .getRawMany();

    const usuariosMasActivos = usuariosActivosResult.map((u) => ({
      usuarioId: u.usuarioId,
      username: u.username,
      analisis: parseInt(u.analisis),
    }));

    return {
      totalUsuarios,
      totalCreditosVendidos,
      totalCreditosConsumidos,
      totalIngresos,
      transaccionesHoy,
      paqueteMasPopular,
      usuariosMasActivos,
    };
  }

  /**
   * Obtiene todas las transacciones del sistema (solo admin)
   */
  async obtenerTodasTransacciones(page: number = 1, limit: number = 50) {
    const [transacciones, total] = await this.creditTransactionRepository.findAndCount({
      order: { creadoEn: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      relations: ['paquete', 'usuario'],
    });

    return {
      transacciones,
      total,
      pagina: page,
      limite: limit,
    };
  }
}
