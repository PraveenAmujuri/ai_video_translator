import { useEffect, useRef, useState, useMemo } from "react";
import CircularGallery from "../components/ui/CircularGallery";
import CardSwap, { Card } from "../components/ui/CardSwap";
import { motion } from "framer-motion";

const PIPELINE_STEPS = [
  { label: 'Upload', desc: 'Source stream extraction' },
  { label: 'Transcribe', desc: 'Audio to text generation' },
  { label: 'Translate', desc: 'Multimodal translation' },
  { label: 'Voice', desc: 'TTS speech synthesis' },
  { label: 'Export', desc: 'Dubbed video encoding' }
];

const CheckIcon = () => (
  <svg className="w-3.5 h-3.5 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const ActiveIcon = () => (
  <svg className="w-3.5 h-3.5 text-white animate-pulse" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="12" r="6" />
  </svg>
);

const UpcomingIcon = () => (
  <svg className="w-3.5 h-3.5 text-neutral-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="6" />
  </svg>
);

function PipelineProgress({ activeStep }) {
  return (
    <div className="flex flex-col gap-0 items-start text-left font-sans select-none max-w-[280px]">
      {PIPELINE_STEPS.map((step, idx) => {
        const isCompleted = idx < activeStep;
        const isActive = idx === activeStep;
        const isUpcoming = idx > activeStep;

        return (
          <div key={idx} className="relative flex flex-col items-start w-full">
            {/* Step Row */}
            <div className="flex items-center gap-4 py-2.5 z-10">
              {/* Marker Container */}
              <div className="w-5 h-5 flex items-center justify-center">
                {isCompleted && (
                  <motion.div
                    initial={{ opacity: 0, y: 3 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                  >
                    <CheckIcon />
                  </motion.div>
                )}
                {isActive && (
                  <motion.div
                    initial={{ opacity: 0, y: 3 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                  >
                    <ActiveIcon />
                  </motion.div>
                )}
                {isUpcoming && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <UpcomingIcon />
                  </motion.div>
                )}
              </div>

              {/* Text Label */}
              <div className="flex flex-col">
                <span className={`text-sm font-medium transition-colors duration-300 ${isActive ? 'text-white' : 'text-neutral-500'}`}>
                  {step.label}
                </span>
                <span className={`text-[11px] font-mono transition-colors duration-300 ${isActive ? 'text-neutral-400' : 'text-neutral-600'}`}>
                  {step.desc}
                </span>
              </div>
            </div>

            {/* Thin Connecting Line */}
            {idx < PIPELINE_STEPS.length - 1 && (
              <div className="absolute left-[9px] top-[26px] bottom-0 w-[1px] bg-neutral-800 -z-0 h-[26px]" />
            )}
          </div>
        );
      })}
    </div>
  );
}

const PLATFORM_ITEMS = [
  { image: "/platforms/youtube.svg", text: "YouTube" },
  { image: "/platforms/tiktok.svg", text: "TikTok" },
  { image: "/platforms/twitch.svg", text: "Twitch" },
  { image: "/platforms/instagram.svg", text: "Instagram" },
  { image: "/platforms/reddit.svg", text: "Reddit" },
  { image: "/platforms/soundcloud.svg", text: "SoundCloud" },
  { image: "/platforms/vimeo.svg", text: "Vimeo" },
  { image: "/platforms/bilibili.svg", text: "Bilibili" },
  { image: "/platforms/facebook.svg", text: "Facebook" },
  { image: "/platforms/twitter.svg", text: "Twitter" }
];

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;550;600&display=swap');`;

const CSS = `
${FONTS}

*, *::before, *::after { box-sizing: border-box; }
body, h1, h2, h3, h4, h5, h6, p, ul, ol, li, figure, blockquote, dl, dd {
  margin: 0;
  padding: 0;
}

:root {
  --bg:        #08090a;
  --bg2:       #0d0e10;
  --border:    rgba(255,255,255,0.065);
  --border2:   rgba(255,255,255,0.11);
  --t1:        #ededeb;
  --t2:        rgba(237,237,235,0.48);
  --t3:        rgba(237,237,235,0.26);
  --font:      'Inter', system-ui, -apple-system, sans-serif;
  --mono:      ui-monospace, 'Cascadia Code', monospace;
}

html { background: var(--bg); scroll-behavior: smooth; }
body {
  background: var(--bg);
  color: var(--t1);
  font-family: var(--font);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  overflow-x: hidden;
}

/* ─── CONTAINERS ──────────────────────────────────────────────────── */
.wrap      { max-width: 1280px; margin: 0 auto; padding: 0 48px; }
.wrap-text { max-width: 900px;  margin: 0 auto; padding: 0 48px; }
.wrap-mid  { max-width: 1080px; margin: 0 auto; padding: 0 48px; }

/* ─── HERO ────────────────────────────────────────────────────────── */
.hero { padding: 160px 0 0; }

.hero-tag {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 5px 13px 5px 10px;
  border: 1px solid var(--border2);
  border-radius: 100px;
  margin-bottom: 28px;
  font-size: 12px; font-weight: 450; color: var(--t3);
  letter-spacing: 0.01em;
  text-decoration: none; cursor: pointer;
  transition: border-color 0.2s, color 0.2s;
}
.hero-tag:hover { border-color: rgba(255,255,255,0.2); color: var(--t2); }
.hero-tag-pip { width: 5px; height: 5px; border-radius: 50%; background: var(--t3); flex-shrink: 0; }

.hero-h1 {
  font-size: clamp(42px, 5vw, 68px);
  font-weight: 590;
  line-height: 1.1;
  letter-spacing: -0.025em;
  margin-bottom: 24px;
}
.hero-h1 .ghost { color: var(--t2); }

.hero-body {
  font-size: 18px; font-weight: 400; line-height: 1.62;
  color: var(--t2); max-width: 640px; margin-bottom: 32px;
}

.hero-actions { display: flex; align-items: center; gap: 12px; }

.btn-dl {
  display: inline-flex; align-items: center; gap: 7px;
  font-size: 14px; font-weight: 500; font-family: var(--font);
  color: var(--bg); background: var(--t1);
  border: none; border-radius: 7px; padding: 11px 22px; cursor: pointer;
  letter-spacing: -0.01em; transition: opacity 0.16s; text-decoration: none;
}
.btn-dl:hover { opacity: 0.85; }

.btn-ghost {
  display: inline-flex; align-items: center; gap: 7px;
  font-size: 14px; font-weight: 400; font-family: var(--font);
  color: var(--t2); background: transparent;
  border: 1px solid var(--border2); border-radius: 7px;
  padding: 11px 20px; cursor: pointer;
  letter-spacing: -0.01em; transition: color 0.16s, border-color 0.16s, background 0.16s;
  text-decoration: none;
}
.btn-ghost:hover { color: var(--t1); border-color: rgba(255,255,255,0.2); background: rgba(255,255,255,0.03); }

/* ─── SCREENSHOT STAGE ────────────────────────────────────────────── */
.stage {
    position: relative;
    width: 100%;
    padding: 80px 48px 60px;
    overflow: hidden;

    background: transparent;
    isolation: isolate;
}

/* We move the spotlight to a pseudo-element to lock its maximum size.
   This guarantees it never bleeds out to the sides on ultrawide screens. */
.stage::before {
    content: "";
    position: absolute;
    top: 0;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 100%;
    max-width: 1440px;
    z-index: 0;

    background:
        radial-gradient(
            ellipse 60% 75% at 50% 0%,
            rgba(255,255,255,.09) 0%,
            rgba(255,255,255,.03) 45%,
            rgba(255,255,255,0) 100%
        ),
        linear-gradient(
            to bottom,
            #141516 0%,
            #111214 35%,
            #0c0d0e 65%,
            rgba(8,9,10,0) 100%
        );
    
    -webkit-mask-image: linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%);
    mask-image: linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%);
}
.stage::after{
    content:"";
    position:absolute;
    left: 50%;
    transform: translateX(-50%);
    width: 100%;
    max-width: 1440px;
    bottom:-1px;
    height:340px;

    background:linear-gradient(
        to bottom,
        transparent,
        var(--bg) 92%
    );

    pointer-events:none;
    z-index:1;

    -webkit-mask-image: linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%);
    mask-image: linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%);
}
    .stage {
    background: transparent;
}

.bridge-section {
    background: transparent;
}

.feature-story {
    background: transparent;
}
.stage-inner {
  position: relative;
  z-index: 2;
  max-width: 1100px;
  margin: 0 auto;
}

/* The actual screenshot frame floating in the stage */
.ss-frame {
  position: relative;
  z-index: 1;
  border-radius: 12px;
  /* Top rim highlight to pop it off the dark glow */
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  overflow: hidden;
  background: var(--bg2);
  
  /* Massive, deep shadow stack to create the 3D elevation */
  box-shadow:
    0 0 0 1px rgba(0, 0, 0, 0.8),
    0 20px 40px -10px rgba(0, 0, 0, 0.7),
    0 80px 120px -20px rgba(0, 0, 0, 1);
}

.ss-img { display: block; width: 100%; height: auto; }

/* History Stage overrides - no gray gradient background */
.stage-history::before {
  background: transparent !important;
}
.stage-history::after {
  background: transparent !important;
}



/* History Frame overrides - black corner fades using CSS masking */
.frame-history {
  -webkit-mask-image: 
    linear-gradient(135deg, transparent 0%, black 25%, black 65%, transparent 100%),
    linear-gradient(45deg, transparent 0%, black 25%, black 75%, transparent 100%);
  mask-image: 
    linear-gradient(135deg, transparent 0%, black 25%, black 65%, transparent 100%),
    linear-gradient(45deg, transparent 0%, black 25%, black 75%, transparent 100%);
  -webkit-mask-composite: source-in;
  mask-composite: intersect;
}

.ss-ph {
  width: 100%; aspect-ratio: 16/9; background: #0c0d0e;
  display: none;
  flex-direction: column; align-items: center; justify-content: center; gap: 10px;
  border: 1.5px dashed rgba(255,255,255,0.07);
}
.ss-ph-lbl { font-size: 10px; font-weight: 500; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(255,255,255,0.15); }
.ss-ph-note { font-size: 11px; color: rgba(255,255,255,0.08); text-align: center; max-width: 300px; line-height: 1.5; }

/* ─── BRIDGE / PILLAR SECTION ─────────────────────────────────────── */
.bridge { padding: 0 0 0; }
.bridge-intro {
  text-align: left; padding: 160px 0 0;
}
.bridge-big {
  font-size: clamp(22px, 2.4vw, 34px);
  font-weight: 520; line-height: 1.25; letter-spacing: -0.018em;
  color: var(--t1); max-width: 660px;
}
.bridge-big strong { font-weight: 560; }
.bridge-big .dim    { color: var(--t2); font-weight: 400; }

.figs {
  display: grid; grid-template-columns: repeat(3, 1fr);
  border-top: 1px solid var(--border);
  margin-top: 80px;
}
.fig-card {
  padding: 48px 40px 52px;
  border-right: 1px solid var(--border);
  position: relative;
  overflow: hidden;
}
.fig-card:last-child { border-right: none; }
.fig-label {
  font-family: var(--mono); font-size: 11px;
  color: var(--t3); letter-spacing: 0.04em;
  margin-bottom: 40px;
}
.fig-art {
  width: 100%; height: 240px;
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 40px;
}
.fig-art svg { width: 100%; height: 100%; }
.fig-name {
  font-size: 16px; font-weight: 560; letter-spacing: -0.015em;
  color: var(--t1); margin-bottom: 10px;
}
 .scene3d-stage { position: relative; width: 100%; height: 100%; --reveal: 0; }
.scene3d-stage svg { position: relative; z-index: 1; width: 100%; height: 100%; overflow: visible; }
.scene3d-halo {
  position: absolute; inset: -20%; z-index: 0; filter: blur(28px);
  opacity: calc(0.25 + var(--reveal) * 0.35);
  transition: opacity 0.8s ease;
  animation: haloDrift 14s ease-in-out infinite;
}
.scene3d-halo-2 { animation-duration: 19s; animation-direction: reverse; }
@keyframes haloDrift {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(4%, -3%) scale(1.08); }
}
.scene3d-reveal {
  opacity: calc(0.4 + var(--reveal) * 0.6);
  transform: scale(calc(0.94 + var(--reveal) * 0.06));
  transition: opacity 0.7s cubic-bezier(0.22,1,0.36,1), transform 0.7s cubic-bezier(0.22,1,0.36,1);
}
.scene3d-glow { filter: blur(3.5px); }
.scene3d-core line, .scene3d-glow line { transition: stroke 0.25s ease, stroke-width 0.25s ease; }
.scene3d-marker { filter: blur(0.2px) drop-shadow(0 0 3px rgba(190,205,255,0.9)); }
.scene3d-stage.is-hover .scene3d-core { filter: drop-shadow(0 0 2px rgba(200,215,255,0.4)); }
@media (prefers-reduced-motion: reduce) {
  .scene3d-halo { animation: none; }
  .scene3d-stage.is-hover .scene3d-core { filter: none; }
}
.fig-body {
  font-size: 13.5px; font-weight: 400; line-height: 1.68;
  color: var(--t2); max-width: 300px;
}

/* ─── FEATURE SECTION ─────────────────────────────────────────────── */
.feat { padding: 200px 0 0; }

.feat-header {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 40px;
  align-items: end;
  margin-bottom: 64px;
}
.feat-left { }
.feat-num {
  font-family: var(--mono); font-size: 12px; color: var(--t3);
  letter-spacing: 0.03em; margin-bottom: 22px;
  display: flex; align-items: center; gap: 10px;
}
.feat-num a { color: var(--t3); text-decoration: none; transition: color 0.16s; }
.feat-num a:hover { color: var(--t2); }
.feat-h2 {
  font-size: clamp(36px, 4.2vw, 58px);
  font-weight: 560; line-height: 1.06; letter-spacing: -0.026em;
  color: var(--t1);
}
.feat-right { padding-bottom: 8px; }
.feat-body {
  font-size: 16px; font-weight: 400; line-height: 1.68;
  color: var(--t2); max-width: 380px;
}
.feat-details {
  margin-top: 24px;
  display: flex; flex-direction: column; gap: 0;
  border-top: 1px solid var(--border);
}
.feat-detail {
  display: flex; align-items: flex-start; gap: 14px;
  padding: 13px 0; border-bottom: 1px solid var(--border);
}
.feat-detail-pip {
  width: 3px; height: 3px; border-radius: 50%;
  background: var(--t3); flex-shrink: 0; margin-top: 9px;
}
.feat-detail-text { font-size: 13px; line-height: 1.6; color: var(--t2); }

/* ─── CTA ─────────────────────────────────────────────────────────── */

.cta {
  padding: 120px 0 80px;
  text-align: center;
  border-top: 1px solid var(--border);
}

.cta-h2 {
  font-size: clamp(44px, 6vw, 80px);
  font-weight: 570; line-height: 1.0; letter-spacing: -0.028em;
  color: var(--t1); max-width: 680px; margin: 0 auto 26px;
}
.cta-sub {
  font-size: 17px; font-weight: 400; line-height: 1.62;
  color: var(--t2); max-width: 400px; margin: 0 auto 52px;
}
.cta-row { display: flex; align-items: center; justify-content: center; gap: 12px; }
.cta-note { margin-top: 20px; font-size: 12px; color: var(--t3); }

/* ─── CAPABILITY COMPARE BLOCK ────────────────────────────────────── */
.compare-card {
  display: grid;
  grid-template-columns: 1fr 1px 1fr;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--bg2);
  margin: 80px auto 80px;
  max-width: 800px;
  text-align: left;
  overflow: hidden;
}
.compare-col {
  padding: 40px 48px;
}
.compare-col-highlight {
  background: rgba(255, 255, 255, 0.01);
}
.compare-divider {
  background: var(--border);
  width: 1px;
  height: auto;
}
.compare-title {
  font-size: 15px;
  font-weight: 590;
  color: var(--t1);
  margin-bottom: 24px;
  letter-spacing: -0.01em;
}
.compare-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.compare-list li {
  font-size: 13.5px;
  color: var(--t2);
  display: flex;
  align-items: center;
  gap: 8px;
}
.compare-list li::before {
  content: "•";
  color: var(--t3);
}


/* ─── SCROLL FADE ─────────────────────────────────────────────────── */
.fade { opacity: 0; transform: translateY(22px); transition: opacity 0.7s cubic-bezier(0.22,1,0.36,1), transform 0.7s cubic-bezier(0.22,1,0.36,1); }
.fade.in { opacity: 1; transform: none; }
.d1 { transition-delay: 0.07s; } .d2 { transition-delay: 0.13s; } .d3 { transition-delay: 0.19s; }

/* ─── RESPONSIVE ──────────────────────────────────────────────────── */
@media (max-width: 860px) {
  .wrap, .wrap-text, .wrap-mid { padding: 0 22px; }
  .stage { padding: 60px 16px 0; }
  .feat-header { grid-template-columns: 1fr; gap: 24px; }
  .figs { grid-template-columns: 1fr; }
  .fig-card { border-right: none; border-bottom: 1px solid var(--border); }
  .fig-card:last-child { border-bottom: none; }
  .hero { padding: 140px 0 0; }
  .feat { padding: 140px 0 0; }
  .bridge-intro { padding: 120px 0 0; }
  .hero-actions { flex-direction: column; align-items: flex-start; }
  .cta-row { flex-direction: column; }

  .compare-card {
    grid-template-columns: 1fr;
    margin: 60px auto 60px;
  }
  .compare-divider {
    width: 100%;
    height: 1px;
  }
  .compare-col {
    padding: 32px 24px;
  }
}
/* Clean Compare Table styles matching the page theme */
.pixel-compare-container {
  font-family: var(--font);
  text-align: center;
  margin: 60px auto;
  max-width: 900px;
  color: var(--t1);
  padding: 0 16px;
}
.pixel-compare-title {
  font-size: 28px;
  font-weight: 590;
  color: var(--t1);
  margin-bottom: 8px;
  letter-spacing: -0.02em;
}
.pixel-compare-subtitle {
  font-size: 15px;
  color: var(--t2);
  margin-bottom: 40px;
}
.pixel-compare-table-box {
  background: var(--bg2);
  border: 1px solid var(--border2);
  padding: 20px;
  position: relative;
  border-radius: 8px;
}
.pixel-compare-table-box::after {
  content: "";
  position: absolute;
  top: 6px;
  bottom: 6px;
  left: 6px;
  right: 6px;
  border: 1px solid var(--border);
  border-radius: 6px;
  pointer-events: none;
}
.pixel-compare-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 14px;
  position: relative;
  z-index: 10;
  line-height: 1.5;
}
.pixel-compare-th {
  font-size: 11px;
  font-weight: 600;
  color: var(--t2);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border2);
}
.pixel-compare-td {
  padding: 16px;
  border-bottom: 1px dashed var(--border);
  vertical-align: middle;
}
.pixel-compare-row:last-child .pixel-compare-td {
  border-bottom: none;
}
.pixel-compare-feature {
  color: var(--t1);
  font-weight: 500;
}
.pixel-compare-our-val {
  color: var(--t1);
}
.pixel-compare-others-val {
  color: var(--t2);
}
@media (max-width: 600px) {
  .pixel-compare-title { font-size: 22px; }
  .pixel-compare-subtitle { font-size: 13px; }
  .pixel-compare-table { font-size: 13px; }
  .pixel-compare-th { padding: 8px; }
  .pixel-compare-td { padding: 12px 8px; }
}
`;

/* ─── Small helpers ──────────────────────────────────────────────── */
function useFade() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const ob = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { el.classList.add("in"); ob.unobserve(el); } },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
    );
    ob.observe(el);
    return () => ob.disconnect();
  }, []);
  return ref;
}
function F({ children, delay = 0, style = {} }) {
  const ref = useFade();
  const cls = delay === 0.07 ? "fade d1" : delay === 0.13 ? "fade d2" : delay === 0.19 ? "fade d3" : "fade";
  return <div ref={ref} className={cls} style={style}>{children}</div>;
}

