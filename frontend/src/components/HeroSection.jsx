import { useState, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";
import GLSLHills from "./ui/GLSLHills";

export default function HeroSection() {
  const { isDark } = useTheme();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 40) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <section
      className="relative h-screen overflow-hidden transition-colors duration-300"
      style={{ background: isDark ? "#000000" : "#ffffff" }}
    >
      {/* ── GLSL WAVE BACKGROUND ─────────────────────────────── */}
      {/* Keyed on isDark so Three.js fully reinitializes on theme change */}
      <div className="absolute inset-0 z-0">
        <GLSLHills key={isDark ? "dark" : "light"} isDark={isDark} />
      </div>

      {/* ── SUBTLE OVERLAY (depth / contrast) ───────────────── */}
      <div
        className="absolute inset-0 z-10 pointer-events-none transition-colors duration-300"
        style={{
          background: isDark
            ? "rgba(0,0,0,0.25)"
            : "rgba(255,255,255,0.15)",
        }}
      />

      {/* ── HERO CONTENT ─────────────────────────────────────── */}
      <div className="relative z-20 flex h-full items-center justify-center px-6">
        <div className="max-w-6xl text-center">

          {/* Eyebrow */}
          <p
            className="text-[18px] sm:text-[24px] md:text-[36px] italic font-light tracking-[-0.03em] transition-colors duration-300"
            style={{ color: isDark ? "rgba(255,255,255,0.88)" : "rgba(0,0,0,0.82)" }}
          >
            Break The
          </p>

          {/* Main heading */}
          <h1
            className="mt-1 text-[38px] sm:text-[62px] leading-[1.1] md:text-[96px] font-bold tracking-[-0.045em] transition-colors duration-300"
            style={{ color: isDark ? "rgba(255,255,255,0.96)" : "rgba(0,0,0,0.94)" }}
          >
            Audio Barrier.
          </h1>

          {/* Description */}
          <p
            className="mx-auto mt-8 max-w-3xl text-[18px] leading-relaxed transition-colors duration-300"
            style={{ color: isDark ? "rgba(255,255,255,0.52)" : "rgba(0,0,0,0.52)" }}
          >
            Real-time AI dubbing with synchronized multilingual playback,
            cinematic subtitle localization, and natural voice generation.
          </p>

        </div>
      </div>
      {/* Bottom Fade */}
<div
  className="
    absolute
    bottom-0
    left-0
    w-full
    h-32
    pointer-events-none
    z-30
  "
  style={{
    background: isDark
      ? "linear-gradient(to bottom, transparent, #000000)"
      : "linear-gradient(to bottom, transparent, #ffffff)",
  }}
/>

    </section>
  );
}