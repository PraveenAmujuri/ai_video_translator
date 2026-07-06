import type { LanguageOption, VoiceOption } from "../types";

export const SOURCE_LANGUAGES: LanguageOption[] = [
  { code: "auto", label: "Auto-detect" },
  { code: "en", label: "English" },
  { code: "hi", label: "Hindi" },
  { code: "te", label: "Telugu" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
  { code: "pt", label: "Portuguese" },
  { code: "zh", label: "Chinese" },
];

export const TARGET_LANGUAGES: LanguageOption[] = SOURCE_LANGUAGES.filter(
  (l) => l.code !== "auto"
);

export const VOICES: VoiceOption[] = [
  { code: "hi-IN-rohan", label: "Rohan", languageCode: "hi", gender: "male" },
  { code: "hi-IN-priya", label: "Priya", languageCode: "hi", gender: "female" },
  { code: "te-IN-maya-medium", label: "Maya", languageCode: "te", gender: "female" },
  { code: "te-IN-mohan", label: "Mohan", languageCode: "te", gender: "male" },
  { code: "en-US-aria", label: "Aria", languageCode: "en", gender: "female" },
  { code: "en-US-guy", label: "Guy", languageCode: "en", gender: "male" },
  { code: "es-ES-alvaro", label: "Álvaro", languageCode: "es", gender: "male" },
  { code: "es-ES-elvira", label: "Elvira", languageCode: "es", gender: "female" },
  { code: "fr-FR-henri", label: "Henri", languageCode: "fr", gender: "male" },
  { code: "fr-FR-denise", label: "Denise", languageCode: "fr", gender: "female" },
  { code: "de-DE-stefan", label: "Stefan", languageCode: "de", gender: "male" },
  { code: "de-DE-katja", label: "Katja", languageCode: "de", gender: "female" },
  { code: "ja-JP-keita", label: "Keita", languageCode: "ja", gender: "male" },
  { code: "ja-JP-nanami", label: "Nanami", languageCode: "ja", gender: "female" },
  { code: "ko-KR-injoon", label: "Injoon", languageCode: "ko", gender: "male" },
  { code: "ko-KR-sunhi", label: "Sunhi", languageCode: "ko", gender: "female" },
  { code: "pt-BR-antonio", label: "Antônio", languageCode: "pt", gender: "male" },
  { code: "pt-BR-francisca", label: "Francisca", languageCode: "pt", gender: "female" },
  { code: "zh-CN-yunxi", label: "Yunxi", languageCode: "zh", gender: "male" },
  { code: "zh-CN-xiaoxiao", label: "Xiaoxiao", languageCode: "zh", gender: "female" },
];

export function getVoicesForLanguage(languageCode: string): VoiceOption[] {
  return VOICES.filter((v) => v.languageCode === languageCode);
}

export function getDefaultVoice(languageCode: string): VoiceOption | undefined {
  return VOICES.find((v) => v.languageCode === languageCode);
}
