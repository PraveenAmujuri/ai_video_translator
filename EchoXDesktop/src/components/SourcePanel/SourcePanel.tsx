import { useState } from "react";
import { FileDropZone } from "./FileDropZone";
import { YouTubeInput } from "./YouTubeInput";

type SourceMode = "file" | "youtube";

interface SourcePanelProps {
  onFileReady: (path: string) => void;
  onYouTubeReady: (url: string) => void;
  disabled: boolean;
}

export function SourcePanel({
  onFileReady,
  onYouTubeReady,
  disabled,
}: SourcePanelProps) {
  const [mode, setMode] = useState<SourceMode>("file");

  return (
    <section className="panel" aria-label="Source input">
      <div className="panel-header">
        <div className="panel-title">
          <span className="panel-eyebrow">Source</span>
        </div>
        <div role="tablist" aria-label="Source mode" className="segmented">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "file"}
            className="segmented-tab"
            onClick={() => setMode("file")}
            disabled={disabled}
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 2.5h6L13 6.5v7A1.5 1.5 0 0 1 11.5 15h-8.5A1.5 1.5 0 0 1 1.5 13.5v-10A1.5 1.5 0 0 1 3 2.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
              <path d="M9 2.5V6.5h4" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
            </svg>
            Local file
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "youtube"}
            className="segmented-tab"
            onClick={() => setMode("youtube")}
            disabled={disabled}
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <rect x="1.5" y="3.5" width="13" height="9" rx="2" stroke="currentColor" strokeWidth="1.3"/>
              <path d="m7 6.5 3 1.5-3 1.5v-3Z" fill="currentColor"/>
            </svg>
            YouTube
          </button>
        </div>
      </div>

      <div className="panel-body" role="tabpanel">
        {mode === "file" ? (
          <FileDropZone onFileSelected={onFileReady} disabled={disabled} />
        ) : (
          <YouTubeInput onUrlSubmit={onYouTubeReady} disabled={disabled} />
        )}
      </div>
    </section>
  );
}
