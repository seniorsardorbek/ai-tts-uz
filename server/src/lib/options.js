export const LANGS = ['uz', 'ru'];
export const DEFAULT_LANG = 'uz';
export const isValidLang = (lang) => LANGS.includes(lang);

export const PROVIDERS = ['gemini', 'elevenlabs'];
export const DEFAULT_PROVIDER = 'gemini';
export const isValidProvider = (p) => PROVIDERS.includes(p);

const GEMINI_VOICES = [
  { id: 'Sadaltager',   label: 'Sadaltager — knowledgeable' },
  { id: 'Charon',       label: 'Charon — informative, clear' },
  { id: 'Sulafat',      label: 'Sulafat — warm, friendly' },
  { id: 'Aoede',        label: 'Aoede — breezy, light' },
  { id: 'Achird',       label: 'Achird — friendly' },
  { id: 'Vindemiatrix', label: 'Vindemiatrix — gentle' },
  { id: 'Kore',         label: 'Kore — firm, neutral' },
  { id: 'Puck',         label: 'Puck — upbeat, youthful' },
  { id: 'Zephyr',       label: 'Zephyr — bright' },
  { id: 'Algieba',      label: 'Algieba — smooth' },
];

// Turkic-native voices for Uzbek.
// ElevenLabs v3 has no Uzbek; we render UZ with language_code 'tr' (see elevenlabs.js).
// A Turkish native speaker's voice carries ZERO English accent and Turkish phonetics are
// the closest match to Uzbek — far more native-sounding than the English library voices.
const ELEVENLABS_VOICES = [
  { id: 'ZaoBgxgzPhoCm533Pb7B', label: 'Zeynep — iliq, ayol (TR)' },
  { id: 'viS7lLPHrcuZhqLroKB8', label: 'Cengizhan — diktor, erkak (TR)' },
  { id: '3BJTXArCvMUh3FJduxup', label: 'Deniz — vazmin diktor, ayol (TR)' },
  { id: '9q3uhh453wT9R7x3sW1i', label: 'Alper — tinch, erkak (TR)' },
  { id: 'AT6MdagXHAuKZlvWWwtT', label: 'Umitales — tinch, ayol (TR)' },
  { id: '5rpbXsoJ8S0uNek3pM5V', label: 'Yonca — iliq, ayol (TR)' },
  { id: 'tF3iUGgHCAKxGm0PKhmW', label: 'Yalcin — chuqur, erkak (TR)' },
  { id: '1FGxfngSjwAlP8hsMWj3', label: 'Sifa — hikoyachi, ayol (TR)' },
];

export const VOICES = {
  gemini: GEMINI_VOICES,
  elevenlabs: ELEVENLABS_VOICES,
};

export const DEFAULT_VOICE = {
  gemini: 'Sadaltager',
  elevenlabs: 'ZaoBgxgzPhoCm533Pb7B', // Zeynep (TR native)
};

export function isValidVoice({ provider, voice }) {
  const list = VOICES[provider];
  return Array.isArray(list) && list.some((v) => v.id === voice);
}

export const MOODS = [
  {
    id: 'default',
    label: { uz: 'Oddiy', ru: 'Обычный' },
    prefix: { uz: '', ru: '' },
  },
  {
    id: 'math_teacher',
    label: { uz: 'Matematika ustozi', ru: 'Учитель математики' },
    prefix: {
      uz: "Matematika o'qituvchisi kabi, aniq, vazmin va tushuntirib ayt: ",
      ru: 'Скажи как учитель математики — спокойно, чётко и с объяснением: ',
    },
  },
  {
    id: 'novel_reader',
    label: { uz: "Roman o'quvchisi", ru: 'Чтец романа' },
    prefix: {
      uz: "Badiiy roman o'quvchisi kabi, hissiyot bilan va ifodali o'qi: ",
      ru: 'Прочитай выразительно и эмоционально, как чтец художественного романа: ',
    },
  },
  {
    id: 'school_teacher',
    label: { uz: "Maktab o'qituvchisi", ru: 'Школьный учитель' },
    prefix: {
      uz: "Mehribon maktab o'qituvchisi kabi, bolalar uchun sodda va do'stona ayt: ",
      ru: 'Скажи мягко и доступно, как добрый школьный учитель, обращаясь к детям: ',
    },
  },
  {
    id: 'journalist',
    label: { uz: 'Jurnalist', ru: 'Журналист' },
    prefix: {
      uz: "Yangiliklarni o'qiyotgan jurnalist kabi, rasmiy va aniq ohangda ayt: ",
      ru: 'Произнеси официальным новостным тоном, как журналист в эфире: ',
    },
  },
];
export const DEFAULT_MOOD = 'math_teacher';
const MOOD_BY_ID = new Map(MOODS.map((m) => [m.id, m]));
export const getMood = (id) => MOOD_BY_ID.get(id);
export const isValidMood = (id) => MOOD_BY_ID.has(id);
