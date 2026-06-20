import type { AppSettings } from "../hooks/useSettings";
import {
  SOURCE_LANGUAGES,
  TARGET_LANGUAGES,
  getVoicesForLanguage,
  getDefaultVoice,
} from "../lib/translation-options";

interface SettingsPageProps {
  settings: AppSettings;
  onChange: (patch: Partial<AppSettings>) => void;
  onReset: () => void;
  onClearHistory: () => void;
  historyCount: number;
}

export const BACKEND_URL = "https://echox-api.eastasia.cloudapp.azure.com";
const MAX_UPLOAD_MB = 200;

export function SettingsPage({
  settings,
  onChange,
  onReset,
  onClearHistory,
  historyCount,
}: SettingsPageProps) {
  const voicesForTarget = getVoicesForLanguage(settings.defaultTargetLanguage);
  const volumePercent = Math.round(settings.backgroundAudioVolume * 100);

  const handleTargetLanguage = (code: string) => {
    const voice = getDefaultVoice(code);
    onChange({
      defaultTargetLanguage: code,
      defaultVoice: voice?.code ?? settings.defaultVoice,
    });
  };

  return (
    <div className="page page--settings">
      <header className="page-head">
        <div className="page-head-text">
          <h1 className="page-title">Settings</h1>
          <p className="page-sub">
            Defaults applied to every new translation, plus local data controls.
          </p>
        </div>
        <div className="page-head-actions">
          <button type="button" className="btn btn--ghost" onClick={onReset}>
            Restore defaults
          </button>
        </div>
      </header>

      <section className="settings-section" aria-label="Translation defaults">
        <header className="settings-section-head">
          <h2>Translation defaults</h2>
          <p>Pre-fill these on every new job.</p>
        </header>

        <div className="settings-row">
          <div className="settings-row-text">
            <span className="settings-row-title">Default target language</span>
            <span className="settings-row-help">
              The language EchoX will dub into when you open a new job.
            </span>
          </div>
          <div className="settings-row-control">
            <div className="select-wrap">
              <select
                className="select"
                value={settings.defaultTargetLanguage}
                onChange={(e) => handleTargetLanguage(e.currentTarget.value)}
                aria-label="Default target language"
              >
                {TARGET_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="settings-row">
          <div className="settings-row-text">
            <span className="settings-row-title">Default voice</span>
            <span className="settings-row-help">
              {voicesForTarget.length === 0
                ? "No voices registered for this language."
                : `${voicesForTarget.length} voice${voicesForTarget.length === 1 ? "" : "s"} available for ${
                    TARGET_LANGUAGES.find((l) => l.code === settings.defaultTargetLanguage)?.label
                  }.`}
            </span>
          </div>
          <div className="settings-row-control">
            <div className="select-wrap">
              <select
                className="select"
                value={settings.defaultVoice}
                onChange={(e) => onChange({ defaultVoice: e.currentTarget.value })}
                disabled={voicesForTarget.length === 0}
                aria-label="Default voice"
              >
                {voicesForTarget.map((v) => (
                  <option key={v.code} value={v.code}>
                    {v.label} · {v.gender}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="settings-row">
          <div className="settings-row-text">
            <span className="settings-row-title">Default source language</span>
            <span className="settings-row-help">
              Use Auto-detect unless you know the source ahead of time.
            </span>
          </div>
          <div className="settings-row-control">
            <div className="select-wrap">
              <select
                className="select"
                value={settings.defaultSourceLanguage}
                onChange={(e) =>
                  onChange({ defaultSourceLanguage: e.currentTarget.value })
                }
                aria-label="Default source language"
              >
                {SOURCE_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      <section className="settings-section" aria-label="Background audio">
        <header className="settings-section-head">
          <h2>Background audio</h2>
          <p>Control how source ambience is mixed with the dubbed voice.</p>
        </header>

        <div className="settings-row">
          <div className="settings-row-text">
            <span className="settings-row-title">Preserve background audio</span>
            <span className="settings-row-help">
              Keeps music and ambient sound underneath the translated voice.
            </span>
          </div>
          <div className="settings-row-control">
            <button
              type="button"
              className="switch"
              role="switch"
              aria-checked={settings.preserveBackgroundAudio}
              onClick={() =>
                onChange({
                  preserveBackgroundAudio: !settings.preserveBackgroundAudio,
                })
              }
            >
              <span className="switch-thumb" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="settings-row">
          <div className="settings-row-text">
            <span className="settings-row-title">Background mix level</span>
            <span className="settings-row-help">
              Applied only when background audio is preserved.
            </span>
          </div>
          <div className="settings-row-control settings-row-control--slider">
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={volumePercent}
              className="slider"
              disabled={!settings.preserveBackgroundAudio}
              onChange={(e) =>
                onChange({
                  backgroundAudioVolume: Number(e.currentTarget.value) / 100,
                })
              }
              aria-label="Background audio volume"
            />
            <span className="slider-value">{volumePercent}%</span>
          </div>
        </div>
      </section>

      <section className="settings-section" aria-label="Local data">
        <header className="settings-section-head">
          <h2>Local data</h2>
          <p>History is stored on this device only.</p>
        </header>

        <div className="settings-row">
          <div className="settings-row-text">
            <span className="settings-row-title">Translation history</span>
            <span className="settings-row-help">
              {historyCount === 0
                ? "No entries stored."
                : `${historyCount} ${historyCount === 1 ? "entry" : "entries"} stored locally.`}
            </span>
          </div>
          <div className="settings-row-control">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={onClearHistory}
              disabled={historyCount === 0}
            >
              Clear history
            </button>
          </div>
        </div>
      </section>

      <section className="settings-section" aria-label="System">
        <header className="settings-section-head">
          <h2>System</h2>
          <p>Runtime details from the bundled native shell.</p>
        </header>

        <div className="settings-row settings-row--static">
          <div className="settings-row-text">
            <span className="settings-row-title">Backend endpoint</span>
            <span className="settings-row-help">Local FastAPI service.</span>
          </div>
          <span className="settings-row-value mono">{BACKEND_URL}</span>
        </div>

        <div className="settings-row settings-row--static">
          <div className="settings-row-text">
            <span className="settings-row-title">Max upload size</span>
            <span className="settings-row-help">Per the /translate-stream contract.</span>
          </div>
          <span className="settings-row-value mono">{MAX_UPLOAD_MB} MB</span>
        </div>

        <div className="settings-row settings-row--static">
          <div className="settings-row-text">
            <span className="settings-row-title">Progress polling interval</span>
            <span className="settings-row-help">Fixed by the translation API.</span>
          </div>
          <span className="settings-row-value mono">2.0 s</span>
        </div>
      </section>
    </div>
  );
}