/* ─── Icons ───────────────────────────────────────────────────────── */
function Arr() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M2 6h8M6.5 2.5 10 6l-3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function Dl() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
      <path d="M6.5 2v7.5M3 8l3.5 3.5L10 8M2 11.5h9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

/* ─── Window Frame (Cleaned of fake OS bars) ─────────────────────── */
function Frame({ children, className }) {
  return (
    <div className={`ss-frame ${className ?? ''}`}>
      {children}
    </div>
  );
}
function Placeholder({ label, note }) {
  return (
    <div className="ss-ph">
      <p className="ss-ph-lbl">{label}</p>
      {note && <p className="ss-ph-note">{note}</p>}
    </div>
  );
}

/* Stage wrapper: gradient backdrop + frame */
function Stage({ children, marginTop, className }) {
  return (
    <div className={`stage ${className ?? ''}`} style={marginTop ? { marginTop } : undefined}>
      <div className="stage-inner">
        {children}
      </div>
    </div>
  );
}

/* ─── 3D SVG Illustrations ────────────────────────────────────────── */
/* ─── Minimal perspective 3D-line engine ─────────────────────────── */

/* ─── Parametric 3D-line engine, dual-pass shading, traveling markers ── */

function lerpRGB(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}
function rgba([r, g, b], a) {
  return `rgba(${r | 0},${g | 0},${b | 0},${a.toFixed(3)})`;
}
function bezier3(p0, p1, p2, t) {
  const mt = 1 - t;
  return [
    mt * mt * p0[0] + 2 * mt * t * p1[0] + t * t * p2[0],
    mt * mt * p0[1] + 2 * mt * t * p1[1] + t * t * p2[1],
    mt * mt * p0[2] + 2 * mt * t * p1[2] + t * t * p2[2],
  ];
}

