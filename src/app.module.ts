import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { ConfigModule } from './config/config.module';
import { ApifyModule } from './apify/apify.module';
import { VideoDownloaderModule } from './apify/downloaderVideo/downloaderFie.module';
import { GoogleVideoIntelligenceModule } from './googleAi/google.module';
import { AnalisisModule } from './analisis/analisis.module';

@Module({
  imports: [ VideoDownloaderModule , GoogleVideoIntelligenceModule,TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'imperio',
      database: 'tick',
      autoLoadEntities: true,
      synchronize: true, // ⚠️ Solo en desarrollo
    }), AuthModule, UserModule, ConfigModule, ApifyModule, AnalisisModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
