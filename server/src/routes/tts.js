import { Router } from 'express';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cacheKey } from '../lib/cacheKey.js';
import { buildWavHeader, fixWavHeader } from '../lib/wav.js';
import { streamTtsPcm } from '../lib/gemini.js';
import {
  DEFAULT_LANG,
  DEFAULT_VOICE,
  DEFAULT_MOOD,
  LANGS,
  VOICES,
  MOODS,
  isValidLang,
  isValidVoice,
  isValidMood,
} from '../lib/options.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.resolve(__dirname, '../../cache');

const MAX_TEXT_LEN = 1000;

const router = Router();

router.get('/options', (_req, res) => {
  res.json({
    langs: LANGS,
    defaultLang: DEFAULT_LANG,
    voices: VOICES,
    defaultVoice: DEFAULT_VOICE,
    moods: MOODS.map(({ id, label }) => ({ id, label })),
    defaultMood: DEFAULT_MOOD,
  });
});

router.get('/', async (req, res) => {
  const text = typeof req.query.text === 'string' ? req.query.text : '';
  const lang  = isValidLang(req.query.lang)   ? req.query.lang   : DEFAULT_LANG;
  const voice = isValidVoice(req.query.voice) ? req.query.voice  : DEFAULT_VOICE;
  const mood  = isValidMood(req.query.mood)   ? req.query.mood   : DEFAULT_MOOD;

  if (!text.trim()) {
    res.status(400).json({ error: 'text query param is required' });
    return;
  }
  if (text.length > MAX_TEXT_LEN) {
    res.status(413).json({ error: `text must be <= ${MAX_TEXT_LEN} chars` });
    return;
  }

  const key = cacheKey({ text, lang, voice, mood });
  const langDir = path.join(CACHE_DIR, lang);
  await fsp.mkdir(langDir, { recursive: true });
  const finalFile = path.join(langDir, `${key}.wav`);

  if (fs.existsSync(finalFile)) {
    const stat = await fsp.stat(finalFile);
    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('X-Cache', 'HIT');
    fs.createReadStream(finalFile).pipe(res);
    console.log(`[tts] HIT  ${lang}/${voice}/${mood}  ${key} (${stat.size}b)`);
    return;
  }

  console.log(`[tts] MISS ${lang}/${voice}/${mood}  ${key} — "${text.slice(0, 50)}..."`);

  res.setHeader('Content-Type', 'audio/wav');
  res.setHeader('Transfer-Encoding', 'chunked');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Cache', 'MISS');

  const tmpFile = `${finalFile}.${process.pid}.${Date.now()}.tmp`;
  const fileStream = fs.createWriteStream(tmpFile);
  const controller = new AbortController();
  let dataBytes = 0;
  let aborted = false;

  const cleanupTmp = async () => {
    try {
      await fsp.unlink(tmpFile);
    } catch {}
  };

  res.on('close', () => {
    if (!res.writableEnded) {
      aborted = true;
      controller.abort();
    }
  });

  try {
    const header = buildWavHeader();
    res.write(header);
    fileStream.write(header);

    for await (const pcm of streamTtsPcm({ text, lang, voice, mood }, { signal: controller.signal })) {
      if (aborted) break;
      res.write(pcm);
      fileStream.write(pcm);
      dataBytes += pcm.length;
    }

    res.end();

    await new Promise((resolve, reject) => {
      fileStream.end((err) => (err ? reject(err) : resolve()));
    });

    if (aborted || dataBytes === 0) {
      await cleanupTmp();
      return;
    }

    await fixWavHeader(tmpFile, dataBytes);
    await fsp.rename(tmpFile, finalFile);
    console.log(`[tts] cached ${lang}/${voice}/${mood}  ${key} (${dataBytes + 44}b)`);
  } catch (err) {
    console.error('[tts] error:', err);
    await cleanupTmp();
    if (!res.headersSent) {
      res.status(500).json({ error: 'tts generation failed', message: String(err?.message ?? err) });
    } else if (!res.writableEnded) {
      res.end();
    }
  }
});

export default router;
