import type { ReactElement } from "react";
import { BACKEND_URL } from "../pages/SettingsPage";

export type SidebarPage = "home" | "history" | "sources" | "settings" | "website" | "support" | "about";
interface SidebarItem {
  id: SidebarPage;
  label: string;
  hint: string;
  icon: ReactElement;
}

interface SidebarSection {
  id: string;
  label: string;
  items: SidebarItem[];
}

interface SidebarProps {
  page: SidebarPage;
  onNavigate: (page: SidebarPage) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  navigationDisabled: boolean;
  historyCount: number;
  platformCount: number;
}

export function Sidebar({
  page,
  onNavigate,
  collapsed,
  onToggleCollapsed,
  navigationDisabled,
  historyCount,
  platformCount,
}: SidebarProps) {
  const sections: SidebarSection[] = [
    {
      id: "workspace",
      label: "Workspace",
      items: [
        {
          id: "home",
          label: "Translator",
          hint: "",
          icon: (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 12h6.5M3 4h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              <path d="M6.5 4 4 12M9.5 4 12 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ),
        },
      ],
    },
    {
      id: "library",
      label: "Library",
      items: [
        {
          id: "history",
          label: "History",
          hint: historyCount > 0 ? String(historyCount) : "",
          icon: (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3" />
              <path
                d="M8 4.5V8l2.5 1.5"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ),
        },
        {
          id: "sources",
          label: "Sources",
          hint: String(platformCount),
          icon: (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3" />
              <ellipse cx="8" cy="8" rx="2.4" ry="6" stroke="currentColor" strokeWidth="1.1" />
              <path d="M2 6h12M2 10h12" stroke="currentColor" strokeWidth="1.1" />
            </svg>
          ),
        },
      ],
    },
    {
      id: "system",
      label: "System",
      items: [
        {
          id: "settings",
          label: "Settings",
          hint: "",
          icon: (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="8" cy="8" r="2.4" stroke="currentColor" strokeWidth="1.3" />
              <path
                d="M8 1.5v1.6M8 12.9v1.6M14.5 8h-1.6M3.1 8H1.5M12.6 3.4l-1.1 1.1M4.5 11.5l-1.1 1.1M12.6 12.6l-1.1-1.1M4.5 4.5 3.4 3.4"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            </svg>
          ),
        },
      ],
    },
    {
      id: "resources",
      label: "Resources",
      items: [
        {
          id: "website",
          label: "Website",
          hint: "",
          icon: (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3" />
              <ellipse cx="8" cy="8" rx="2.4" ry="6" stroke="currentColor" strokeWidth="1.1" />
              <path d="M2 6h12M2 10h12" stroke="currentColor" strokeWidth="1.1" />
            </svg>
          ),
        },
        {
          id: "support",
          label: "Support",
          hint: "",
          icon: (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3" />
              <path d="M8 5a2 2 0 0 1 2 2c0 1.1-.9 1.8-1.6 2.1-.3.1-.4.4-.4.6v.3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              <circle cx="8" cy="12" r="0.75" fill="currentColor" />
            </svg>
          ),
        },
        {
          id: "about",
          label: "About EchoX",
          hint: "",
          icon: (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3" />
              <path d="M8 7v4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              <circle cx="8" cy="5" r="0.85" fill="currentColor" />
            </svg>
          ),
        },
      ],
    },
  ];

  return (
    <aside className="sidebar" aria-label="Primary navigation">
      <div className="sidebar-brand">
        <span className="sidebar-brand-mark" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="1.5" y="4" width="2.4" height="8" rx="1" fill="currentColor" opacity="0.5" />
            <rect x="5.4" y="2" width="2.4" height="12" rx="1" fill="currentColor" opacity="0.85" />
            <rect x="9.3" y="5" width="2.4" height="6" rx="1" fill="currentColor" />
            <rect x="13" y="6.5" width="1.5" height="3" rx="0.75" fill="currentColor" opacity="0.7" />
          </svg>
        </span>
        <span className="sidebar-brand-name">EchoX</span>
      </div>

      <button
        type="button"
        className="sidebar-toggle"
        onClick={onToggleCollapsed}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        aria-expanded={!collapsed}
      >
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="M10 3 5 8l5 5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <nav className="sidebar-nav">
        {sections.map((section) => (
          <div key={section.id} className="sidebar-section">
            <span className="sidebar-label">{section.label}</span>
            {section.items.map((item) => {
              const active = item.id === page;
              return (
                <button
                  type="button"
                  key={item.id}
                  className="sidebar-item"
                  aria-current={active ? "page" : undefined}
                  onClick={() => onNavigate(item.id)}
                  disabled={navigationDisabled && !active}
                  title={collapsed ? item.label : undefined}
                >
                  <span className="sidebar-item-icon" aria-hidden="true">
                    {item.icon}
                  </span>
                  <span className="sidebar-item-label">{item.label}</span>
                  {item.hint ? (
                    <span className="sidebar-item-trail" aria-hidden="true">
                      {item.hint}
                    </span>
                  ) : (
                    <span className="sidebar-item-trail" aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="sidebar-spacer" />

      <div className="sidebar-divider" aria-hidden="true" />

      <div className="sidebar-profile" title={collapsed ? "Local workspace" : undefined}>
        <span className="sidebar-avatar" aria-hidden="true">
          EX
        </span>
        <span className="sidebar-profile-body">
          <span className="sidebar-profile-name">Local workspace</span>
          <span className="sidebar-profile-meta">
            {BACKEND_URL.replace(/^https?:\/\//, '')}
          </span>
        </span>
      </div>
    </aside>
  );
}
