import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfileAnalysisController } from './profile-analysis.controller';
import { ProfileAnalysisService } from './services/profile-analysis.service';
import { VideoAnalysisJobService } from './services/video-analysis-job.service';
import { VideoAnalysisProcessor } from './processors/video-analysis.processor';
import { ProfileAnalysis } from './entities/profile-analysis.entity';
import { VideoAnalysisJob } from './entities/video-analysis-job.entity';
import { Analysis } from '../apify/entity/apify.entity';
import { VideoAnalysisCache } from '../competitor-analysis/entities/video-analysis-cache.entity';

// Importar módulos necesarios
import { ApifyModule } from '../apify/apify.module';
import { GoogleVideoIntelligenceModule } from '../googleAi/google.module';
import { VideoDownloaderModule } from '../apify/downloaderVideo/downloaderFie.module';
import { CreditModule } from '../credits/credit.module';

@Module({
  imports: [
    // Registrar entidades
    TypeOrmModule.forFeature([
      ProfileAnalysis,
      VideoAnalysisJob,
      Analysis,
      VideoAnalysisCache,
    ]),
    // Importar módulos de dependencias
    ApifyModule,
    GoogleVideoIntelligenceModule,
    VideoDownloaderModule,
    CreditModule,
  ],
  controllers: [ProfileAnalysisController],
  providers: [
    ProfileAnalysisService,
    VideoAnalysisJobService,
    VideoAnalysisProcessor,
  ],
  exports: [
    ProfileAnalysisService,
    VideoAnalysisJobService,
    VideoAnalysisProcessor,
  ],
})
export class ProfileAnalysisModule {}
