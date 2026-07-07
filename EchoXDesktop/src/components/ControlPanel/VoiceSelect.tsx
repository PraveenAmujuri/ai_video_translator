import type { VoiceOption } from "../../types";

interface VoiceSelectProps {
  value: string;
  voices: VoiceOption[];
  onChange: (code: string) => void;
  disabled: boolean;
}

export function VoiceSelect({
  value,
  voices,
  onChange,
  disabled,
}: VoiceSelectProps) {
  const safeValue = voices.some((v) => v.code === value)
    ? value
    : (voices[0]?.code ?? "");

  // Extract language family to route voice previews correctly
  const langFamily = safeValue.split("-")[0]?.split("_")[0]?.toLowerCase() || "en";
  const previewUrl = safeValue ? `/voice-previews/${langFamily}/${safeValue}.mp3` : "";

  return (
    <div className="field">
      <label htmlFor="voice-select" className="field-label">Voice</label>
      <div className="select-wrap">
        <select
          id="voice-select"
          value={safeValue}
          onChange={(e) => onChange(e.currentTarget.value)}
          disabled={disabled || voices.length === 0}
          className="select"
        >
          {voices.length === 0 ? (
            <option value="">No voices available</option>
          ) : (
            voices.map((v) => (
              <option key={v.code} value={v.code}>
                {v.label} · {v.gender}
              </option>
            ))
          )}
        </select>
      </div>

      {/* Simple normal browser native audio player for desktop app */}
      {previewUrl && voices.length > 0 && (
        <div style={{ marginTop: "12px", width: "100%" }}>
          <audio
            key={safeValue}
            controls
            src={previewUrl}
            style={{ width: "100%", height: "32px", display: "block" }}
          />
        </div>
      )}
    </div>
  );
}
