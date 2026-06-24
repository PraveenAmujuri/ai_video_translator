import { openUrl } from "@tauri-apps/plugin-opener";

const WEBSITE_URL = "https://echox.praveenai.tech";
const DOCS_URL = "https://echox.praveenai.tech/docs";
const GITHUB_URL = "https://github.com/PraveenAmujuri/ai_video_translator";

function ExternalLinkIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M6.5 3.5H3a.5.5 0 0 0-.5.5v9a.5.5 0 0 0 .5.5h9a.5.5 0 0 0 .5-.5V9.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 2.5h4v4M13.5 2.5 8 8"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GlobeIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3" />
      <ellipse cx="8" cy="8" rx="2.4" ry="6" stroke="currentColor" strokeWidth="1.1" />
      <path d="M2 6h12M2 10h12" stroke="currentColor" strokeWidth="1.1" />
    </svg>
  );
}

function BookIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M3 2.5h7a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <path d="M5 6h5M5 8.5h5M5 11h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M11 3.5h2a.5.5 0 0 1 .5.5v8.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function GithubIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 1C4.134 1 1 4.134 1 8c0 3.09 2.006 5.71 4.787 6.635.35.064.478-.152.478-.337 0-.166-.006-.606-.01-1.19-1.947.424-2.358-.94-2.358-.94-.318-.809-.777-1.024-.777-1.024-.635-.434.048-.425.048-.425.702.049 1.071.72 1.071.72.624 1.069 1.636.76 2.035.582.064-.453.244-.761.444-.935-1.554-.177-3.188-.777-3.188-3.462 0-.764.273-1.389.72-1.879-.072-.178-.312-.888.068-1.852 0 0 .587-.188 1.923.716A6.702 6.702 0 0 1 8 4.976c.594.003 1.19.08 1.748.235 1.334-.904 1.92-.716 1.92-.716.381.964.141 1.674.069 1.852.449.49.72 1.115.72 1.879 0 2.692-1.638 3.283-3.197 3.456.251.217.475.644.475 1.298 0 .937-.009 1.692-.009 1.922 0 .187.126.405.482.337C12.996 13.707 15 11.088 15 8c0-3.866-3.134-7-7-7Z" />
    </svg>
  );
}

interface LinkRowProps {
  icon: React.ReactNode;
  title: string;
  meta: string;
  url: string;
}

function LinkRow({ icon, title, meta, url }: LinkRowProps) {
  return (
    <button
      type="button"
      className="website-link-row"
      onClick={() => openUrl(url)}
    >
      <span className="website-link-icon">{icon}</span>
      <span className="website-link-body">
        <span className="website-link-title">{title}</span>
        <span className="website-link-meta">{meta}</span>
      </span>
      <span className="website-link-arrow">
        <ExternalLinkIcon size={13} />
      </span>
    </button>
  );
}

export function WebsitePage() {
  return (
    <div className="page page--website">
      <header className="page-head">
        <div className="page-head-text">
          <h1 className="page-title">Website</h1>
          <p className="page-sub">Visit EchoX online for news, documentation, and updates.</p>
        </div>
        <div className="page-head-actions">
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => openUrl(WEBSITE_URL)}
          >
            <ExternalLinkIcon size={13} />
            Open Website
          </button>
        </div>
      </header>

      <section className="website-hero-card">
        <div className="website-hero-brand">
          <span className="website-hero-mark" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 16 16" fill="none">
              <rect x="1.5" y="4" width="2.4" height="8" rx="1" fill="currentColor" opacity="0.5" />
              <rect x="5.4" y="2" width="2.4" height="12" rx="1" fill="currentColor" opacity="0.85" />
              <rect x="9.3" y="5" width="2.4" height="6" rx="1" fill="currentColor" />
              <rect x="13" y="6.5" width="1.5" height="3" rx="0.75" fill="currentColor" opacity="0.7" />
            </svg>
          </span>
          <div className="website-hero-brand-text">
            <span className="website-hero-name">EchoX</span>
            <span className="website-hero-tagline">Break Audio Barrier</span>
          </div>
        </div>
        <a
          className="website-url-chip"
          role="button"
          onClick={(e) => { e.preventDefault(); openUrl(WEBSITE_URL); }}
        >
          <GlobeIcon size={12} />
          echox.praveenai.tech
        </a>
      </section>

      <section className="settings-section" aria-label="Resources">
        <header className="settings-section-head">
          <h2>Resources</h2>
          <p>Official links for EchoX.</p>
        </header>
        <div className="website-links">
          <LinkRow
            icon={<GlobeIcon size={15} />}
            title="EchoX Website"
            meta="echox.praveenai.tech"
            url={WEBSITE_URL}
          />
          <LinkRow
            icon={<BookIcon size={15} />}
            title="Documentation"
            meta="echox.praveenai.tech/docs"
            url={DOCS_URL}
          />
          <LinkRow
            icon={<GithubIcon size={15} />}
            title="GitHub Repository"
            meta="github.com/PraveenAmujuri/ai_video_translator"
            url={GITHUB_URL}
          />
        </div>
      </section>
    </div>
  );
}
