# Requerimientos del Backend para el Módulo de Admin

## Endpoints que YA DEBERÍAN estar implementados (según SISTEMA_CREDITOS.md)

Según la documentación en `readme/SISTEMA_CREDITOS.md`, estos endpoints ya deberían existir:

### Paquetes de Créditos
- ✅ `GET /credits/packages` - Obtener todos los paquetes
- ✅ `POST /credits/packages/initialize` - Inicializar paquetes predeterminados

### Transacciones
- ✅ `POST /credits/purchase/:userId` - Comprar créditos
- ✅ `POST /credits/consume/:userId` - Consumir créditos
- ✅ `POST /credits/gift/:userId` - Regalar créditos
- ✅ `GET /credits/check/:userId/:cantidad` - Verificar si tiene créditos suficientes

### Consultas
- ✅ `GET /credits/balance/:userId` - Obtener balance de créditos
- ✅ `GET /credits/history/:userId?page=1&limit=10` - Obtener historial paginado
- ✅ `GET /credits/stats/:userId` - Obtener estadísticas detalladas

## Endpoints que NECESITAS IMPLEMENTAR para el módulo de Admin

Estos endpoints son necesarios pero probablemente NO están en el backend actual:

### 1. Gestión de Paquetes (Admin)
```typescript
// Crear un nuevo paquete
POST /credits/packages
Body: {
  tipo: "basico" | "estandar" | "premium" | "gratuito",
  nombre: string,
  creditos: number,
  precio: number,
  descripcion: string,
  activo?: boolean,
  metadata?: {
    destacado?: boolean,
    etiqueta?: string,
    caracteristicas?: string[]
  }
}

// Actualizar un paquete existente
PATCH /credits/packages/:packageId
Body: {
  nombre?: string,
  creditos?: number,
  precio?: number,
  descripcion?: string,
  activo?: boolean,
  metadata?: {
    destacado?: boolean,
    etiqueta?: string,
    caracteristicas?: string[]
  }
}

// Eliminar un paquete
DELETE /credits/packages/:packageId
```

### 2. Gestión de Usuarios (Admin)
```typescript
// Obtener todos los usuarios con información de créditos
GET /user
// O si prefieres un endpoint específico:
GET /admin/users
Response: User[] (incluyendo creditosDisponibles, totalCreditosComprados, totalCreditosConsumidos)

// Ajustar créditos de un usuario (sin ser compra/regalo)
POST /credits/adjust/:userId
Body: {
  cantidad: number,  // Puede ser positivo o negativo
  descripcion: string
}
```

### 3. Estadísticas del Sistema (Admin)
```typescript
// Obtener estadísticas generales del sistema
GET /credits/admin/stats
Response: {
  totalUsuarios: number,
  totalCreditosVendidos: number,
  totalCreditosConsumidos: number,
  totalIngresos: number,
  transaccionesHoy: number,
  paqueteMasPopular?: {
    nombre: string,
    ventas: number
  },
  usuariosMasActivos: [
    {
      usuarioId: string,
      username: string,
      analisis: number
    }
  ]
}
```

### 4. Historial de Transacciones (Admin)
```typescript
// Obtener TODAS las transacciones del sistema (no solo de un usuario)
GET /credits/transactions?page=1&limit=50
Response: {
  transacciones: CreditTransaction[],
  total: number,
  pagina: number,
  limite: number
}
```

## Cambios Necesarios en las Entidades

### Entity: Usuario (user.entity.ts)
Asegúrate de que tenga estos campos:

```typescript
@Entity('usuarios')
export class Usuario {
  // ... campos existentes ...

  @Column({ type: 'varchar', length: 20, default: 'usuario' })
  rol: 'usuario' | 'admin';  // ⚠️ IMPORTANTE: Campo nuevo para roles

  @Column({ type: 'int', default: 3 })
  creditosDisponibles: number;  // ✅ Ya debería existir

  @Column({ type: 'int', default: 0 })
  totalCreditosComprados: number;  // ✅ Ya debería existir

  @Column({ type: 'int', default: 0 })
  totalCreditosConsumidos: number;  // ✅ Ya debería existir
}
```

### Entity: CreditPackage (credit-package.entity.ts)
Debería tener estos campos:

```typescript
@Entity('credit_packages')
export class CreditPackage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  tipo: 'gratuito' | 'basico' | 'estandar' | 'premium';

  @Column({ type: 'varchar' })
  nombre: string;

  @Column({ type: 'int' })
  creditos: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  precio: number;

  @Column({ type: 'text' })
  descripcion: string;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: {
    destacado?: boolean;
    etiqueta?: string;
    caracteristicas?: string[];
  };

  @CreateDateColumn()
  creadoEn: Date;

  @UpdateDateColumn()
  actualizadoEn: Date;
}
```

