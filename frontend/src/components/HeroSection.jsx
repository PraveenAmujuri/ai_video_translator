"use client";
import { useState, useEffect } from "react";
import GLSLHills from "./ui/GLSLHills";
import GooeyNav from "./ui/GooeyNav";
import { AnimatedThemeToggler } from "./ui/animated-theme-toggler";

export default function HeroSection() {
  // Track isDark as React state so GLSLHills re-renders when theme changes
  const [isDark, setIsDark] = useState(
    () => document.documentElement.classList.contains("dark")
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
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

      {/* ── FIXED HEADER / NAVBAR ────────────────────────────── */}
      <header className="fixed top-0 inset-x-0 w-full z-[9999] bg-transparent backdrop-blur-md transition-colors duration-300"
        style={{
          borderBottom: isDark
            ? "1px solid rgba(255,255,255,0.04)"
            : "1px solid rgba(0,0,0,0.06)",
        }}
      >
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">

          {/* Brand */}
          <div className="flex items-center gap-2">
            <span
              className="font-bold tracking-tight text-sm uppercase font-sans transition-colors duration-300"
              style={{ color: isDark ? "#ffffff" : "#000000" }}
            >
              V_Matrix
            </span>
            <span
              className="text-[9px] px-1.5 py-0.5 rounded-sm font-mono tracking-widest scale-90 transition-colors duration-300"
              style={{
                background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
                color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)",
              }}
            >
              v2.0
            </span>
          </div>

          {/* Nav + Toggle */}
          <div className="flex items-center gap-4">
            <GooeyNav
              items={[
                { label: "Home", href: "#" },
                { label: "Features", href: "#features" },
                { label: "Docs", href: "#docs" },
                { label: "Github", href: "#github" },
              ]}
              initialActiveIndex={0}
            />

            {/* Separator */}
            <div
              className="h-4 w-[1px] mx-2 transition-colors duration-300"
              style={{
                background: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)",
              }}
            />

            <AnimatedThemeToggler variant="circle" duration={500} />
          </div>
        </div>
      </header>

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
            className="text-[24px] md:text-[36px] italic font-light tracking-[-0.03em] transition-colors duration-300"
            style={{ color: isDark ? "rgba(255,255,255,0.88)" : "rgba(0,0,0,0.82)" }}
          >
            Break The
          </p>

          {/* Main heading */}
          <h1
            className="mt-1 text-[62px] leading-[1] md:text-[96px] font-bold tracking-[-0.045em] transition-colors duration-300"
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