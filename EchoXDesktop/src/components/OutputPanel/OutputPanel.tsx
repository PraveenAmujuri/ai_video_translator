import { SaveButton } from "./SaveButton";
import { useSaveProgress } from "../../hooks/useSaveProgress";
import type { StreamEndpointsResponse } from "../../types";

interface OutputPanelProps {
  endpoints: StreamEndpointsResponse;
  onSave: () => void;
}

export function OutputPanel({ endpoints, onSave }: OutputPanelProps) {
  const saveProgress = useSaveProgress();
  const isSaving = saveProgress !== null && saveProgress.percentage < 100;

  return (
    <section className="panel" aria-label="Translation output">
      <div className="panel-header">
        <div className="panel-title">
          <span className="panel-eyebrow">Output</span>
        </div>
        <span className="field-help">Preview and save the translated video</span>
      </div>

      <div className="panel-body">
        <video
          className="output-video"
          src={endpoints.videoUrl}
          controls
          preload="metadata"
          aria-label="Translated video preview"
        />

        <div className="output-actions">
          <SaveButton onSave={onSave} saveProgress={saveProgress} />
          {isSaving && (
            <div
              className="save-progress"
              role="progressbar"
              aria-valuenow={Math.round(saveProgress!.percentage)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Save progress"
            >
              <div
                className="save-progress-fill"
                style={{ ["--progress" as string]: `${saveProgress!.percentage}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
