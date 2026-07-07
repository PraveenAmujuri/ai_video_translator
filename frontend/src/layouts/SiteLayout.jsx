import { Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import ClickSpark from "../components/ui/ClickSpark";
import { useTheme } from "../context/ThemeContext";

export default function SiteLayout() {
  const { pathname } = useLocation();
  const { isDark } = useTheme();
  const isFeedbackRoute = pathname === "/request-feature" || pathname === "/report-issue";

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);

  return (
    <div
      className="
        min-h-screen
        overflow-x-hidden
        transition-colors
        duration-300
        bg-white
        text-black
        dark:bg-[#000000]
        dark:text-white
      "
    >
      <ClickSpark sparkColor="#f97316" sparkSize={8} sparkRadius={20} sparkCount={8} duration={400}>
        <Header />
        <Outlet />
        <Footer />
      </ClickSpark>
    </div>
  );
}
