import { useState, type ReactElement } from "react";
import { FileDropZone } from "./FileDropZone";
import { OnlineUrlInput } from "./OnlineUrlInput";
import { AudioDropZone } from "./AudioDropZone";

type SourceMode = "file" | "url" | "audio";

interface SourcePanelProps {
  onFileReady: (path: string) => void;
  onUrlReady: (url: string) => void;
  disabled: boolean;
  onViewSources: () => void;
}

const TABS: { mode: SourceMode; label: string; icon: ReactElement }[] = [
  {
    mode: "file",
    label: "Local File",
    icon: (
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M3 2.5h6L13 6.5v7A1.5 1.5 0 0 1 11.5 15h-8.5A1.5 1.5 0 0 1 1.5 13.5v-10A1.5 1.5 0 0 1 3 2.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
        <path d="M9 2.5V6.5h4" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    mode: "url",
    label: "Online URL",
    icon: (
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3"/>
        <ellipse cx="8" cy="8" rx="2.5" ry="6.5" stroke="currentColor" strokeWidth="1.1"/>
        <path d="M1.5 6h13M1.5 10h13" stroke="currentColor" strokeWidth="1.1"/>
      </svg>
    ),
  },
  {
    mode: "audio",
    label: "Audio File",
    icon: (
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M6 13.5V4.5L14 3v9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="4" cy="13.5" r="2" stroke="currentColor" strokeWidth="1.3"/>
        <circle cx="12" cy="12" r="2" stroke="currentColor" strokeWidth="1.3"/>
      </svg>
    ),
  },
];

export function SourcePanel({
  onFileReady,
  onUrlReady,
  disabled,
  onViewSources,
}: SourcePanelProps) {
  const [mode, setMode] = useState<SourceMode>("file");

  return (
    <section className="panel" aria-label="Source input">
      <div className="panel-header">
        <div className="panel-title">
          <span className="panel-eyebrow">Source</span>
        </div>
        <div role="tablist" aria-label="Source mode" className="segmented">
          {TABS.map(({ mode: m, label, icon }) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              className="segmented-tab"
              onClick={() => setMode(m)}
              disabled={disabled}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="panel-body" role="tabpanel">
        {mode === "file" && (
          <FileDropZone onFileSelected={onFileReady} disabled={disabled} />
        )}
        {mode === "url" && (
          <OnlineUrlInput
            onUrlSubmit={onUrlReady}
            disabled={disabled}
            onViewSources={onViewSources}
          />
        )}
        {mode === "audio" && (
          <AudioDropZone onFileSelected={onFileReady} disabled={disabled} />
        )}
      </div>
    </section>
  );
}
