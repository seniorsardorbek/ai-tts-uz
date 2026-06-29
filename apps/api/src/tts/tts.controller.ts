import { Controller, Get, Req, Res } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Request, Response } from "express";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import type { TtsOptionsResponse } from "@ai-tts/shared";
import { DEFAULT_GENDER, GENDERS, GENDER_TO_VOICE, LOCKED_MOOD, isValidGender } from "../common/options";
import { cacheKey } from "../common/cache-key";
import { ElevenLabsService } from "./elevenlabs.service";
import { AnalyticsService, LessonCtx } from "../analytics/analytics.service";

const MAX_TEXT_LEN = 1000;
const CONTENT_TYPE = "audio/mpeg";
const FILE_EXT = ".mp3";

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

@Controller("api/tts")
export class TtsController {
  private readonly cacheDir: string;
  private readonly xAccel: boolean;

  constructor(
    private readonly config: ConfigService,
    private readonly elevenlabs: ElevenLabsService,
    private readonly analytics: AnalyticsService,
  ) {
    this.cacheDir = config.get<string>("CACHE_DIR") || path.resolve(__dirname, "../../cache");
    this.xAccel = !!config.get<string>("X_ACCEL_CACHE");
  }

  @Get("options")
  options(): TtsOptionsResponse {
    return { genders: GENDERS, defaultGender: DEFAULT_GENDER };
  }

  @Get()
  async tts(@Req() req: Request, @Res() res: Response): Promise<void> {
    let fileStream: fs.WriteStream | null = null;
    let tmpFile: string | null = null;
    let headerWritten = false;
    let aborted = false;
    let dataBytes = 0;
    const controller = new AbortController();

    const cleanupTmp = async () => {
      if (!tmpFile) return;
      try {
        await fsp.unlink(tmpFile);
      } catch {}
    };

    try {
      const q = req.query;
      const text = typeof q.text === "string" ? q.text : "";
      const gender = isValidGender(q.g) ? (q.g as string) : DEFAULT_GENDER;
      const voice = GENDER_TO_VOICE[gender as "m" | "f"];
      const ctx: LessonCtx = {
        lessonId: str(q.lesson_id),
        studentUuid: str(q.student_uuid),
        lessonName: str(q.lesson_name),
      };

      if (!text.trim()) {
        res.status(400).json({ error: "text query param is required" });
        return;
      }
      if (text.length > MAX_TEXT_LEN) {
        res.status(413).json({ error: `text must be <= ${MAX_TEXT_LEN} chars` });
        return;
      }

      const key = cacheKey(gender, text);
      const dir = path.join(this.cacheDir, gender);
      await fsp.mkdir(dir, { recursive: true });
      const finalFile = path.join(dir, `${key}${FILE_EXT}`);

      if (fs.existsSync(finalFile)) {
        const stat = await fsp.stat(finalFile);
        res.setHeader("Content-Type", CONTENT_TYPE);
        res.setHeader("X-Cache", "HIT");
        // analytics (fire-and-forget) + lazy upsert (recovers text for old files)
        this.analytics.recordTtsRequest({ cacheKey: key, gender, cacheHit: true, ctx });
        this.analytics.upsertCacheEntry({ cacheKey: key, gender, text, sizeBytes: stat.size, createdAt: stat.mtime });
        if (this.xAccel) {
          res.setHeader("X-Accel-Redirect", `/__cache/${gender}/${key}${FILE_EXT}`);
          res.end();
        } else {
          res.sendFile(finalFile, { maxAge: "1h", acceptRanges: true } as any, (err) => {
            if (err && !res.headersSent) res.status(500).end();
          });
        }
        return;
      }

      tmpFile = `${finalFile}.${process.pid}.${Date.now()}.tmp`;
      fileStream = fs.createWriteStream(tmpFile);

      res.on("close", () => {
        if (!res.writableEnded) {
          aborted = true;
          controller.abort();
        }
      });

      for await (const chunk of this.elevenlabs.streamAudio(
        { text, voice, mood: LOCKED_MOOD },
        controller.signal,
      )) {
        if (aborted) break;
        if (!headerWritten) {
          res.setHeader("Content-Type", CONTENT_TYPE);
          res.setHeader("Transfer-Encoding", "chunked");
          res.setHeader("Cache-Control", "no-store");
          res.setHeader("X-Cache", "MISS");
          headerWritten = true;
        }
        res.write(chunk);
        fileStream.write(chunk);
        dataBytes += chunk.length;
      }

      if (!headerWritten && !aborted) throw new Error("TTS yielded no audio chunks");

      res.end();
      await new Promise<void>((resolve, reject) => {
        fileStream!.end((err: any) => (err ? reject(err) : resolve()));
      });

      if (aborted || dataBytes === 0) {
        await cleanupTmp();
        return;
      }

      await fsp.rename(tmpFile, finalFile);
      this.analytics.recordTtsRequest({ cacheKey: key, gender, cacheHit: false, ctx });
      this.analytics.upsertCacheEntry({ cacheKey: key, gender, text, sizeBytes: dataBytes, createdAt: new Date() });
    } catch (err: any) {
      console.error("[tts] error:", err.message || err);
      if (fileStream && !fileStream.destroyed) fileStream.destroy();
      await cleanupTmp();
      if (!res.headersSent) {
        res.status(500).json({ error: "tts generation failed", message: String(err?.message ?? err) });
      } else if (!res.writableEnded) {
        res.end();
      }
    }
  }
}
