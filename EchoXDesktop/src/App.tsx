// src/App.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslationPipeline } from "./hooks/useTranslationPipeline";
import { useHistory } from "./hooks/useHistory";
import { useSettings } from "./hooks/useSettings";
import { SourcePanel } from "./components/SourcePanel/SourcePanel";
import { ControlPanel } from "./components/ControlPanel/ControlPanel";
import { ProgressTrack } from "./components/ProgressTrack/ProgressTrack";
import { StatusChip } from "./components/ProgressTrack/StatusChip";
import { HudMonitor } from "./components/HudMonitor/HudMonitor";
import { OutputPanel } from "./components/OutputPanel/OutputPanel";
import { Sidebar, type SidebarPage } from "./components/Sidebar";
import { SupportedSourcesPage } from "./pages/SupportedSourcesPage";
import { HistoryPage } from "./pages/HistoryPage";
import { SettingsPage } from "./pages/SettingsPage";
import { WebsitePage } from "./pages/WebsitePage";
import { SupportPage } from "./pages/SupportPage";
import { AboutPage } from "./pages/AboutPage";
import { tauriUpdateExtractorEngine } from "./lib/tauri-commands";
import { SITE_DIRECTORY } from "./lib/source-registry";
import { VOICES } from "./lib/translation-options";
import type { TranslationOptions } from "./types";

interface PendingSource {
  kind: "file" | "url";
  label: string;
}

const PAGE_TITLES: Record<SidebarPage, string> = {
  home: "Translator",
  history: "History",
  sources: "Sources",
  settings: "Settings",
  website: "Website",
  support: "Support",
  about: "About",
};

function basename(path: string): string {
  const parts = path.split(/[\\/]/);
  return parts[parts.length - 1] || path;
}

