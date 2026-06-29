// Shared types/DTOs used by both the NestJS API (apps/api) and the React web (apps/web).

export type Gender = "m" | "f";
export type Lang = "uz" | "ru";
export type GradeMode = "text" | "voice";

export const GENDERS: Gender[] = ["m", "f"];
export const DEFAULT_GENDER: Gender = "f";

/** Optional analytics context sent by the frontend (snake_case on the wire). */
export interface LessonContext {
  lesson_id?: string | null;
  student_uuid?: string | null;
  lesson_name?: string | null;
}

export interface TtsOptionsResponse {
  genders: Gender[];
  defaultGender: Gender;
}

export interface CacheItem {
  key: string;
  gender: Gender;
  text: string | null;
  createdAt: string;
  sizeBytes: number;
}

export interface CacheListResponse {
  total: number;
  totalBytes: number;
  items: CacheItem[];
}

export interface GradeResult {
  correct: boolean;
  feedback: string;
  transcript?: string;
}
