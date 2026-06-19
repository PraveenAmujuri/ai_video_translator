import type { LanguageOption } from "../../types";

interface LanguageSelectProps {
  id: string;
  label: string;
  value: string;
  options: LanguageOption[];
  onChange: (code: string) => void;
  disabled: boolean;
}

export function LanguageSelect({
  id,
  label,
  value,
  options,
  onChange,
  disabled,
}: LanguageSelectProps) {
  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
        disabled={disabled}
      >
        {options.map((opt) => (
          <option key={opt.code} value={opt.code}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
