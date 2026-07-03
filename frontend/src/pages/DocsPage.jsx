import { useState, useEffect, useRef } from "react";
import { useTheme } from "../context/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";
import ScrollReveal from "../components/ui/ScrollReveal";
import {
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  Terminal,
  Download,
  Subtitles,
  Mic,
  Monitor,
  Compass,
  X,
  LayoutGrid,
} from "lucide-react";

const DOWNLOAD_URL =
  "https://github.com/PraveenAmujuri/ai_video_translator/releases/download/v1.0.0/EchoX_0.1.0_x64-setup.exe";

/* ─────────────────────────────────────────────────────────────────────────
 *  Navigation sections for the sidebar
 * ───────────────────────────────────────────────────────────────────────── */
const DOC_SECTIONS = [
  {
    id: "getting-started",
    label: "Getting started",
    icon: ChevronRight,
    content: {
      heading: "Getting started",
      body: "EchoX is a native Windows desktop application for AI-powered video translation and dubbing. Everything runs locally — no uploads to the cloud, no subscription fees, no file size limits.",
      subsections: [
        {
          title: "Installation",
          text: "Download the latest installer from the releases page. Run the executable — EchoX requires no additional dependencies. Windows 10 or later is supported.",
        },
        {
          title: "System requirements",
          items: [
            "Windows 10 64-bit or later",
            "8 GB RAM (16 GB recommended)",
            "GPU with Vulkan support (optional, for faster processing)",
            "~500 MB disk space for the application",
          ],
        },
        {
          title: "Quick start",
          text: 'Launch EchoX. Click "Upload" to select a video file, or paste a YouTube URL. Choose your target language and voice. Click "Translate" and wait for the pipeline to complete.',
        },
      ],
    },
  },
  {
    id: "core-features",
    label: "Core features",
    icon: Subtitles,
    content: {
      heading: "Core features",
      body: "EchoX provides a complete video translation pipeline in a single desktop application.",
      subsections: [
        {
          title: "AI video translation",
          text: "Upload any video file (MP4, MOV, AVI, MKV) and select a target language. EchoX transcribes the original audio, translates the content, and generates a dubbed version with synchronized timing.",
        },
        {
          title: "YouTube URL processing",
          text: "Paste a YouTube URL directly into EchoX. The application downloads the video, processes the audio track, and returns a fully translated version — all within the same interface.",
        },
        {
          title: "Subtitle localization",
          text: "Translated subtitles are context-aware — idioms, cultural references, and tone are preserved. Source and translated tracks are available for side-by-side comparison during playback.",
        },
        {
          title: "Translation history",
          text: "Every translation job is saved locally. Browse your history, revisit past projects, and re-download completed translations without re-processing.",
        },
        {
          title: "Multi-language support",
          text: "Translate between dozens of language pairs. Supported languages include English, Spanish, Japanese, Telugu, Hindi, Mandarin Chinese, French, German, Korean, and many more.",
        },
      ],
    },
  },
  {
    id: "neural-voice",
    label: "Neural voice",
    icon: Mic,
    content: {
      heading: "Neural voice generation",
      body: "EchoX uses neural text-to-speech to generate natural-sounding voiceovers in the target language.",
      subsections: [
        {
          title: "Voice selection",
          text: "Browse a library of 40+ neural voices across supported languages. Each voice includes information about gender, regional dialect, and style (warm, crisp, soft, etc.).",
        },
        {
          title: "Voice preview",
          text: "Preview any voice with sample text before committing to a translation. The preview generates a short audio clip so you can evaluate tone, pacing, and clarity.",
        },
        {
          title: "Processing",
          text: "Voice generation runs entirely on your machine. Processing time depends on video length, selected voice complexity, and your hardware. A 10-minute video typically processes in 3–8 minutes on modern hardware.",
        },
      ],
    },
  },
  {
    id: "desktop-app",
    label: "Desktop app",
    icon: Monitor,
    content: {
      heading: "Desktop application",
      body: "EchoX is built with Tauri — a lightweight native framework that combines a Rust backend with a web-based frontend.",
      subsections: [
        {
          title: "Native performance",
          text: "Unlike Electron-based apps, Tauri delivers a native executable with minimal memory overhead. The binary is approximately 45 MB and startup is near-instant.",
        },
        {
          title: "Offline operation",
          text: "Translation and voice generation run locally using on-device AI models. An internet connection is only required for YouTube downloads and initial model downloads.",
        },
        {
          title: "Automatic updates",
          text: "EchoX checks for updates on launch. New versions are downloaded and applied automatically. Release notes are displayed before updating.",
        },
        {
          title: "File management",
          text: "All projects, translations, and generated files are stored locally. Use the Library view to browse, search, and manage your translation history.",
        },
      ],
    },
  },
  {
    id: "engineering-journey",
    label: "Engineering journey",
    icon: Compass,
    content: {
      heading: "Engineering journey",
      body: "Trace the architectural evolution, experimentation, and lessons learned during the design and development of EchoX.",
      timeline: [
        {
          date: "Phase 1",
          title: "Initial Web Architecture",
          status: "Completed",
          icon: <Monitor size={14} />,
          desc: "EchoX began as a browser-based AI video translation application. The design concept delegated all processing workloads to a server-side backend executing command-line extraction tools and ONNX-synthesized voice neural networks.",
          diagram: "Browser (Client)\n   ↓ [Paste URL]\nFastAPI Backend\n   ↓ [Spawn pipeline processes]\nyt-dlp → FFmpeg → Whisper → Gemini (Translation) → Piper TTS\n   ↓ [Merge & Output]\nDownload Completed Video",
          details: [
            "Performed audio demuxing and track downsampling on the server.",
            "Ran Gemini translation and local Piper ONNX synthesis as sequential server-side steps.",
            "Objective: Keep client footprint ultra-lightweight and run fully in-browser."
          ]
        },
        {
          date: "Phase 2",
          title: "Datacenter IP Restrictions & Blocks",
          status: "Completed",
          icon: <ChevronRight size={14} className="rotate-90" />,
          desc: "During early deployment, we encountered severe network restrictions. Cloud providers (Azure, Vercel, AWS) IP addresses were frequently flagged by YouTube's integrity systems, resulting in HTTP 403 Forbidden errors when yt-dlp was executed from server-side datacenter gateways.",
          details: [
            "Strict datacenter IP blocks resulted in immediate client extraction failures.",
            "Encountered high rate limits and anti-bot checks (CAPTCHA/HTTP 403).",
            "Alternative solutions like proxy rotation introduced high network latency and significant maintenance overhead."
          ]
        },
        {
          date: "Phase 3",
          title: "The EchoX Browser Extension",
          status: "Completed",
          icon: <ChevronRight size={14} />,
          desc: "To bypass datacenter IP restrictions, we designed an experimental developer browser extension. The core idea shifted media extraction to the user's client browser, using their residential IP network, and uploaded raw extracted chunks back to our backend for processing.",
          diagram: "User's Browser (Extension Context)\n   ↓ [Fetch Media Chunks via Residential IP]\nExtract Audio Locally\n   ↓ [Upload Raw Audio Bytes]\nFastAPI Backend (AI Dub / Subtitle Translation)",
          details: [
            "Circumvented datacenter blocks by fetching audio streams directly via user residential IPs.",
            "Began background extraction inside a hidden tab pointing to the target YouTube video page."
          ]
        },
        {
          date: "Phase 4",
          title: "Investigating YouTube's Streaming Architecture",
          status: "Completed",
          icon: <ChevronRight size={14} />,
          desc: "Explored YouTube's streaming protocols and Innertube client contexts to understand media distribution. We noted that the Android mobile client context consistently returned stream information without immediate server-side validation blocks. However, YouTube serves media using HTTP 206 Partial Content range requests, necessitating sequential chunk gathering.",
          details: [
            "Identified YouTube Innertube Android mobile client context as returning valid stream URLs.",
            "Analyzed chunked range requests (HTTP 206 Partial Content) rather than unified static file downloads.",
            "Explored adaptive buffering mechanisms and chunk assembly logic."
          ]
        },
        {
          date: "Phase 5",
          title: "Browser Security Constraints & Gating",
          status: "Completed",
          icon: <ChevronRight size={14} />,
          desc: "Investigated YouTube's dynamically generated player logic (base.js), request validation, and browser security restrictions while experimenting with extension-based media extraction. Running extraction code outside the youtube.com origin triggered strict Cross-Origin Resource Sharing (CORS) constraints.",
          details: [
            "Studied browser Cross-Origin Resource Sharing (CORS) constraints on non-YouTube domains.",
            "YouTube's dynamically generated player logic (base.js) and signature validation introduced additional complexity.",
            "Explored different debugging and extension development techniques to better understand how browser security affected media extraction."
          ]
        },
        {
          date: "Phase 6",
          title: "Architecture Failure & Resource Constraints",
          status: "Abandoned",
          icon: <ExternalLink size={14} />,
          desc: "Although chunk extraction was feasible during development, the architecture proved unsuitable for stable production. Browser networking and memory constraints made reconstruction of large adaptive media streams unreliable. Buffering inconsistencies and frequent changes to YouTube's player logic introduced significant maintenance overhead.",
          details: [
            "Encountered missing byte ranges, incomplete adaptive media segments, and inconsistent chunk assembly, causing corrupted audio buffers.",
            "Encountered browser-level memory constraints and socket limitations for large raw byte streams.",
            "High dependency on internal player logic changes meant front-end updates could break extraction logic unexpectedly."
          ]
        },
        {
          date: "Phase 7",
          title: "EchoX Desktop Natively",
          status: "Current",
          icon: <Monitor size={14} />,
          desc: "We pivoted the system architecture to a native local model. EchoX Desktop runs yt-dlp locally as a subprocess, utilizing the client's residential IP network to avoid server-side 403 Forbidden blocks. This reduces backend download and processing costs, shifting transcription and voice generation workloads directly onto local client resources.",
          diagram: "EchoX Desktop App (Tauri / Rust)\n   ↓ [Natively Spawns]\nyt-dlp (Residential IP) → local FFmpeg → local Whisper & Gemini (Translation) → local Piper TTS\n   ↓ [Minimal Infrastructure Dependency]\nDirect Output Video File",
          details: [
            "Avoids server-side datacenter blocks by routing downloads through the local residential connection.",
            "Tauri wraps native yt-dlp binary calls safely with automatic updating layers.",
            "Maintains minimal infrastructure dependencies, utilizing the cloud primarily for translation APIs."
          ]
        },
        {
          date: "Phase 8",
          title: "Current Web Strategy",
          status: "Current",
          icon: <Monitor size={14} />,
          desc: "Rather than running yt-dlp server-side or deploying extensions, the EchoX Web application delegates media extraction to a dedicated third-party media extraction service. This preserves the zero-install web trial experience while recommending the native Desktop application for advanced pipelines.",
          details: [
            "Delegates media extraction to a dedicated third-party media extraction service.",
            "Keeps web trials lightweight and free from browser extension installation requirements."
          ]
        }
      ]
    }
  },
  {
    id: "faq",
    label: "FAQ",
    icon: Terminal,
    content: {
      heading: "Frequently asked questions",
      body: null,
      faqs: [
        {
          q: "Is an internet connection required?",
          a: "An internet connection is needed for initial AI model downloads and YouTube video processing. Translation and voice generation run entirely on your local machine.",
        },
        {
          q: "What file formats are supported?",
          a: "EchoX supports MP4, MOV, AVI, MKV for video input. Output is delivered as MP4 with the dubbed audio track and embedded subtitles.",
        },
        {
          q: "How long does translation take?",
          a: "Processing time depends on video length and your hardware. A 10-minute video typically completes in 3–8 minutes. Shorter clips process in under a minute.",
        },
        {
          q: "Can I use EchoX commercially?",
          a: "Yes. EchoX is free and open source under the MIT license. You can use it for personal, educational, and commercial projects.",
        },
        {
          q: "How do I update EchoX?",
          a: "EchoX checks for updates automatically on launch. You can also download the latest version from the GitHub releases page.",
        },
      ],
    },
  },
];

