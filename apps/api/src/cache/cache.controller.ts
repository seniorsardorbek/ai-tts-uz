import { Body, Controller, Delete, Get, Param, Post, Query, Res } from "@nestjs/common";
import type { Response } from "express";
import fs from "node:fs";
import { NO_LESSON } from "@ai-tts/shared";
import type { CacheListResponse, LessonsResponse } from "@ai-tts/shared";
import { CacheService } from "./cache.service";

interface PreviewBody {
  promptText?: string;
  voiceGender?: string;
}

@Controller("api/cache")
export class CacheController {
  constructor(private readonly cache: CacheService) {}

  @Get()
  list(): Promise<CacheListResponse> {
    return this.cache.list();
  }

  // Lessons from the tts history (grouped; includes the no-lesson group).
  @Get("lessons")
  async lessons(): Promise<LessonsResponse> {
    return { lessons: await this.cache.listLessons() };
  }

  // Cached speeches used in a lesson. lessonId=__none__ -> the no-lesson group.
  @Get("lessons/speeches")
  lessonSpeeches(@Query("lessonId") lessonId?: string): Promise<CacheListResponse> {
    const id = !lessonId || lessonId === NO_LESSON ? null : lessonId;
    return this.cache.lessonSpeeches(id);
  }

  // Preview a cached file (Range/206). Hash-validated (no path traversal).
  @Get(":gender/:key/audio")
  audio(@Param("gender") gender: string, @Param("key") key: string, @Res() res: Response): void {
    const file = this.cache.audioPath(gender, key);
    if (!file) {
      res.status(400).json({ error: "bad gender or key" });
      return;
    }
    if (!fs.existsSync(file)) {
      res.status(404).json({ error: "not found" });
      return;
    }
    res.setHeader("Content-Type", "audio/mpeg");
    res.sendFile(file, { acceptRanges: true, maxAge: "1h" } as any, (err) => {
      if (err && !res.headersSent) res.status(500).end();
    });
  }

  // ---- Regenerate (replace) the served audio, keeping the same key + displayed text ----
  // Staged: generate -> <key>.preview.mp3 (live mp3 untouched until commit).
  // CORS-only protection (no token), per design — the admin UI is the gate.

  @Get(":gender/:key/preview/audio")
  previewAudio(@Param("gender") gender: string, @Param("key") key: string, @Res() res: Response): void {
    const file = this.cache.previewPath(gender, key);
    if (!file) {
      res.status(400).json({ error: "bad gender or key" });
      return;
    }
    if (!fs.existsSync(file)) {
      res.status(404).json({ error: "no preview" });
      return;
    }
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-store");
    res.sendFile(file, { acceptRanges: true } as any, (err) => {
      if (err && !res.headersSent) res.status(500).end();
    });
  }

  @Post(":gender/:key/preview")
  async preview(
    @Param("gender") gender: string,
    @Param("key") key: string,
    @Body() body: PreviewBody,
    @Res() res: Response,
  ): Promise<void> {
    const promptText = typeof body?.promptText === "string" ? body.promptText : "";
    if (!promptText.trim()) {
      res.status(400).json({ error: "promptText is required" });
      return;
    }
    try {
      const result = await this.cache.generatePreview(gender, key, promptText, body?.voiceGender);
      if (!result) {
        res.status(400).json({ error: "bad gender or key" });
        return;
      }
      console.log(`[cache] preview generated ${gender}/${key} (${result.sizeBytes} bytes)`);
      res.json({ ok: true, sizeBytes: result.sizeBytes });
    } catch (err: any) {
      console.error("[cache] preview error:", err.message || err);
      res.status(500).json({ error: "preview generation failed", message: String(err?.message ?? err) });
    }
  }

  @Post(":gender/:key/commit")
  async commit(
    @Param("gender") gender: string,
    @Param("key") key: string,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const ok = await this.cache.commitPreview(gender, key);
      if (!ok) {
        res.status(404).json({ error: "no preview to commit" });
        return;
      }
      console.log(`[cache] committed regenerated audio ${gender}/${key}`);
      res.json({ ok: true });
    } catch (err: any) {
      console.error("[cache] commit error:", err.message || err);
      res.status(500).json({ error: "commit failed" });
    }
  }

  @Post(":gender/:key/preview/discard")
  async discard(
    @Param("gender") gender: string,
    @Param("key") key: string,
    @Res() res: Response,
  ): Promise<void> {
    try {
      await this.cache.discardPreview(gender, key);
      res.json({ ok: true });
    } catch (err: any) {
      console.error("[cache] discard error:", err.message || err);
      res.status(500).json({ error: "discard failed" });
    }
  }

  // Delete is exposed as both DELETE and POST .../delete — some proxies (the CRM
  // in front) block the DELETE method (403), so browsers use the POST form.
  @Delete(":gender/:key")
  async del(@Param("gender") gender: string, @Param("key") key: string, @Res() res: Response): Promise<void> {
    await this.handleDelete(gender, key, res);
  }

  @Post(":gender/:key/delete")
  async delPost(
    @Param("gender") gender: string,
    @Param("key") key: string,
    @Res() res: Response,
  ): Promise<void> {
    await this.handleDelete(gender, key, res);
  }

  private async handleDelete(gender: string, key: string, res: Response): Promise<void> {
    try {
      const ok = await this.cache.remove(gender, key);
      if (!ok) {
        res.status(400).json({ error: "bad gender or key" });
        return;
      }
      console.log(`[cache] deleted ${gender}/${key}`);
      res.json({ ok: true });
    } catch (err: any) {
      console.error("[cache] delete error:", err.message || err);
      res.status(500).json({ error: "failed to delete" });
    }
  }
}
