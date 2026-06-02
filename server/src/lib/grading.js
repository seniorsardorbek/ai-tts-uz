import { GoogleGenAI } from '@google/genai';
import { setTimeout as sleep } from 'node:timers/promises';
import { toWav } from './transcode.js';

const MODEL = process.env.GEMINI_GRADING_MODEL || 'gemini-2.5-flash';
const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 600;

let cachedClient = null;
function getClient() {
  if (!cachedClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error('GEMINI_API_KEY is not set');
    cachedClient = new GoogleGenAI({ apiKey: key });
  }
  return cachedClient;
}

function isRetryable(err) {
  if (err?.code === 'BAD_AI_SHAPE') return true; // one reparse retry is cheap
  const status = err?.status;
  if (typeof status === 'number' && (status === 429 || status >= 500)) return true;
  const msg = String(err?.message ?? err);
  return /exception parsing|UNAVAILABLE|temporarily|timeout|ECONNRESET|ETIMEDOUT|fetch failed|got status:\s*(5\d\d|429)/i.test(msg);
}

function systemInstruction(lang) {
  if (lang === 'ru') {
    return `Ты опытный, доброжелательный учитель. Ты оцениваешь ответ ученика по заданному вопросу и критерию (рубрике). Верни ТОЛЬКО валидный JSON, без какого-либо другого текста.
Правила feedback:
- на русском языке;
- 2-3 предложения, не больше;
- конструктивно: скажи, что именно неверно и как это исправить, не пиши просто "неправильно";
- будь конкретным, избегай общих фраз вроде "хороший ответ";
- не используй имя ученика;
- не используй никаких символов или математических обозначений — пиши всё словами (например "квадрат", "корень", "дробь", "плюс", "равно"), потому что feedback потом озвучивается.
Поле correct: true, если ответ соответствует критерию, иначе false.`;
  }
  return `Sen tajribali va mehribon o'qituvchisan. O'quvchining javobini berilgan savol va baholash mezoni (rubrika) asosida baholaysan. FAQAT yaroqli JSON qaytar, boshqa hech qanday matn yozma.
Feedback qoidalari:
- o'zbek tilida bo'lsin;
- 2-3 ta gap, ko'p emas;
- konstruktiv bo'lsin: nima xato ekanini va qanday tuzatishni ayt, faqat "noto'g'ri" deb qo'yma;
- aniq va o'ziga xos bo'lsin, "yaxshi javob" kabi umumiy gaplardan saqlan;
- o'quvchining ismini ishlatma;
- hech qanday belgi yoki matematik yozuv ishlatma — barchasini so'z bilan yoz (masalan "kvadrat", "ildiz", "kasr", "plyus", "teng"), chunki feedback keyin ovozga aylantiriladi.
correct maydoni: javob mezonga mos kelsa true, aks holda false.`;
}

function textInstruction({ question, rubric, answerText, lang }) {
  const shape = `{"correct": boolean, "feedback": "string"}`;
  if (lang === 'ru') {
    return `Вопрос: ${question}
Критерий (rubric): ${rubric}
Ответ ученика: ${answerText}

Верни только JSON такой формы, и ничего больше:
${shape}`;
  }
  return `Savol: ${question}
Baholash mezoni (rubric): ${rubric}
O'quvchi javobi: ${answerText}

Faqat shu shakldagi JSON qaytar, boshqa hech narsa yozma:
${shape}`;
}

function voiceInstruction({ question, rubric, lang }) {
  const shape = `{"correct": boolean, "feedback": "string", "transcript": "string"}`;
  if (lang === 'ru') {
    return `Прикреплённое аудио — устный ответ ученика.
1) Расшифруй аудио в текст (transcript).
2) Оцени этот ответ по вопросу и критерию.

Вопрос: ${question}
Критерий (rubric): ${rubric}

Верни только JSON такой формы, и ничего больше:
${shape}
transcript — точный текст того, что сказал ученик (на том же языке).`;
  }
  return `Biriktirilgan audio — o'quvchining og'zaki javobi.
1) Audioni matnga aylantir (transcript).
2) Shu javobni savol va mezon asosida bahola.

Savol: ${question}
Baholash mezoni (rubric): ${rubric}

Faqat shu shakldagi JSON qaytar, boshqa hech narsa yozma:
${shape}
transcript — o'quvchi aytgan so'zlarning aniq matni (o'sha tilda).`;
}

function parseGradeJson(raw, { requireTranscript } = {}) {
  const fail = (m) => {
    const e = new Error(`Bad AI response: ${m}`);
    e.code = 'BAD_AI_SHAPE';
    return e;
  };
  if (!raw || typeof raw !== 'string') throw fail('empty');

  let s = raw.trim();
  // strip ```json ... ``` / ``` ... ``` fences
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  let obj;
  try {
    obj = JSON.parse(s);
  } catch {
    const a = s.indexOf('{');
    const b = s.lastIndexOf('}');
    if (a === -1 || b === -1 || b <= a) throw fail('not json');
    try { obj = JSON.parse(s.slice(a, b + 1)); } catch { throw fail('not json'); }
  }

  let correct = obj.correct;
  if (typeof correct === 'string') {
    if (correct.toLowerCase() === 'true') correct = true;
    else if (correct.toLowerCase() === 'false') correct = false;
  }
  if (typeof correct !== 'boolean') throw fail('correct not boolean');
  if (typeof obj.feedback !== 'string' || !obj.feedback.trim()) throw fail('feedback missing');

  const out = { correct, feedback: obj.feedback.trim() };
  if (requireTranscript) {
    out.transcript = typeof obj.transcript === 'string' ? obj.transcript : '';
  }
  return out;
}

async function callGemini({ lang, parts }) {
  const ai = getClient();
  let lastErr;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const resp = await ai.models.generateContent({
        model: MODEL,
        contents: [{ role: 'user', parts }],
        config: {
          systemInstruction: systemInstruction(lang),
          responseMimeType: 'application/json',
          temperature: 0.2,
          // gemini-2.5-flash is a thinking model. The installed @google/genai 0.7.0
          // does not pass thinkingConfig through, so thinking still runs and shares
          // this budget — keep it generous so thinking + the (small) JSON both fit,
          // otherwise the JSON gets truncated. maxOutputTokens is only a cap (unused
          // tokens are not billed).
          maxOutputTokens: 2048,
          thinkingConfig: { thinkingBudget: 0 },
        },
      });
      return resp.text;
    } catch (err) {
      lastErr = err;
      if (attempt === MAX_ATTEMPTS || !isRetryable(err)) throw err;
      await sleep(BASE_DELAY_MS * 2 ** (attempt - 1));
    }
  }
  throw lastErr;
}

export async function gradeText({ question, rubric, lang, answerText }) {
  const raw = await callGemini({
    lang,
    parts: [{ text: textInstruction({ question, rubric, answerText, lang }) }],
  });
  return parseGradeJson(raw, { requireTranscript: false });
}

export async function gradeVoice({ question, rubric, lang, audioBuffer, mimeType }) {
  const wav = await toWav(audioBuffer);
  const raw = await callGemini({
    lang,
    parts: [
      { inlineData: { mimeType: 'audio/wav', data: wav.toString('base64') } },
      { text: voiceInstruction({ question, rubric, lang }) },
    ],
  });
  return parseGradeJson(raw, { requireTranscript: true });
}
