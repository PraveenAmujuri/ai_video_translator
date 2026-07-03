import { useNavigate, useLocation, Link } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import GooeyNav from "./ui/GooeyNav";
import StaggeredMenu from "./ui/StaggeredMenu";
import { AnimatedThemeToggler } from "./ui/animated-theme-toggler";
import EchoXLogo from "./ui/EchoxLogo";

const WindowsIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M0 3.449L9.75 2.1v9.45H0V3.449zM0 12.45h9.75v9.45L0 20.551v-8.101zM11.25 1.899L24 0v11.55H11.25V1.899zM11.25 12.45H24v11.55l-12.75-1.9v-9.65z" />
  </svg>
);

const GITHUB_URL = "https://github.com/PraveenAmujuri/ai_video_translator";
const DOWNLOAD_URL =
  "https://github.com/PraveenAmujuri/ai_video_translator/releases/download/v1.0.0/EchoX_0.1.0_x64-setup.exe";

const NAV_ITEMS = [
  { label: "Home", to: "/", external: false },
  { label: "Features", to: "/features", external: false },
  { label: "Docs", to: "/docs", external: false },
  { label: "Github", to: GITHUB_URL, external: true },
];

export default function Header() {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const activeIndex = Math.max(
    0,
    NAV_ITEMS.findIndex(
      (i) => !i.external && i.to === location.pathname
    )
  );

  const handleNav = (item) => {
    if (item.external) {
      window.open(item.to, "_blank", "noopener,noreferrer");
      return;
    }
    if (item.to !== location.pathname) {
      setTimeout(() => {
        navigate(item.to);
      }, 550);
    }
  };

  return (
    <header
      className="fixed top-0 inset-x-0 w-full z-[9999] bg-white/60 dark:bg-black/30 backdrop-blur-xl transition-colors duration-300"
      style={{
        borderBottom: isDark
          ? "1px solid rgba(255,255,255,0.04)"
          : "1px solid rgba(0,0,0,0.06)",
      }}
    >
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        {/* Brand / Logo → home */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <EchoXLogo isDark={isDark} size={40} />
          <span
            className="font-bold tracking-tight text-sm uppercase font-sans transition-colors duration-300"
            style={{ color: isDark ? "#ffffff" : "#000000" }}
          >
            EchoX
          </span>
        </Link>

        {/* Navigation & Controls */}
        <div className="flex items-center gap-4">
          {/* Desktop Only Nav items */}
          <div className="hidden md:flex items-center gap-4">
            <GooeyNav
              key={activeIndex /* re-sync indicator on route change */}
              items={NAV_ITEMS.map((i) => ({
                label: i.label,
                href: i.external ? i.to : i.to,
              }))}
              initialActiveIndex={activeIndex}
              onItemClick={(_, index) => handleNav(NAV_ITEMS[index])}
            />

            <div
              className="h-4 w-[1px] mx-1 transition-colors duration-300"
              style={{
                background: isDark
                  ? "rgba(255,255,255,0.12)"
                  : "rgba(0,0,0,0.12)",
              }}
            />

            <a
              href={DOWNLOAD_URL}
              className="
                flex items-center justify-center gap-2.5
                px-5 py-[0.6em]
                bg-black hover:bg-neutral-900 text-white
                dark:bg-white dark:hover:bg-neutral-100 dark:text-black
                font-normal text-[16px]
                rounded-full
                transition-all duration-200
                active:scale-[0.98]
                cursor-pointer
              "
            >
              <WindowsIcon />
              <span>Download</span>
            </a>

            <div
              className="h-4 w-[1px] mx-1 transition-colors duration-300"
              style={{
                background: isDark
                  ? "rgba(255,255,255,0.12)"
                  : "rgba(0,0,0,0.12)",
              }}
            />
            <AnimatedThemeToggler variant="circle" duration={500} />
          </div>

          {/* Mobile Only Navigation Menu */}
          <div className="md:hidden">
            <StaggeredMenu
              position="right"
              items={[
                ...NAV_ITEMS.map((item) => ({
                  label: item.label,
                  link: item.to,
                  ariaLabel: `Go to ${item.label}`,
                })),
                {
                  label: "Download",
                  link: DOWNLOAD_URL,
                  ariaLabel: "Download desktop app",
                }
              ]}
              socialItems={[
                { label: "GitHub", link: GITHUB_URL },
              ]}
              displaySocials
              displayItemNumbering={true}
              menuButtonColor={isDark ? "#ffffff" : "#000000"}
              openMenuButtonColor={isDark ? "#ffffff" : "#000000"}
              changeMenuColorOnOpen={true}
              colors={isDark ? ["#090a0b", "#161719", "#ea580c"] : ["#f8fafc", "#f1f5f9", "#ea580c"]}
              logoUrl="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
              accentColor="#f97316"
              isFixed={true}
              onItemClick={(e, index) => {
                handleNav(NAV_ITEMS[index]);
              }}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
