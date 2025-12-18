import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompetitorAnalysisController } from './competitor-analysis.controller';
import { CompetitorAnalysisService } from './competitor-analysis.service';
import { CompetitorAnalysis } from './entities/competitor-analysis.entity';
import { VideoAnalysisCache } from './entities/video-analysis-cache.entity';
import { ApifyModule } from '../apify/apify.module';
import { GoogleVideoIntelligenceModule } from '../googleAi/google.module';
import { CreditModule } from '../credits/credit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CompetitorAnalysis, VideoAnalysisCache]),
    ApifyModule,
    GoogleVideoIntelligenceModule,
    CreditModule,
  ],
  controllers: [CompetitorAnalysisController],
  providers: [CompetitorAnalysisService],
  exports: [CompetitorAnalysisService],
})
export class CompetitorAnalysisModule {}
