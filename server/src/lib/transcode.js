import { spawn } from 'node:child_process';

// Transcode arbitrary browser audio (webm/opus, mp4, ogg, ...) to WAV 16kHz mono.
// Gemini does not reliably accept webm; WAV/PCM is always supported. ffmpeg reads
// the input from stdin and writes WAV to stdout — no temp files.
export function toWav(inputBuffer) {
  return new Promise((resolve, reject) => {
    const ff = spawn('ffmpeg', [
      '-hide_banner', '-loglevel', 'error',
      '-i', 'pipe:0',
      '-ac', '1',          // mono
      '-ar', '16000',      // 16 kHz (speech)
      '-f', 'wav',
      'pipe:1',
    ]);

    const out = [];
    const errChunks = [];
    ff.stdout.on('data', (c) => out.push(c));
    ff.stderr.on('data', (c) => errChunks.push(c));

    ff.on('error', (err) => {
      reject(new Error(`ffmpeg spawn failed (is it installed?): ${err.message}`));
    });
    ff.on('close', (code) => {
      if (code === 0 && out.length) {
        resolve(Buffer.concat(out));
      } else {
        const detail = Buffer.concat(errChunks).toString().slice(0, 400);
        reject(new Error(`ffmpeg exited ${code}: ${detail}`));
      }
    });

    ff.stdin.on('error', () => {}); // ignore EPIPE if ffmpeg dies early
    ff.stdin.write(inputBuffer);
    ff.stdin.end();
  });
}
