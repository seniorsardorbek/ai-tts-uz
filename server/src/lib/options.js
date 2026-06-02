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

// Static ElevenLabs voice list (Turkic-native first for Uzbek).
// UZ is rendered with language_code 'tr' (see elevenlabs.js) — a Turkish native
// voice carries no English accent and Turkish phonetics are the closest to Uzbek.
const ELEVENLABS_VOICES = [
  { id: '9q3uhh453wT9R7x3sW1i', label: 'Alper (istanbul, male)' },
  { id: 'viS7lLPHrcuZhqLroKB8', label: 'Cengizhan Atalay - Narrator (istanbul, male)' },
  { id: 'ZaoBgxgzPhoCm533Pb7B', label: 'Zeynep Signature Voice Warm (istanbul, female)' },
  { id: 'pNInz6obpgDQGcFmaJgB', label: 'Adam - Dominant, Firm (american, male)' },
  { id: 'Xb7hH8MSUJpSbSDYk0k2', label: 'Alice - Clear, Engaging Educator (british, female)' },
  { id: 'hpp4J3VqNfWAUOO0d1Us', label: 'Bella - Professional, Bright, Warm (american, female)' },
  { id: 'pqHfZKP75CvOlQylNhV4', label: 'Bill - Wise, Mature, Balanced (american, male)' },
  { id: 'nPczCjzI2devNBz1zQrb', label: 'Brian - Deep, Resonant and Comforting (american, male)' },
  { id: 'N2lVS1w4EtoT3dr4eOWO', label: 'Callum - Husky Trickster (american, male)' },
  { id: 'IKne3meq5aSn9XLyUdCD', label: 'Charlie - Deep, Confident, Energetic (australian, male)' },
  { id: 'iP95p4xoKVk53GoZ742B', label: 'Chris - Charming, Down-to-Earth (american, male)' },
  { id: 'onwK4e9ZLuTAKqWW03F9', label: 'Daniel - Steady Broadcaster (british, male)' },
  { id: 'cjVigY5qzO86Huf0OWal', label: 'Eric - Smooth, Trustworthy (american, male)' },
  { id: 'JBFqnCBsd6RMkjVDRZzb', label: 'George - Warm, Captivating Storyteller (british, male)' },
  { id: 'SOYHLrjzK2X1ezoPC6cr', label: 'Harry - Fierce Warrior (american, male)' },
  { id: 'cgSgspJ2msm6clMCkdW9', label: 'Jessica - Playful, Bright, Warm (american, female)' },
  { id: 'FGY2WhTYpPnrIDTdsKH5', label: 'Laura - Enthusiast, Quirky Attitude (american, female)' },
  { id: 'TX3LPaxmHKxFdv7VOQHJ', label: 'Liam - Energetic, Social Media Creator (american, male)' },
  { id: 'pFZP5JQG7iQjIQuC4Bku', label: 'Lily - Velvety Actress (british, female)' },
  { id: 'XrExE9yKIg1WjnnlVkGX', label: 'Matilda - Knowledgable, Professional (american, female)' },
  { id: 'SAz9YHcvj6GT2YYXdXww', label: 'River - Relaxed, Neutral, Informative (american, neutral)' },
  { id: 'CwhRBWXzGAHq8TQ4Fs17', label: 'Roger - Laid-Back, Casual, Resonant (american, male)' },
  { id: 'EXAVITQu4vr4xnSDxMaL', label: 'Sarah - Mature, Reassuring, Confident (american, female)' },
  { id: 'bIHbv24MWmeRgasZH58o', label: 'Will - Relaxed Optimist (american, male)' },
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
export const DEFAULT_MOOD = 'school_teacher';
const MOOD_BY_ID = new Map(MOODS.map((m) => [m.id, m]));
export const getMood = (id) => MOOD_BY_ID.get(id);
export const isValidMood = (id) => MOOD_BY_ID.has(id);
