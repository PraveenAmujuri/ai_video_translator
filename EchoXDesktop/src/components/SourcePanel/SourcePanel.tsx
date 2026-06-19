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
    <section aria-label="Source input">
      <div role="tablist" aria-label="Source mode">
        <button
          role="tab"
          aria-selected={mode === "file"}
          onClick={() => setMode("file")}
          disabled={disabled}
        >
          Local File
        </button>
        <button
          role="tab"
          aria-selected={mode === "youtube"}
          onClick={() => setMode("youtube")}
          disabled={disabled}
        >
          YouTube URL
        </button>
      </div>

      <div role="tabpanel">
        {mode === "file" ? (
          <FileDropZone onFileSelected={onFileReady} disabled={disabled} />
        ) : (
          <YouTubeInput onUrlSubmit={onYouTubeReady} disabled={disabled} />
        )}
      </div>
    </section>
  );
}
