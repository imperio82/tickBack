import { Module } from '@nestjs/common';
import { AnalisisController } from './analisis.controller';
import { AnalisisService, AnalysisService } from './analisis.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Analysis } from './analisisentity/analisis.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Analysis])],
  controllers: [AnalisisController],
  providers: [AnalysisService]
})
export class AnalisisModule {}
