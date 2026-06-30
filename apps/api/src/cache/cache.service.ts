import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import type { CacheListResponse, Gender, LessonSummary } from "@ai-tts/shared";
import { CacheEntry } from "../entities/cache-entry.entity";
import { GENDER_TO_VOICE, LOCKED_MOOD, isValidGender } from "../common/options";
import { ElevenLabsService } from "../tts/elevenlabs.service";

const KEY_RE = /^[a-f0-9]{64}$/;
const GENDERS = new Set(["m", "f"]);

@Injectable()
export class CacheService {
  private readonly cacheDir: string;

  constructor(
    config: ConfigService,
    @InjectRepository(CacheEntry) private readonly repo: Repository<CacheEntry>,
    private readonly elevenlabs: ElevenLabsService,
  ) {
    this.cacheDir = config.get<string>("CACHE_DIR") || path.resolve(__dirname, "../../cache");
  }

  async list(): Promise<CacheListResponse> {
    const rows = await this.repo.find({ order: { createdAt: "DESC" } });
    const items = rows.map((r) => ({
      key: r.cacheKey,
      gender: r.gender as Gender,
      text: r.text,
      createdAt: r.createdAt.toISOString(),
      sizeBytes: r.sizeBytes,
    }));
    const totalBytes = rows.reduce((s, r) => s + r.sizeBytes, 0);
    return { total: items.length, totalBytes, items };
  }

  // Lessons derived from the tts_requests history (incl. the null group).
  async listLessons(): Promise<LessonSummary[]> {
    const rows = await this.repo.manager.query(`
      SELECT lesson_id AS "lessonId",
             max(lesson_name) AS "lessonName",
             count(DISTINCT cache_key)::int AS "speechCount",
             count(*)::int AS "requestCount",
             max(created_at) AS "lastUsed"
      FROM tts_requests
      GROUP BY lesson_id
      ORDER BY max(created_at) DESC
    `);
    return rows.map((r: any) => ({
      lessonId: r.lessonId,
      lessonName: r.lessonName,
      speechCount: r.speechCount,
      requestCount: r.requestCount,
      lastUsed: new Date(r.lastUsed).toISOString(),
    }));
  }

  // Distinct cached speeches used in a lesson (lessonId null = the no-lesson group).
  async lessonSpeeches(lessonId: string | null): Promise<CacheListResponse> {
    const where = lessonId === null ? "t.lesson_id IS NULL" : "t.lesson_id = $1";
    const params = lessonId === null ? [] : [lessonId];
    const rows = await this.repo.manager.query(
      `SELECT DISTINCT c.cache_key AS key, c.gender, c.text,
              c.size_bytes AS "sizeBytes", c.created_at AS "createdAt"
       FROM tts_requests t
       JOIN cache_entries c ON c.cache_key = t.cache_key
       WHERE ${where}
       ORDER BY c.created_at DESC`,
      params,
    );
    const items = rows.map((r: any) => ({
      key: r.key,
      gender: r.gender as Gender,
      text: r.text,
      createdAt: new Date(r.createdAt).toISOString(),
      sizeBytes: r.sizeBytes,
    }));
    const totalBytes = items.reduce((s: number, i) => s + i.sizeBytes, 0);
    return { total: items.length, totalBytes, items };
  }

  // Resolve the on-disk path, rejecting anything that isn't gender m|f + 64-hex key.
  audioPath(gender: string, key: string): string | null {
    if (!GENDERS.has(gender) || !KEY_RE.test(key)) return null;
    return path.join(this.cacheDir, gender, `${key}.mp3`);
  }

  // The staged-regeneration file (same dir/key as the live mp3); same validation.
  previewPath(gender: string, key: string): string | null {
    if (!GENDERS.has(gender) || !KEY_RE.test(key)) return null;
    return path.join(this.cacheDir, gender, `${key}.preview.mp3`);
  }

  private async unlinkQuiet(f: string): Promise<void> {
    try {
      await fsp.unlink(f);
    } catch (e: any) {
      if (e.code !== "ENOENT") throw e;
    }
  }

