import { LanguageSelect } from "./LanguageSelect";
import { VoiceSelect } from "./VoiceSelect";
import {
  SOURCE_LANGUAGES,
  TARGET_LANGUAGES,
  getVoicesForLanguage,
  getDefaultVoice,
} from "../../lib/translation-options";
import type { TranslationOptions } from "../../types";

interface ControlPanelProps {
  options: TranslationOptions;
  onChange: (options: TranslationOptions) => void;
  disabled: boolean;
}

export function ControlPanel({ options, onChange, disabled }: ControlPanelProps) {
  const voices = getVoicesForLanguage(options.targetLanguage);

  const handleTargetLanguageChange = (code: string) => {
    const defaultVoice = getDefaultVoice(code);
    onChange({
      ...options,
      targetLanguage: code,
      voice: defaultVoice?.code ?? "",
    });
  };

  return (
    <section aria-label="Translation settings">
      <LanguageSelect
        id="target-language"
        label="Target language"
        value={options.targetLanguage}
        options={TARGET_LANGUAGES}
        onChange={handleTargetLanguageChange}
        disabled={disabled}
      />

      <VoiceSelect
        value={options.voice}
        voices={voices}
        onChange={(code) => onChange({ ...options, voice: code })}
        disabled={disabled}
      />

      <LanguageSelect
        id="source-language"
        label="Source language"
        value={options.sourceLanguage}
        options={SOURCE_LANGUAGES}
        onChange={(code) => onChange({ ...options, sourceLanguage: code })}
        disabled={disabled}
      />
    </section>
  );
}
