import { useEffect, useRef, useState } from "react";
import { useTheme } from "../context/ThemeContext";
import api from "../services/api";

const ACCENT = "#FF8C00"; // Rich orange accent
const ACCENT_SOFT = "rgba(255, 140, 0, 0.75)";

const STATUS_COLOR = {
  completed: {
    text: "text-zinc-800 dark:text-zinc-100 font-semibold drop-shadow-[0_0_6px_rgba(255,140,0,0.15)]",
    dot: "bg-[#FF8C00]",
    glow: "rgba(255,140,0,0.4)",
    hex: "#FF8C00",
    barBg: "linear-gradient(90deg, #fec195, #FF8C00)",
  },
  failed: {
    text: "text-rose-600 dark:text-rose-400",
    dot: "bg-rose-600 dark:bg-rose-400",
    glow: "rgba(251,113,133,0.45)",
    hex: "#fb7185",
    barBg: "linear-gradient(90deg, #f43f5e, #fb7185)",
  },
  transcribing: {
    text: "text-amber-600 dark:text-amber-200/90",
    dot: "bg-amber-500 dark:bg-amber-400/80",
    glow: "rgba(252,211,77,0.25)",
    hex: "#fde68a",
    barBg: `linear-gradient(90deg, rgba(255,140,0,0.4), var(--accent-soft))`,
  },
  translating: {
    text: "text-orange-600 dark:text-orange-200/90",
    dot: "bg-orange-500 dark:bg-orange-400/80",
    glow: "rgba(251,146,60,0.25)",
    hex: "#fed7aa",
    barBg: `linear-gradient(90deg, rgba(255,140,0,0.4), var(--accent-soft))`,
  },
  generating_tts: {
    text: "text-orange-700 dark:text-orange-100",
    dot: "bg-orange-400 dark:bg-orange-300",
    glow: "rgba(253,186,116,0.3)",
    hex: "#ffedd5",
    barBg: `linear-gradient(90deg, rgba(255,140,0,0.5), var(--accent-soft))`,
  },
  default: {
    text: "text-slate-600 dark:text-slate-400",
    dot: "bg-slate-500",
    glow: "rgba(255,255,255,0.05)",
    hex: "#94a3b8",
    barBg: "linear-gradient(90deg, #475569, #64748b)",
  },
};

function getStatusTheme(status, error) {
  if (error) return STATUS_COLOR.failed;
  return STATUS_COLOR[status] || STATUS_COLOR.default;
}

// The real Claude Code indicator (confirmed by inspecting an actual
// frame-by-frame capture) is NOT a continuous geometric morph — it is a
// fast discrete cycle through six fixed marks, each held for a few
// frames before cutting to the next:
const THINKING_GLYPHS = ["·", "✢", "✳", "✶", "✻", "✽"];
const GLYPH_HOLD_MS = 220; // how long each mark is shown before advancing

const THINKING_WORDS = [
  "Thinking",
  "Transcribing",
  "Translating",
  "Synthesizing",
  "Polishing",
  "Wrangling",
  "Cooking",
  "Finagling",
];

const STEPS = [
  { label: "Extract", target: 20 },
  { label: "Transcribe", target: 35 },
  { label: "Translate", target: 55 },
  { label: "Voice", target: 75 },
  { label: "Complete", target: 100 },
];

