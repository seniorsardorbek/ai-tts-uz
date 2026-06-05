import { Router } from 'express';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cacheKey } from '../lib/cacheKey.js';
import { streamAudio } from '../lib/elevenlabs.js';
import {
  DEFAULT_GENDER,
  GENDERS,
  GENDER_TO_VOICE,
  LOCKED_MOOD,
  isValidGender,
} from '../lib/options.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.resolve(__dirname, '../../cache');

const MAX_TEXT_LEN = 1000;
const CONTENT_TYPE = 'audio/mpeg';
const FILE_EXT = '.mp3';

const router = Router();

router.get('/options', (_req, res) => {
  res.json({ genders: GENDERS, defaultGender: DEFAULT_GENDER });
});

router.get('/', async (req, res) => {
  let fileStream = null;
  let tmpFile = null;
  let headerWritten = false;
  let aborted = false;
  let dataBytes = 0;
  const controller = new AbortController();

  const cleanupTmp = async () => {
    if (!tmpFile) return;
    try { await fsp.unlink(tmpFile); } catch {}
  };

  try {
    const text = typeof req.query.text === 'string' ? req.query.text : '';
    const gender = isValidGender(req.query.g) ? req.query.g : DEFAULT_GENDER;
    const voice = GENDER_TO_VOICE[gender];

    if (!text.trim()) {
      res.status(400).json({ error: 'text query param is required' });
      return;
    }
    if (text.length > MAX_TEXT_LEN) {
      res.status(413).json({ error: `text must be <= ${MAX_TEXT_LEN} chars` });
      return;
    }

    const key = cacheKey({ gender, text });
    const dir = path.join(CACHE_DIR, gender);
    await fsp.mkdir(dir, { recursive: true });
    const finalFile = path.join(dir, `${key}${FILE_EXT}`);

    if (fs.existsSync(finalFile)) {
      res.setHeader('Content-Type', CONTENT_TYPE);
      res.setHeader('X-Cache', 'HIT');
      console.log(`[tts] HIT  ${gender} ${key}`);
      res.sendFile(finalFile, { maxAge: '1h', acceptRanges: true }, (err) => {
        if (err && !res.headersSent) res.status(500).end();
      });
      return;
    }

    console.log(`[tts] MISS ${gender} ${key} — "${text.slice(0, 50)}..."`);

    tmpFile = `${finalFile}.${process.pid}.${Date.now()}.tmp`;
    fileStream = fs.createWriteStream(tmpFile);

    res.on('close', () => {
      if (!res.writableEnded) {
        aborted = true;
        controller.abort();
      }
    });

    for await (const chunk of streamAudio(
      { text, voice, mood: LOCKED_MOOD },
      { signal: controller.signal },
    )) {
      if (aborted) break;
      if (!headerWritten) {
        res.setHeader('Content-Type', CONTENT_TYPE);
        res.setHeader('Transfer-Encoding', 'chunked');
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('X-Cache', 'MISS');
        headerWritten = true;
      }
      res.write(chunk);
      fileStream.write(chunk);
      dataBytes += chunk.length;
    }

    if (!headerWritten && !aborted) {
      throw new Error('TTS yielded no audio chunks');
    }

    res.end();

    await new Promise((resolve, reject) => {
      fileStream.end((err) => (err ? reject(err) : resolve()));
    });

    if (aborted || dataBytes === 0) {
      await cleanupTmp();
      return;
    }

    await fsp.rename(tmpFile, finalFile);
    console.log(`[tts] cached ${gender} ${key} (${dataBytes}b)`);
  } catch (err) {
    console.error('[tts] error:', err.message || err);
    if (fileStream && !fileStream.destroyed) fileStream.destroy();
    await cleanupTmp();
    if (!res.headersSent) {
      res.status(500).json({ error: 'tts generation failed', message: String(err?.message ?? err) });
    } else if (!res.writableEnded) {
      res.end();
    }
  }
});

export default router;
