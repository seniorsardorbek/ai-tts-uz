import type { CacheListResponse, Gender, LessonSummary, LessonsResponse } from "@ai-tts/shared";
import { getToken } from "./auth";

// "" in dev (Vite proxies /api -> :4000); the CRM base in production builds.
export const API_BASE = (import.meta.env.VITE_API_BASE ?? "") as string;

// Bearer header for forward-compat — data endpoints are CORS-only for now and
// ignore it server-side; only /api/auth/me actually verifies it.
export function authHeaders(): Record<string, string> {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export function ttsUrl(text: string, g: Gender): string {
  return `${API_BASE}/api/tts?${new URLSearchParams({ text, g })}`;
}

export function cacheAudioUrl(gender: string, key: string): string {
  return `${API_BASE}/api/cache/${gender}/${key}/audio`;
}

export async function fetchCache(): Promise<CacheListResponse> {
  const res = await fetch(`${API_BASE}/api/cache`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchLessons(): Promise<LessonSummary[]> {
  const res = await fetch(`${API_BASE}/api/cache/lessons`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return ((await res.json()) as LessonsResponse).lessons;
}

export async function fetchLessonSpeeches(lessonId: string): Promise<CacheListResponse> {
  const res = await fetch(`${API_BASE}/api/cache/lessons/speeches?lessonId=${encodeURIComponent(lessonId)}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// POST (not DELETE) — the CRM proxy blocks the DELETE method (403).
export async function deleteCache(gender: string, key: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/cache/${gender}/${key}/delete`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

// Delete a whole lesson: its history + orphaned voices (__none__ = no-lesson group).
export async function deleteLesson(lessonId: string): Promise<{ deleted: number }> {
  const res = await fetch(`${API_BASE}/api/cache/lessons/${encodeURIComponent(lessonId)}/delete`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/* ---------- regenerate (replace) a cached slot's audio ---------- */

// Generate a staged preview (<key>.preview.mp3) from a different prompt/voice.
export async function regeneratePreview(
  gender: string,
  key: string,
  promptText: string,
  voiceGender: Gender,
): Promise<{ ok: boolean; sizeBytes: number }> {
  const res = await fetch(`${API_BASE}/api/cache/${gender}/${key}/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ promptText, voiceGender }),
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(msg || `HTTP ${res.status}`);
  }
  return res.json();
}

// Cache-busted (no-store, plus ?t=) so a fresh preview/commit isn't masked by the browser cache.
export function previewAudioUrl(gender: string, key: string): string {
  return `${API_BASE}/api/cache/${gender}/${key}/preview/audio?t=${Date.now()}`;
}

export async function commitRegenerate(gender: string, key: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/cache/${gender}/${key}/commit`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export async function discardPreview(gender: string, key: string): Promise<void> {
  await fetch(`${API_BASE}/api/cache/${gender}/${key}/preview/discard`, {
    method: "POST",
    headers: authHeaders(),
  }).catch(() => {}); // best-effort
}
