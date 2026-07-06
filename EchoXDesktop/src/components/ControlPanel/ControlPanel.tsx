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
    <section className="panel" aria-label="Translation settings">
      <div className="panel-header">
        <div className="panel-title">
          <span className="panel-eyebrow">Translation</span>
        </div>
      </div>

      <div className="panel-body">
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

        <div 
          style={{ 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "space-between", 
            marginTop: "auto", 
            paddingTop: "12px", 
            borderTop: "1px solid var(--line)" 
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "2px", paddingRight: "16px" }}>
            <span style={{ fontSize: "12.5px", fontWeight: "500", color: "var(--text-primary)" }}>
              Preserve Background Music & Effects (Beta)
            </span>
            <span style={{ fontSize: "10.5px", color: "var(--text-tertiary)", lineHeight: "1.4" }}>
              Preserves background music and ambient sounds while replacing spoken dialogue. Requires a one-time model download.
            </span>
          </div>
          <button
            type="button"
            className="switch"
            role="switch"
            disabled={disabled}
            aria-checked={options.preserveBackgroundMusicEffects ?? false}
            onClick={() =>
              onChange({
                ...options,
                preserveBackgroundMusicEffects: !options.preserveBackgroundMusicEffects,
              })
            }
          >
            <span className="switch-thumb" aria-hidden="true" />
          </button>
        </div>

        {(options.preserveBackgroundMusicEffects ?? false) && (
          <div 
            style={{ 
              display: "flex", 
              flexDirection: "column", 
              gap: "8px", 
              marginTop: "10px",
              padding: "10px 12px", 
              borderRadius: "6px", 
              backgroundColor: "rgba(255, 255, 255, 0.015)", 
              border: "1px solid rgba(255, 255, 255, 0.04)" 
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text-secondary)", fontWeight: 500 }}>
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{ opacity: 0.7 }}>
                  <path d="M4.5 6H2.5A1.5 1.5 0 0 0 1 7.5v1A1.5 1.5 0 0 0 2.5 10H4.5l4 3.2c.6.5 1.5.1 1.5-.7V3.5c0-.8-.9-1.2-1.5-.7L4.5 6z" fill="currentColor"/>
                  <path d="M12.5 5.5c.6.7.9 1.6.9 2.5s-.3 1.8-.9 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                Background mix level
              </span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--tile-blue)", fontWeight: 600 }}>
                {Math.round((options.backgroundAudioVolume ?? 0.3) * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={Math.round((options.backgroundAudioVolume ?? 0.3) * 100)}
              className="slider"
              style={{
                background: `linear-gradient(to right, var(--tile-blue) 0%, var(--tile-blue) ${Math.round((options.backgroundAudioVolume ?? 0.3) * 100)}%, var(--bg-canvas) ${Math.round((options.backgroundAudioVolume ?? 0.3) * 100)}%, var(--bg-canvas) 100%)`
              }}
              disabled={disabled}
              onChange={(e) =>
                onChange({
                  ...options,
                  backgroundAudioVolume: Number(e.currentTarget.value) / 100,
                })
              }
              aria-label="Background audio volume"
            />
          </div>
        )}
      </div>
    </section>
  );
}