const CAM = { dist: 260, focal: 240, cx: 150, cy: 120 };
function project(p, rotX, rotY) {
  const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
  const x1 = p[0] * cosY + p[2] * sinY;
  const z1 = -p[0] * sinY + p[2] * cosY;
  const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
  const y1 = p[1] * cosX - z1 * sinX;
  const z2 = p[1] * sinX + z1 * cosX;
  const zc = z2 + CAM.dist;
  const scale = CAM.focal / zc;
  return { u: CAM.cx + x1 * scale, v: CAM.cy + y1 * scale, scale };
}
function depthOf(scale) {
  return Math.max(0, Math.min(1, (scale - 0.52) / 0.58));
}

function useScene3D(buildScene, { autoSpin = 0.09 } = {}) {
  const wrapRef = useRef(null);
  const coreRefs = useRef([]);
  const glowRefs = useRef([]);
  const markerRefs = useRef([]);
  const camera = useRef({ rotY: 0.5, rotX: -0.28 });
  const mouse = useRef({ x: 0, y: 0, active: false });
  const visible = useRef(false);
  const raf = useRef(null);
  const t0 = useRef(performance.now());

  const scene = useMemo(buildScene, []);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const io = new IntersectionObserver(
      ([entry]) => { visible.current = entry.isIntersecting; el.style.setProperty("--reveal", entry.isIntersecting ? "1" : "0"); },
      { threshold: [0, 0.2, 0.6, 1] }
    );
    io.observe(el);

    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      mouse.current.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      mouse.current.y = ((e.clientY - r.top) / r.height) * 2 - 1;
      mouse.current.active = true;
      el.classList.add("is-hover");
    };
    const onLeave = () => { mouse.current.active = false; el.classList.remove("is-hover"); };
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);

    const step = (now) => {
      if (visible.current) {
        const time = (now - t0.current) / 1000;
        const targetRotY = 0.5 + (mouse.current.active ? mouse.current.x * 0.6 : 0) + (reduceMotion ? 0 : time * autoSpin * 0.02);
        const targetRotX = -0.28 + (mouse.current.active ? mouse.current.y * 0.32 : 0);
        camera.current.rotY += (targetRotY - camera.current.rotY) * 0.05;
        camera.current.rotX += (targetRotX - camera.current.rotX) * 0.05;

        let si = 0;
        for (const curve of scene.curves) {
          const pts = new Array(curve.samples + 1);
          for (let i = 0; i <= curve.samples; i++) pts[i] = curve.fn(i / curve.samples, time);
          const proj = pts.map((p) => project(p, camera.current.rotX, camera.current.rotY));

          for (let i = 0; i < proj.length - 1; i++) {
            const a = proj[i], b = proj[i + 1];
            const depthT = depthOf((a.scale + b.scale) / 2);
            const col = lerpRGB(curve.colorFar, curve.colorNear, depthT);
            const core = coreRefs.current[si];
            const glow = glowRefs.current[si];
            if (core) {
              core.setAttribute("x1", a.u.toFixed(2)); core.setAttribute("y1", a.v.toFixed(2));
              core.setAttribute("x2", b.u.toFixed(2)); core.setAttribute("y2", b.v.toFixed(2));
              core.setAttribute("stroke", rgba(col, 0.18 + depthT * 0.75));
              core.setAttribute("stroke-width", (0.3 + depthT * 1.7).toFixed(2));
            }
            if (glow) {
              glow.setAttribute("x1", a.u.toFixed(2)); glow.setAttribute("y1", a.v.toFixed(2));
              glow.setAttribute("x2", b.u.toFixed(2)); glow.setAttribute("y2", b.v.toFixed(2));
              glow.setAttribute("stroke", rgba(curve.colorNear, 0.06 + depthT * 0.22));
              glow.setAttribute("stroke-width", (2 + depthT * 4).toFixed(2));
            }
            si++;
          }
        }

        let mi = 0;
        for (const curve of scene.curves) {
          for (const marker of curve.markers || []) {
            const tt = (time * marker.speed + marker.phase) % 1;
            const p = curve.fn(tt, time);
            const proj = project(p, camera.current.rotX, camera.current.rotY);
            const depthT = depthOf(proj.scale);
            const el2 = markerRefs.current[mi];
            if (el2) {
              el2.setAttribute("cx", proj.u.toFixed(2));
              el2.setAttribute("cy", proj.v.toFixed(2));
              el2.setAttribute("r", (marker.size * (0.55 + depthT * 0.8)).toFixed(2));
              el2.setAttribute("opacity", (0.25 + depthT * 0.75).toFixed(2));
              el2.setAttribute("fill", rgba(marker.color, 0.9));
            }
            mi++;
          }
        }
      }
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(raf.current);
      io.disconnect();
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, [scene, autoSpin]);

  return { wrapRef, coreRefs, glowRefs, markerRefs, scene };
}

