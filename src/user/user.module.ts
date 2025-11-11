import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Usuario } from './user.Entity/user.Entity';
import { Analysis } from 'src/apify/entity/apify.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Usuario, Analysis])],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService, TypeOrmModule]
})
export class UserModule {}
