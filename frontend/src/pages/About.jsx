import { useTheme } from "../context/ThemeContext";
import ProfileCard from "../components/ui/ProfileCard";
import { motion } from "framer-motion";


const FEATURES = [
  {
    title: "AI Video & Audio Translation",
    desc: "End-to-end pipeline — upload a video, choose a language, receive a fully dubbed output. Powered by Whisper transcription and Gemini translation.",
    span: "col-span-2",
  },
  {
    title: "Native Desktop App",
    desc: "Cross-platform desktop application built with Tauri and Rust for near-native performance.",
    span: "col-span-1",
  },
  {
    title: "Background Audio Preservation",
    desc: "HT Demucs separates vocals from background music so the original score survives dubbing intact.",
    span: "col-span-1",
  },
  {
    title: "Offline Local TTS",
    desc: "Piper TTS synthesises speech entirely on-device. No cloud, no latency, no cost.",
    span: "col-span-1",
  },
  {
    title: "Selectable Closed Captions",
    desc: "Auto-generated CC tracks embedded in the output, selectable per target language.",
    span: "col-span-2",
  },
  {
    title: "YouTube & Online Media",
    desc: "yt-dlp integration pulls audio and video from remote URLs before the pipeline starts.",
    span: "col-span-1",
  },
  {
    title: "FastAPI Backend",
    desc: "Async Python server handles heavy AI workloads without blocking the UI.",
    span: "col-span-1",
  },
  {
    title: "Modern React UI",
    desc: "Vite + React frontend with real-time progress tracking and a clean translation workspace.",
    span: "col-span-1",
  },
];

const TECH = [
  "React", "FastAPI", "Python", "Tauri", "Rust",
  "Whisper", "Gemini 3.1 Flash lite", "Piper TTS",
  "HT Demucs", "ONNX Runtime", "FFmpeg", "yt-dlp", "SQLite",
];

/* ─── animations ─────────────────────────────────────────────── */
const fadeUp  = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.48, ease: "easeOut" } } };
const stagger = { show: { transition: { staggerChildren: 0.06 } } };



