import { Module } from "@nestjs/common";
import { AnalyticsModule } from "../analytics/analytics.module";
import { GradingService } from "./grading.service";
import { GradeController } from "./grade.controller";

@Module({
  imports: [AnalyticsModule],
  controllers: [GradeController],
  providers: [GradingService],
})
export class GradeModule {}
