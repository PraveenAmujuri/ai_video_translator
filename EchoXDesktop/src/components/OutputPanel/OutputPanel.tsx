import { useState } from "react";
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
  const [ccActive, setCcActive] = useState(true);

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
          crossOrigin="anonymous"
          controls
          preload="metadata"
          aria-label="Translated video preview"
        >
          {endpoints.subtitleUrl && ccActive && (
            <track
              label="Translated Subtitles"
              kind="subtitles"
              srcLang="auto"
              src={endpoints.subtitleUrl}
              default
            />
          )}
        </video>

        <div className="output-actions" style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <SaveButton onSave={onSave} saveProgress={saveProgress} />
          {endpoints.subtitleUrl && (
            <button
              type="button"
              onClick={() => setCcActive(!ccActive)}
              className={`btn ${ccActive ? "btn--primary" : "btn--ghost"}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                height: "36px",
                padding: "0 14px",
                fontSize: "12px",
                fontWeight: "500",
                borderRadius: "6px",
                transition: "all 0.2s"
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <path d="M7 10h2a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2H7" />
                <path d="M15 10h2a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2h-2" />
              </svg>
              <span>CC: {ccActive ? "ON" : "OFF"}</span>
            </button>
          )}
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
