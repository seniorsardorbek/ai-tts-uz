// Used by /api/grade (legacy)
export const LANGS = ['uz', 'ru'];
export const DEFAULT_LANG = 'uz';
export const isValidLang = (lang) => LANGS.includes(lang);

// TTS contract
export const GENDERS = ['m', 'f'];
export const DEFAULT_GENDER = 'f';
export const isValidGender = (g) => GENDERS.includes(g);

export const GENDER_TO_VOICE = {
  m: 'TX3LPaxmHKxFdv7VOQHJ', // Liam
  f: 'cgSgspJ2msm6clMCkdW9', // Jessica
};

export const LOCKED_MOOD = 'school_teacher';