/* ═══════════════════════════════════════════════════════════════════════════
 *  DocsPage — Linear-inspired documentation
 * ═══════════════════════════════════════════════════════════════════════════ */
export default function DocsPage() {
  const { isDark } = useTheme();
  const [activeSection, setActiveSection] = useState("getting-started");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);

  const activeIndex = DOC_SECTIONS.findIndex((s) => s.id === activeSection);
  const active = DOC_SECTIONS[activeIndex] ?? DOC_SECTIONS[0];

  const goTo = (index) => {
    const wrapped = (index + DOC_SECTIONS.length) % DOC_SECTIONS.length;
    setActiveSection(DOC_SECTIONS[wrapped].id);
  };
  const goPrev = () => goTo(activeIndex - 1);
  const goNext = () => goTo(activeIndex + 1);

  /* ── Swipe handling (mobile) ─────────────────────────────────── */
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };
  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    // Ignore mostly-vertical scrolls
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0) goNext();
      else goPrev();
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  /* Scroll active section into view on mobile when navigating */
  useEffect(() => {
    const el = document.getElementById(`doc-${activeSection}`);
    if (el && window.innerWidth < 768) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [activeSection]);

  /* Lock body scroll while the fullscreen jump menu is open */
  useEffect(() => {
    if (mobileMenuOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [mobileMenuOpen]);

  const fontStack =
    "'Inter Variable', ui-sans-serif, system-ui, -apple-system, sans-serif";

  return (
    <main
      className="transition-colors duration-300"
      style={{
        background: isDark ? "#08090a" : "#ffffff",
        color: isDark ? "#f7f8f8" : "#08090a",
      }}
    >
      {/* ─── HERO ──────────────────────────────────────────────────── */}
      <section className="relative pt-36 pb-16 md:pt-40 md:pb-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <p
              className="text-[11px] uppercase tracking-[0.18em] mb-4"
              style={{
                color: isDark ? "#62666d" : "#8a8f98",
                fontFamily: fontStack,
              }}
            >
              Documentation
            </p>

            <h1
              className="text-[40px] md:text-[56px] leading-[1.05] font-light tracking-[-0.03em] max-w-3xl"
              style={{
                color: isDark ? "#f7f8f8" : "#08090a",
                fontFamily: fontStack,
              }}
            >
              Everything you need to
              <br />
              get started with EchoX.
            </h1>

            <p
              className="mt-5 max-w-xl text-[17px] leading-relaxed"
              style={{
                color: isDark ? "#8a8f98" : "#62666d",
                fontFamily: fontStack,
              }}
            >
              Installation guides, feature documentation, and answers to common
              questions.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ─── CONTENT ────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 pb-16">
        <div className="flex flex-col md:flex-row gap-12 md:gap-16 relative">
          {/* ── Sidebar (Desktop — untouched) ────────────────────── */}
          <aside
            className="hidden md:block w-56 shrink-0 sticky top-28 self-start relative z-10"
            style={{ maxHeight: "calc(100vh - 8rem)" }}
          >
            <nav className="flex flex-col gap-1">
              {DOC_SECTIONS.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className="flex items-center gap-2.5 w-full text-left px-3 py-2 rounded-md transition-all duration-150 text-[13px]"
                    style={{
                      background: isActive
                        ? isDark
                          ? "rgba(255,255,255,0.06)"
                          : "rgba(0,0,0,0.04)"
                        : "transparent",
                      color: isActive
                        ? isDark
                          ? "#f7f8f8"
                          : "#08090a"
                        : isDark
                          ? "#8a8f98"
                          : "#62666d",
                      fontFamily: fontStack,
                      fontWeight: isActive ? 510 : 400,
                    }}
                  >
                    <Icon size={14} style={{ opacity: isActive ? 1 : 0.5 }} />
                    {section.label}
                  </button>
                );
              })}
            </nav>

            {/* Sidebar bottom: download */}
            <div
              className="mt-8 pt-6"
              style={{
                borderTop: `1px solid ${isDark ? "#23252a" : "#e5e5e6"}`,
              }}
            >
              <a
                href={DOWNLOAD_URL}
                className="flex items-center gap-2 text-[13px] no-underline transition-colors duration-150"
                style={{
                  color: isDark ? "#d0d6e0" : "#323334",
                  fontFamily: fontStack,
                }}
              >
                <Download size={14} />
                Download EchoX
                <ExternalLink size={10} style={{ opacity: 0.5 }} />
              </a>
            </div>
          </aside>

          {/* ── MAIN CONTENT ─────────────────────────────────────────── */}
          <div
            className="flex-1 min-w-0 mt-0 md:mt-0 pb-28 md:pb-0"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <AnimatePresence mode="wait">
              {DOC_SECTIONS.filter((s) => s.id === activeSection).map((section) => {
                const c = section.content;
                return (
                  <motion.div
                    key={section.id}
                    id={`doc-${section.id}`}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {/* Section heading */}
                    <div
                      style={{
                        color: isDark ? "#f7f8f8" : "#08090a",
                        fontFamily: fontStack,
                      }}
                    >
                      <ScrollReveal
                        key={c.heading}
                        containerClassName="!my-0 mb-6 text-[32px] md:text-[40px] font-light"
                        textClassName="!text-inherit !font-inherit !leading-[1.1] !tracking-[-0.025em] !m-0"
                        baseRotation={1}
                      >
                        {c.heading}
                      </ScrollReveal>
                    </div>

                    {c.body && (
                      <p
                        className="text-[16px] leading-relaxed mb-12 max-w-2xl"
                        style={{
                          color: isDark ? "#8a8f98" : "#62666d",
                          fontFamily: fontStack,
                        }}
                      >
                        {c.body}
                      </p>
                    )}

                    {/* Subsections */}
                    {c.subsections?.map((sub, i) => (
                      <motion.div
                        key={i}
                        className="mb-10 last:mb-0"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.1 }}
                        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                      >
                        <h3
                          className="text-[20px] font-normal tracking-[-0.01em] mb-2"
                          style={{
                            color: isDark ? "#f7f8f8" : "#08090a",
                            fontFamily: fontStack,
                          }}
                        >
                          {sub.title}
                        </h3>

                        {sub.text && (
                          <p
                            className="text-[15px] leading-relaxed max-w-2xl"
                            style={{
                              color: isDark ? "#d0d6e0" : "#323334",
                              fontFamily: fontStack,
                            }}
                          >
                            {sub.text}
                          </p>
                        )}

                        {sub.items && (
                          <ul
                            className="mt-2 space-y-1.5 max-w-xl"
                            style={{ color: isDark ? "#d0d6e0" : "#323334" }}
                          >
                            {sub.items.map((item, j) => (
                              <li
                                key={j}
                                className="text-[15px] leading-relaxed pl-5 relative"
                                style={{ fontFamily: fontStack }}
                              >
                                <span
                                  className="absolute left-0 top-[0.6em] w-1.5 h-1.5 rounded-full"
                                  style={{
                                    background: isDark ? "#62666d" : "#8a8f98",
                                  }}
                                />
                                {item}
                              </li>
                            ))}
                          </ul>
                        )}
                      </motion.div>
                    ))}

                    {/* Timeline (Engineering Journey) */}
                    {c.timeline && (
                      <div className="relative border-l border-neutral-200 dark:border-neutral-800 ml-4 pl-8 space-y-12 py-2">
                        {c.timeline.map((phase, idx) => (
                          <div key={idx} className="relative">
                            <div className="absolute -left-[48px] top-1.5 w-8 h-8 rounded-full bg-white dark:bg-[#0c0d0e] border border-neutral-200 dark:border-neutral-800 flex items-center justify-center text-neutral-500 dark:text-neutral-400 z-10 shadow-sm">
                              {phase.icon}
                            </div>

                            <div className="flex flex-wrap items-center gap-3 mb-2">
                              <span className="text-[12px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                                {phase.date}
                              </span>
                              <span
                                className={`text-[10px] px-2.5 py-0.5 rounded-full border font-medium ${
                                  phase.status === "Completed"
                                    ? "bg-green-50/50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-900/60"
                                    : phase.status === "Abandoned"
                                    ? "bg-red-50/50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-900/60"
                                    : "bg-orange-50/50 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-900/60"
                                }`}
                              >
                                {phase.status}
                              </span>
                            </div>

                            <h3 className="text-xl font-medium tracking-tight mb-2 text-neutral-900 dark:text-neutral-100">
                              {phase.title}
                            </h3>

                            <p className="text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-400 max-w-2xl">
                              {phase.desc}
                            </p>

                            {phase.details && phase.details.length > 0 && (
                              <ul className="mt-3 space-y-1.5 pl-4 list-disc text-[14px] text-neutral-500 dark:text-neutral-400 max-w-2xl">
                                {phase.details.map((detail, dIdx) => (
                                  <li key={dIdx}>{detail}</li>
                                ))}
                              </ul>
                            )}

                            {phase.diagram && (
                              <div className="mt-4 p-4 rounded-lg bg-neutral-50 dark:bg-neutral-900/30 border border-neutral-200/60 dark:border-neutral-800/80 font-mono text-[12px] overflow-x-auto text-neutral-700 dark:text-neutral-300 leading-relaxed whitespace-pre">
                                {phase.diagram}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* FAQs */}
                    {c.faqs && (
                      <div className="space-y-8">
                        {c.faqs.map((faq, i) => (
                          <div key={i}>
                            <h3
                              className="text-[17px] font-[510] mb-2"
                              style={{
                                color: isDark ? "#f7f8f8" : "#08090a",
                                fontFamily: fontStack,
                              }}
                            >
                              {faq.q}
                            </h3>
                            <p
                              className="text-[15px] leading-relaxed max-w-2xl"
                              style={{
                                color: isDark ? "#d0d6e0" : "#323334",
                                fontFamily: fontStack,
                              }}
                            >
                              {faq.a}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
       *  MOBILE STICKY BOTTOM COMMAND BAR (thumb zone, 44px+ targets)
       * ═══════════════════════════════════════════════════════════════ */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 pointer-events-auto px-3 pb-[max(env(safe-area-inset-bottom),12px)] pt-2"
        style={{
          background: isDark
            ? "linear-gradient(180deg, rgba(8,9,10,0) 0%, #08090a 40%)"
            : "linear-gradient(180deg, rgba(255,255,255,0) 0%, #ffffff 40%)",
        }}
      >
        <div
          className="flex items-center gap-2 rounded-2xl px-2 py-2 backdrop-blur-xl border shadow-lg"
          style={{
            background: isDark
              ? "rgba(20,21,23,0.85)"
              : "rgba(255,255,255,0.9)",
            borderColor: isDark ? "#23252a" : "#e5e5e6",
          }}
        >
          <button
            type="button"
            onClick={goPrev}
            aria-label="Previous section"
            className="flex items-center justify-center rounded-xl active:scale-95 transition-transform"
            style={{
              width: 44,
              height: 44,
              color: isDark ? "#d0d6e0" : "#323334",
            }}
          >
            <ChevronLeft size={20} />
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl active:scale-[0.98] transition-transform"
            style={{
              height: 44,
              background: isDark
                ? "rgba(255,255,255,0.06)"
                : "rgba(0,0,0,0.04)",
              fontFamily: fontStack,
            }}
          >
            <active.icon
              size={15}
              style={{ color: isDark ? "#f7f8f8" : "#08090a" }}
            />
            <span
              className="text-[13.5px] font-medium truncate max-w-[140px]"
              style={{ color: isDark ? "#f7f8f8" : "#08090a" }}
            >
              {active.label}
            </span>
            <span
              className="text-[11px] tabular-nums"
              style={{ color: isDark ? "#62666d" : "#8a8f98" }}
            >
              {activeIndex + 1}/{DOC_SECTIONS.length}
            </span>
          </button>

          <button
            type="button"
            onClick={goNext}
            aria-label="Next section"
            className="flex items-center justify-center rounded-xl active:scale-95 transition-transform"
            style={{
              width: 44,
              height: 44,
              color: isDark ? "#d0d6e0" : "#323334",
            }}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
       *  MOBILE FULLSCREEN JUMP MENU
       * ═══════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
            />
            {/* Bottom Sheet */}
            <motion.div
              className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-[28px] border-t shadow-2xl overflow-hidden h-[500px]"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              style={{
                background: isDark ? "#08090a" : "#ffffff",
                borderColor: isDark ? "#23252a" : "#e5e5e6",
              }}
            >
            {/* Header */}
             <div
              className="flex items-center justify-between px-5 pt-5 pb-4 border-b"
              style={{ borderColor: isDark ? "#23252a" : "#e5e5e6" }}
            >
              <div className="flex items-center gap-2">
                <LayoutGrid
                  size={16}
                  style={{ color: isDark ? "#8a8f98" : "#62666d" }}
                />
                <span
                  className="text-[15px] font-medium"
                  style={{
                    color: isDark ? "#f7f8f8" : "#08090a",
                    fontFamily: fontStack,
                  }}
                >
                  Jump to section
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close menu"
                className="flex items-center justify-center rounded-full active:scale-95 transition-transform"
                style={{
                  width: 44,
                  height: 44,
                  color: isDark ? "#d0d6e0" : "#323334",
                  background: isDark
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(0,0,0,0.04)",
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Section list */}
            <div className="flex-1 overflow-y-auto px-3 py-3">
              {DOC_SECTIONS.map((section, i) => {
                const Icon = section.icon;
                const isActive = section.id === activeSection;
                return (
                  <motion.button
                    key={section.id}
                    type="button"
                    onClick={() => {
                      setActiveSection(section.id);
                      setMobileMenuOpen(false);
                    }}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: i * 0.03 }}
                    className="w-full flex items-center gap-3.5 px-3.5 rounded-xl mb-1.5 text-left active:scale-[0.98] transition-transform"
                    style={{
                      minHeight: 56,
                      background: isActive
                        ? isDark
                          ? "rgba(255,255,255,0.08)"
                          : "rgba(0,0,0,0.05)"
                        : "transparent",
                    }}
                  >
                    <div
                      className="flex items-center justify-center rounded-lg shrink-0"
                      style={{
                        width: 36,
                        height: 36,
                        background: isActive
                          ? isDark
                            ? "#ffffff"
                            : "#08090a"
                          : isDark
                            ? "rgba(255,255,255,0.06)"
                            : "rgba(0,0,0,0.04)",
                        color: isActive
                          ? isDark
                            ? "#08090a"
                            : "#ffffff"
                          : isDark
                            ? "#8a8f98"
                            : "#62666d",
                      }}
                    >
                      <Icon size={16} />
                    </div>
                    <span
                      className="text-[15px]"
                      style={{
                        color: isDark ? "#f7f8f8" : "#08090a",
                        fontFamily: fontStack,
                        fontWeight: isActive ? 560 : 420,
                      }}
                    >
                      {section.label}
                    </span>
                    {isActive && (
                      <span
                        className="ml-auto w-2 h-2 rounded-full shrink-0"
                        style={{ background: isDark ? "#f7f8f8" : "#08090a" }}
                      />
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* Download in menu footer */}
            <div
              className="px-5 py-4 border-t pb-[max(env(safe-area-inset-bottom),16px)]"
              style={{ borderColor: isDark ? "#23252a" : "#e5e5e6" }}
            >
              <a
                href={DOWNLOAD_URL}
                className="flex items-center justify-center gap-2 rounded-xl text-[14px] font-medium no-underline"
                style={{
                  height: 48,
                  background: isDark ? "#ffffff" : "#08090a",
                  color: isDark ? "#08090a" : "#ffffff",
                  fontFamily: fontStack,
                }}
              >
                <Download size={15} />
                Download EchoX
                <ExternalLink size={11} style={{ opacity: 0.6 }} />
              </a>
            </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </main>
  );
}