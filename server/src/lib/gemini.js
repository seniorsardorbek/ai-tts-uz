import { GoogleGenAI } from '@google/genai';
import { getMood } from './options.js';

const MODEL = 'gemini-2.5-flash-preview-tts';

function apiKeyFor(lang) {
  const specific = lang === 'ru' ? process.env.GEMINI_API_KEY_RU : process.env.GEMINI_API_KEY_UZ;
  const key = specific || process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error(
      `No Gemini API key set for lang="${lang}" (checked GEMINI_API_KEY_${lang.toUpperCase()} and GEMINI_API_KEY)`,
    );
  }
  return key;
}

const clientCache = new Map();
function getClient(lang) {
  const key = apiKeyFor(lang);
  let client = clientCache.get(key);
  if (!client) {
    client = new GoogleGenAI({ apiKey: key });
    clientCache.set(key, client);
  }
  return client;
}

function buildPrompt({ text, lang, mood }) {
  const m = getMood(mood);
  const prefix = m?.prefix?.[lang] ?? '';
  return prefix ? `${prefix}${text}` : text;
}

export async function* streamTtsPcm({ text, lang, voice, mood }, { signal } = {}) {
  const ai = getClient(lang);
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
