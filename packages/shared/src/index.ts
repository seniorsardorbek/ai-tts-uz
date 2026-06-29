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

// A lesson group derived from the tts_requests history.
export interface LessonSummary {
  lessonId: string | null; // null = the "no lesson" group
  lessonName: string | null;
  speechCount: number; // distinct cached speeches used in this lesson
  requestCount: number; // total tts requests (incl. repeats / HITs)
  lastUsed: string; // ISO
}

export interface LessonsResponse {
  lessons: LessonSummary[];
}

// Sentinel used in the URL for the "no lesson" group.
export const NO_LESSON = "__none__";

export interface GradeResult {
  correct: boolean;
  feedback: string;
  transcript?: string;
}
