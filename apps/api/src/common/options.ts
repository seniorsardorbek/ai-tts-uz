import type { Gender } from "@ai-tts/shared";

export const GENDERS: Gender[] = ["m", "f"];
export const DEFAULT_GENDER: Gender = "f";
export const isValidGender = (g: unknown): g is Gender => g === "m" || g === "f";

// gender -> ElevenLabs voice id
export const GENDER_TO_VOICE: Record<Gender, string> = {
  m: "TX3LPaxmHKxFdv7VOQHJ", // Liam
  f: "cgSgspJ2msm6clMCkdW9", // Jessica
};

// Locked voice-settings profile (ElevenLabs voice_settings)
export const LOCKED_MOOD = "school_teacher";

export const MOOD_SETTINGS: Record<
  string,
  { stability: number; similarity_boost: number; style: number; use_speaker_boost: boolean }
> = {
  default: { stability: 0.5, similarity_boost: 0.75, style: 0.0, use_speaker_boost: true },
  school_teacher: { stability: 0.6, similarity_boost: 0.75, style: 0.15, use_speaker_boost: true },
};
