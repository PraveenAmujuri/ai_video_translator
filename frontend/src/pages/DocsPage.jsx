import { useState, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";
import { motion } from "framer-motion";
import ScrollReveal from "../components/ui/ScrollReveal";
import {
  ChevronRight,
  ExternalLink,
  Terminal,
  Download,
  Subtitles,
  Mic,
  Monitor,
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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const active = DOC_SECTIONS.find((s) => s.id === activeSection) ?? DOC_SECTIONS[0];

  /* Scroll active section into view on mobile when navigating */
  useEffect(() => {
    const el = document.getElementById(`doc-${activeSection}`);
    if (el && window.innerWidth < 768) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [activeSection]);

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
                fontFamily:
                  "'Inter Variable', ui-sans-serif, system-ui, -apple-system, sans-serif",
              }}
            >
              Documentation
            </p>

            <h1
              className="text-[40px] md:text-[56px] leading-[1.05] font-light tracking-[-0.03em] max-w-3xl"
              style={{
                color: isDark ? "#f7f8f8" : "#08090a",
                fontFamily:
                  "'Inter Variable', ui-sans-serif, system-ui, -apple-system, sans-serif",
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
                fontFamily:
                  "'Inter Variable', ui-sans-serif, system-ui, -apple-system, sans-serif",
              }}
            >
              Installation guides, feature documentation, and answers to common
              questions.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ─── CONTENT ────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 pb-32">
        <div className="flex gap-12 md:gap-16 relative">
          {/* ── Sidebar ───────────────────────────────────────────── */}
          <aside
            className="hidden md:block w-56 shrink-0 sticky top-28 self-start"
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
                      fontFamily:
                        "'Inter Variable', ui-sans-serif, system-ui, -apple-system, sans-serif",
                      fontWeight: isActive ? 510 : 400,
                    }}
                  >
                    <Icon
                      size={14}
                      style={{
                        opacity: isActive ? 1 : 0.5,
                      }}
                    />
                    {section.label}
                  </button>
                );
              })}
            </nav>

            {/* Sidebar bottom: download */}
            <div
              className="mt-8 pt-6"
              style={{
                borderTop: `1px solid ${
                  isDark ? "#23252a" : "#e5e5e6"
                }`,
              }}
            >
              <a
                href={DOWNLOAD_URL}
                className="flex items-center gap-2 text-[13px] no-underline transition-colors duration-150"
                style={{
                  color: isDark ? "#d0d6e0" : "#323334",
                  fontFamily:
                    "'Inter Variable', ui-sans-serif, system-ui, -apple-system, sans-serif",
                }}
              >
                <Download size={14} />
                Download EchoX
                <ExternalLink size={10} style={{ opacity: 0.5 }} />
              </a>
            </div>
          </aside>

          {/* ── Mobile nav toggle ─────────────────────────────────── */}
          <button
            onClick={() => setMobileNavOpen((p) => !p)}
            className="md:hidden flex items-center gap-2 text-[13px] px-3 py-2 rounded-md w-full transition-colors"
            style={{
              background: isDark
                ? "rgba(255,255,255,0.04)"
                : "rgba(0,0,0,0.03)",
              color: isDark ? "#d0d6e0" : "#323334",
              fontFamily:
                "'Inter Variable', ui-sans-serif, system-ui, -apple-system, sans-serif",
            }}
          >
            <span className="flex-1 text-left">{active.label}</span>
            <ChevronRight
              size={14}
              style={{
                transform: mobileNavOpen ? "rotate(90deg)" : "rotate(0deg)",
                transition: "transform 0.2s ease",
              }}
            />
          </button>

          {/* ── Mobile nav dropdown ───────────────────────────────── */}
          {mobileNavOpen && (
            <div className="md:hidden absolute top-12 left-6 right-6 z-20 rounded-xl p-2 shadow-xl border"
              style={{
                background: isDark ? "#0f1011" : "#ffffff",
                borderColor: isDark ? "#23252a" : "#e5e5e6",
              }}
            >
              {DOC_SECTIONS.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                return (
                  <button
                    key={section.id}
                    onClick={() => {
                      setActiveSection(section.id);
                      setMobileNavOpen(false);
                    }}
                    className="flex items-center gap-2.5 w-full text-left px-3 py-2.5 rounded-lg text-[13px] transition-colors"
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
                      fontFamily:
                        "'Inter Variable', ui-sans-serif, system-ui, -apple-system, sans-serif",
                    }}
                  >
                    <Icon size={14} />
                    {section.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* ── MAIN CONTENT ─────────────────────────────────────────── */}
          <div className="flex-1 min-w-0 mt-0 md:mt-0">
            {DOC_SECTIONS.map((section) => {
              if (section.id !== activeSection) return null;
              const c = section.content;

              return (
                <motion.div
                  key={section.id}
                  id={`doc-${section.id}`}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                >
                  {/* Section heading */}
                  <div
                    style={{
                      color: isDark ? "#f7f8f8" : "#08090a",
                      fontFamily:
                        "'Inter Variable', ui-sans-serif, system-ui, -apple-system, sans-serif",
                    }}
                  >
                    <ScrollReveal
                      key={c.heading}
                      containerClassName="!my-0 mb-4 text-[32px] md:text-[40px] font-light"
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
                        fontFamily:
                          "'Inter Variable', ui-sans-serif, system-ui, -apple-system, sans-serif",
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
                          fontFamily:
                            "'Inter Variable', ui-sans-serif, system-ui, -apple-system, sans-serif",
                        }}
                      >
                        {sub.title}
                      </h3>

                      {sub.text && (
                        <p
                          className="text-[15px] leading-relaxed max-w-2xl"
                          style={{
                            color: isDark ? "#d0d6e0" : "#323334",
                            fontFamily:
                              "'Inter Variable', ui-sans-serif, system-ui, -apple-system, sans-serif",
                          }}
                        >
                          {sub.text}
                        </p>
                      )}

                      {sub.items && (
                        <ul
                          className="mt-2 space-y-1.5 max-w-xl"
                          style={{
                            color: isDark ? "#d0d6e0" : "#323334",
                          }}
                        >
                          {sub.items.map((item, j) => (
                            <li
                              key={j}
                              className="text-[15px] leading-relaxed pl-5 relative"
                              style={{
                                fontFamily:
                                  "'Inter Variable', ui-sans-serif, system-ui, -apple-system, sans-serif",
                              }}
                            >
                              <span
                                className="absolute left-0 top-[0.6em] w-1.5 h-1.5 rounded-full"
                                style={{
                                  background: isDark
                                    ? "#62666d"
                                    : "#8a8f98",
                                }}
                              />
                              {item}
                            </li>
                          ))}
                        </ul>
                      )}
                    </motion.div>
                  ))}

                  {/* FAQs */}
                  {c.faqs && (
                    <div className="space-y-8">
                      {c.faqs.map((faq, i) => (
                        <div key={i}>
                          <h3
                            className="text-[17px] font-[510] mb-2"
                            style={{
                              color: isDark ? "#f7f8f8" : "#08090a",
                              fontFamily:
                                "'Inter Variable', ui-sans-serif, system-ui, -apple-system, sans-serif",
                            }}
                          >
                            {faq.q}
                          </h3>
                          <p
                            className="text-[15px] leading-relaxed max-w-2xl"
                            style={{
                              color: isDark ? "#d0d6e0" : "#323334",
                              fontFamily:
                                "'Inter Variable', ui-sans-serif, system-ui, -apple-system, sans-serif",
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
          </div>
        </div>
      </div>
    </main>
  );
}
