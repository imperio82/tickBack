import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { RolUsuario } from '../user/dto/enums';

/**
 * Guard para proteger endpoints que requieren permisos de administrador
 *
 * Uso:
 * @UseGuards(JwtAuthGuard, AdminGuard)
 *
 * Nota: Este guard debe usarse DESPUÉS de un guard de autenticación (como JwtAuthGuard)
 * que establezca el usuario en request.user
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Verificar que el usuario esté autenticado
    if (!user) {
      throw new UnauthorizedException(
        'Debes estar autenticado para acceder a este recurso',
      );
    }

    // Verificar que el usuario tenga rol de admin
    if (user.rol !== RolUsuario.ADMIN) {
      throw new ForbiddenException(
        'No tienes permisos de administrador para acceder a este recurso',
      );
    }

    return true;
  }
}
