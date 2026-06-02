#!/usr/bin/env node
// Instant Voice Cloning (IVC) helper — clone a native Uzbek voice on ElevenLabs.
//
// Requires a paid ElevenLabs plan (Starter+); the API rejects IVC on the free tier
// with "can_not_use_instant_voice_cloning".
//
// Usage:
//   ELEVENLABS_API_KEY=... node scripts/clone-voice.js "Uzbek Speaker" sample1.mp3 [sample2.mp3 ...]
//
// Tips for the sample(s):
//   - 1–3 minutes total of ONE native Uzbek speaker, clean (no music/noise/echo).
//   - Natural reading pace; a mix of sentences works best.
//   - mp3 or wav, mono is fine.
//
// On success it prints the new voice_id. Add it to ELEVENLABS_VOICES in
// src/lib/options.js and (optionally) set it as DEFAULT_VOICE.elevenlabs.
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';

const [name, ...files] = process.argv.slice(2);
const key = process.env.ELEVENLABS_API_KEY;

if (!key) { console.error('ELEVENLABS_API_KEY is not set'); process.exit(1); }
if (!name || files.length === 0) {
  console.error('Usage: node scripts/clone-voice.js "<Voice Name>" <sample1> [sample2 ...]');
  process.exit(1);
}

const form = new FormData();
form.append('name', name);
form.append('remove_background_noise', 'true');
form.append('description', 'Native Uzbek voice (IVC)');
for (const f of files) {
  const buf = fs.readFileSync(f);
  form.append('files', new Blob([buf]), path.basename(f));
}

const resp = await fetch('https://api.elevenlabs.io/v1/voices/add', {
  method: 'POST',
  headers: { 'xi-api-key': key },
  body: form,
});

const text = await resp.text();
if (!resp.ok) {
  console.error(`ElevenLabs ${resp.status}: ${text}`);
  process.exit(1);
}
const data = JSON.parse(text);
console.log('✅ Cloned. voice_id =', data.voice_id);
console.log('Add it to ELEVENLABS_VOICES in src/lib/options.js.');
