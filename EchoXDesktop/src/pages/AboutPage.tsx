import { useEffect, useState } from "react";
import { getVersion, getName, getTauriVersion } from "@tauri-apps/api/app";

const BACKEND_HOST = "echox-api.eastasia.cloudapp.azure.com";
const BACKEND_URL = `https://${BACKEND_HOST}`;

function detectPlatform(): string {
  const ua = navigator.userAgent;
  if (ua.includes("Windows")) return "Windows";
  if (ua.includes("Mac")) return "macOS";
  if (ua.includes("Linux")) return "Linux";
  return navigator.platform || "Unknown";
}

interface BuildInfo {
  appName: string;
  appVersion: string;
  tauriVersion: string;
  osPlatform: string;
  userAgent: string;
}

function InfoRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="settings-row settings-row--static">
      <div className="settings-row-text">
        <span className="settings-row-title">{label}</span>
      </div>
      <span className={`settings-row-value${mono ? " mono" : ""}`}>{value}</span>
    </div>
  );
}

export function AboutPage() {
  const [info, setInfo] = useState<BuildInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getName(), getVersion(), getTauriVersion()])
      .then(([name, ver, tauriVer]) => {
        setInfo({
          appName: name,
          appVersion: ver,
          tauriVersion: tauriVer,
          osPlatform: detectPlatform(),
          userAgent: navigator.userAgent,
        });
      })
      .catch(() => {
        setInfo({
          appName: "EchoX",
          appVersion: "—",
          tauriVersion: "—",
          osPlatform: detectPlatform(),
          userAgent: navigator.userAgent,
        });
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page page--about">
      <header className="page-head">
        <div className="page-head-text">
          <h1 className="page-title">About EchoX</h1>
          <p className="page-sub">Build details, platform info, and service endpoints.</p>
        </div>
      </header>

      <div className="about-identity">
        <span className="about-mark" aria-hidden="true">
          <svg width="36" height="36" viewBox="0 0 16 16" fill="none">
            <rect x="1.5" y="4" width="2.4" height="8" rx="1" fill="currentColor" opacity="0.5" />
            <rect x="5.4" y="2" width="2.4" height="12" rx="1" fill="currentColor" opacity="0.85" />
            <rect x="9.3" y="5" width="2.4" height="6" rx="1" fill="currentColor" />
            <rect x="13" y="6.5" width="1.5" height="3" rx="0.75" fill="currentColor" opacity="0.7" />
          </svg>
        </span>
        <div className="about-identity-body">
          <span className="about-app-name">EchoX</span>
          <span className="about-app-slogan">Break Audio Barrier</span>
        </div>
        {info && !loading && (
          <span className="about-version-badge">v{info.appVersion}</span>
        )}
      </div>

      <section className="settings-section" aria-label="Application">
        <header className="settings-section-head">
          <h2>Application</h2>
          <p>Runtime build metadata.</p>
        </header>

        {loading ? (
          <div className="about-loading">Loading build info…</div>
        ) : info ? (
          <>
            <InfoRow label="App name" value={info.appName} />
            <InfoRow label="Version" value={`v${info.appVersion}`} mono />
            <InfoRow label="Tauri version" value={`v${info.tauriVersion}`} mono />
          </>
        ) : null}
      </section>

      <section className="settings-section" aria-label="Platform">
        <header className="settings-section-head">
          <h2>Platform</h2>
          <p>Operating system and hardware details.</p>
        </header>

        {loading ? (
          <div className="about-loading">Loading platform info…</div>
        ) : info ? (
          <>
            <InfoRow label="OS" value={info.osPlatform} />
            <InfoRow label="User agent" value={info.userAgent} mono />
          </>
        ) : null}
      </section>

      <section className="settings-section" aria-label="Service">
        <header className="settings-section-head">
          <h2>Service</h2>
          <p>Backend endpoints used by this build.</p>
        </header>

        <InfoRow label="Translation API" value={BACKEND_URL} mono />
        <InfoRow label="Host" value={BACKEND_HOST} mono />
        <InfoRow label="Region" value="East Asia" />
      </section>
    </div>
  );
}