## Middleware/Guards que necesitas

### 1. AdminGuard
```typescript
// admin.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || user.rol !== 'admin') {
      throw new ForbiddenException('Se requieren permisos de administrador');
    }

    return true;
  }
}
```

### 2. Aplicar el Guard en los controllers
```typescript
// credit.controller.ts
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../guards/admin.guard';

@Controller('credits')
export class CreditController {
  // Endpoints públicos o de usuario
  @Get('packages')
  getPackages() { ... }

  // Endpoints solo para admin
  @Post('packages')
  @UseGuards(JwtAuthGuard, AdminGuard)
  createPackage() { ... }

  @Patch('packages/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  updatePackage() { ... }

  @Delete('packages/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  deletePackage() { ... }

  @Get('admin/stats')
  @UseGuards(JwtAuthGuard, AdminGuard)
  getAdminStats() { ... }

  @Get('transactions')
  @UseGuards(JwtAuthGuard, AdminGuard)
  getAllTransactions() { ... }
}
```

## Implementación del AdminStats endpoint

Ejemplo de cómo implementar el endpoint de estadísticas:

```typescript
// credit.service.ts
async getAdminStats(): Promise<AdminStats> {
  // Total de usuarios
  const totalUsuarios = await this.usuarioRepository.count();

  // Total de créditos vendidos (suma de todas las compras)
  const ventasResult = await this.transactionRepository
    .createQueryBuilder('t')
    .select('SUM(t.cantidad)', 'total')
    .where('t.tipo = :tipo', { tipo: 'compra' })
    .andWhere('t.estado = :estado', { estado: 'completada' })
    .getRawOne();
  const totalCreditosVendidos = parseInt(ventasResult?.total || '0');

  // Total de créditos consumidos
  const consumoResult = await this.transactionRepository
    .createQueryBuilder('t')
    .select('SUM(ABS(t.cantidad))', 'total')
    .where('t.tipo = :tipo', { tipo: 'consumo' })
    .andWhere('t.estado = :estado', { estado: 'completada' })
    .getRawOne();
  const totalCreditosConsumidos = parseInt(consumoResult?.total || '0');

  // Ingresos totales (suma del precio de todos los paquetes vendidos)
  const ingresosResult = await this.transactionRepository
    .createQueryBuilder('t')
    .leftJoin('credit_packages', 'p', 't.paqueteId = p.id')
    .select('SUM(p.precio)', 'total')
    .where('t.tipo = :tipo', { tipo: 'compra' })
    .andWhere('t.estado = :estado', { estado: 'completada' })
    .getRawOne();
  const totalIngresos = parseFloat(ingresosResult?.total || '0');

  // Transacciones de hoy
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const transaccionesHoy = await this.transactionRepository.count({
    where: {
      creadoEn: MoreThanOrEqual(hoy),
    },
  });

  // Paquete más popular
  const paquetePopular = await this.transactionRepository
    .createQueryBuilder('t')
    .leftJoin('credit_packages', 'p', 't.paqueteId = p.id')
    .select('p.nombre', 'nombre')
    .addSelect('COUNT(*)', 'ventas')
    .where('t.tipo = :tipo', { tipo: 'compra' })
    .andWhere('t.estado = :estado', { estado: 'completada' })
    .groupBy('p.nombre')
    .orderBy('ventas', 'DESC')
    .limit(1)
    .getRawOne();

  // Usuarios más activos
  const usuariosActivos = await this.transactionRepository
    .createQueryBuilder('t')
    .leftJoin('usuarios', 'u', 't.usuarioId = u.id')
    .select('u.id', 'usuarioId')
    .addSelect('u.username', 'username')
    .addSelect('COUNT(*)', 'analisis')
    .where('t.tipo = :tipo', { tipo: 'consumo' })
    .andWhere('t.estado = :estado', { estado: 'completada' })
    .groupBy('u.id')
    .addGroupBy('u.username')
    .orderBy('analisis', 'DESC')
    .limit(5)
    .getRawMany();

  return {
    totalUsuarios,
    totalCreditosVendidos,
    totalCreditosConsumidos,
    totalIngresos,
    transaccionesHoy,
    paqueteMasPopular: paquetePopular ? {
      nombre: paquetePopular.nombre,
      ventas: parseInt(paquetePopular.ventas),
    } : undefined,
    usuariosMasActivos: usuariosActivos.map(u => ({
      usuarioId: u.usuarioId,
      username: u.username,
      analisis: parseInt(u.analisis),
    })),
  };
}

// credit.controller.ts
@Get('admin/stats')
@UseGuards(JwtAuthGuard, AdminGuard)
async getAdminStats() {
  return this.creditService.getAdminStats();
}
```

