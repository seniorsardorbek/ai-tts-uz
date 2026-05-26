import { GoogleGenAI } from '@google/genai';
import { setTimeout as sleep } from 'node:timers/promises';
import { getMood } from './options.js';

const MODEL = 'gemini-2.5-flash-preview-tts';
const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 600;

let cachedClient = null;
function getClient() {
  if (!cachedClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error('GEMINI_API_KEY is not set');
    cachedClient = new GoogleGenAI({ apiKey: key });
  }
  return cachedClient;
}

function buildPrompt({ text, lang, mood }) {
  const m = getMood(mood);
  const prefix = m?.prefix?.[lang] ?? '';
  const body = text.normalize('NFC');
  return prefix ? `${prefix}${body}` : body;
}

function isRetryable(err) {
  const status = err?.status;
  if (typeof status === 'number' && (status === 429 || status >= 500)) return true;
  const msg = String(err?.message ?? err);
  return /exception parsing|UNAVAILABLE|temporarily|timeout|ECONNRESET|ETIMEDOUT|fetch failed|got status:\s*(5\d\d|429)/i.test(msg);
}

async function* streamOnce({ text, lang, voice, mood }, { signal } = {}) {
  const ai = getClient();
  const prompt = buildPrompt({ text, lang, mood });
  const stream = await ai.models.generateContentStream({
    model: MODEL,
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } },
      },
    },
  });
  for await (const chunk of stream) {
    if (signal?.aborted) return;
    const parts = chunk?.candidates?.[0]?.content?.parts ?? [];
    for (const part of parts) {
      const data = part?.inlineData?.data;
      if (data) yield Buffer.from(data, 'base64');
    }
  }
}

export async function* streamTtsPcm(input, options = {}) {
  const signal = options.signal;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let yieldedAny = false;
    try {
      for await (const chunk of streamOnce(input, options)) {
        yieldedAny = true;
        yield chunk;
      }
      return;
    } catch (err) {
      if (yieldedAny || attempt === MAX_ATTEMPTS || !isRetryable(err)) {
        throw err;
      }
      const delay = BASE_DELAY_MS * 2 ** (attempt - 1);
      console.warn(
        `[tts] attempt ${attempt}/${MAX_ATTEMPTS} failed (${err.message || err}); retrying in ${delay}ms`,
      );
      await sleep(delay);
      if (signal?.aborted) return;
    }
  }
}
