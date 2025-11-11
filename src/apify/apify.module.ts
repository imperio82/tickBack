import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

// Importar las entidades si las necesitas
import { Usuario } from 'src/user/user.Entity/user.Entity';

// Importar los controladores y servicios de Apify
import { TikTokController } from './apify.controller';

// Importar los servicios
import { TikTokApifyService } from './apify.service';
import { AnalysisService } from './Analisys.services';
import { Analysis } from './entity/apify.entity';
import { AnalysisController } from './analiticsController/Analisys.controller';

@Module({
  imports: [
    // Importar ConfigModule para acceder a las variables de entorno
    ConfigModule,
    
    // Si necesitas entidades de base de datos, importa TypeOrmModule
    TypeOrmModule.forFeature([
      Usuario,
      Analysis
    ]),
  ],
  controllers: [
    TikTokController,
    AnalysisController

  ],
  providers: [
    // Servicios de Apify
    TikTokApifyService,
    AnalysisService
    
    // ConfigService ya está disponible a través de ConfigModule
  ],
  exports: [
    // Exportar servicios que otros módulos puedan necesitar
    TikTokApifyService,
  ],
})
export class ApifyModule {}