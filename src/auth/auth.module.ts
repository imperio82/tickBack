import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtModule } from '@nestjs/jwt';
import { Usuario } from 'src/user/user.Entity/user.Entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from 'src/user/user.module';
import { JwtStrategy } from './strategy';
import { JwtRefreshStrategy } from './jwtRefreshStrategy';

import * as dotenv from 'dotenv';
dotenv.config();

@Module({
  imports: [JwtModule.register({
    secret: process.env.TOKEN_SECRET,
    signOptions: {expiresIn: process.env.JWT_EXPIRES_IN}
  }), UserModule, TypeOrmModule.forFeature([Usuario])],
  providers: [AuthService, JwtStrategy, JwtRefreshStrategy],
  controllers: [AuthController]
})
export class AuthModule {}