function Scene3D({ buildScene, autoSpin, haloColors }) {
  const { wrapRef, coreRefs, glowRefs, markerRefs, scene } = useScene3D(buildScene, { autoSpin });
  let si = 0, mi = 0;
  return (
    <div ref={wrapRef} className="scene3d-stage">
      <div className="scene3d-halo" style={{ background: `radial-gradient(circle, ${haloColors[0]} 0%, transparent 70%)` }} />
      <div className="scene3d-halo scene3d-halo-2" style={{ background: `radial-gradient(circle, ${haloColors[1]} 0%, transparent 70%)` }} />
      <svg viewBox="0 0 300 240" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="scene3d-reveal">
        <g className="scene3d-glow">
          {scene.curves.map((curve, ci) => (
            <g key={`g${ci}`}>
              {Array.from({ length: curve.samples }).map((_, i) => {
                const idx = si + i;
                return <line key={i} ref={(el) => (glowRefs.current[idx] = el)} strokeLinecap="round" />;
              })}
            </g>
          ))}
        </g>
        <g className="scene3d-core">
          {scene.curves.map((curve, ci) => {
            const start = si; si += curve.samples;
            return (
              <g key={`c${ci}`}>
                {Array.from({ length: curve.samples }).map((_, i) => (
                  <line key={i} ref={(el) => (coreRefs.current[start + i] = el)} strokeLinecap="round" />
                ))}
              </g>
            );
          })}
        </g>
        <g className="scene3d-markers">
          {scene.curves.flatMap((curve) =>
            (curve.markers || []).map((_, i) => {
              const idx = mi++;
              return <circle key={idx} ref={(el) => (markerRefs.current[idx] = el)} className="scene3d-marker" />;
            })
          )}
        </g>
      </svg>
    </div>
  );
}
/* Double-helix speech waveform — source track + dubbed track, cross-synced,
   with word-timing "packets" traveling along the strand */
