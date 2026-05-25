export const LANGS = ['uz', 'ru'];
export const DEFAULT_LANG = 'uz';

export const VOICES = [
  { id: 'Charon',        label: 'Charon — informative, clear' },
  { id: 'Sulafat',       label: 'Sulafat — warm, friendly' },
  { id: 'Aoede',         label: 'Aoede — breezy, light' },
  { id: 'Sadaltager',    label: 'Sadaltager — knowledgeable' },
  { id: 'Achird',        label: 'Achird — friendly' },
  { id: 'Vindemiatrix',  label: 'Vindemiatrix — gentle' },
  { id: 'Kore',          label: 'Kore — firm, neutral' },
  { id: 'Puck',          label: 'Puck — upbeat, youthful' },
  { id: 'Zephyr',        label: 'Zephyr — bright' },
  { id: 'Algieba',       label: 'Algieba — smooth' },
];
export const DEFAULT_VOICE = 'Charon';
const VOICE_IDS = new Set(VOICES.map((v) => v.id));
export const isValidVoice = (id) => typeof id === 'string' && VOICE_IDS.has(id);

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
export const DEFAULT_MOOD = 'default';
const MOOD_BY_ID = new Map(MOODS.map((m) => [m.id, m]));
export const getMood = (id) => MOOD_BY_ID.get(id);
export const isValidMood = (id) => MOOD_BY_ID.has(id);
export const isValidLang = (lang) => LANGS.includes(lang);
