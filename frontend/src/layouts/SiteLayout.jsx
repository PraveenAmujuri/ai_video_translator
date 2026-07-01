import { Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";

export default function SiteLayout() {
  const { pathname } = useLocation();

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
      <Header />
      <Outlet />
      <Footer />
    </div>
  );
}
