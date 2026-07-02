import { Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import ClickSpark from "../components/ui/ClickSpark";
import { useTheme } from "../context/ThemeContext";

export default function SiteLayout() {
  const { pathname } = useLocation();
  const { isDark } = useTheme();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);

  return (
    <ClickSpark
      sparkColor={isDark ? "#f97316" : "#ea580c"}
      sparkSize={10}
      sparkRadius={15}
      sparkCount={8}
      duration={400}
    >
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
        <Header />
        <Outlet />
        <Footer />
      </div>
    </ClickSpark>
  );
}
