import { openUrl } from "@tauri-apps/plugin-opener";

const SUPPORT_EMAIL = "saipraveenamujuri@gmail.com";
const WEBSITE_URL = "https://echox.praveenai.tech";
const BUG_REPORT_URL = "https://echox.praveenai.tech/support/bug";
const FEATURE_REQUEST_URL = "https://echox.praveenai.tech/support/feature";

function MailIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="1.5" y="3.5" width="13" height="9" rx="1.2" stroke="currentColor" strokeWidth="1.3" />
      <path d="m1.5 5 6.5 4.5L14.5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function BugIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <ellipse cx="8" cy="9" rx="4" ry="4.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M6 4.5a2 2 0 0 1 4 0" stroke="currentColor" strokeWidth="1.3" />
      <path d="M1.5 8.5H4M12 8.5h2.5M2.5 6l1.5 1.5M13.5 6 12 7.5M2.5 12l1.5-1.5M13.5 12 12 10.5M8 4.5V3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function LightbulbIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 2a4 4 0 0 0-2 7.464V11a2 2 0 0 0 4 0V9.464A4 4 0 0 0 8 2Z" stroke="currentColor" strokeWidth="1.3" />
      <path d="M6.5 13.5h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
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

function ExternalLinkIcon({ size = 13 }: { size?: number }) {
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

interface ActionCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action: string;
  onClick: () => void;
}

function ActionCard({ icon, title, description, action, onClick }: ActionCardProps) {
  return (
    <div className="support-card">
      <div className="support-card-icon">{icon}</div>
      <div className="support-card-body">
        <span className="support-card-title">{title}</span>
        <span className="support-card-desc">{description}</span>
      </div>
      <button type="button" className="btn btn--ghost support-card-btn" onClick={onClick}>
        <ExternalLinkIcon size={12} />
        {action}
      </button>
    </div>
  );
}

export function SupportPage() {
  return (
    <div className="page page--support">
      <header className="page-head">
        <div className="page-head-text">
          <h1 className="page-title">Support</h1>
          <p className="page-sub">Get help, report issues, or request new features.</p>
        </div>
      </header>

      <section className="settings-section" aria-label="Contact">
        <header className="settings-section-head">
          <h2>Contact</h2>
          <p>Reach out directly for questions or support.</p>
        </header>

        <div className="settings-row">
          <div className="settings-row-text">
            <span className="settings-row-title">Email</span>
            <span className="settings-row-help">
              Direct support from the developer.
            </span>
          </div>
          <div className="settings-row-control">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => openUrl(`mailto:${SUPPORT_EMAIL}`)}
            >
              <MailIcon size={13} />
              {SUPPORT_EMAIL}
            </button>
          </div>
        </div>

        <div className="settings-row">
          <div className="settings-row-text">
            <span className="settings-row-title">Website</span>
            <span className="settings-row-help">
              Documentation, changelog, and more.
            </span>
          </div>
          <div className="settings-row-control">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => openUrl(WEBSITE_URL)}
            >
              <GlobeIcon size={13} />
              echox.praveenai.tech
            </button>
          </div>
        </div>
      </section>

      <section className="settings-section" aria-label="Feedback">
        <header className="settings-section-head">
          <h2>Feedback</h2>
          <p>Help improve EchoX by submitting bugs and ideas.</p>
        </header>

        <div className="support-cards">
          <ActionCard
            icon={<BugIcon size={18} />}
            title="Report a Bug"
            description="Found something broken? Let us know what happened and we'll fix it."
            action="Report Bug"
            onClick={() => openUrl(BUG_REPORT_URL)}
          />
          <ActionCard
            icon={<LightbulbIcon size={18} />}
            title="Feature Request"
            description="Have an idea for a new feature or workflow improvement? Share it."
            action="Request Feature"
            onClick={() => openUrl(FEATURE_REQUEST_URL)}
          />
        </div>
      </section>
    </div>
  );
}
// src/pages/SettingsPage.tsx
export const BACKEND_URL = "https://echox-api.eastasia.cloudapp.azure.com";