  // Regenerate the slot's audio from a DIFFERENT prompt/voice, staged into
  // <key>.preview.mp3 — the live mp3 (and cache key / displayed text) is untouched
  // until commitPreview(). voiceGender only picks the ElevenLabs voice; the slot
  // gender (part of the cache key) never changes. Returns bytes, or null on bad input.
  async generatePreview(
    gender: string,
    key: string,
    promptText: string,
    voiceGender?: string,
  ): Promise<{ sizeBytes: number } | null> {
    const preview = this.previewPath(gender, key);
    if (!preview || !promptText.trim()) return null;

    const vg = isValidGender(voiceGender) ? voiceGender : (gender as Gender);
    const voice = GENDER_TO_VOICE[vg];

    await fsp.mkdir(path.dirname(preview), { recursive: true });
    const tmp = `${preview}.${process.pid}.${process.hrtime.bigint()}.tmp`;
    const out = fs.createWriteStream(tmp);
    let bytes = 0;
    try {
      for await (const chunk of this.elevenlabs.streamAudio({
        text: promptText,
        voice,
        mood: LOCKED_MOOD,
      })) {
        out.write(chunk);
        bytes += chunk.length;
      }
      await new Promise<void>((resolve, reject) => out.end((err: any) => (err ? reject(err) : resolve())));
      if (bytes === 0) throw new Error("TTS yielded no audio chunks");
      await fsp.rename(tmp, preview);
      return { sizeBytes: bytes };
    } catch (err) {
      if (!out.destroyed) out.destroy();
      await this.unlinkQuiet(tmp);
      throw err;
    }
  }

  // Promote the staged preview over the live mp3 (atomic same-fs rename). The DB
  // sizeBytes is intentionally NOT updated here — it self-heals on the next client
  // HIT via upsertCacheEntry. Returns false if there's no preview to commit.
  async commitPreview(gender: string, key: string): Promise<boolean> {
    const preview = this.previewPath(gender, key);
    const live = this.audioPath(gender, key);
    if (!preview || !live || !fs.existsSync(preview)) return false;
    await fsp.rename(preview, live);
    return true;
  }

  async discardPreview(gender: string, key: string): Promise<boolean> {
    const preview = this.previewPath(gender, key);
    if (!preview) return false;
    await this.unlinkQuiet(preview);
    return true;
  }

  async remove(gender: string, key: string): Promise<boolean> {
    if (!GENDERS.has(gender) || !KEY_RE.test(key)) return false;
    const mp3 = path.join(this.cacheDir, gender, `${key}.mp3`);
    const json = path.join(this.cacheDir, gender, `${key}.json`); // legacy sidecar, if any
    const preview = path.join(this.cacheDir, gender, `${key}.preview.mp3`); // orphan stage, if any
    await this.unlinkQuiet(mp3);
    await this.unlinkQuiet(json);
    await this.unlinkQuiet(preview);
    await this.repo.delete({ cacheKey: key });
    return true;
  }

  // Delete a whole lesson: its tts_requests history + every voice (audio + cache
  // row) that becomes orphaned by that deletion. lessonId null = the no-lesson group.
  // A cache key still referenced by ANOTHER lesson's requests is kept (safe GC).
  async removeLesson(lessonId: string | null): Promise<{ deleted: number }> {
    const where = lessonId === null ? "lesson_id IS NULL" : "lesson_id = $1";
    const params = lessonId === null ? [] : [lessonId];

    // keys (with gender) this lesson references, BEFORE we delete its history
    const keyRows: Array<{ key: string; gender: string }> = await this.repo.manager.query(
      `SELECT DISTINCT c.cache_key AS key, c.gender
       FROM tts_requests t JOIN cache_entries c ON c.cache_key = t.cache_key
       WHERE ${where.replace(/lesson_id/g, "t.lesson_id")}`,
      params,
    );

    // remove this lesson's request history
    await this.repo.manager.query(`DELETE FROM tts_requests WHERE ${where}`, params);

    // GC: drop only keys no longer referenced by any remaining request
    let deleted = 0;
    for (const { key, gender } of keyRows) {
      const still: unknown[] = await this.repo.manager.query(
        `SELECT 1 FROM tts_requests WHERE cache_key = $1 LIMIT 1`,
        [key],
      );
      if (still.length === 0 && (await this.remove(gender, key))) deleted++;
    }
    return { deleted };
  }
}
