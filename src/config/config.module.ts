import { Module } from '@nestjs/common';
import { ConfigController } from './config.controller';
import { ConfigService } from './config.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Usuario } from 'src/user/user.Entity/user.Entity';
import { ConfiguracionAnalisis } from './entity/config.Entity';

@Module({
  imports: [TypeOrmModule.forFeature([ConfiguracionAnalisis])],
  controllers: [ConfigController],
  providers: [ConfigService]
})
export class ConfigModule {}