function buildVoiceWaveform() {
  const helixA = (t, time) => {
    const angle = t * Math.PI * 3.6 + time * 0.12;
    const y = (t - 0.5) * 175;
    const breathe = Math.sin(time * 0.6 + t * 9) * 3;
    const r = 34 + Math.sin(t * 24 + time * 0.4) * 5 + breathe;
    return [Math.cos(angle) * r, y, Math.sin(angle) * r];
  };
  const helixB = (t, time) => { const p = helixA(t, time); return [-p[0], p[1], -p[2]]; };
  const rungAt = (tFixed) => (u, time) => {
    const a = helixA(tFixed, time), b = helixB(tFixed, time);
    return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
  };
  const cool = { colorNear: [232, 238, 255], colorFar: [120, 130, 175] };
  const rungs = [];
  for (let i = 3; i < 20; i += 3) {
    rungs.push({ samples: 1, fn: rungAt(i / 20), ...cool, colorNear: [190, 205, 255], colorFar: [90, 100, 150] });
  }
  return {
    curves: [
      { samples: 64, fn: helixA, ...cool, markers: [{ speed: 0.18, phase: 0, size: 2.4, color: [200, 215, 255] }, { speed: 0.18, phase: 0.5, size: 1.8, color: [190, 205, 255] }] },
      { samples: 64, fn: helixB, colorNear: [210, 218, 255], colorFar: [95, 100, 150], markers: [{ speed: 0.15, phase: 0.25, size: 1.6, color: [170, 185, 240] }] },
      ...rungs,
    ],
  };
}

/* Hub-and-spoke network — platform nodes curving into the app, orbiting
   gently, with an active job pulsing along the live link */
function buildTranslationNetwork() {
  const bases = [
    [70, -30, 10], [-60, -40, -20], [50, 40, -30], [-70, 20, 20],
    [10, -60, -40], [-20, 55, 35], [80, 15, -10], [-45, -55, 30],
  ];
  const center = [0, 0, 0];
  const satPos = (r0, phase) => (time) => {
    const wob = Math.sin(time * 0.25 + phase) * 4;
    const orbit = time * 0.04 + phase;
    const c = Math.cos(orbit), s = Math.sin(orbit);
    return [r0[0] * c - r0[2] * s + wob, r0[1] + Math.sin(time * 0.3 + phase) * 2, r0[0] * s + r0[2] * c];
  };
  const curves = bases.map((r0, i) => {
    const pos = satPos(r0, i * 1.1);
    const mid = (time) => {
      const s = pos(time);
      const bulge = 14 + Math.sin(time * 0.4 + i) * 4;
      return [s[0] * 0.5, s[1] * 0.5 + bulge, s[2] * 0.5];
    };
    const fn = (t, time) => bezier3(center, mid(time), pos(time), t);
    const active = i === 0;
    return {
      samples: 22, fn,
      colorNear: active ? [200, 220, 255] : [225, 228, 240],
      colorFar: active ? [90, 105, 170] : [95, 95, 105],
      markers: active ? [{ speed: 0.3, phase: 0, size: 2.6, color: [205, 220, 255] }] : undefined,
    };
  });
  const ring = {
    samples: 40,
    fn: (t, time) => {
      const a = t * Math.PI * 2 + time * 0.03;
      return [Math.cos(a) * 24, Math.sin(a * 2 + time * 0.2) * 3, Math.sin(a) * 24];
    },
    colorNear: [210, 220, 250], colorFar: [70, 75, 100],
  };
  return { curves: [ring, ...curves] };
}

