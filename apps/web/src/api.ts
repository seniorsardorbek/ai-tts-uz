import type { CacheListResponse, Gender } from "@ai-tts/shared";

// "" in dev (Vite proxies /api -> :4000); the CRM base in production builds.
export const API_BASE = (import.meta.env.VITE_API_BASE ?? "") as string;

export function ttsUrl(text: string, g: Gender): string {
  return `${API_BASE}/api/tts?${new URLSearchParams({ text, g })}`;
}

export function cacheAudioUrl(gender: string, key: string): string {
  return `${API_BASE}/api/cache/${gender}/${key}/audio`;
}

export async function fetchCache(): Promise<CacheListResponse> {
  const res = await fetch(`${API_BASE}/api/cache`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// POST (not DELETE) — the CRM proxy blocks the DELETE method (403).
export async function deleteCache(gender: string, key: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/cache/${gender}/${key}/delete`, { method: "POST" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}
