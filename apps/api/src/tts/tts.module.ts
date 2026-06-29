import { Module } from "@nestjs/common";
import { AnalyticsModule } from "../analytics/analytics.module";
import { ElevenLabsService } from "./elevenlabs.service";
import { TtsController } from "./tts.controller";

@Module({
  imports: [AnalyticsModule],
  controllers: [TtsController],
  providers: [ElevenLabsService],
})
export class TtsModule {}
