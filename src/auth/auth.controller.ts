import { Body, Controller, Get, HttpCode, Post, UnauthorizedException, UseGuards, Request, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from './guards/autGuard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { LoginDto } from './dto/authdto';
import { AuthService } from './auth.service';

class TokenResponse {
  access_token: string;
  refresh_token: string;
}

class UserResponse {
  id: number;
  email: string;
  name: string;
  role?: string;
  createdAt: Date;
  updatedAt: Date;
}

@ApiTags('Autenticación')
@Controller('auth')
export class AuthController {
      constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Iniciar sesión',
    description: 'Inicia sesión con email y contraseña válidos y retorna tokens',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Login exitoso', type: TokenResponse })
  @ApiUnauthorizedResponse({ description: 'Credenciales inválidas' })
  async login(@Body() loginDto: LoginDto): Promise<TokenResponse> {
    const user = await this.authService.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    return this.authService.login(user);
  }

  @Post('refresh')
  @UseGuards(JwtRefreshGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Refrescar token de acceso',
    description: 'Retorna un nuevo access_token si el refresh_token es válido',
  })
  @ApiResponse({ status: 200, description: 'Token refrescado correctamente', schema: {
    properties: {
      access_token: { type: 'string', example: 'nuevo-access-token' }
    }
  }})
  @ApiUnauthorizedResponse({ description: 'Refresh token inválido o expirado' })
  async refresh(@Request() req): Promise<{ access_token: string }> {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      throw new UnauthorizedException('Token no encontrado');
    }
    return this.authService.refreshToken(token);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Obtener información del usuario autenticado',
    description: 'Retorna la información del usuario actual basada en el token JWT',
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Información del usuario obtenida correctamente',
    type: UserResponse 
  })
  @ApiUnauthorizedResponse({ description: 'Token inválido o expirado' })
  async getMe(@Request() req): Promise<UserResponse> {
    // req.user contiene la información del usuario decodificada del JWT
    return this.authService.getMe(req.user.userId);
  }
}
