import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';
import { ScheduledPost } from './entities/scheduled-post.entity';
import { ContentCalendar } from './entities/content-calendar.entity';
import { CompetitorAnalysis } from '../competitor-analysis/entities/competitor-analysis.entity';
import { ProfileAnalysis } from '../profile-analysis/entities/profile-analysis.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ScheduledPost,
      ContentCalendar,
      CompetitorAnalysis,
      ProfileAnalysis,
    ]),
  ],
  controllers: [CalendarController],
  providers: [CalendarService],
  exports: [CalendarService],
})
export class CalendarModule {}
