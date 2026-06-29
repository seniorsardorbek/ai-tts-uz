import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { setTimeout as sleep } from "node:timers/promises";
import { MOOD_SETTINGS } from "../common/options";

const DEFAULT_MODEL = "eleven_v3";
const OUTPUT_FORMAT = "mp3_44100_128";
const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 600;

interface StreamInput {
  text: string;
  voice: string;
  mood: string;
}

@Injectable()
export class ElevenLabsService {
  constructor(private readonly config: ConfigService) {}

  private apiKey(): string {
    const k = this.config.get<string>("ELEVENLABS_API_KEY");
    if (!k) throw new Error("ELEVENLABS_API_KEY is not set");
    return k;
  }

  private model(): string {
    return this.config.get<string>("ELEVENLABS_MODEL") || DEFAULT_MODEL;
  }

  private isRetryable(err: any): boolean {
    const status = err?.status;
    if (typeof status === "number" && (status === 429 || status >= 500)) return true;
    const msg = String(err?.message ?? err);
    return /timeout|ECONNRESET|ETIMEDOUT|fetch failed|got status:\s*(5\d\d|429)/i.test(msg);
  }

  private async *streamOnce(
    { text, voice, mood }: StreamInput,
    signal?: AbortSignal,
  ): AsyncGenerator<Buffer> {
    const voice_settings = MOOD_SETTINGS[mood] ?? MOOD_SETTINGS.default;
    const body = {
      text: text.normalize("NFC"),
      model_id: this.model(),
      voice_settings,
    };

    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voice}/stream?output_format=${OUTPUT_FORMAT}`;
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "xi-api-key": this.apiKey(),
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
        // datacenter IPs can hit Cloudflare's bot challenge; a browser-like UA helps
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
      body: JSON.stringify(body),
      signal,
    });

    if (!resp.ok) {
      const detail = await resp.text().catch(() => "");
      const err: any = new Error(`ElevenLabs ${resp.status}: ${detail.slice(0, 400)}`);
      err.status = resp.status;
      throw err;
    }
    if (!resp.body) throw new Error("ElevenLabs: empty response body");

    for await (const chunk of resp.body as any as AsyncIterable<Uint8Array>) {
      if (signal?.aborted) return;
      yield Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    }
  }

  async *streamAudio(input: StreamInput, signal?: AbortSignal): AsyncGenerator<Buffer> {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      let yieldedAny = false;
      try {
        for await (const chunk of this.streamOnce(input, signal)) {
          yieldedAny = true;
          yield chunk;
        }
        return;
      } catch (err: any) {
        if (yieldedAny || attempt === MAX_ATTEMPTS || !this.isRetryable(err)) throw err;
        const delay = BASE_DELAY_MS * 2 ** (attempt - 1);
        console.warn(
          `[elevenlabs] attempt ${attempt}/${MAX_ATTEMPTS} failed (${err.message || err}); retrying in ${delay}ms`,
        );
        await sleep(delay);
        if (signal?.aborted) return;
      }
    }
  }
}
