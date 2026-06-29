import { createHash } from "node:crypto";

export function normalizeText(text: string): string {
  return text
    .normalize("NFC")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.!?,;:]+$/u, "");
}

export function cacheKey(gender: string, text: string): string {
  return createHash("sha256").update(`${gender}|${normalizeText(text)}`).digest("hex");
}
