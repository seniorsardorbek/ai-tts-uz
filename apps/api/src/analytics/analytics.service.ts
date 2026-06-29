import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CacheEntry } from "../entities/cache-entry.entity";
import { TtsRequest } from "../entities/tts-request.entity";
import { GradingRecord } from "../entities/grading-record.entity";

export interface LessonCtx {
  lessonId: string | null;
  studentUuid: string | null;
  lessonName: string | null;
}

// All methods are FIRE-AND-FORGET: callers do NOT await them, and they never
// throw — a lost analytics row must never affect the user-facing response.
@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger("Analytics");

  constructor(
    @InjectRepository(CacheEntry) private readonly cacheRepo: Repository<CacheEntry>,
    @InjectRepository(TtsRequest) private readonly ttsRepo: Repository<TtsRequest>,
    @InjectRepository(GradingRecord) private readonly gradeRepo: Repository<GradingRecord>,
  ) {}

  recordTtsRequest(data: {
    cacheKey: string;
    gender: string;
    cacheHit: boolean;
    ctx: LessonCtx;
  }): void {
    this.ttsRepo
      .insert({
        cacheKey: data.cacheKey,
        gender: data.gender,
        cacheHit: data.cacheHit,
        lessonId: data.ctx.lessonId,
        studentUuid: data.ctx.studentUuid,
        lessonName: data.ctx.lessonName,
      })
      .catch((e) => this.logger.warn(`tts log failed: ${e.message || e}`));
  }

  // Lazy upsert — idempotent. The request always carries the text, so old files
  // (cached before tracking) get their CacheEntry (and text) created on next use.
  upsertCacheEntry(entry: {
    cacheKey: string;
    gender: string;
    text: string;
    sizeBytes: number;
    createdAt: Date;
  }): void {
    this.cacheRepo
      .upsert(entry, ["cacheKey"])
      .catch((e) => this.logger.warn(`cache upsert failed: ${e.message || e}`));
  }

  recordGrading(data: {
    ctx: LessonCtx;
    mode: string;
    lang: string;
    question: string;
    rubric: string;
    answerText: string | null;
    transcript: string | null;
    correct: boolean;
    feedback: string;
  }): void {
    this.gradeRepo
      .insert({
        lessonId: data.ctx.lessonId,
        studentUuid: data.ctx.studentUuid,
        lessonName: data.ctx.lessonName,
        mode: data.mode,
        lang: data.lang,
        question: data.question,
        rubric: data.rubric,
        answerText: data.answerText,
        transcript: data.transcript,
        correct: data.correct,
        feedback: data.feedback,
      })
      .catch((e) => this.logger.warn(`grade log failed: ${e.message || e}`));
  }
}
