import crypto from 'node:crypto';

export function normalizeText(text) {
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.!?,;:]+$/u, '');
}

export function cacheKey({ text, lang, voice, mood }) {
  const payload = `${lang}|${voice}|${mood}|${normalizeText(text)}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}
