import { GoogleGenAI } from '@google/genai';
import { getMood } from './options.js';

const MODEL = 'gemini-2.5-flash-preview-tts';

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
  return prefix ? `${prefix}${text}` : text;
}

export async function* streamTtsPcm({ text, lang, voice, mood }, { signal } = {}) {
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
