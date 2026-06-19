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

  return (
    <div>
      <label htmlFor="voice-select">Voice</label>
      <select
        id="voice-select"
        value={safeValue}
        onChange={(e) => onChange(e.currentTarget.value)}
        disabled={disabled || voices.length === 0}
      >
        {voices.length === 0 ? (
          <option value="">No voices available</option>
        ) : (
          voices.map((v) => (
            <option key={v.code} value={v.code}>
              {v.label} ({v.gender})
            </option>
          ))
        )}
      </select>
    </div>
  );
}
