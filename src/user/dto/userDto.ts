// ========== DTOs CON SWAGGER ==========

import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsDate, IsEmail, IsEnum, IsOptional, IsString, MinLength } from "class-validator";
import { Type } from "class-transformer";
import { EstadoUsuario, TipoSuscripcion } from "./enums";

export class CrearUsuarioDto {
  @ApiProperty({
    description: 'Email único del usuario',
    example: 'juan.perez@ejemplo.com',
    format: 'email'
  })
  @IsEmail({}, { message: 'El email debe tener un formato válido' })
  email: string;

  @ApiProperty({
    description: 'Nombre de usuario único',
    example: 'juanperez123',
    minLength: 3,
    maxLength: 50
  })
  @IsString({ message: 'El username debe ser un string' })
  @MinLength(3, { message: 'El username debe tener al menos 3 caracteres' })
  username: string;

  @ApiProperty({
    description: 'Contraseña del usuario (será hasheada)',
    example: 'MiPasswordSegura123!',
    minLength: 8
  })
  @IsString({ message: 'La contraseña debe ser un string' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password: string;

  @ApiProperty({
    description: 'Nombre del usuario',
    example: 'Juan'
  })
  @IsString({ message: 'El nombre debe ser un string' })
  nombre: string;

  @ApiProperty({
    description: 'Apellido del usuario',
    example: 'Pérez'
  })
  @IsString({ message: 'El apellido debe ser un string' })
  apellido: string;

  @ApiProperty({
    description: 'Teléfono del usuario (opcional)',
    example: '+57 300 123 4567',
    required: false
  })
  @IsOptional()
  @IsString({ message: 'El teléfono debe ser un string' })
  telefono?: string;

  @ApiProperty({
    description: 'Empresa donde trabaja (opcional)',
    example: 'Tech Solutions S.A.S',
    required: false
  })
  @IsOptional()
  @IsString({ message: 'La empresa debe ser un string' })
  empresa?: string;

  @ApiProperty({
    description: 'Cargo en la empresa (opcional)',
    example: 'Desarrollador Full Stack',
    required: false
  })
  @IsOptional()
  @IsString({ message: 'El cargo debe ser un string' })
  cargo?: string;
}

export class ActualizarUsuarioDto {
  @ApiProperty({
    description: 'Nombre del usuario',
    example: 'Juan Carlos',
    required: false
  })
  @IsOptional()
  @IsString({ message: 'El nombre debe ser un string' })
  nombre?: string;

  @ApiProperty({
    description: 'Apellido del usuario',
    example: 'Pérez García',
    required: false
  })
  @IsOptional()
  @IsString({ message: 'El apellido debe ser un string' })
  apellido?: string;

  @ApiProperty({
    description: 'Teléfono del usuario',
    example: '+57 300 123 4567',
    required: false
  })
  @IsOptional()
  @IsString({ message: 'El teléfono debe ser un string' })
  telefono?: string;

  @ApiProperty({
    description: 'Fecha de nacimiento',
    example: '1990-05-15',
    type: 'string',
    format: 'date',
    required: false
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'La fecha de nacimiento debe ser válida' })
  fechaNacimiento?: Date;

  @ApiProperty({
    description: 'Empresa donde trabaja',
    example: 'Tech Solutions S.A.S',
    required: false
  })
  @IsOptional()
  @IsString({ message: 'La empresa debe ser un string' })
  empresa?: string;

  @ApiProperty({
    description: 'Cargo en la empresa',
    example: 'Senior Full Stack Developer',
    required: false
  })
  @IsOptional()
  @IsString({ message: 'El cargo debe ser un string' })
  cargo?: string;

  @ApiProperty({
    description: 'Sitio web personal o profesional',
    example: 'https://juanperez.dev',
    required: false
  })
  @IsOptional()
  @IsString({ message: 'El sitio web debe ser un string' })
  sitioWeb?: string;

  @ApiProperty({
    description: 'Estado del usuario',
    enum: EstadoUsuario,
    example: EstadoUsuario.ACTIVO,
    required: false
  })
  @IsOptional()
  @IsEnum(EstadoUsuario, { message: 'El estado debe ser válido' })
  estado?: EstadoUsuario;

  @ApiProperty({
    description: 'Habilitar notificaciones por email',
    example: true,
    required: false
  })
  @IsOptional()
  @IsBoolean({ message: 'Las notificaciones de email deben ser booleanas' })
  notificacionesEmail?: boolean;

  @ApiProperty({
    description: 'Habilitar notificaciones push',
    example: false,
    required: false
  })
  @IsOptional()
  @IsBoolean({ message: 'Las notificaciones push deben ser booleanas' })
  notificacionesPush?: boolean;
}

export class ActualizarSuscripcionDto {
  @ApiProperty({
    description: 'Tipo de suscripción',
    enum: TipoSuscripcion,
    example: TipoSuscripcion.PREMIUM
  })
  @IsEnum(TipoSuscripcion, { message: 'El tipo de suscripción debe ser válido' })
  tipoSuscripcion: TipoSuscripcion;

  @ApiProperty({
    description: 'Fecha de vencimiento de la suscripción',
    example: '2024-12-31T23:59:59.000Z',
    type: 'string',
    format: 'date-time',
    required: false
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'La fecha de vencimiento debe ser válida' })
  fechaVencimiento?: Date;
}

export class UsuarioResponseDto {
  @ApiProperty({
    description: 'ID único del usuario',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  id: string;

  @ApiProperty({
    description: 'Email del usuario',
    example: 'juan.perez@ejemplo.com'
  })
  email: string;

  @ApiProperty({
    description: 'Nombre de usuario',
    example: 'juanperez123'
  })
  username: string;

  @ApiProperty({
    description: 'Nombre completo',
    example: 'Juan'
  })
  nombre: string;

  @ApiProperty({
    description: 'Apellido',
    example: 'Pérez'
  })
  apellido: string;

  @ApiProperty({
    description: 'Estado actual del usuario',
    enum: EstadoUsuario,
    example: EstadoUsuario.ACTIVO
  })
  estado: EstadoUsuario;

  @ApiProperty({
    description: 'Tipo de suscripción',
    enum: TipoSuscripcion,
    example: TipoSuscripcion.GRATUITA
  })
  tipoSuscripcion: TipoSuscripcion;

  @ApiProperty({
    description: 'Fecha de creación',
    example: '2024-01-15T10:30:00.000Z'
  })
  creadoEn: Date;
}

export class ListarUsuariosResponseDto {
  @ApiProperty({
    description: 'Lista de usuarios',
    type: [UsuarioResponseDto]
  })
  usuarios: UsuarioResponseDto[];

  @ApiProperty({
    description: 'Total de usuarios',
    example: 150
  })
  total: number;
}

export class ErrorResponseDto {
  @ApiProperty({
    description: 'Código de estado HTTP',
    example: 400
  })
  statusCode: number;

  @ApiProperty({
    description: 'Mensaje de error',
    example: 'El email ya está registrado'
  })
  message: string;

  @ApiProperty({
    description: 'Tipo de error',
    example: 'Bad Request'
  })
  error: string;

  @ApiProperty({
    description: 'Timestamp del error',
    example: '2024-01-15T10:30:00.000Z'
  })
  timestamp: string;

  @ApiProperty({
    description: 'Ruta donde ocurrió el error',
    example: '/api/v1/user'
  })
  path: string;
}