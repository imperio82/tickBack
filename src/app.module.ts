import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule as NestConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { ConfigModule } from './config/config.module';
import { ApifyModule } from './apify/apify.module';
import { VideoDownloaderModule } from './apify/downloaderVideo/downloaderFie.module';
import { GoogleVideoIntelligenceModule } from './googleAi/google.module';
import { AnalisisModule } from './analisis/analisis.module';
import { CompetitorAnalysisModule } from './competitor-analysis/competitor-analysis.module';
import { ProfileAnalysisModule } from './profile-analysis/profile-analysis.module';
import { CreditModule } from './credits/credit.module';
import { CalendarModule } from './calendar/calendar.module';

@Module({
  imports: [
    // Configuración de variables de entorno
    NestConfigModule.forRoot({
      isGlobal: true, // Hace que ConfigService esté disponible en todos los módulos
      envFilePath: '.env',
    }),
    VideoDownloaderModule,
    GoogleVideoIntelligenceModule,
    // Configuración de base de datos usando variables de entorno
    TypeOrmModule.forRootAsync({
      imports: [NestConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USER'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME'),
        autoLoadEntities: true,
        synchronize: true, // ⚠️ Cambiar a false en producción
        logging: false,
      }),
    }),
    AuthModule,
    UserModule,
    ConfigModule,
    ApifyModule,
    AnalisisModule,
    CompetitorAnalysisModule,
    ProfileAnalysisModule,
    CreditModule,
    CalendarModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