export default function App() {
  const { settings, updateSettings, resetSettings } = useSettings();
  const { state, endpoints, actions } = useTranslationPipeline();
  const history = useHistory();

  const [options, setOptions] = useState<TranslationOptions>({
    targetLanguage: settings.defaultTargetLanguage,
    voice: settings.defaultVoice,
    sourceLanguage: settings.defaultSourceLanguage,
    preserveBackgroundMusicEffects: settings.preserveBackgroundMusicEffects,
    backgroundAudioVolume: settings.backgroundAudioVolume,
    embedSubtitles: settings.embedSubtitles,
  });

  const [page, setPage] = useState<SidebarPage>("home");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activityOpen, setActivityOpen] = useState(true);

  const lastResetTokenRef = useRef<string>("init");
  const pendingSourceRef = useRef<PendingSource | null>(null);
  const recordedJobIdsRef = useRef<Set<string>>(new Set());
  const recordedErrorTokensRef = useRef<Set<string>>(new Set());

  const isActive =
    state.phase !== "idle" &&
    state.phase !== "completed" &&
    state.phase !== "error";

  useEffect(() => {
    if (state.phase !== "idle") return;
    const token = `${state.jobId ?? "none"}-${state.error ?? "none"}`;
    if (lastResetTokenRef.current === token) return;
    lastResetTokenRef.current = token;
    setOptions({
      targetLanguage: settings.defaultTargetLanguage,
      voice: settings.defaultVoice,
      sourceLanguage: settings.defaultSourceLanguage,
      preserveBackgroundMusicEffects: settings.preserveBackgroundMusicEffects,
      backgroundAudioVolume: settings.backgroundAudioVolume,
      embedSubtitles: settings.embedSubtitles,
    });
  }, [
    state.phase,
    state.jobId,
    state.error,
    settings.defaultTargetLanguage,
    settings.defaultVoice,
    settings.defaultSourceLanguage,
    settings.preserveBackgroundMusicEffects,
    settings.backgroundAudioVolume,
  ]);

  useEffect(() => {
    if (state.phase === "completed" && state.jobId) {
      if (recordedJobIdsRef.current.has(state.jobId)) return;
      recordedJobIdsRef.current.add(state.jobId);
      const source = pendingSourceRef.current;
      history.appendEntry({
        id: state.jobId,
        sourceKind: source?.kind ?? "file",
        sourceLabel:
          source?.label ??
          (state.localFilePath ? basename(state.localFilePath) : state.jobId),
        targetLanguage:
          state.translationProgress?.target_language ?? options.targetLanguage,
        sourceLanguage:
          state.translationProgress?.source_language ?? options.sourceLanguage,
        voice: options.voice,
        status: "completed",
        errorMessage: null,
      });
    } else if (state.phase === "error" && state.error) {
      const id = state.jobId ?? `err-${state.error}`;
      if (recordedErrorTokensRef.current.has(id)) return;
      recordedErrorTokensRef.current.add(id);
      const source = pendingSourceRef.current;
      history.appendEntry({
        id,
        sourceKind: source?.kind ?? "file",
        sourceLabel:
          source?.label ??
          (state.localFilePath ? basename(state.localFilePath) : "Untracked source"),
        targetLanguage: options.targetLanguage,
        sourceLanguage: options.sourceLanguage,
        voice: options.voice,
        status: "error",
        errorMessage: state.error,
      });
    }
  }, [
    state.phase,
    state.jobId,
    state.error,
    state.localFilePath,
    state.translationProgress,
    options.targetLanguage,
    options.sourceLanguage,
    options.voice,
    history,
  ]);

  // Run engine lifecycle check once on mount; failures are non-fatal.
  const { appendLog } = actions;
  useEffect(() => {
    tauriUpdateExtractorEngine()
      .then((msg) => appendLog(`[Engine] ${msg}`))
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        appendLog(`[Engine] ${msg}`, "warn");
      });
  }, [appendLog]);

  const handleFileReady = (path: string) => {
    pendingSourceRef.current = { kind: "file", label: basename(path) };
    actions.startFromLocalFile(path, {
      ...options,
      preserveBackgroundMusicEffects: settings.preserveBackgroundMusicEffects,
      backgroundAudioVolume: settings.backgroundAudioVolume,
      embedSubtitles: settings.embedSubtitles,
    });
  };

  const handleUrlReady = (url: string) => {
    pendingSourceRef.current = { kind: "url", label: url };
    actions.startFromYouTubeUrl(url, {
      ...options,
      preserveBackgroundMusicEffects: settings.preserveBackgroundMusicEffects,
      backgroundAudioVolume: settings.backgroundAudioVolume,
      embedSubtitles: settings.embedSubtitles,
    });
  };

  const showProgress = state.phase !== "idle" && state.phase !== "error";

  const stats = useMemo(
    () => [
      {
        tone: "blue" as const,
        value: String(history.metrics.completed),
        label: "Completed translations",
      },
      {
        tone: "green" as const,
        value:
          history.metrics.successRate === null
            ? "—"
            : `${history.metrics.successRate}%`,
        label: "Success rate",
      },
      {
        tone: "yellow" as const,
        value: String(VOICES.length),
        label: "Voices available",
      },
      {
        tone: "purple" as const,
        value: String(SITE_DIRECTORY.length),
        label: "Source platforms",
      },
    ],
    [history.metrics.completed, history.metrics.successRate],
  );

  const pageMeta = useMemo(() => {
    switch (page) {
      case "home":
        return state.jobId ? `Job ${state.jobId.slice(0, 8)}` : null;
      case "history":
        return `${history.metrics.total} ${history.metrics.total === 1 ? "entry" : "entries"}`;
      case "sources":
        return `${SITE_DIRECTORY.length} sources`;
      case "settings":
        return "Local to this device";
      case "website":
        return "echox.praveenai.tech";
      case "support":
        return "saipraveenamujuri@gmail.com";
      case "about":
        return "Build info";
    }
  }, [page, state.jobId, history.metrics.total]);

  return (
    <div
      data-app="echox"
      data-page={page}
      data-sidebar={sidebarCollapsed ? "collapsed" : "expanded"}
      data-activity={activityOpen ? "open" : "closed"}
    >
      <Sidebar
        page={page}
        onNavigate={setPage}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((v) => !v)}
        navigationDisabled={isActive}
        historyCount={history.metrics.total}
        platformCount={SITE_DIRECTORY.length}
      />

      <section className="workspace-col">
        <header className="topbar" role="banner">
          <div className="topbar-title">
            <span className="topbar-title-eyebrow">EchoX</span>
            <span className="topbar-title-name">{PAGE_TITLES[page]}</span>
            {page === "home" && !state.jobId ? (
              <span className="topbar-title-slogan" aria-label="Break Audio Barrier">
                Break Audio Barrier
              </span>
            ) : (
              <span className="topbar-title-meta" aria-live="polite">
                {pageMeta}
              </span>
            )}
          </div>

          <div className="topbar-cluster">
            <StatusChip phase={state.phase} />
            <button
              type="button"
              className="topbar-pill"
              data-active={activityOpen ? "true" : "false"}
              aria-pressed={activityOpen}
              onClick={() => setActivityOpen((v) => !v)}
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <rect x="1.5" y="3" width="13" height="10" rx="1.4" stroke="currentColor" strokeWidth="1.4" />
                <path d="M4 6.5h8M4 9.5h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              Activity
              {state.logs.length > 0 && (
                <span className="topbar-pill-count" aria-hidden="true">
                  {state.logs.length}
                </span>
              )}
            </button>
          </div>
        </header>

        {page === "home" && (
          <main className="workspace" aria-label="Translator workspace">
            <div className="workspace-inner">
              <section className="hero" aria-label="Workspace overview">
                <div className="hero-body">
                  <h1 className="hero-title">
                    Translate any video into a native voice that keeps the speaker's pacing.
                  </h1>
                  <p className="hero-sub">
                    Drop a local file or paste a link. EchoX dubs the audio in your chosen
                    language and writes synced subtitles.
                  </p>
                  <button
                    type="button"
                    className="hero-cta"
                    onClick={() => setPage("sources")}
                    disabled={isActive}
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" />
                      <ellipse cx="8" cy="8" rx="2.4" ry="6" stroke="currentColor" strokeWidth="1.2" />
                      <path d="M2 6h12M2 10h12" stroke="currentColor" strokeWidth="1.2" />
                    </svg>
                    Browse source platforms
                  </button>
                </div>
                <div className="hero-orb" aria-hidden="true">
                  <span className="hero-orb-grid" />
                  <span className="hero-orb-glyph">
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                      <rect x="3" y="6" width="3.5" height="12" rx="1.2" fill="currentColor" opacity="0.55" />
                      <rect x="9" y="3" width="3.5" height="18" rx="1.2" fill="currentColor" opacity="0.85" />
                      <rect x="15" y="8" width="3.5" height="9" rx="1.2" fill="currentColor" />
                    </svg>
                  </span>
                </div>
              </section>

              <h2 className="section-eyebrow">Workspace</h2>
              <section className="stats" aria-label="Workspace metrics">
                {stats.map((stat, i) => (
                  <article key={i} className="tile" data-tone={stat.tone}>
                    <div className="tile-foot">
                      <span className="tile-value">{stat.value}</span>
                      <span className="tile-label">{stat.label}</span>
                    </div>
                  </article>
                ))}
              </section>

              {/* 1. Source Input Panel and Control Configuration Panel sit directly above trackers */}
              <section className="bento" style={{ position: "relative", zIndex: 30 }}>
                <div className="bento-col">
                  <SourcePanel
                    onFileReady={handleFileReady}
                    onUrlReady={handleUrlReady}
                    disabled={isActive}
                    onViewSources={() => setPage("sources")}
                  />
                </div>

                <div className="bento-col">
                  <ControlPanel
                    options={options}
                    onChange={setOptions}
                    disabled={isActive}
                  />

                  {state.phase !== "idle" && (
                    <div className="area-actions">
                      <button
                        type="button"
                        onClick={actions.reset}
                        className="btn btn--ghost"
                      >
                        <span className="btn-icon" aria-hidden="true">
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                            <path
                              d="M3 8a5 5 0 1 1 1.4 3.5"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                            />
                            <path
                              d="M3 4v3.5H6.5"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </span>
                        Start over
                      </button>
                    </div>
                  )}
                </div>
              </section>

              {/* 2. Elevated Progress Tracker layout pane captures full width right beneath Bento system blocks */}
              {showProgress && (
                <div className="area-progress" style={{ width: "100%" }}>
                  <ProgressTrack
                    phase={state.phase}
                    translationProgress={state.translationProgress}
                    downloadProgress={state.downloadProgress}
                  />
                </div>
              )}

              {/* 3. Output video plays natively full width right beneath progress sequence frame maps */}
              {state.phase === "completed" && endpoints && (
                <div className="area-output" style={{ width: "100%", marginBottom: "16px" }}>
                  <OutputPanel endpoints={endpoints} onSave={actions.saveOutput} />
                </div>
              )}

              {state.phase === "error" && state.error && (
                <div className="area-progress" style={{ width: "100%" }}>
                  <div className="banner banner--error" role="alert">
                    <span className="banner-icon" aria-hidden="true">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path
                          d="M8 1.75 14.5 13H1.5L8 1.75Z"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinejoin="round"
                        />
                        <path d="M8 6.5v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        <circle cx="8" cy="11.25" r="0.85" fill="currentColor" />
                      </svg>
                    </span>
                    <div className="banner-body">
                      <span className="banner-title">Pipeline failed</span>
                      <span className="banner-message">{state.error}</span>
                    </div>
                  </div>
                </div>
              )}
              
            </div>
          </main>
        )}

        {page === "history" && (
          <main className="workspace workspace--page" aria-label="History">
            <HistoryPage
              entries={history.entries}
              onRemove={history.removeEntry}
              onClear={history.clear}
            />
          </main>
        )}

        {page === "sources" && (
          <main className="workspace workspace--page" aria-label="Supported sources">
            <SupportedSourcesPage />
          </main>
        )}

        {page === "settings" && (
          <main className="workspace workspace--page" aria-label="Settings">
            <SettingsPage
              settings={settings}
              onChange={updateSettings}
              onReset={resetSettings}
              onClearHistory={history.clear}
              historyCount={history.metrics.total}
            />
          </main>
        )}

        {page === "website" && (
          <main className="workspace workspace--page" aria-label="Website">
            <WebsitePage />
          </main>
        )}

        {page === "support" && (
          <main className="workspace workspace--page" aria-label="Support">
            <SupportPage />
          </main>
        )}

        {page === "about" && (
          <main className="workspace workspace--page" aria-label="About EchoX">
            <AboutPage />
          </main>
        )}
      </section>

      <aside className="activity" aria-label="Activity log" hidden={!activityOpen}>
        <header className="activity-header">
          <div className="activity-header-text">
            <span className="activity-eyebrow">Activity</span>
            <span className="activity-meta">
              {state.logs.length === 0
                ? "Idle"
                : `${state.logs.length} ${state.logs.length === 1 ? "event" : "events"}`}
            </span>
          </div>
          <button
            type="button"
            className="activity-close"
            onClick={() => setActivityOpen(false)}
            aria-label="Close activity log"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="m4 4 8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <HudMonitor logs={state.logs} />
      </aside>
    </div>
  );
}