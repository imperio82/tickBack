// src/modules/google-video-intelligence.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GoogleVideoIntelligenceService } from './google-video-intelligence.service';
import { GoogleAIService } from './iaLenguageGeneta';
import { AIServicesController } from './googleAI.controller';

@Module({
  controllers: [AIServicesController],
  imports: [ConfigModule],
  providers: [GoogleVideoIntelligenceService, GoogleAIService],
  exports: [GoogleVideoIntelligenceService, GoogleAIService],
})
export class GoogleVideoIntelligenceModule {}