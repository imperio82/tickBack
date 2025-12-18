import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ValidationPipe,
  Logger,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiBearerAuth,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { CreditService } from './credit.service';
import {
  ComprarCreditosDto,
  ConsumarCreditosDto,
  RegalarCreditosDto,
  PaqueteCreditoResponseDto,
  BalanceCreditosResponseDto,
  TransaccionCreditoResponseDto,
  HistorialTransaccionesResponseDto,
} from '../user/dto/creditDto';
import {
  CreatePackageDto,
  UpdatePackageDto,
  AdjustCreditsDto,
  AdminStatsResponseDto,
  AllTransactionsResponseDto,
} from './dto/admin-credit.dto';
import { AdminGuard } from '../guards/admin.guard';
import { JwtAuthGuard } from '../auth/guards/autGuard';

@ApiTags('💳 Créditos')
@Controller('credits')
@ApiBearerAuth('JWT-auth')
export class CreditController {
  private readonly logger = new Logger(CreditController.name);

  constructor(private readonly creditService: CreditService) {}

  // ========== PAQUETES ==========

  @Get('packages')
  @ApiOperation({
    summary: 'Obtener paquetes de créditos disponibles',
    description: 'Lista todos los paquetes de créditos activos con sus precios y características'
  })
  @ApiOkResponse({
    description: 'Lista de paquetes obtenida exitosamente',
    type: [PaqueteCreditoResponseDto]
  })
  async obtenerPaquetes(): Promise<PaqueteCreditoResponseDto[]> {
    try {
      this.logger.log('Solicitud de obtener paquetes de créditos');
      const paquetes = await this.creditService.obtenerPaquetesActivos();

      return paquetes.map(p => ({
        id: p.id,
        tipo: p.tipo,
        nombre: p.nombre,
        creditos: p.creditos,
        precio: parseFloat(p.precio.toString()),
        descripcion: p.descripcion,
        activo: p.activo,
      }));
    } catch (error) {
      this.logger.error(`Error obteniendo paquetes: ${error.message}`);
      throw error;
    }
  }