/* Layered compute stack — local hardware processing, with data packets
   rising through each stratum */
function buildComputeStack() {
  const layers = 5;
  const layerPts = (l) => {
    const y = -80 + l * 40;
    const baseSize = 46 - l * 3;
    return { y, baseSize, l };
  };
  const cornerPos = (c, l, time) => {
    const { y, baseSize } = layerPts(l);
    const breathe = Math.sin(time * 0.3 + l * 0.6) * 1.5;
    const rot = time * 0.05 + l * 0.22;
    const a = (c / 4) * Math.PI * 2 + rot;
    const size = baseSize + breathe;
    return [Math.cos(a) * size, y, Math.sin(a) * size];
  };
  const curves = [];
  for (let l = 0; l < layers; l++) {
    curves.push({
      samples: 32,
      fn: (t, time) => {
        const a = t * Math.PI * 2;
        const cf = a / (Math.PI / 2);
        const c0 = Math.floor(cf) % 4, c1 = (c0 + 1) % 4, f = cf - Math.floor(cf);
        const p0 = cornerPos(c0, l, time), p1 = cornerPos(c1, l, time);
        return [p0[0] + (p1[0] - p0[0]) * f, p0[1] + (p1[1] - p0[1]) * f, p0[2] + (p1[2] - p0[2]) * f];
      },
      colorNear: l === layers - 1 ? [205, 220, 255] : [220, 224, 235],
      colorFar: [80, 85, 100],
    });
  }
  for (let c = 0; c < 4; c++) {
    curves.push({
      samples: 1,
      fn: (t, time) => {
        const lf = t * (layers - 1);
        const l0 = Math.floor(lf), l1 = Math.min(layers - 1, l0 + 1), f = lf - l0;
        const p0 = cornerPos(c, l0, time), p1 = cornerPos(c, l1, time);
        return [p0[0] + (p1[0] - p0[0]) * f, p0[1] + (p1[1] - p0[1]) * f, p0[2] + (p1[2] - p0[2]) * f];
      },
      colorNear: [195, 210, 255], colorFar: [70, 75, 95],
      markers: [{ speed: 0.22, phase: c * 0.25, size: 2, color: [200, 215, 255] }],
    });
  }
  return { curves };
}

