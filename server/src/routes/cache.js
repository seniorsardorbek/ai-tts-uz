import { Router } from 'express';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.resolve(__dirname, '../../cache');
const GENDERS = ['m', 'f'];
const KEY_RE = /^[a-f0-9]{64}$/;

const router = Router();

// Reject path traversal: gender must be m|f and key a 64-hex sha256.
function safePaths(gender, key) {
  if (!GENDERS.includes(gender) || !KEY_RE.test(key)) return null;
  const dir = path.join(CACHE_DIR, gender);
  return { mp3: path.join(dir, `${key}.mp3`), meta: path.join(dir, `${key}.json`) };
}

// GET /api/cache — list every cached speech (text from sidecar if present).
router.get('/', async (_req, res) => {
  try {
    const items = [];
    let totalBytes = 0;
    for (const gender of GENDERS) {
      const dir = path.join(CACHE_DIR, gender);
      let files;
      try {
        files = await fsp.readdir(dir);
      } catch {
        continue; // dir not created yet
      }
      for (const f of files) {
        if (!f.endsWith('.mp3')) continue;
        const key = f.slice(0, -4);
        const stat = await fsp.stat(path.join(dir, f)).catch(() => null);
        if (!stat) continue;
        let text = null;
        let createdAt = stat.mtime.toISOString();
        try {
          const meta = JSON.parse(await fsp.readFile(path.join(dir, `${key}.json`), 'utf8'));
          if (typeof meta.text === 'string') text = meta.text;
          if (meta.createdAt) createdAt = meta.createdAt;
        } catch {
          /* old file without sidecar — text stays null, createdAt = mtime */
        }
        totalBytes += stat.size;
        items.push({ key, gender, text, createdAt, sizeBytes: stat.size });
      }
    }
    items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)); // newest first
    res.json({ total: items.length, totalBytes, items });
  } catch (err) {
    console.error('[cache] list error:', err.message || err);
    res.status(500).json({ error: 'failed to list cache' });
  }
});

// GET /api/cache/:gender/:key/audio — stream a cached file (Range/206) for preview.
router.get('/:gender/:key/audio', (req, res) => {
  const p = safePaths(req.params.gender, req.params.key);
  if (!p) return res.status(400).json({ error: 'bad gender or key' });
  if (!fs.existsSync(p.mp3)) return res.status(404).json({ error: 'not found' });
  res.setHeader('Content-Type', 'audio/mpeg');
  res.sendFile(p.mp3, { acceptRanges: true, maxAge: '1h' }, (err) => {
    if (err && !res.headersSent) res.status(500).end();
  });
});

// Remove the mp3 + sidecar. Exposed as both DELETE and POST .../delete —
// some proxies (e.g. the CRM in front) block the DELETE method (403), so the
// browser uses the POST form.
async function deleteEntry(req, res) {
  const p = safePaths(req.params.gender, req.params.key);
  if (!p) return res.status(400).json({ error: 'bad gender or key' });
  const unlink = async (f) => { try { await fsp.unlink(f); } catch (e) { if (e.code !== 'ENOENT') throw e; } };
  try {
    await unlink(p.mp3);
    await unlink(p.meta);
    console.log(`[cache] deleted ${req.params.gender}/${req.params.key}`);
    res.json({ ok: true });
  } catch (err) {
    console.error('[cache] delete error:', err.message || err);
    res.status(500).json({ error: 'failed to delete' });
  }
}

router.delete('/:gender/:key', deleteEntry);
router.post('/:gender/:key/delete', deleteEntry);

export default router;
