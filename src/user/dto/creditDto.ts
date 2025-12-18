import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { TipoPaqueteCredito, TipoTransaccionCredito, EstadoTransaccion } from './enums';

// ========== DTOs DE PAQUETES DE CRÉDITOS ==========

export class ComprarCreditosDto {
  @ApiProperty({
    description: 'Tipo de paquete de créditos a comprar',
    enum: TipoPaqueteCredito,
    example: TipoPaqueteCredito.BASICO
  })
  @IsEnum(TipoPaqueteCredito, { message: 'El tipo de paquete debe ser válido' })
  @IsNotEmpty()
  tipoPaquete: TipoPaqueteCredito;

  @ApiPropertyOptional({
    description: 'ID de la transacción de pago (para integración con pasarela)',
    example: 'txn_1234567890'
  })
  @IsOptional()
  @IsString()
  pagoId?: string;

  @ApiPropertyOptional({
    description: 'Método de pago utilizado',
    example: 'stripe'
  })
  @IsOptional()
  @IsString()
  metodoPago?: string;
}

export class ConsumarCreditosDto {
  @ApiProperty({
    description: 'Cantidad de créditos a consumir',
    example: 1,
    minimum: 1
  })
  @IsNumber()
  @Min(1, { message: 'Debe consumir al menos 1 crédito' })
  cantidad: number;

  @ApiProperty({
    description: 'Descripción del consumo (ej: análisis de perfil, análisis de competencia)',
    example: 'Análisis de perfil @username'
  })
  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @ApiPropertyOptional({
    description: 'ID del recurso relacionado (ej: ID del análisis)',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  @IsOptional()
  @IsUUID()
  recursoId?: string;
}

export class RegalarCreditosDto {
  @ApiProperty({
    description: 'ID del usuario que recibirá los créditos',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  @IsUUID()
  @IsNotEmpty()
  usuarioDestinoId: string;

  @ApiProperty({
    description: 'Cantidad de créditos a regalar',
    example: 5,
    minimum: 1
  })
  @IsNumber()
  @Min(1, { message: 'Debe regalar al menos 1 crédito' })
  cantidad: number;

  @ApiPropertyOptional({
    description: 'Mensaje o razón del regalo',
    example: 'Regalo de bienvenida'
  })
  @IsOptional()
  @IsString()
  mensaje?: string;
}

// ========== DTOs DE RESPUESTA ==========

export class PaqueteCreditoResponseDto {
  @ApiProperty({
    description: 'ID del paquete',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  id: string;

  @ApiProperty({
    description: 'Tipo de paquete',
    enum: TipoPaqueteCredito,
    example: TipoPaqueteCredito.BASICO
  })
  tipo: TipoPaqueteCredito;

  @ApiProperty({
    description: 'Nombre del paquete',
    example: 'Paquete Básico'
  })
  nombre: string;

  @ApiProperty({
    description: 'Cantidad de créditos incluidos',
    example: 20
  })
  creditos: number;

  @ApiProperty({
    description: 'Precio en USD',
    example: 15
  })
  precio: number;

  @ApiProperty({
    description: 'Descripción del paquete',
    example: 'Ideal para análisis esporádicos'
  })
  descripcion: string;

  @ApiProperty({
    description: 'Si el paquete está activo',
    example: true
  })
  activo: boolean;
}

export class BalanceCreditosResponseDto {
  @ApiProperty({
    description: 'ID del usuario',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  usuarioId: string;

  @ApiProperty({
    description: 'Créditos disponibles actuales',
    example: 15
  })
  creditosDisponibles: number;

  @ApiProperty({
    description: 'Total de créditos comprados históricamente',
    example: 60
  })
  totalComprados: number;

  @ApiProperty({
    description: 'Total de créditos consumidos históricamente',
    example: 45
  })
  totalConsumidos: number;
}

export class TransaccionCreditoResponseDto {
  @ApiProperty({
    description: 'ID de la transacción',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  id: string;

  @ApiProperty({
    description: 'ID del usuario',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  usuarioId: string;

  @ApiProperty({
    description: 'Tipo de transacción',
    enum: TipoTransaccionCredito,
    example: TipoTransaccionCredito.COMPRA
  })
  tipo: TipoTransaccionCredito;

  @ApiProperty({
    description: 'Cantidad de créditos (positivo para compra/regalo, negativo para consumo)',
    example: 20
  })
  cantidad: number;

  @ApiProperty({
    description: 'Balance de créditos después de la transacción',
    example: 35
  })
  balanceResultante: number;

  @ApiProperty({
    description: 'Descripción de la transacción',
    example: 'Compra de paquete básico (20 créditos)'
  })
  descripcion: string;

  @ApiProperty({
    description: 'Estado de la transacción',
    enum: EstadoTransaccion,
    example: EstadoTransaccion.COMPLETADA
  })
  estado: EstadoTransaccion;

  @ApiProperty({
    description: 'Fecha de la transacción',
    example: '2024-01-15T10:30:00.000Z'
  })
  creadoEn: Date;
}

export class HistorialTransaccionesResponseDto {
  @ApiProperty({
    description: 'Lista de transacciones',
    type: [TransaccionCreditoResponseDto]
  })
  transacciones: TransaccionCreditoResponseDto[];

  @ApiProperty({
    description: 'Total de transacciones',
    example: 15
  })
  total: number;

  @ApiProperty({
    description: 'Página actual',
    example: 1
  })
  pagina: number;

  @ApiProperty({
    description: 'Límite por página',
    example: 10
  })
  limite: number;
}