function IllustrationLayers() {
  return <Scene3D buildScene={buildVoiceWaveform} autoSpin={0.09} haloColors={["rgba(150,170,255,0.35)", "rgba(190,150,255,0.25)"]} />;
}
function IllustrationNodes() {
  return <Scene3D buildScene={buildTranslationNetwork} autoSpin={0.07} haloColors={["rgba(140,200,255,0.3)", "rgba(150,170,255,0.22)"]} />;
}
function IllustrationSpeed() {
  return <Scene3D buildScene={buildComputeStack} autoSpin={0.08} haloColors={["rgba(200,210,255,0.3)", "rgba(150,180,255,0.2)"]} />;
}
/* ─── Section label ───────────────────────────────────────────────── */
function SectionNum({ n, name }) {
  return (
    <div className="feat-num">
      <span>{n}</span>
      <a href="#">{name} →</a>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════ */
export default function EchoXFeaturesPage() {
  const [activeStep, setActiveStep] = useState(0);
  const [activeCardIndex, setActiveCardIndex] = useState(0);

  useEffect(() => {
    let step = 0;
    if (activeCardIndex === 0) step = 0;
    else if (activeCardIndex === 1) step = 2;
    else if (activeCardIndex === 2) step = 3;
    setActiveStep(step);

    let timer = null;
    if (activeCardIndex === 0) {
      timer = setTimeout(() => {
        setActiveStep(1);
      }, 2500);
    } else if (activeCardIndex === 2) {
      timer = setTimeout(() => {
        setActiveStep(4);
      }, 2500);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [activeCardIndex]);

  return (
    <>
      <style>{CSS}</style>

      {/* ── HERO ───────────────────────────────────────────────── */}
      <section className="hero" aria-label="Hero">
        <div className="wrap-text">
          <F delay={0.07}>
            <h1 className="hero-h1">
              Video translation.<br/>
              <span className="ghost">Web or desktop.</span>
            </h1>
          </F>
          <F delay={0.13}>
            <p className="hero-body">
              Translate videos in your browser or run the pipeline natively on your system. EchoX handles audio extraction, language translation, and voice synthesis in one unified workflow.
            </p>
          </F>
          <F delay={0.19}>
            <div className="hero-actions">
              <a href="#download" className="btn-dl"><Dl/> Download for Windows</a>
              <a href="#translate" className="btn-ghost">See how it works <Arr/></a>
            </div>
          </F>
        </div>

        <Stage marginTop={56}>
          <F delay={0.13}>
            <Frame>
              <img
                className="ss-img"
                src="/screenshots/workspace.png"
                alt="EchoX translator — translate any video into a native voice"
                onError={e => {
                  e.currentTarget.style.display = "none";
                  e.currentTarget.nextSibling.style.display = "flex";
                }}
              />
              <Placeholder
                label="Screenshot 1 — Translator workspace"
                note="Main translator view. File: /screenshots/workspace.png"
              />
            </Frame>
          </F>
        </Stage>
      </section>

      {/* ── BRIDGE ──────────────────────────────────────────────── */}
      <section className="bridge" aria-labelledby="bridge-h">
        <div className="wrap-mid">
          <div className="bridge-intro">
            <F>
              <h2 className="bridge-big" id="bridge-h">
                <strong>Built for direct media translation.</strong>{" "}
                <span className="dim">
                  Skip the subscription fees and upload limits of web-based tools. By executing translation pipelines on your own hardware, you keep your files secure and your rendering speeds consistent.
                </span>
              </h2>
            </F>
          </div>

          <div className="figs">
            {[
              {
                fig: "FIG 0.2",
                art: <IllustrationLayers/>,
                name: "Targeted voice synthesis",
                body: "Convert your media into clear, translated speech. Choose from natural target voices to ensure your dubbed track is clear, with options optimized for regional languages."
              },
              {
                fig: "FIG 0.3",
                art: <IllustrationNodes/>,
                name: "Direct link translation",
                body: "Translate web content directly without manual downloads. Paste URLs from major platforms to extract and translate media streams, with expanded compatibility on desktop."
              },
              {
                fig: "FIG 0.4",
                art: <IllustrationSpeed/>,
                name: "Hardware-driven control",
                body: "Run processing pipelines on your own hardware resources. The desktop app provides persistent translation history, offline execution, and local database control."
              },
            ].map(({ fig, art, name, body }, i) => (
              <F key={i} delay={[0, 0.07, 0.13][i]}>
                <div className="fig-card">
                  <p className="fig-label">{fig}</p>
                  <div className="fig-art">{art}</div>
                  <p className="fig-name">{name}</p>
                  <p className="fig-body">{body}</p>
                </div>
              </F>
            ))}
          </div>
        </div>
      </section>

      {/* ── 1.0 TRANSLATE ──────────────────────────────────────── */}
      <section className="feat" id="translate" aria-labelledby="feat1-h">
        <div className="wrap-mid">
          <F>
            <div className="feat-header">
              <div className="feat-left">
                <SectionNum n="1.0" name="Translate"/>
                <h2 className="feat-h2" id="feat1-h">
                  Transcribe audio.<br/>Generate voice tracks.<br/>Align subtitles.
                </h2>
              </div>
              <div className="feat-right">
                <p className="feat-body">
                  Produce fully dubbed videos and transcripts from a single source. EchoX handles the entire audio extraction, translation, and speech generation pipeline in one interface.
                </p>
                <div className="feat-details">
                  {[
                    "Generate target speech tracks in English, Hindi, Telugu, Tamil, and Japanese.",
                    "Start instantly as the engine automatically detects the language in your source media.",
                    "Export matching subtitle files that align perfectly with the new voice track.",
                    "Keep the feel of the original media by blending dubbed speech with background music.",
                  ].map((t, i) => (
                    <div className="feat-detail" key={i}>
                      <span className="feat-detail-pip"/>
                      <span className="feat-detail-text">{t}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </F>
        </div>

        {/* Lower split-screen waveform tracks & CardSwap block */}
        <div style={{ minHeight: '480px', marginTop: '56px' }} className="wrap-mid grid grid-cols-1 md:grid-cols-2 gap-16 items-center overflow-visible">
          {/* Left Column: Premium vertical step indicator */}
          <F delay={0.07}>
            <div className="flex justify-start w-full md:pl-16">
              <PipelineProgress activeStep={activeStep} />
            </div>
          </F>

          {/* Right Column: CardSwap Container */}
          <div style={{ height: '400px', position: 'relative' }} className="w-full overflow-visible flex items-center justify-end">
            <CardSwap
              cardDistance={45}
              verticalDistance={55}
              delay={5000}
              pauseOnHover={false}
              width={380}
              height={300}
              onCardChange={setActiveCardIndex}
            >
              <Card className="p-8 flex flex-col justify-between border-neutral-800 bg-[#0d0e10]/80 backdrop-blur-md text-[#ededeb] shadow-2xl rounded-xl">
                <div>
                  <div className="flex items-center gap-3 mb-4 text-neutral-400">
                    <svg className="w-5 h-5 stroke-neutral-500" viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 10v4M6 6v12M9 3v18M12 9v6M15 5v14M18 8v8M21 11v2" />
                    </svg>
                    <span className="text-[10px] font-mono tracking-widest uppercase">Phase 01 &middot; Extraction</span>
                  </div>
                  <h3 className="text-xl font-bold mb-3 tracking-tight text-white">Audio Stream Demux</h3>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    <strong className="text-neutral-200">Local pipeline processing.</strong> EchoX extracts the source audio track directly on your system using ffmpeg. Keep your media private and ignore file size caps.
                  </p>
                </div>
                <div className="flex justify-between items-center text-[10px] font-mono text-neutral-500 mt-6 border-t border-neutral-800/60 pt-4">
                  <span>01. DEMUX</span>
                  <span>FFMPEG STREAM</span>
                </div>
              </Card>
              <Card className="p-8 flex flex-col justify-between border-neutral-800 bg-[#0d0e10]/80 backdrop-blur-md text-[#ededeb] shadow-2xl rounded-xl">
                <div>
                  <div className="flex items-center gap-3 mb-4 text-neutral-400">
                    <svg className="w-5 h-5 stroke-neutral-500" viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      <path d="M8 10h.01M12 10h.01M16 10h.01" />
                    </svg>
                    <span className="text-[10px] font-mono tracking-widest uppercase">Phase 02 &middot; Translation</span>
                  </div>
                  <h3 className="text-xl font-bold mb-3 tracking-tight text-white">Multimodal Translation</h3>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    <strong className="text-neutral-200">Dialogue localizing.</strong> Transcribe speech, align subtitles, and translate texts to target languages using Gemini API models.
                  </p>
                </div>
                <div className="flex justify-between items-center text-[10px] font-mono text-neutral-500 mt-6 border-t border-neutral-800/60 pt-4">
                  <span>02. TRANSCRIBE</span>
                  <span>AI MULTIMODAL</span>
                </div>
              </Card>
              <Card className="p-8 flex flex-col justify-between border-neutral-800 bg-[#0d0e10]/80 backdrop-blur-md text-[#ededeb] shadow-2xl rounded-xl">
                <div>
                  <div className="flex items-center gap-3 mb-4 text-neutral-400">
                    <svg className="w-5 h-5 stroke-neutral-500" viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                      <path d="M19 10v1a7 7 0 0 1-14 0v-1M12 19v3M8 22h8" />
                    </svg>
                    <span className="text-[10px] font-mono tracking-widest uppercase">Phase 03 &middot; Dub Mix</span>
                  </div>
                  <h3 className="text-xl font-bold mb-3 tracking-tight text-white">Voice Dubbing &amp; Mix</h3>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    <strong className="text-neutral-200">Local TTS execution.</strong> Dub original media using local Piper ONNX voice profiles. Blends speech tracks with background audio tracks locally.
                  </p>
                </div>
                <div className="flex justify-between items-center text-[10px] font-mono text-neutral-500 mt-6 border-t border-neutral-800/60 pt-4">
                  <span>03. SYNTHESIS</span>
                  <span>PIPER TTS</span>
                </div>
              </Card>
            </CardSwap>
          </div>
        </div>
      </section>

      {/* ── 2.0 IMPORT ─────────────────────────────────────────── */}
      <section className="feat" id="sources" aria-labelledby="feat2-h">
        <div className="wrap-mid">
          <F>
            <div className="feat-header">
              <div className="feat-left">
                <SectionNum n="2.0" name="Import"/>
                <h2 className="feat-h2" id="feat2-h">
                  Stream directly<br/>from the web.
                </h2>
              </div>
              <div className="feat-right">
                <p className="feat-body">
                  Skip the manual download and conversion steps. Input links from sharing platforms to extract the underlying media tracks and begin translating immediately.
                </p>
              </div>
            </div>
          </F>
        </div>

        <F delay={0.07}>
          <div className="w-full max-w-[1200px] mx-auto h-[500px] relative overflow-hidden" style={{ marginTop: "56px" }}>
            <CircularGallery items={PLATFORM_ITEMS} bend={1} borderRadius={0.05} />
            {/* Smooth Edge Fades to blend cards as they curve out */}
            <div className="absolute top-0 left-0 bottom-0 w-32 bg-gradient-to-r from-[#08090a] to-transparent pointer-events-none z-10" />
            <div className="absolute top-0 right-0 bottom-0 w-32 bg-gradient-to-l from-[#08090a] to-transparent pointer-events-none z-10" />
          </div>
        </F>
      </section>

      {/* ── 3.0 RUN / DESKTOP ──────────────────────────────────── */}
      <section className="feat" id="desktop" aria-labelledby="feat3-h">
        <div className="wrap-mid">
          <F>
            <div className="feat-header">
              <div className="feat-left">
                <SectionNum n="3.0" name="Desktop"/>
                <h2 className="feat-h2" id="feat3-h">
                  Keep your history.<br/>Control your data.
                </h2>
              </div>
              <div className="feat-right">
                <p className="feat-body">
                  Keep your original files and translation records on your own hard drive. EchoX processes media locally and saves your work logs in a persistent SQLite database.
                </p>
                <div className="feat-details">
                  {[
                    "Process large files quickly using your own system resources.",
                    "Bypass external servers to keep your translation pipeline secure.",
                    "Manage all past translation jobs in a persistent, searchable dashboard.",
                    "Customize your workspace with dark and light themes designed for visual comfort.",
                  ].map((t, i) => (
                    <div className="feat-detail" key={i}>
                      <span className="feat-detail-pip"/>
                      <span className="feat-detail-text">{t}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </F>
        </div>

        <Stage className="stage-history">
          <F delay={0.07}>
            <Frame className="frame-history">
              <img
                className="ss-img"
                src="/screenshots/history.png"
                alt="EchoX translation history showing completed jobs and activity log"
                onError={e => {
                  e.currentTarget.style.display = "none";
                  e.currentTarget.nextSibling.style.display = "flex";
                }}
              />
              <Placeholder
                label="Screenshot 4 — Translation history & activity"
                note="EchoX history view: completed translations, activity log, workspace stats. File: /screenshots/history.png"
              />
            </Frame>
          </F>
        </Stage>
      </section>

      {/* ── CAPABILITY COMPARISON ───────────────────────────────── */}
      <section className="feat" style={{ padding: "80px 0 0" }}>
        <div className="wrap-mid">

          <F>
            <div className="pixel-compare-container">
              <h2 className="pixel-compare-title">One product. Two ways to work.</h2>
              <p className="pixel-compare-subtitle">Cloud accessibility meets native local power.</p>
              <div className="pixel-compare-table-box">
                <table className="pixel-compare-table">
                  <thead>
                    <tr>
                      <th className="pixel-compare-th" style={{ width: '30%' }}>Capability</th>
                      <th className="pixel-compare-th" style={{ width: '35%' }}>Web Application</th>
                      <th className="pixel-compare-th" style={{ width: '35%' }}>Desktop Application</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="pixel-compare-row">
                      <td className="pixel-compare-td pixel-compare-feature">Local Upload</td>
                      <td className="pixel-compare-td pixel-compare-others-val">Upload local video and audio files</td>
                      <td className="pixel-compare-td pixel-compare-our-val">Upload local video and audio files</td>
                    </tr>
                    <tr className="pixel-compare-row">
                      <td className="pixel-compare-td pixel-compare-feature">Stream Import</td>
                      <td className="pixel-compare-td pixel-compare-others-val">Translate streaming video links</td>
                      <td className="pixel-compare-td pixel-compare-our-val">Expanded stream extraction for hundreds of platform URLs</td>
                    </tr>
                    <tr className="pixel-compare-row">
                      <td className="pixel-compare-td pixel-compare-feature">Voices & Dubbing</td>
                      <td className="pixel-compare-td pixel-compare-others-val">Choose target languages and select AI voices</td>
                      <td className="pixel-compare-td pixel-compare-our-val">Includes all Web Application capabilities</td>
                    </tr>
                    <tr className="pixel-compare-row">
                      <td className="pixel-compare-td pixel-compare-feature">Local Processing</td>
                      <td className="pixel-compare-td pixel-compare-others-val">Capped cloud server API resources</td>
                      <td className="pixel-compare-td pixel-compare-our-val">Local CPU/GPU hardware resource processing</td>
                    </tr>
                    <tr className="pixel-compare-row">
                      <td className="pixel-compare-td pixel-compare-feature">Job History</td>
                      <td className="pixel-compare-td pixel-compare-others-val">Track active translation progress</td>
                      <td className="pixel-compare-td pixel-compare-our-val">Persistent local database for translation history</td>
                    </tr>
                    <tr className="pixel-compare-row">
                      <td className="pixel-compare-td pixel-compare-feature">Dashboard stats</td>
                      <td className="pixel-compare-td pixel-compare-others-val">Active session logs only</td>
                      <td className="pixel-compare-td pixel-compare-our-val">Searchable project dashboard and run statistics</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </F>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────── */}
      <section className="cta" id="download" aria-labelledby="cta-h">
        <div className="wrap">
          <F>
            <h2 className="cta-h2" id="cta-h">
              Take control of your media translation.
            </h2>
          </F>
          <F delay={0.07}>
            <p className="cta-sub">
              Free to download and run. Skip the file caps, account sign-ups, and subscription fees of cloud video services.
            </p>
          </F>
          <F delay={0.13}>
            <div className="cta-row">
              <a href="#" className="btn-dl" style={{ fontSize: 14, padding: "13px 26px" }}>
                <Dl/> Download for Windows
              </a>
              <a href="#" className="btn-ghost" style={{ fontSize: 14, padding: "13px 22px" }}>
                View on GitHub <Arr/>
              </a>
            </div>
            <p className="cta-note">Native Tauri app · Windows 10 / 11 · No installation required</p>
          </F>
        </div>
      </section>


    </>
  );
}