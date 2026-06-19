import { useState } from "react";
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

  return (
    <div data-app="echox">
      <header>
        <h1>EchoX</h1>
        <StatusChip phase={state.phase} />
      </header>

      <main>
        <SourcePanel
          onFileReady={handleFileReady}
          onYouTubeReady={handleYouTubeReady}
          disabled={isActive}
        />

        <ControlPanel
          options={options}
          onChange={setOptions}
          disabled={isActive}
        />

        <ProgressTrack
          phase={state.phase}
          translationProgress={state.translationProgress}
          downloadProgress={state.downloadProgress}
        />

        {state.phase === "error" && state.error && (
          <div role="alert" aria-label="Error">
            <span>{state.error}</span>
          </div>
        )}

        {state.phase === "completed" && endpoints && (
          <OutputPanel endpoints={endpoints} onSave={actions.saveOutput} />
        )}

        {(state.phase === "completed" || state.phase === "error") && (
          <button type="button" onClick={actions.reset}>
            Start over
          </button>
        )}
      </main>

      <HudMonitor logs={state.logs} />
    </div>
  );
}
