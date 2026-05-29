import crypto from 'node:crypto';

export function normalizeText(text) {
  return text
    .normalize('NFC')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.!?,;:]+$/u, '');
}

export function cacheKey({ provider, text, lang, voice, mood }) {
  const payload = `${provider}|${lang}|${voice}|${mood}|${normalizeText(text)}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}
