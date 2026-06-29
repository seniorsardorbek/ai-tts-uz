import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import fsp from "node:fs/promises";
import path from "node:path";
import type { CacheListResponse, Gender, LessonSummary } from "@ai-tts/shared";
import { CacheEntry } from "../entities/cache-entry.entity";

const KEY_RE = /^[a-f0-9]{64}$/;
const GENDERS = new Set(["m", "f"]);

@Injectable()
export class CacheService {
  private readonly cacheDir: string;

  constructor(
    config: ConfigService,
    @InjectRepository(CacheEntry) private readonly repo: Repository<CacheEntry>,
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

  async remove(gender: string, key: string): Promise<boolean> {
    if (!GENDERS.has(gender) || !KEY_RE.test(key)) return false;
    const mp3 = path.join(this.cacheDir, gender, `${key}.mp3`);
    const json = path.join(this.cacheDir, gender, `${key}.json`); // legacy sidecar, if any
    const unlink = async (f: string) => {
      try {
        await fsp.unlink(f);
      } catch (e: any) {
        if (e.code !== "ENOENT") throw e;
      }
    };
    await unlink(mp3);
    await unlink(json);
    await this.repo.delete({ cacheKey: key });
    return true;
  }
}
