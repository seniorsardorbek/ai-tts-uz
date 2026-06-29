import { Controller, Delete, Get, Param, Post, Res } from "@nestjs/common";
import type { Response } from "express";
import fs from "node:fs";
import type { CacheListResponse } from "@ai-tts/shared";
import { CacheService } from "./cache.service";

@Controller("api/cache")
export class CacheController {
  constructor(private readonly cache: CacheService) {}

  @Get()
  list(): Promise<CacheListResponse> {
    return this.cache.list();
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