## Checklist de Implementación

### Paso 1: Actualizar Entidades
- [ ] Agregar campo `rol` a la entidad Usuario
- [ ] Asegurarse de que CreditPackage tenga el campo `metadata` tipo JSONB
- [ ] Ejecutar migraciones si es necesario

### Paso 2: Crear/Actualizar Guards
- [ ] Crear `AdminGuard` para proteger endpoints de admin
- [ ] Aplicar guards a endpoints administrativos

### Paso 3: Implementar Endpoints de Admin
- [ ] `POST /credits/packages` - Crear paquete
- [ ] `PATCH /credits/packages/:id` - Actualizar paquete
- [ ] `DELETE /credits/packages/:id` - Eliminar paquete
- [ ] `POST /credits/adjust/:userId` - Ajustar créditos manualmente
- [ ] `GET /credits/admin/stats` - Estadísticas del sistema
- [ ] `GET /credits/transactions` - Todas las transacciones (paginado)

### Paso 4: Actualizar Endpoints Existentes
- [ ] `GET /user` - Asegurarse de que devuelva todos los usuarios con campos de créditos
- [ ] Verificar que todos los endpoints de créditos existentes funcionen correctamente

### Paso 5: Asignar Roles
- [ ] Crear un endpoint o script para asignar rol 'admin' a usuarios específicos
- [ ] Alternativa: Hacerlo manualmente en la base de datos:
  ```sql
  UPDATE usuarios SET rol = 'admin' WHERE email = 'admin@example.com';
  ```

### Paso 6: Probar
- [ ] Probar inicialización de paquetes
- [ ] Probar creación/edición/eliminación de paquetes
- [ ] Probar regalo de créditos
- [ ] Probar estadísticas del sistema
- [ ] Probar protección de rutas (usuario normal no puede acceder a endpoints de admin)

## Scripts SQL Útiles

### Asignar rol de admin a un usuario
```sql
UPDATE usuarios SET rol = 'admin' WHERE email = 'tu-email@example.com';
```

### Verificar paquetes existentes
```sql
SELECT * FROM credit_packages;
```

### Ver transacciones
```sql
SELECT * FROM credit_transactions ORDER BY "creadoEn" DESC LIMIT 20;
```

### Ver usuarios con más créditos
```sql
SELECT username, email, "creditosDisponibles", "totalCreditosComprados", "totalCreditosConsumidos"
FROM usuarios
ORDER BY "creditosDisponibles" DESC
LIMIT 10;
```

## Notas Importantes

1. **Seguridad**: Los endpoints de admin DEBEN estar protegidos con `AdminGuard`
2. **Validación**: Agregar DTOs con class-validator para validar los datos de entrada
3. **Transacciones**: Usar transacciones de base de datos para operaciones críticas
4. **Logs**: Agregar logs de auditoría para operaciones administrativas
5. **CORS**: Asegurarse de que el frontend pueda comunicarse con estos endpoints

## Ejemplo de DTO para crear paquete

```typescript
// create-package.dto.ts
import { IsString, IsNumber, IsBoolean, IsOptional, IsEnum, Min } from 'class-validator';

export class CreatePackageDto {
  @IsEnum(['gratuito', 'basico', 'estandar', 'premium'])
  tipo: string;

  @IsString()
  nombre: string;

  @IsNumber()
  @Min(0)
  creditos: number;

  @IsNumber()
  @Min(0)
  precio: number;

  @IsString()
  descripcion: string;

  @IsBoolean()
  @IsOptional()
  activo?: boolean;

  @IsOptional()
  metadata?: {
    destacado?: boolean;
    etiqueta?: string;
    caracteristicas?: string[];
  };
}
```

## Prioridad de Implementación

**Alta Prioridad** (necesarios para que el módulo funcione):
1. Campo `rol` en Usuario
2. `AdminGuard`
3. `GET /credits/admin/stats`
4. `GET /credits/transactions`
5. `POST /credits/packages` (crear)
6. `PATCH /credits/packages/:id` (actualizar)

**Media Prioridad**:
7. `DELETE /credits/packages/:id`
8. `POST /credits/adjust/:userId`

**Baja Prioridad** (nice to have):
9. Endpoints adicionales de reportes
10. Exportación a CSV/PDF
