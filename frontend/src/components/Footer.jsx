import { Link } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import EchoXLogo from "./ui/EchoxLogo";

const GITHUB_URL = "https://github.com/PraveenAmujuri/ai_video_translator";
const DOWNLOAD_URL =
  "https://github.com/PraveenAmujuri/ai_video_translator/releases/download/v1.0.0/EchoX_0.1.0_x64-setup.exe";

const COLS = [
  {
    heading: "Product",
    links: [
      { label: "Features", to: "/features", external: false },
      { label: "Docs", to: "/docs", external: false },
      { label: "Download", to: DOWNLOAD_URL, external: true },
    ],
  },
  {
    heading: "Resources",
    links: [
      { label: "GitHub", to: GITHUB_URL, external: true },
      { label: "Releases", to: `${GITHUB_URL}/releases`, external: true },
      { label: "Issues", to: `${GITHUB_URL}/issues`, external: true },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", to: "/about", external: false },
      { label: "Request Feature", to: "/request-feature", external: false },
      { label: "Report Issue", to: "/report-issue", external: false },
    ],
  },
];

export default function Footer() {
  const { isDark } = useTheme();

  const divider = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)";
  const muted = isDark ? "rgba(255,255,255,0.38)" : "rgba(0,0,0,0.38)";
  const hover = isDark ? "rgba(255,255,255,0.75)" : "rgba(0,0,0,0.75)";

  return (
    <footer
      className="relative w-full mt-32"
      style={{ borderTop: `1px solid ${divider}` }}
    >
      <div className="max-w-7xl mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-16">
        {/* Brand */}
        <div className="flex flex-col gap-4 max-w-xs">
          <Link to="/" className="flex items-center gap-2.5">
            <EchoXLogo isDark={isDark} size={32} />
            <span
              className="font-bold tracking-tight text-sm uppercase"
              style={{ color: isDark ? "#ffffff" : "#000000" }}
            >
              EchoX
            </span>
          </Link>
          <p
            className="text-[13px] leading-relaxed"
            style={{ color: muted }}
          >
            AI video translation and dubbing.<br />
            Every voice. Every language.
          </p>
        </div>

        {/* Link columns */}
        <div className="grid grid-cols-3 gap-12">
          {COLS.map((col) => (
            <div key={col.heading} className="flex flex-col gap-3">
              <span
                className="text-[11px] uppercase tracking-[0.14em] font-medium"
                style={{ color: muted }}
              >
                {col.heading}
              </span>
              {col.links.map((link) =>
                link.external ? (
                  <a
                    key={link.label}
                    href={link.to}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[13px] transition-colors duration-150"
                    style={{ color: muted }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = hover)}
                    onMouseLeave={(e) => (e.currentTarget.style.color = muted)}
                  >
                    {link.label}
                  </a>
                ) : (
                  <Link
                    key={link.label}
                    to={link.to}
                    className="text-[13px] transition-colors duration-150"
                    style={{ color: muted }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = hover)}
                    onMouseLeave={(e) => (e.currentTarget.style.color = muted)}
                  >
                    {link.label}
                  </Link>
                )
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div
        className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between"
        style={{ borderTop: `1px solid ${divider}` }}
      >
        <span className="text-[12px]" style={{ color: muted }}>
          © {new Date().getFullYear()} EchoX. All rights reserved.
        </span>
        <a
          href="https://praveenai.tech"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[12px] hover:underline transition-opacity duration-200 hover:opacity-80"
          style={{ color: muted }}
        >
          praveenai.tech
        </a>
      </div>
    </footer>
  );
}
