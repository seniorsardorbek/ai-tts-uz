import { Body, Controller, Post, Res, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import type { Lang } from "@ai-tts/shared";
import { GradingService } from "./grading.service";
import { AnalyticsService, LessonCtx } from "../analytics/analytics.service";

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
const MIN_ANSWER_LEN = 3;

// grading languages are independent of the TTS voice contract
const GRADE_LANGS = ["uz", "ru"];
const DEFAULT_LANG: Lang = "uz";
const isValidLang = (l: unknown): l is Lang => typeof l === "string" && GRADE_LANGS.includes(l);

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

@Controller("api/grade")
export class GradeController {
  constructor(
    private readonly grading: GradingService,
    private readonly analytics: AnalyticsService,
  ) {}

  // Single endpoint, two modes: application/json (text) or multipart (voice).
  @Post()
  @UseInterceptors(FileInterceptor("audio", { limits: { fileSize: MAX_AUDIO_BYTES } }))
  async grade(
    @Body() body: Record<string, any>,
    @UploadedFile() file: { buffer: Buffer; mimetype: string } | undefined,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const question = typeof body.question === "string" ? body.question.trim() : "";
      const rubric = typeof body.rubric === "string" ? body.rubric.trim() : "";
      const lang = isValidLang(body.lang) ? body.lang : DEFAULT_LANG;
      const mode = file ? "voice" : "text";
      const ctx: LessonCtx = {
        lessonId: str(body.lesson_id),
        studentUuid: str(body.student_uuid),
        lessonName: str(body.lesson_name),
      };

      if (!question) {
        res.status(400).json({ error: "question is required" });
        return;
      }
      if (!rubric) {
        res.status(400).json({ error: "rubric is required" });
        return;
      }

      console.log(
        `[grade] lesson=${ctx.lessonId ?? "-"} student=${ctx.studentUuid ?? "-"} mode=${mode} lang=${lang}`,
      );

      let answerText: string | null = null;
      let result;
      if (mode === "voice") {
        if (!file || !file.buffer?.length) {
          res.status(400).json({ error: "audio file is required" });
          return;
        }
        result = await this.grading.gradeVoice(question, rubric, lang, file.buffer);
      } else {
        answerText = typeof body.answerText === "string" ? body.answerText.trim() : "";
        if (answerText.length < MIN_ANSWER_LEN) {
          res.status(400).json({ error: "answer too short" });
          return;
        }
        result = await this.grading.gradeText(question, rubric, lang, answerText);
      }

      // analytics + result history (fire-and-forget)
      this.analytics.recordGrading({
        ctx,
        mode,
        lang,
        question,
        rubric,
        answerText,
        transcript: result.transcript ?? null,
        correct: result.correct,
        feedback: result.feedback,
      });

      res.json(result);
    } catch (err: any) {
      console.error("[grade] error:", err.message || err);
      res.status(500).json({ error: "grading failed" });
    }
  }
}