  @Post('packages/initialize')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Inicializar paquetes de créditos',
    description: 'Crea los paquetes de créditos por defecto en la base de datos (solo desarrollo/admin)'
  })
  @ApiOkResponse({
    description: 'Paquetes inicializados exitosamente'
  })
  async inicializarPaquetes(): Promise<{ message: string }> {
    try {
      this.logger.log('Solicitud de inicializar paquetes');
      await this.creditService.inicializarPaquetes();
      return { message: 'Paquetes de créditos inicializados correctamente' };
    } catch (error) {
      this.logger.error(`Error inicializando paquetes: ${error.message}`);
      throw error;
    }
  }

  // ========== COMPRA DE CRÉDITOS ==========

  @Post('purchase/:userId')
  @ApiOperation({
    summary: 'Comprar paquete de créditos',
    description: 'Permite a un usuario comprar un paquete de créditos'
  })
  @ApiParam({
    name: 'userId',
    description: 'ID del usuario que compra',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  @ApiBody({
    type: ComprarCreditosDto,
    description: 'Datos de la compra'
  })
  @ApiCreatedResponse({
    description: 'Créditos comprados exitosamente',
    type: TransaccionCreditoResponseDto
  })
  @ApiNotFoundResponse({
    description: 'Usuario o paquete no encontrado'
  })
  @ApiBadRequestResponse({
    description: 'Datos de compra inválidos'
  })
  @ApiConflictResponse({
    description: 'Ya se usó el paquete gratuito'
  })
  async comprarCreditos(
    @Param('userId') userId: string,
    @Body(new ValidationPipe({ transform: true })) comprarDto: ComprarCreditosDto
  ): Promise<TransaccionCreditoResponseDto> {
    try {
      this.logger.log(`Usuario ${userId} comprando paquete ${comprarDto.tipoPaquete}`);

      const transaccion = await this.creditService.comprarCreditos(
        userId,
        comprarDto.tipoPaquete,
        comprarDto.pagoId,
        comprarDto.metodoPago,
      );

      return {
        id: transaccion.id,
        usuarioId: transaccion.usuarioId,
        tipo: transaccion.tipo,
        cantidad: transaccion.cantidad,
        balanceResultante: transaccion.balanceResultante,
        descripcion: transaccion.descripcion,
        estado: transaccion.estado,
        creadoEn: transaccion.creadoEn,
      };
    } catch (error) {
      this.logger.error(`Error comprando créditos: ${error.message}`);
      throw error;
    }
  }

  // ========== CONSUMO DE CRÉDITOS ==========

  @Post('consume/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Consumir créditos',
    description: 'Consume créditos del usuario para realizar una acción (análisis, etc.)'
  })
  @ApiParam({
    name: 'userId',
    description: 'ID del usuario',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  @ApiBody({
    type: ConsumarCreditosDto,
    description: 'Datos del consumo'
  })
  @ApiOkResponse({
    description: 'Créditos consumidos exitosamente',
    type: TransaccionCreditoResponseDto
  })
  @ApiNotFoundResponse({
    description: 'Usuario no encontrado'
  })
  @ApiBadRequestResponse({
    description: 'Créditos insuficientes o datos inválidos'
  })
  async consumirCreditos(
    @Param('userId') userId: string,
    @Body(new ValidationPipe({ transform: true })) consumirDto: ConsumarCreditosDto
  ): Promise<TransaccionCreditoResponseDto> {
    try {
      this.logger.log(`Usuario ${userId} consumiendo ${consumirDto.cantidad} créditos`);

      const transaccion = await this.creditService.consumirCreditos(
        userId,
        consumirDto.cantidad,
        consumirDto.descripcion,
        consumirDto.recursoId,
      );

      return {
        id: transaccion.id,
        usuarioId: transaccion.usuarioId,
        tipo: transaccion.tipo,
        cantidad: transaccion.cantidad,
        balanceResultante: transaccion.balanceResultante,
        descripcion: transaccion.descripcion,
        estado: transaccion.estado,
        creadoEn: transaccion.creadoEn,
      };
    } catch (error) {
      this.logger.error(`Error consumiendo créditos: ${error.message}`);
      throw error;
    }
  }

  @Get('check/:userId/:cantidad')
  @ApiOperation({
    summary: 'Verificar créditos disponibles',
    description: 'Verifica si el usuario tiene créditos suficientes'
  })
  @ApiParam({
    name: 'userId',
    description: 'ID del usuario',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  @ApiParam({
    name: 'cantidad',
    description: 'Cantidad de créditos requeridos',
    example: 1
  })
  @ApiOkResponse({
    description: 'Resultado de la verificación',
    schema: {
      type: 'object',
      properties: {
        tieneCreditos: { type: 'boolean', example: true },
        mensaje: { type: 'string', example: 'Créditos suficientes' }
      }
    }
  })
  async verificarCreditos(
    @Param('userId') userId: string,
    @Param('cantidad') cantidad: string
  ): Promise<{ tieneCreditos: boolean; mensaje: string }> {
    try {
      const cantidadNum = parseInt(cantidad, 10);
      this.logger.log(`Verificando ${cantidadNum} créditos para usuario ${userId}`);

      const tieneCreditos = await this.creditService.verificarCreditos(userId, cantidadNum);

      return {
        tieneCreditos,
        mensaje: tieneCreditos
          ? 'Créditos suficientes'
          : `Créditos insuficientes. Necesitas comprar más créditos.`
      };
    } catch (error) {
      this.logger.error(`Error verificando créditos: ${error.message}`);
      throw error;
    }
  }

  // ========== REGALOS ==========

  @Post('gift/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Regalar créditos',
    description: 'Permite a un usuario regalar créditos a otro usuario'
  })
  @ApiParam({
    name: 'userId',
    description: 'ID del usuario que regala',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  @ApiBody({
    type: RegalarCreditosDto,
    description: 'Datos del regalo'
  })
  @ApiOkResponse({
    description: 'Créditos regalados exitosamente'
  })
  @ApiNotFoundResponse({
    description: 'Usuario no encontrado'
  })
  @ApiBadRequestResponse({
    description: 'Créditos insuficientes o datos inválidos'
  })
  async regalarCreditos(
    @Param('userId') userId: string,
    @Body(new ValidationPipe({ transform: true })) regalarDto: RegalarCreditosDto
  ): Promise<{ message: string; transacciones: any }> {
    try {
      this.logger.log(
        `Usuario ${userId} regalando ${regalarDto.cantidad} créditos a ${regalarDto.usuarioDestinoId}`
      );

      const resultado = await this.creditService.regalarCreditos(
        userId,
        regalarDto.usuarioDestinoId,
        regalarDto.cantidad,
        regalarDto.mensaje,
      );

      return {
        message: 'Créditos regalados exitosamente',
        transacciones: {
          origen: {
            id: resultado.transaccionOrigen.id,
            cantidad: resultado.transaccionOrigen.cantidad,
            balance: resultado.transaccionOrigen.balanceResultante,
          },
          destino: {
            id: resultado.transaccionDestino.id,
            cantidad: resultado.transaccionDestino.cantidad,
            balance: resultado.transaccionDestino.balanceResultante,
          },
        },
      };
    } catch (error) {
      this.logger.error(`Error regalando créditos: ${error.message}`);
      throw error;
    }
  }

  // ========== CONSULTAS ==========

  @Get('balance/:userId')
  @ApiOperation({
    summary: 'Obtener balance de créditos',
    description: 'Obtiene el balance actual y estadísticas de créditos del usuario'
  })
  @ApiParam({
    name: 'userId',
    description: 'ID del usuario',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  @ApiOkResponse({
    description: 'Balance obtenido exitosamente',
    type: BalanceCreditosResponseDto
  })
  @ApiNotFoundResponse({
    description: 'Usuario no encontrado'
  })
  async obtenerBalance(
    @Param('userId') userId: string
  ): Promise<BalanceCreditosResponseDto> {
    try {
      this.logger.log(`Obteniendo balance de créditos para usuario ${userId}`);
      return await this.creditService.obtenerBalance(userId);
    } catch (error) {
      this.logger.error(`Error obteniendo balance: ${error.message}`);
      throw error;
    }
  }

  @Get('history/:userId')
  @ApiOperation({
    summary: 'Obtener historial de transacciones',
    description: 'Obtiene el historial paginado de transacciones de créditos'
  })
  @ApiParam({
    name: 'userId',
    description: 'ID del usuario',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Número de página',
    example: 1
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Transacciones por página',
    example: 10
  })
  @ApiOkResponse({
    description: 'Historial obtenido exitosamente',
    type: HistorialTransaccionesResponseDto
  })
  @ApiNotFoundResponse({
    description: 'Usuario no encontrado'
  })
  async obtenerHistorial(
    @Param('userId') userId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10
  ): Promise<HistorialTransaccionesResponseDto> {
    try {
      this.logger.log(`Obteniendo historial de usuario ${userId}`);
      const resultado = await this.creditService.obtenerHistorial(
        userId,
        Number(page),
        Number(limit)
      );

      return {
        transacciones: resultado.transacciones.map(t => ({
          id: t.id,
          usuarioId: t.usuarioId,
          tipo: t.tipo,
          cantidad: t.cantidad,
          balanceResultante: t.balanceResultante,
          descripcion: t.descripcion,
          estado: t.estado,
          creadoEn: t.creadoEn,
        })),
        total: resultado.total,
        pagina: resultado.pagina,
        limite: resultado.limite,
      };
    } catch (error) {
      this.logger.error(`Error obteniendo historial: ${error.message}`);
      throw error;
    }
  }

  @Get('stats/:userId')
  @ApiOperation({
    summary: 'Obtener estadísticas de créditos',
    description: 'Obtiene estadísticas detalladas del uso de créditos'
  })
  @ApiParam({
    name: 'userId',
    description: 'ID del usuario',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  @ApiOkResponse({
    description: 'Estadísticas obtenidas exitosamente'
  })
  @ApiNotFoundResponse({
    description: 'Usuario no encontrado'
  })
  async obtenerEstadisticas(@Param('userId') userId: string) {
    try {
      this.logger.log(`Obteniendo estadísticas de usuario ${userId}`);
      return await this.creditService.obtenerEstadisticas(userId);
    } catch (error) {
      this.logger.error(`Error obteniendo estadísticas: ${error.message}`);
      throw error;
    }
  }

  // ========== ENDPOINTS DE ADMINISTRACIÓN ==========

  @Post('packages')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '[ADMIN] Crear nuevo paquete de créditos',
    description: 'Crea un nuevo paquete de créditos. Requiere permisos de administrador.'
  })
  @ApiBody({
    type: CreatePackageDto,
    description: 'Datos del nuevo paquete'
  })
  @ApiCreatedResponse({
    description: 'Paquete creado exitosamente',
    type: PaqueteCreditoResponseDto
  })
  @ApiForbiddenResponse({
    description: 'No tienes permisos de administrador'
  })
  @ApiConflictResponse({
    description: 'Ya existe un paquete con ese tipo'
  })
  async crearPaquete(
    @Body(new ValidationPipe({ transform: true })) createDto: CreatePackageDto
  ) {
    try {
      this.logger.log(`[ADMIN] Creando nuevo paquete: ${createDto.nombre}`);
      return await this.creditService.crearPaquete(createDto);
    } catch (error) {
      this.logger.error(`Error creando paquete: ${error.message}`);
      throw error;
    }
  }

  @Patch('packages/:packageId')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({
    summary: '[ADMIN] Actualizar paquete de créditos',
    description: 'Actualiza un paquete existente. Requiere permisos de administrador.'
  })
  @ApiParam({
    name: 'packageId',
    description: 'ID del paquete a actualizar',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  @ApiBody({
    type: UpdatePackageDto,
    description: 'Datos a actualizar'
  })
  @ApiOkResponse({
    description: 'Paquete actualizado exitosamente',
    type: PaqueteCreditoResponseDto
  })
  @ApiForbiddenResponse({
    description: 'No tienes permisos de administrador'
  })
  @ApiNotFoundResponse({
    description: 'Paquete no encontrado'
  })
  async actualizarPaquete(
    @Param('packageId') packageId: string,
    @Body(new ValidationPipe({ transform: true })) updateDto: UpdatePackageDto
  ) {
    try {
      this.logger.log(`[ADMIN] Actualizando paquete ${packageId}`);
      return await this.creditService.actualizarPaquete(packageId, updateDto);
    } catch (error) {
      this.logger.error(`Error actualizando paquete: ${error.message}`);
      throw error;
    }
  }

  @Delete('packages/:packageId')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[ADMIN] Eliminar paquete de créditos',
    description: 'Elimina o desactiva un paquete. Si tiene transacciones asociadas, solo lo desactiva. Requiere permisos de administrador.'
  })
  @ApiParam({
    name: 'packageId',
    description: 'ID del paquete a eliminar',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  @ApiOkResponse({
    description: 'Paquete eliminado o desactivado exitosamente'
  })
  @ApiForbiddenResponse({
    description: 'No tienes permisos de administrador'
  })
  @ApiNotFoundResponse({
    description: 'Paquete no encontrado'
  })
  async eliminarPaquete(@Param('packageId') packageId: string) {
    try {
      this.logger.log(`[ADMIN] Eliminando paquete ${packageId}`);
      await this.creditService.eliminarPaquete(packageId);
      return { message: 'Paquete eliminado o desactivado exitosamente' };
    } catch (error) {
      this.logger.error(`Error eliminando paquete: ${error.message}`);
      throw error;
    }
  }

  @Post('adjust/:userId')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[ADMIN] Ajustar créditos de un usuario',
    description: 'Ajusta manualmente los créditos de un usuario (positivo o negativo). Requiere permisos de administrador.'
  })
  @ApiParam({
    name: 'userId',
    description: 'ID del usuario',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  @ApiBody({
    type: AdjustCreditsDto,
    description: 'Datos del ajuste'
  })
  @ApiOkResponse({
    description: 'Créditos ajustados exitosamente',
    type: TransaccionCreditoResponseDto
  })
  @ApiForbiddenResponse({
    description: 'No tienes permisos de administrador'
  })
  @ApiNotFoundResponse({
    description: 'Usuario no encontrado'
  })
  @ApiBadRequestResponse({
    description: 'Cantidad inválida o balance resultante negativo'
  })
  async ajustarCreditos(
    @Param('userId') userId: string,
    @Body(new ValidationPipe({ transform: true })) adjustDto: AdjustCreditsDto
  ) {
    try {
      this.logger.log(`[ADMIN] Ajustando ${adjustDto.cantidad} créditos para usuario ${userId}`);
      const transaccion = await this.creditService.ajustarCreditos(
        userId,
        adjustDto.cantidad,
        adjustDto.descripcion
      );

      return {
        id: transaccion.id,
        usuarioId: transaccion.usuarioId,
        tipo: transaccion.tipo,
        cantidad: transaccion.cantidad,
        balanceResultante: transaccion.balanceResultante,
        descripcion: transaccion.descripcion,
        estado: transaccion.estado,
        creadoEn: transaccion.creadoEn,
      };
    } catch (error) {
      this.logger.error(`Error ajustando créditos: ${error.message}`);
      throw error;
    }
  }

  @Get('admin/stats')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({
    summary: '[ADMIN] Obtener estadísticas del sistema',
    description: 'Obtiene estadísticas generales del sistema de créditos. Requiere permisos de administrador.'
  })
  @ApiOkResponse({
    description: 'Estadísticas obtenidas exitosamente',
    type: AdminStatsResponseDto
  })
  @ApiForbiddenResponse({
    description: 'No tienes permisos de administrador'
  })
  async obtenerEstadisticasAdmin() {
    try {
      this.logger.log('[ADMIN] Obteniendo estadísticas del sistema');
      return await this.creditService.obtenerEstadisticasAdmin();
    } catch (error) {
      this.logger.error(`Error obteniendo estadísticas admin: ${error.message}`);
      throw error;
    }
  }

  @Get('transactions')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({
    summary: '[ADMIN] Obtener todas las transacciones',
    description: 'Obtiene todas las transacciones del sistema (no solo de un usuario). Requiere permisos de administrador.'
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Número de página',
    example: 1
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Transacciones por página',
    example: 50
  })
  @ApiOkResponse({
    description: 'Transacciones obtenidas exitosamente',
    type: AllTransactionsResponseDto
  })
  @ApiForbiddenResponse({
    description: 'No tienes permisos de administrador'
  })
  async obtenerTodasTransacciones(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50
  ) {
    try {
      this.logger.log('[ADMIN] Obteniendo todas las transacciones');
      return await this.creditService.obtenerTodasTransacciones(
        Number(page),
        Number(limit)
      );
    } catch (error) {
      this.logger.error(`Error obteniendo transacciones: ${error.message}`);
      throw error;
    }
  }
}
