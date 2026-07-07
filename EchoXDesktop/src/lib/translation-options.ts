import type { LanguageOption, VoiceOption } from "../types";

export const SOURCE_LANGUAGES: LanguageOption[] = [
  { code: "auto", label: "Auto-detect" },
  { code: "en", label: "English" },
  { code: "hi", label: "Hindi" },
  { code: "te", label: "Telugu" },
  { code: "ml", label: "Malayalam" },
  { code: "ur", label: "Urdu" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "it", label: "Italian" },
  { code: "pt", label: "Portuguese" },
  { code: "zh", label: "Chinese" },
  { code: "ru", label: "Russian" },
  { code: "ar", label: "Arabic" },
  { code: "tr", label: "Turkish" },
  { code: "id", label: "Indonesian" },
  { code: "vi", label: "Vietnamese" },
  { code: "nl", label: "Dutch" },
  { code: "pl", label: "Polish" },
  { code: "ta", label: "Tamil" },
  { code: "kn", label: "Kannada" },
  { code: "bn", label: "Bengali" },
  { code: "mr", label: "Marathi" },
  { code: "gu", label: "Gujarati" },
  { code: "pa", label: "Punjabi" },
  { code: "or", label: "Odia" },
  { code: "as", label: "Assamese" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
  { code: "th", label: "Thai" },
];

export const TARGET_LANGUAGES: LanguageOption[] = SOURCE_LANGUAGES.filter(
  (l) => l.code !== "auto"
);

export const VOICES: VoiceOption[] = [
  // English (en)
  { code: "en_US-lessac-medium", label: "Lessac (Male - Default)", languageCode: "en", gender: "male" },
  { code: "en_US-amy-medium", label: "Amy (Female)", languageCode: "en", gender: "female" },
  { code: "en_US-ryan-medium", label: "Ryan (Male)", languageCode: "en", gender: "male" },
  { code: "en_GB-alan-medium", label: "Alan (Male)", languageCode: "en", gender: "male" },
  // Hindi (hi)
  { code: "hi_IN-rohan-medium", label: "Rohan (Male - Default)", languageCode: "hi", gender: "male" },
  { code: "hi_IN-priyamvada-medium", label: "Priyamvada (Female)", languageCode: "hi", gender: "female" },
  // Telugu (te)
  { code: "te_IN-maya-medium", label: "Maya (Female - Default)", languageCode: "te", gender: "female" },
  { code: "te_IN-padmavathi-medium", label: "Padmavathi (Female)", languageCode: "te", gender: "female" },
  // Malayalam (ml)
  { code: "ml_IN-meera-medium", label: "Meera (Female - Default)", languageCode: "ml", gender: "female" },
  // Urdu (ur)
  { code: "ur_PK-fasih-medium", label: "Fasih (Male - Default)", languageCode: "ur", gender: "male" },
  // Spanish (es)
  { code: "es_ES-davefx-medium", label: "Davefx (Male - Default)", languageCode: "es", gender: "male" },
  // French (fr)
  { code: "fr_FR-siwis-medium", label: "Siwis (Female - Default)", languageCode: "fr", gender: "female" },
  // German (de)
  { code: "de_DE-thorsten-medium", label: "Thorsten (Male - Default)", languageCode: "de", gender: "male" },
  // Italian (it)
  { code: "it_IT-paola-medium", label: "Paola (Female - Default)", languageCode: "it", gender: "female" },
  // Portuguese (pt)
  { code: "pt_BR-jeff-medium", label: "Jeff (Male - Default)", languageCode: "pt", gender: "male" },
  // Chinese (zh)
  { code: "zh_CN-huayan-medium", label: "Huayan (Female - Default)", languageCode: "zh", gender: "female" },
  // Russian (ru)
  { code: "ru_RU-irina-medium", label: "Irina (Female - Default)", languageCode: "ru", gender: "female" },
  // Arabic (ar)
  { code: "ar_JO-kareem-medium", label: "Kareem (Male - Default)", languageCode: "ar", gender: "male" },
  // Turkish (tr)
  { code: "tr_TR-dfki-medium", label: "Dfki (Male - Default)", languageCode: "tr", gender: "male" },
  // Indonesian (id)
  { code: "id_ID-news_tts-medium", label: "News TTS (Male - Default)", languageCode: "id", gender: "male" },
  // Vietnamese (vi)
  { code: "vi_VN-vais1000-medium", label: "Vais1000 (Male - Default)", languageCode: "vi", gender: "male" },
  // Dutch (nl)
  { code: "nl_NL-alex-medium", label: "Alex (Male - Default)", languageCode: "nl", gender: "male" },
  // Polish (pl)
  { code: "pl_PL-gosia-medium", label: "Gosia (Female - Default)", languageCode: "pl", gender: "female" },
];

export function getVoicesForLanguage(languageCode: string): VoiceOption[] {
  return VOICES.filter((v) => v.languageCode === languageCode);
}

export function getDefaultVoice(languageCode: string): VoiceOption | undefined {
  return VOICES.find((v) => v.languageCode === languageCode);
}
