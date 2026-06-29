import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CacheEntry } from "../entities/cache-entry.entity";
import { CacheController } from "./cache.controller";
import { CacheService } from "./cache.service";
import { ElevenLabsService } from "../tts/elevenlabs.service";

@Module({
  imports: [TypeOrmModule.forFeature([CacheEntry])],
  controllers: [CacheController],
  providers: [CacheService, ElevenLabsService],
})
export class CacheModule {}