export default function ProgressTracker({
  jobId,
  progress,
  setProgress,
  setStatus,
  setVideoUrl,
  status,
}) {
  const { isDark } = useTheme();
  const [message, setMessage] = useState(() => {
    if (status === "completed") return "Translation completed successfully!";
    if (status === "failed") return "Translation failed.";
    return "Waiting...";
  });
  const [error, setError] = useState(null);
  const [mounted, setMounted] = useState(false);
  const prevProgress = useRef(progress);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (!jobId || status === "completed" || status === "failed") return;

    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/progress/${jobId}`);
        const job = res.data;

        console.log("JOB UPDATE:", job);

        prevProgress.current = progress;
        setProgress(job.progress || 0);
        setStatus(job.status);
        setMessage(job.message || "");
        setError(job.error || null);

        if (job.status === "completed") {
          console.log("JOB COMPLETED");
          const streamRes = await api.get(`/job/${jobId}/streams`);
          setVideoUrl(streamRes.data.video_url);
          clearInterval(interval);
        }

        if (job.status === "failed") {
          console.error("JOB FAILED:", job.error);
          clearInterval(interval);
        }
      } catch (err) {
        console.error("TRACKER ERROR:", err);
        setError("Backend connection failed");
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [jobId, status]);

  const isActive = status !== "completed" && status !== "failed";
  const theme = getStatusTheme(status, error);

  const [wordIndex, setWordIndex] = useState(0);
  useEffect(() => {
    if (!isActive) return;
    const id = setInterval(() => {
      setWordIndex((i) => (i + 1) % THINKING_WORDS.length);
    }, 3000);
    return () => clearInterval(id);
  }, [isActive]);

  return (
    <div className="w-full py-8">
      <style>{`
        :root {
          --accent: ${ACCENT};
          --accent-soft: ${ACCENT_SOFT};
        }

        /* ---------- Entrance cascade ---------- */
        @keyframes fadeRise {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .cascade-item {
          opacity: 0;
          animation: fadeRise 0.85s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          animation-play-state: paused;
        }
        .cascade-in .cascade-item { animation-play-state: running; }
        .cascade-item:nth-of-type(1) { animation-delay: 0ms; }
        .cascade-item:nth-of-type(2) { animation-delay: 150ms; }
        .cascade-item:nth-of-type(3) { animation-delay: 300ms; }
        .cascade-item:nth-of-type(4) { animation-delay: 450ms; }

        /* ---------- Thinking glyph bloom (fast pop on each cut) ---------- */
        @keyframes glyphBloom {
          0%   { opacity: 0;   transform: scale(0.55); }
          55%  { opacity: 1;   transform: scale(1.12); }
          100% { opacity: 1;   transform: scale(1); }
        }
        .thinking-glyph-bloom {
          display: inline-block;
          animation: glyphBloom 160ms cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        /* ---------- Shimmer for active connector segments ---------- */
        @keyframes glowTrack {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .connector-active {
          background-size: 200% 200%;
          animation: glowTrack 4.0s linear infinite;
        }

        /* ---------- Card-style hover lift ---------- */
        .lift-on-hover {
          transition: transform 300ms cubic-bezier(0.16, 1, 0.3, 1),
                      box-shadow 300ms cubic-bezier(0.16, 1, 0.3, 1);
        }
        .lift-on-hover:hover {
          transform: translateY(-2px) scale(1.01);
        }

        @media (prefers-reduced-motion: reduce) {
          .cascade-item {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
          .thinking-glyph-bloom,
          .connector-active {
            animation: none !important;
          }
          .lift-on-hover:hover {
            transform: none !important;
          }
        }
      `}</style>

      <div className={`${mounted ? "cascade-in" : ""}`}>
        {/* STATUS HEADER */}
        <div className="cascade-item flex items-center gap-4">
          <ThinkingIndicator active={isActive} status={status} error={error} />

          <p className={`text-base sm:text-lg font-medium tracking-wide transition-all duration-500 ${theme.text}`}>
            {isActive ? (
              <>
                {THINKING_WORDS[wordIndex]}
                {message ? (
                  <span className="text-black/40 dark:text-white/35 font-normal"> — {message}</span>
                ) : (
                  <span className="text-black/40 dark:text-white/35 font-normal">…</span>
                )}
              </>
            ) : (
              message || status
            )}
          </p>
        </div>

        {/* PROGRESS BAR */}
        <div className="cascade-item mt-8">
          <div className="flex justify-between items-center mb-3">
            <span className="text-black/55 dark:text-white/55 text-sm font-medium">
              Translation Progress
            </span>
            <span className="text-black dark:text-white font-semibold tracking-wider tabular-nums">
              {progress}%
            </span>
          </div>

          <div
            className="relative h-[3px] w-full bg-black/5 dark:bg-white/5 overflow-hidden rounded-full"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="absolute left-0 top-0 h-full rounded-full transition-all duration-1000 ease-out"
              style={{
                width: `${progress}%`,
                background: theme.barBg,
                boxShadow: `0 0 12px ${theme.glow}`,
              }}
            />
          </div>
        </div>

        {/* PIPELINE STEPS */}
        <div className="cascade-item mt-10 flex items-center justify-between w-full gap-0.5 sm:gap-2 py-4">
          {STEPS.map((step, idx) => {
            const isStepActive = progress >= step.target;
            const isNextStepActive = idx < STEPS.length - 1 && progress >= STEPS[idx + 1].target;

            return (
              <div
                key={step.label}
                className={`flex items-center ${
                  idx < STEPS.length - 1 ? "flex-1" : "shrink-0"
                } gap-0.5 sm:gap-3`}
              >
                <span
                  tabIndex={0}
                  className={`lift-on-hover rounded-md px-0.5 text-[10px] sm:text-xs md:text-sm font-semibold tracking-tight sm:tracking-wider shrink-0 outline-none
                    focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black
                    transition-colors duration-300 ${
                      isStepActive
                        ? "text-black dark:text-white dark:drop-shadow-[0_0_6px_rgba(255,255,255,0.2)]"
                        : "text-black/25 dark:text-white/25"
                    }`}
                  style={isStepActive ? { "--tw-ring-color": ACCENT } : undefined}
                >
                  {step.label}
                </span>

                {idx < STEPS.length - 1 && (
                  <div className="flex flex-1 items-center min-w-[8px] sm:min-w-[12px] md:min-w-[24px] pr-0.5">
                    <div
                      className={`h-[1.5px] sm:h-[2px] flex-1 rounded-full transition-all duration-500 ${
                        isNextStepActive ? "connector-active" : "bg-black/5 dark:bg-white/5"
                      }`}
                      style={
                        isNextStepActive
                          ? {
                              backgroundImage: `linear-gradient(90deg, var(--accent-soft), rgba(255,219,190,0.85), var(--accent-soft))`,
                              boxShadow: `0 0 8px ${ACCENT_SOFT}`,
                            }
                          : undefined
                      }
                    />
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-2.5 h-2.5 sm:w-3 sm:h-3 -ml-0.5 transition-all duration-500 shrink-0"
                      style={{
                        color: isNextStepActive ? ACCENT : (isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"),
                        filter: isNextStepActive ? `drop-shadow(0 0 5px ${ACCENT_SOFT})` : "none",
                      }}
                    >
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ERROR DISPLAY */}
        {error && (
          <div
            className="cascade-item mt-8 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm tracking-wide lift-on-hover"
            role="alert"
          >
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Signature element: the actual Claude Code "thinking" mark. Verified
 * against a real frame-by-frame capture of the CLI animation — it is a
 * fast discrete cycle through six fixed glyphs (· ✢ ✳ ✶ ✻ ✽), each held
 * for a few frames, then cut to the next. There is no in-between blended
 * shape in the source material; the "smooth" feel comes entirely from
 * speed (~220ms per glyph) plus a quick scale/opacity bloom on every cut,
 * not from geometric interpolation between shapes.
 */
function ThinkingIndicator({ active, status, error }) {
  const theme = getStatusTheme(status, error);
  const [glyphIndex, setGlyphIndex] = useState(0);

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      setGlyphIndex((i) => (i + 1) % THINKING_GLYPHS.length);
    }, GLYPH_HOLD_MS);
    return () => clearInterval(id);
  }, [active]);

  if (!active) {
    return (
      <div className="relative w-5 h-5 flex items-center justify-center select-none" aria-hidden="true">
        <div
          className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ${theme.dot}`}
          style={{ boxShadow: `0 0 12px ${theme.glow}` }}
        />
      </div>
    );
  }

  return (
    <div className="relative w-5 h-5 flex items-center justify-center select-none" aria-hidden="true">
      <span
        key={glyphIndex}
        className="thinking-glyph-bloom text-xl leading-none font-normal"
        style={{ color: theme.hex, textShadow: `0 0 8px ${theme.glow}` }}
      >
        {THINKING_GLYPHS[glyphIndex]}
      </span>
    </div>
  );
}