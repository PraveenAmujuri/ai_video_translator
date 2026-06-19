import { useState } from "react";
import "./App.css";
import { useTranslationPipeline } from "./hooks/useTranslationPipeline";
import { SourcePanel } from "./components/SourcePanel/SourcePanel";
import { ControlPanel } from "./components/ControlPanel/ControlPanel";
import { ProgressTrack } from "./components/ProgressTrack/ProgressTrack";
import { StatusChip } from "./components/ProgressTrack/StatusChip";
import { HudMonitor } from "./components/HudMonitor/HudMonitor";
import { OutputPanel } from "./components/OutputPanel/OutputPanel";
import type { TranslationOptions } from "./types";

const DEFAULT_OPTIONS: TranslationOptions = {
  targetLanguage: "hi",
  voice: "hi-IN-rohan",
  sourceLanguage: "auto",
};

export default function App() {
  const { state, endpoints, actions } = useTranslationPipeline();
  const [options, setOptions] = useState<TranslationOptions>(DEFAULT_OPTIONS);

  const isActive =
    state.phase !== "idle" &&
    state.phase !== "completed" &&
    state.phase !== "error";

  const handleFileReady = (path: string) => {
    actions.startFromLocalFile(path, options);
  };

  const handleYouTubeReady = (url: string) => {
    actions.startFromYouTubeUrl(url, options);
  };

  const showProgress =
    state.phase !== "idle" && state.phase !== "error";

  return (
    <div data-app="echox">
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="1.5" y="4" width="2.5" height="8" rx="1" fill="currentColor" opacity="0.55"/>
              <rect x="5.5" y="2" width="2.5" height="12" rx="1" fill="currentColor" opacity="0.85"/>
              <rect x="9.5" y="5" width="2.5" height="6" rx="1" fill="currentColor"/>
              <rect x="13"  y="6.5" width="1.5" height="3" rx="0.75" fill="currentColor" opacity="0.7"/>
            </svg>
          </span>
          <span className="brand-name">EchoX</span>
          <span className="brand-divider" aria-hidden="true" />
          <span className="brand-tag">AI Video Translator</span>
        </div>
        <div className="header-meta">
          <StatusChip phase={state.phase} />
        </div>
      </header>

      <main className="workspace">
        <div className="workspace-inner">
          <div className="area-source">
            <SourcePanel
              onFileReady={handleFileReady}
              onYouTubeReady={handleYouTubeReady}
              disabled={isActive}
            />
          </div>

          <div className="area-controls">
            <ControlPanel
              options={options}
              onChange={setOptions}
              disabled={isActive}
            />
          </div>

          {showProgress && (
            <div className="area-progress">
              <ProgressTrack
                phase={state.phase}
                translationProgress={state.translationProgress}
                downloadProgress={state.downloadProgress}
              />
            </div>
          )}

          {state.phase === "error" && state.error && (
            <div className="area-progress">
              <div className="banner banner--error" role="alert" aria-label="Error">
                <span className="banner-icon" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8 1.75 14.5 13H1.5L8 1.75Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                    <path d="M8 6.5v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <circle cx="8" cy="11.25" r="0.85" fill="currentColor"/>
                  </svg>
                </span>
                <div className="banner-body">
                  <span className="banner-title">Pipeline failed</span>
                  <span className="banner-message">{state.error}</span>
                </div>
              </div>
            </div>
          )}

          {state.phase === "completed" && endpoints && (
            <div className="area-output">
              <OutputPanel endpoints={endpoints} onSave={actions.saveOutput} />
            </div>
          )}

          {(state.phase === "completed" || state.phase === "error") && (
            <div className="area-actions">
              <button
                type="button"
                onClick={actions.reset}
                className="btn btn--ghost"
              >
                <span className="btn-icon" aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8a5 5 0 1 1 1.4 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M3 4v3.5H6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
                Start over
              </button>
            </div>
          )}
        </div>
      </main>

      <aside className="activity" aria-label="Activity panel">
        <div className="activity-header">
          <span className="activity-title">Activity Monitor</span>
          <span className="activity-meta">
            {state.logs.length === 0
              ? "—"
              : `${state.logs.length} ${state.logs.length === 1 ? "event" : "events"}`}
          </span>
        </div>
        <HudMonitor logs={state.logs} />
      </aside>
    </div>
  );
}
