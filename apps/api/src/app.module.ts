import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CacheEntry } from "./entities/cache-entry.entity";
import { TtsRequest } from "./entities/tts-request.entity";
import { GradingRecord } from "./entities/grading-record.entity";
import { AdminUser } from "./entities/admin-user.entity";
import { TtsModule } from "./tts/tts.module";
import { GradeModule } from "./grade/grade.module";
import { CacheModule } from "./cache/cache.module";
import { AuthModule } from "./auth/auth.module";
import { AppController } from "./app.controller";
import { SnakeNamingStrategy } from "./common/snake-naming.strategy";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: "postgres",
        host: config.get<string>("DB_HOST", "localhost"),
        port: Number(config.get<string>("DB_PORT", "5432")),
        username: config.get<string>("DB_USER", "postgres"),
        password: config.get<string>("DB_PASSWORD", ""),
        database: config.get<string>("DB_NAME", "coddyjuniorms"),
        entities: [CacheEntry, TtsRequest, GradingRecord, AdminUser],
        namingStrategy: new SnakeNamingStrategy(),
        synchronize: true, // auto-create/update schema (no migrations, per design)
      }),
    }),
    TtsModule,
    GradeModule,
    CacheModule,
    AuthModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
