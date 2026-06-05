import crypto from 'node:crypto';

export function normalizeText(text) {
  return text
    .normalize('NFC')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.!?,;:]+$/u, '');
}

export function cacheKey({ gender, text }) {
  return crypto
    .createHash('sha256')
    .update(`${gender}|${normalizeText(text)}`)
    .digest('hex');
}
