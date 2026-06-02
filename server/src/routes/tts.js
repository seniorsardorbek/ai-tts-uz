import { Router } from 'express';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cacheKey } from '../lib/cacheKey.js';
import { buildWavHeader, fixWavHeader } from '../lib/wav.js';
import { getProvider } from '../lib/providers.js';
import {
  DEFAULT_LANG,
  DEFAULT_MOOD,
  DEFAULT_PROVIDER,
  DEFAULT_VOICE,
  LANGS,
  MOODS,
  PROVIDERS,
  VOICES,
  isValidLang,
  isValidMood,
  isValidProvider,
  isValidVoice,
} from '../lib/options.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.resolve(__dirname, '../../cache');

const MAX_TEXT_LEN = 1000;

const router = Router();

router.get('/options', (_req, res) => {
  res.json({
    langs: LANGS,
    defaultLang: DEFAULT_LANG,
    providers: PROVIDERS,
    defaultProvider: DEFAULT_PROVIDER,
    voices: VOICES,
    defaultVoice: DEFAULT_VOICE,
    moods: MOODS.map(({ id, label }) => ({ id, label })),
    defaultMood: DEFAULT_MOOD,
  });
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
    const provider = isValidProvider(req.query.provider) ? req.query.provider : DEFAULT_PROVIDER;
    const lang     = isValidLang(req.query.lang)         ? req.query.lang     : DEFAULT_LANG;
    const mood     = isValidMood(req.query.mood)         ? req.query.mood     : DEFAULT_MOOD;
    const voiceArg = typeof req.query.voice === 'string' ? req.query.voice    : '';
    const voice = isValidVoice({ provider, voice: voiceArg })
      ? voiceArg
      : DEFAULT_VOICE[provider];

    if (!text.trim()) {
      res.status(400).json({ error: 'text query param is required' });
      return;
    }
    if (text.length > MAX_TEXT_LEN) {
      res.status(413).json({ error: `text must be <= ${MAX_TEXT_LEN} chars` });
      return;
    }

    const { streamAudio, format, contentType, fileExt } = getProvider(provider);
    const isWav = format === 'wav';

    const key = cacheKey({ provider, text, lang, voice, mood });
    const dir = path.join(CACHE_DIR, provider, lang);
    await fsp.mkdir(dir, { recursive: true });
    const finalFile = path.join(dir, `${key}${fileExt}`);

    if (fs.existsSync(finalFile)) {
      const stat = await fsp.stat(finalFile);
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Length', stat.size);
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('X-Cache', 'HIT');
      fs.createReadStream(finalFile).pipe(res);
      console.log(`[tts] HIT  ${provider}/${lang}/${voice}/${mood} ${key} (${stat.size}b)`);
      return;
    }

    console.log(`[tts] MISS ${provider}/${lang}/${voice}/${mood} ${key} — "${text.slice(0, 50)}..."`);

    tmpFile = `${finalFile}.${process.pid}.${Date.now()}.tmp`;
    fileStream = fs.createWriteStream(tmpFile);

    res.on('close', () => {
      if (!res.writableEnded) {
        aborted = true;
        controller.abort();
      }
    });

    for await (const chunk of streamAudio({ text, lang, voice, mood }, { signal: controller.signal })) {
      if (aborted) break;
      if (!headerWritten) {
        res.setHeader('Content-Type', contentType);
        res.setHeader('Transfer-Encoding', 'chunked');
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('X-Cache', 'MISS');
        if (isWav) {
          const wavHeader = buildWavHeader();
          res.write(wavHeader);
          fileStream.write(wavHeader);
        }
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

    if (isWav) await fixWavHeader(tmpFile, dataBytes);
    await fsp.rename(tmpFile, finalFile);
    const totalBytes = dataBytes + (isWav ? 44 : 0);
    console.log(`[tts] cached ${provider}/${lang}/${voice}/${mood} ${key} (${totalBytes}b)`);
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
