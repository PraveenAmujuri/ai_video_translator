import { useState, useEffect, useRef } from "react";
import type { LanguageOption } from "../../types";

interface LanguageSelectProps {
  id: string;
  label: string;
  value: string;
  options: LanguageOption[];
  onChange: (code: string) => void;
  disabled?: boolean;
}

export function LanguageSelect({
  id,
  label,
  value,
  options,
  onChange,
  disabled = false,
}: LanguageSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredCode, setHoveredCode] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  const activeLang = options.find((opt) => opt.code === value) || options[0];

  return (
    <div className="field" ref={containerRef} style={{ position: "relative" }}>
      <label htmlFor={id} className="field-label">{label}</label>
      <div className="select-wrap">
        <button
          type="button"
          id={id}
          disabled={disabled}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className="select"
          style={{
            display: "block",
            textAlign: "left",
            width: "100%",
            boxSizing: "border-box",
            paddingRight: "32px",
            opacity: disabled ? 0.5 : 1,
            cursor: disabled ? "not-allowed" : "pointer",
          }}
        >
          {activeLang?.label || value}
        </button>

        {isOpen && (
          <div
            style={{
              position: "absolute",
              zIndex: 9999,
              left: 0,
              right: 0,
              marginTop: "4px",
              borderRadius: "6px",
              border: "1px solid var(--line)",
              backgroundColor: "var(--bg-panel-hi)",
              boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)",
              maxHeight: "200px",
              overflowY: "auto",
              padding: "4px 0",
            }}
          >
            {options.map((opt) => {
              const supported =
                opt.code === "en" ||
                opt.code === "hi" ||
                opt.code === "te" ||
                opt.code === "auto";

              const isHovered = hoveredCode === opt.code;

              return (
                <div
                  key={opt.code}
                  onClick={() => {
                    if (supported) {
                      onChange(opt.code);
                      setIsOpen(false);
                    }
                  }}
                  onMouseEnter={() => supported && setHoveredCode(opt.code)}
                  onMouseLeave={() => setHoveredCode(null)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    fontSize: "12px",
                    cursor: supported ? "pointer" : "default",
                    opacity: supported ? 1 : 0.45,
                    color: supported ? "var(--text-primary)" : "var(--text-tertiary)",
                    backgroundColor: isHovered && supported ? "var(--line-strong)" : "transparent",
                    transition: "background-color 0.15s ease",
                  }}
                >
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {opt.label}
                  </span>
                  {!supported && (
                    <span
                      style={{
                        fontSize: "8px",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        border: "1px solid var(--line-strong)",
                        backgroundColor: "var(--bg-canvas)",
                        color: "var(--text-tertiary)",
                        whiteSpace: "nowrap",
                        marginLeft: "8px",
                      }}
                    >
                      Currently unavailable
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
