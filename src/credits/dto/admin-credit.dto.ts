import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsEnum,
  Min,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoPaqueteCredito } from '../../user/dto/enums';

// ========== DTOs para Creación/Actualización de Paquetes ==========

class MetadataPaqueteDto {
  @ApiPropertyOptional({
    description: 'Si el paquete está destacado en la UI',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  destacado?: boolean;

  @ApiPropertyOptional({
    description: 'Etiqueta especial del paquete',
    example: 'Más Popular',
  })
  @IsString()
  @IsOptional()
  etiqueta?: string;

  @ApiPropertyOptional({
    description: 'Lista de características del paquete',
    example: ['Soporte 24/7', 'Análisis ilimitados', 'Exportación de datos'],
  })
  @IsString({ each: true })
  @IsOptional()
  caracteristicas?: string[];
}

export class CreatePackageDto {
  @ApiProperty({
    description: 'Tipo de paquete',
    enum: TipoPaqueteCredito,
    example: TipoPaqueteCredito.BASICO,
  })
  @IsEnum(TipoPaqueteCredito)
  tipo: TipoPaqueteCredito;

  @ApiProperty({
    description: 'Nombre del paquete',
    example: 'Paquete Básico',
  })
  @IsString()
  nombre: string;

  @ApiProperty({
    description: 'Cantidad de créditos del paquete',
    example: 20,
  })
  @IsNumber()
  @Min(0)
  creditos: number;

  @ApiProperty({
    description: 'Precio del paquete en la moneda configurada',
    example: 15.99,
  })
  @IsNumber()
  @Min(0)
  precio: number;

  @ApiProperty({
    description: 'Descripción del paquete',
    example: 'Ideal para análisis esporádicos',
  })
  @IsString()
  descripcion: string;

  @ApiPropertyOptional({
    description: 'Si el paquete está activo',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  activo?: boolean;

  @ApiPropertyOptional({
    description: 'Metadata adicional del paquete',
    type: MetadataPaqueteDto,
  })
  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => MetadataPaqueteDto)
  metadata?: MetadataPaqueteDto;
}

export class UpdatePackageDto {
  @ApiPropertyOptional({
    description: 'Nombre del paquete',
    example: 'Paquete Básico Actualizado',
  })
  @IsString()
  @IsOptional()
  nombre?: string;

  @ApiPropertyOptional({
    description: 'Cantidad de créditos del paquete',
    example: 25,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  creditos?: number;

  @ApiPropertyOptional({
    description: 'Precio del paquete',
    example: 19.99,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  precio?: number;

  @ApiPropertyOptional({
    description: 'Descripción del paquete',
    example: 'Ideal para análisis regulares',
  })
  @IsString()
  @IsOptional()
  descripcion?: string;

  @ApiPropertyOptional({
    description: 'Si el paquete está activo',
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  activo?: boolean;

  @ApiPropertyOptional({
    description: 'Metadata adicional del paquete',
    type: MetadataPaqueteDto,
  })
  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => MetadataPaqueteDto)
  metadata?: MetadataPaqueteDto;
}

// ========== DTOs para Ajuste de Créditos ==========

export class AdjustCreditsDto {
  @ApiProperty({
    description: 'Cantidad de créditos a ajustar (positivo o negativo)',
    example: 10,
  })
  @IsNumber()
  cantidad: number;

  @ApiProperty({
    description: 'Descripción del ajuste',
    example: 'Bonificación por error en el sistema',
  })
  @IsString()
  descripcion: string;
}

// ========== DTOs de Respuesta ==========

export class AdminStatsResponseDto {
  @ApiProperty({
    description: 'Total de usuarios registrados',
    example: 150,
  })
  totalUsuarios: number;

  @ApiProperty({
    description: 'Total de créditos vendidos',
    example: 5000,
  })
  totalCreditosVendidos: number;

  @ApiProperty({
    description: 'Total de créditos consumidos',
    example: 3200,
  })
  totalCreditosConsumidos: number;

  @ApiProperty({
    description: 'Total de ingresos generados',
    example: 1250.5,
  })
  totalIngresos: number;

  @ApiProperty({
    description: 'Transacciones realizadas hoy',
    example: 12,
  })
  transaccionesHoy: number;

  @ApiPropertyOptional({
    description: 'Paquete más popular',
    example: { nombre: 'Paquete Estándar', ventas: 45 },
  })
  paqueteMasPopular?: {
    nombre: string;
    ventas: number;
  };

  @ApiProperty({
    description: 'Usuarios más activos',
    example: [
      { usuarioId: '123', username: 'user1', analisis: 50 },
      { usuarioId: '456', username: 'user2', analisis: 35 },
    ],
  })
  usuariosMasActivos: Array<{
    usuarioId: string;
    username: string;
    analisis: number;
  }>;
}

export class AllTransactionsResponseDto {
  @ApiProperty({
    description: 'Lista de transacciones',
    type: 'array',
  })
  transacciones: any[];

  @ApiProperty({
    description: 'Total de transacciones',
    example: 500,
  })
  total: number;

  @ApiProperty({
    description: 'Página actual',
    example: 1,
  })
  pagina: number;

  @ApiProperty({
    description: 'Límite de resultados por página',
    example: 50,
  })
  limite: number;
}
