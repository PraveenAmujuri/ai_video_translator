import { SaveButton } from "./SaveButton";
import { useSaveProgress } from "../../hooks/useSaveProgress";
import type { StreamEndpointsResponse } from "../../types";

interface OutputPanelProps {
  endpoints: StreamEndpointsResponse;
  onSave: () => void;
}

export function OutputPanel({ endpoints, onSave }: OutputPanelProps) {
  const saveProgress = useSaveProgress();

  return (
    <section aria-label="Translation output">
      <video
        src={endpoints.videoUrl}
        controls
        preload="metadata"
        aria-label="Translated video preview"
      />

      <SaveButton onSave={onSave} saveProgress={saveProgress} />

      {saveProgress !== null && saveProgress.percentage < 100 && (
        <div
          role="progressbar"
          aria-valuenow={Math.round(saveProgress.percentage)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Save progress"
        >
          <div
            style={{
              width: "100%",
              transform: `translateX(${saveProgress.percentage - 100}%)`,
              willChange: "transform",
            }}
          />
        </div>
      )}
    </section>
  );
}
