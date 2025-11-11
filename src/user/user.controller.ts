import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ValidationPipe,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiConflictResponse,
} from '@nestjs/swagger';
import { UserService } from './user.service';
import { ActualizarSuscripcionDto, ActualizarUsuarioDto, CrearUsuarioDto, ErrorResponseDto, ListarUsuariosResponseDto, UsuarioResponseDto } from './dto/userDto';



// ========== CONTROLADOR ==========

@ApiTags('👤 Usuarios')
@Controller('user')
@ApiBearerAuth('JWT-auth')
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(private readonly UserService: UserService) {}

  // ========== CREAR USUARIO ==========
  @Post()
  @ApiOperation({
    summary: 'Crear nuevo usuario',
    description: 'Registra un nuevo usuario en el sistema con validaciones de unicidad para email y username'
  })
  @ApiCreatedResponse({
    description: 'Usuario creado exitosamente',
    type: UsuarioResponseDto
  })
  @ApiBadRequestResponse({
    description: 'Datos de entrada inválidos',
    type: ErrorResponseDto
  })
  @ApiConflictResponse({
    description: 'El email o username ya están registrados',
    type: ErrorResponseDto
  })
  @ApiBody({
    type: CrearUsuarioDto,
    description: 'Datos para crear el usuario'
  })
  async crear(
    @Body(new ValidationPipe({ transform: true })) crearUsuarioDto: CrearUsuarioDto
  ): Promise<UsuarioResponseDto> {
    try {
      this.logger.log(`Solicitud de creación de usuario: ${crearUsuarioDto.email}`);
      return await this.UserService.crear(crearUsuarioDto);
    } catch (error) {
      this.logger.error(`Error en crear usuario: ${error.message}`);
      throw error;
    }
  }

  // ========== OBTENER USUARIO POR ID ==========
  @Get(':id')
  @ApiOperation({
    summary: 'Obtener usuario por ID',
    description: 'Recupera los datos de un usuario específico por su ID único'
  })
  @ApiParam({
    name: 'id',
    description: 'ID único del usuario',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  @ApiOkResponse({
    description: 'Usuario encontrado',
    type: UsuarioResponseDto
  })
  @ApiNotFoundResponse({
    description: 'Usuario no encontrado',
    type: ErrorResponseDto
  })
  @ApiBadRequestResponse({
    description: 'ID inválido',
    type: ErrorResponseDto
  })
  async obtenerPorId(@Param('id') id: string): Promise<UsuarioResponseDto> {
    try {
      this.logger.log(`Solicitud de obtener usuario por ID: ${id}`);
      return await this.UserService.obtenerPorId(id);
    } catch (error) {
      this.logger.error(`Error en obtener usuario por ID: ${error.message}`);
      throw error;
    }
  }

  // ========== OBTENER USUARIO POR EMAIL ==========
  @Get('email/:email')
  @ApiOperation({
    summary: 'Obtener usuario por email',
    description: 'Recupera los datos de un usuario específico por su email'
  })
  @ApiParam({
    name: 'email',
    description: 'Email del usuario',
    example: 'juan.perez@ejemplo.com'
  })
  @ApiOkResponse({
    description: 'Usuario encontrado',
    type: UsuarioResponseDto
  })
  @ApiNotFoundResponse({
    description: 'Usuario no encontrado',
    type: ErrorResponseDto
  })
  @ApiBadRequestResponse({
    description: 'Email inválido',
    type: ErrorResponseDto
  })
  async obtenerPorEmail(@Param('email') email: string): Promise<UsuarioResponseDto> {
    try {
      this.logger.log(`Solicitud de obtener usuario por email: ${email}`);
      return await this.UserService.obtenerPorEmail(email);
    } catch (error) {
      this.logger.error(`Error en obtener usuario por email: ${error.message}`);
      throw error;
    }
  }

  // ========== LISTAR USUARIOS ==========
  @Get()
  @ApiOperation({
    summary: 'Listar usuarios',
    description: 'Obtiene una lista paginada de usuarios registrados en el sistema'
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Número de página',
    example: 1,
    type: 'number'
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Cantidad de usuarios por página',
    example: 10,
    type: 'number'
  })
  @ApiOkResponse({
    description: 'Lista de usuarios obtenida exitosamente',
    type: ListarUsuariosResponseDto
  })
  @ApiBadRequestResponse({
    description: 'Parámetros de paginación inválidos',
    type: ErrorResponseDto
  })
  async listar(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10
  ): Promise<ListarUsuariosResponseDto> {
    try {
      this.logger.log(`Solicitud de listar usuarios - Página: ${page}, Límite: ${limit}`);
      return await this.UserService.listar(Number(page), Number(limit));
    } catch (error) {
      this.logger.error(`Error en listar usuarios: ${error.message}`);
      throw error;
    }
  }

  // ========== ACTUALIZAR USUARIO ==========
  @Put(':id')
  @ApiOperation({
    summary: 'Actualizar usuario',
    description: 'Actualiza los datos de un usuario existente'
  })
  @ApiParam({
    name: 'id',
    description: 'ID único del usuario',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  @ApiBody({
    type: ActualizarUsuarioDto,
    description: 'Datos a actualizar del usuario'
  })
  @ApiOkResponse({
    description: 'Usuario actualizado exitosamente',
    type: UsuarioResponseDto
  })
  @ApiNotFoundResponse({
    description: 'Usuario no encontrado',
    type: ErrorResponseDto
  })
  @ApiBadRequestResponse({
    description: 'Datos de entrada inválidos',
    type: ErrorResponseDto
  })
  async actualizar(
    @Param('id') id: string,
    @Body(new ValidationPipe({ transform: true })) actualizarUsuarioDto: ActualizarUsuarioDto
  ): Promise<UsuarioResponseDto> {
    try {
      this.logger.log(`Solicitud de actualizar usuario: ${id}`);
      return await this.UserService.actualizar(id, actualizarUsuarioDto);
    } catch (error) {
      this.logger.error(`Error en actualizar usuario: ${error.message}`);
      throw error;
    }
  }

  // ========== ELIMINAR USUARIO ==========
  @Delete(':id')
  @ApiOperation({
    summary: 'Eliminar usuario',
    description: 'Elimina permanentemente un usuario del sistema'
  })
  @ApiParam({
    name: 'id',
    description: 'ID único del usuario',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  @ApiOkResponse({
    description: 'Usuario eliminado exitosamente'
  })
  @ApiNotFoundResponse({
    description: 'Usuario no encontrado',
    type: ErrorResponseDto
  })
  @ApiBadRequestResponse({
    description: 'ID inválido',
    type: ErrorResponseDto
  })
  async eliminar(@Param('id') id: string): Promise<{ message: string }> {
    try {
      this.logger.log(`Solicitud de eliminar usuario: ${id}`);
      await this.UserService.eliminar(id);
      return { message: 'Usuario eliminado exitosamente' };
    } catch (error) {
      this.logger.error(`Error en eliminar usuario: ${error.message}`);
      throw error;
    }
  }

  // ========== ACTUALIZAR SUSCRIPCIÓN ==========
  @Put(':id/suscripcion')
  @ApiOperation({
    summary: 'Actualizar suscripción',
    description: 'Actualiza el tipo de suscripción y los límites asociados de un usuario'
  })
  @ApiParam({
    name: 'id',
    description: 'ID único del usuario',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  @ApiBody({
    type: ActualizarSuscripcionDto,
    description: 'Datos de la nueva suscripción'
  })
  @ApiOkResponse({
    description: 'Suscripción actualizada exitosamente',
    type: UsuarioResponseDto
  })
  @ApiNotFoundResponse({
    description: 'Usuario no encontrado',
    type: ErrorResponseDto
  })
  @ApiBadRequestResponse({
    description: 'Datos de suscripción inválidos',
    type: ErrorResponseDto
  })
  async actualizarSuscripcion(
    @Param('id') id: string,
    @Body(new ValidationPipe({ transform: true })) actualizarSuscripcionDto: ActualizarSuscripcionDto
  ): Promise<UsuarioResponseDto> {
    try {
      this.logger.log(`Solicitud de actualizar suscripción del usuario: ${id}`);
      return await this.UserService.actualizarSuscripcion(
        id,
        actualizarSuscripcionDto.tipoSuscripcion,
        actualizarSuscripcionDto.fechaVencimiento
      );
    } catch (error) {
      this.logger.error(`Error en actualizar suscripción: ${error.message}`);
      throw error;
    }
  }

  // ========== VERIFICAR EMAIL ==========
  @Put(':id/verificar-email')
  @ApiOperation({
    summary: 'Verificar email',
    description: 'Marca el email del usuario como verificado'
  })
  @ApiParam({
    name: 'id',
    description: 'ID único del usuario',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  @ApiOkResponse({
    description: 'Email verificado exitosamente',
    type: UsuarioResponseDto
  })
  @ApiNotFoundResponse({
    description: 'Usuario no encontrado',
    type: ErrorResponseDto
  })
  @ApiBadRequestResponse({
    description: 'ID inválido',
    type: ErrorResponseDto
  })
  async verificarEmail(@Param('id') id: string): Promise<UsuarioResponseDto> {
    try {
      this.logger.log(`Solicitud de verificar email del usuario: ${id}`);
      return await this.UserService.verificarEmail(id);
    } catch (error) {
      this.logger.error(`Error en verificar email: ${error.message}`);
      throw error;
    }
  }

  // ========== INCREMENTAR BÚSQUEDAS ==========
  @Put(':id/incrementar-busquedas')
  @ApiOperation({
    summary: 'Incrementar búsquedas',
    description: 'Incrementa el contador de búsquedas utilizadas del usuario'
  })
  @ApiParam({
    name: 'id',
    description: 'ID único del usuario',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  @ApiOkResponse({
    description: 'Búsquedas incrementadas exitosamente'
  })
  @ApiNotFoundResponse({
    description: 'Usuario no encontrado',
    type: ErrorResponseDto
  })
  @ApiBadRequestResponse({
    description: 'Límite de búsquedas alcanzado o ID inválido',
    type: ErrorResponseDto
  })
  async incrementarBusquedas(@Param('id') id: string): Promise<{ message: string }> {
    try {
      this.logger.log(`Solicitud de incrementar búsquedas del usuario: ${id}`);
      await this.UserService.incrementarBusquedas(id);
      return { message: 'Búsquedas incrementadas exitosamente' };
    } catch (error) {
      this.logger.error(`Error en incrementar búsquedas: ${error.message}`);
      throw error;
    }
  }
}