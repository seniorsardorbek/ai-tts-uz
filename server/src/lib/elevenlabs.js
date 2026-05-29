import { setTimeout as sleep } from 'node:timers/promises';

const DEFAULT_MODEL = 'eleven_v3';
const OUTPUT_FORMAT = 'mp3_44100_128';
const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 600;

// UZ is not officially supported by ElevenLabs v3.
// Omitting language_code → model auto-detects (often picks tr/ru-ish phonetics).
// For RU we hint explicitly.
const LANG_HINT = {
  uz: undefined,
  ru: 'ru',
};

const MOOD_SETTINGS = {
  default:        { stability: 0.5,  similarity_boost: 0.75, style: 0.0,  use_speaker_boost: true },
  math_teacher:   { stability: 0.7,  similarity_boost: 0.75, style: 0.0,  use_speaker_boost: true },
  novel_reader:   { stability: 0.4,  similarity_boost: 0.75, style: 0.35, use_speaker_boost: true },
  school_teacher: { stability: 0.6,  similarity_boost: 0.75, style: 0.15, use_speaker_boost: true },
  journalist:     { stability: 0.8,  similarity_boost: 0.75, style: 0.0,  use_speaker_boost: true },
};

function apiKey() {
  const k = process.env.ELEVENLABS_API_KEY;
  if (!k) throw new Error('ELEVENLABS_API_KEY is not set');
  return k;
}

function model() {
  return process.env.ELEVENLABS_MODEL || DEFAULT_MODEL;
}

function isRetryable(err) {
  const status = err?.status;
  if (typeof status === 'number' && (status === 429 || status >= 500)) return true;
  const msg = String(err?.message ?? err);
  return /timeout|ECONNRESET|ETIMEDOUT|fetch failed|got status:\s*(5\d\d|429)/i.test(msg);
}

async function* streamOnce({ text, lang, voice, mood }, { signal } = {}) {
  const voice_settings = MOOD_SETTINGS[mood] ?? MOOD_SETTINGS.default;
  const language_code = LANG_HINT[lang];
  const body = {
    text: text.normalize('NFC'),
    model_id: model(),
    voice_settings,
    ...(language_code ? { language_code } : {}),
  };

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voice}/stream?output_format=${OUTPUT_FORMAT}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey(),
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!resp.ok) {
    const detail = await resp.text().catch(() => '');
    const err = new Error(`ElevenLabs ${resp.status}: ${detail.slice(0, 400)}`);
    err.status = resp.status;
    throw err;
  }
  if (!resp.body) throw new Error('ElevenLabs: empty response body');

  for await (const chunk of resp.body) {
    if (signal?.aborted) return;
    yield Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
  }
}

export async function* streamAudio(input, options = {}) {
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
        `[elevenlabs] attempt ${attempt}/${MAX_ATTEMPTS} failed (${err.message || err}); retrying in ${delay}ms`,
      );
      await sleep(delay);
      if (signal?.aborted) return;
    }
  }
}
