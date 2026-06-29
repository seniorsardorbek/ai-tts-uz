import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CacheEntry } from "../entities/cache-entry.entity";
import { TtsRequest } from "../entities/tts-request.entity";
import { GradingRecord } from "../entities/grading-record.entity";
import { AnalyticsService } from "./analytics.service";

@Module({
  imports: [TypeOrmModule.forFeature([CacheEntry, TtsRequest, GradingRecord])],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