/* ─── component ─────────────────────────────────────────────── */
export default function About() {
  const { isDark } = useTheme();

  const fg      = isDark ? "#ffffff"                 : "#000000";
  const fgMid   = isDark ? "rgba(255,255,255,0.65)"  : "rgba(0,0,0,0.65)";
  const fgDim   = isDark ? "rgba(255,255,255,0.38)"  : "rgba(0,0,0,0.38)";
  const line    = isDark ? "rgba(255,255,255,0.07)"  : "rgba(0,0,0,0.07)";
  const subtle  = isDark ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.02)";

  return (
    <main className="overflow-x-hidden" style={{ color: fg, minHeight: "100vh" }}>
      <div className="max-w-7xl mx-auto px-6 pt-28 pb-32">

        {/* ── MASTER TWO-COLUMN ──────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-20 items-start">

          {/* ═══════════════════════════════════════════════════
              LEFT COLUMN
          ═══════════════════════════════════════════════════ */}
          <motion.div variants={stagger} initial="hidden" animate="show" className="min-w-0">

            {/* ── 1. HERO ──────────────────────────────────── */}
            <motion.div variants={fadeUp} className="mb-20">
              <p className="text-xs uppercase tracking-[0.2em] mb-5" style={{ color: fgDim }}>
                AI · Video Translation · Desktop
              </p>
              <h1
                className="text-[2.75rem] md:text-[3.5rem] font-extrabold tracking-[-0.03em] leading-[1.08] mb-6"
                style={{ color: fg }}
              >
                AI video translation,<br />
                <span style={{ color: fgMid }}>built for everyone.</span>
              </h1>
              <p className="text-[17px] leading-[1.75] max-w-lg" style={{ color: fgMid }}>
                EchoX is an AI-powered video translation and dubbing platform focused on making
                multilingual content creation accessible through modern AI and media processing.
              </p>
            </motion.div>

            {/* ── 2. PROJECT STORY — asymmetric split ──────── */}
            <motion.div
              variants={fadeUp}
              className="mb-20"
              style={{ borderTop: `1px solid ${line}`, paddingTop: '40px' }}
            >
              <p className="text-[11px] uppercase tracking-[0.18em] mb-8" style={{ color: fgDim }}>
                Project Story
              </p>
              <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-8">
                {/* Main narrative */}
                <div className="space-y-5 text-[15px] leading-[1.8]" style={{ color: fgMid }}>
                  <p>
                    EchoX started as a weekend experiment — could open-source AI models replace expensive
                    cloud dubbing services? The answer was yes, and the project grew far beyond the
                    original scope.
                  </p>
                  <p>
                    Today it combines <strong style={{ color: fg }}>AI speech transcription</strong>,{" "}
                    <strong style={{ color: fg }}>neural translation</strong>, and{" "}
                    <strong style={{ color: fg }}>voice synthesis</strong> into a single pipeline — available
                    both as a web app and a native desktop application built on Tauri and Rust.
                  </p>
                </div>

                {/* Right stat column */}
                <div
                  className="flex flex-col gap-px"
                  style={{ borderLeft: `1px solid ${line}`, paddingLeft: '28px' }}
                >
                  {[
                    ["Architecture", "Client-server"],
                    ["Desktop", "Tauri + Rust"],
                    ["TTS", "Fully offline"],
                  ].map(([label, val]) => (
                    <div key={label} className="py-4" style={{ borderBottom: `1px solid ${line}` }}>
                      <div className="text-[11px] uppercase tracking-[0.14em] mb-1" style={{ color: fgDim }}>{label}</div>
                      <div className="text-[14px] font-medium" style={{ color: fg }}>{val}</div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* ── 3. ENGINEERING HIGHLIGHTS — bento grid ───── */}
            <motion.div
              variants={fadeUp}
              className="mb-20"
              style={{ borderTop: `1px solid ${line}`, paddingTop: '40px' }}
            >
              <p className="text-[11px] uppercase tracking-[0.18em] mb-8" style={{ color: fgDim }}>
                Engineering Highlights
              </p>

              {/*
                Bento: 3-column grid on md+
                Odd cards span 2 cols, even cards span 1.
                Row 1: [span-2] [span-1]
                Row 2: [span-1] [span-2]
                Row 3: [span-2] [span-1]
                ...
              */}
              <motion.div
                variants={stagger}
                className="grid grid-cols-1 md:grid-cols-3"
                style={{ border: `1px solid ${line}`, borderRadius: '16px', overflow: 'hidden' }}
              >
                {FEATURES.map(({ title, desc, span }, i) => {
                  const isWide = span === "col-span-2";
                  return (
                    <motion.div
                      key={title}
                      variants={fadeUp}
                      className={`p-6 md:${span} flex flex-col justify-between gap-8 transition-colors duration-200`}
                      style={{
                        minHeight: isWide ? '160px' : '160px',
                        borderRight: (i % 3 !== 2) ? `1px solid ${line}` : 'none',
                        borderBottom: `1px solid ${line}`,
                        backgroundColor: 'transparent',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = subtle)}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <p className="text-[13px] font-semibold leading-snug" style={{ color: fg }}>{title}</p>
                      <p className="text-[12px] leading-relaxed" style={{ color: fgDim }}>{desc}</p>
                    </motion.div>
                  );
                })}
              </motion.div>
            </motion.div>

            {/* ── 4. TECHNOLOGIES ──────────────────────────── */}
            <motion.div
              variants={fadeUp}
              className="mb-20"
              style={{ borderTop: `1px solid ${line}`, paddingTop: '40px' }}
            >
              <p className="text-[11px] uppercase tracking-[0.18em] mb-6" style={{ color: fgDim }}>
                Technologies
              </p>
              <div className="flex flex-wrap gap-2">
                {TECH.map((label) => (
                  <span
                    key={label}
                    className="px-3 py-1.5 text-[12px] rounded-md"
                    style={{
                      color: fgMid,
                      border: `1px solid ${line}`,
                      backgroundColor: subtle,
                    }}
                  >
                    {label}
                  </span>
                ))}
              </div>
            </motion.div>


          </motion.div>

          {/* ═══════════════════════════════════════════════════
              RIGHT COLUMN — ProfileCard, sticky
          ═══════════════════════════════════════════════════ */}
          <motion.aside
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="flex justify-center lg:sticky lg:top-28"
          >
            <ProfileCard
              name="Praveen Amujuri"
              title="Applied AI Developer"
              handle="PraveenAmujuri"
              avatarUrl="/profile.jpg"
              iconUrl="/assets/demo/iconpattern.png"
              behindGlowEnabled
              behindGlowColor="rgba(125, 190, 255, 0.67)"
              innerGradient="linear-gradient(145deg,#60496e8c 0%,#71C4FF44 100%)"
              status="Building EchoX"
              showUserInfo={true}
              enableTilt={true}
              enableMobileTilt={false}
            />
          </motion.aside>

        </div>
      </div>
    </main>
  );
}
