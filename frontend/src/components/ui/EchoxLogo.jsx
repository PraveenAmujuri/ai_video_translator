import { useId } from "react";

/**
 * EchoXLogo — animated brand mark for the navbar / hero.
 *
 * Concept: the speech-bubble outline and its internal waveform draw on
 * together like an equalizer settling into place (voice + AI signal),
 * then the "X" strokes draw in on top, overlapping the bubble's open
 * edge exactly as in the source mark, finishing with a brief soft glow
 * settle. Everything is driven by stroke-dasharray/dashoffset and a
 * scaleY rise — both GPU-cheap, no JS animation loop, no extra
 * dependency. Plays once on mount (CSS `forwards` animations), then
 * sits fully static. `prefers-reduced-motion` disables all motion and
 * renders the finished mark immediately.
 *
 * Geometry lives in a 40x40 viewBox so it maps 1:1 onto the navbar
 * target size; pass size={80} for the hero version, anything else as
 * needed — it's just a width/height prop, the artwork scales cleanly.
 */
export function EchoXLogo({ isDark, size = 40, className = "" }) {
  // useId guarantees unique animation-name scoping if multiple logo
  // instances ever render at once (e.g. navbar + hero simultaneously) —
  // otherwise two <style> blocks with identical @keyframes names would
  // still work in practice (keyframes are global), but unique class
  // names keep delays/instances from fighting if you later want to
  // restart one independently of the other.
  const uid = `ex${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

  const lineColor = isDark ? "rgba(255,255,255,0.92)" : "rgba(0,0,0,0.88)";
  const accent = "#FF8C00";

  return (
    <span
      className={`echox-logo-${uid} inline-block ${className}`}
      style={{ width: size, height: size, lineHeight: 0 }}
      role="img"
      aria-label="EchoX"
    >
      <style>{`
        .echox-logo-${uid} .echox-draw {
          stroke-dasharray: 46.993;
          stroke-dashoffset: 46.993;
          animation: echoxDraw-${uid} 0.65s cubic-bezier(0.65, 0, 0.35, 1) forwards;
        }
        .echox-logo-${uid} .echox-bar {
          transform-origin: center;
          transform: scaleY(0);
          animation: echoxBarRise-${uid} 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .echox-logo-${uid} .echox-bar:nth-of-type(1) { animation-delay: 0.55s; }
        .echox-logo-${uid} .echox-bar:nth-of-type(2) { animation-delay: 0.62s; }
        .echox-logo-${uid} .echox-bar:nth-of-type(3) { animation-delay: 0.69s; }
        .echox-logo-${uid} .echox-bar:nth-of-type(4) { animation-delay: 0.76s; }
        .echox-logo-${uid} .echox-bar:nth-of-type(5) { animation-delay: 0.83s; }

        .echox-logo-${uid} .echox-x {
          stroke-dasharray: 15.207;
          stroke-dashoffset: 15.207;
          animation-name: echoxDraw-${uid}, echoxSettle-${uid};
          animation-duration: 0.5s, 0.4s;
          animation-timing-function: cubic-bezier(0.65, 0, 0.35, 1), ease-out;
          animation-fill-mode: forwards, forwards;
        }
        .echox-logo-${uid} .echox-x:nth-of-type(1) { animation-delay: 0.5s, 0.9s; }
        .echox-logo-${uid} .echox-x:nth-of-type(2) { animation-delay: 0.58s, 1s; }

        @keyframes echoxDraw-${uid} {
          to { stroke-dashoffset: 0; }
        }
        @keyframes echoxBarRise-${uid} {
          to { transform: scaleY(1); }
        }
        @keyframes echoxSettle-${uid} {
          0% { filter: drop-shadow(0 0 0px rgba(255,140,0,0)); }
          50% { filter: drop-shadow(0 0 5px rgba(255,140,0,0.55)); }
          100% { filter: drop-shadow(0 0 0px rgba(255,140,0,0)); }
        }

        @media (prefers-reduced-motion: reduce) {
          .echox-logo-${uid} .echox-draw,
          .echox-logo-${uid} .echox-bar,
          .echox-logo-${uid} .echox-x {
            animation: none !important;
            stroke-dashoffset: 0 !important;
            transform: scaleY(1) !important;
          }
        }
      `}</style>

      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Speech bubble outline (chat + voice) */}
        <path
          className="echox-draw"
          d="M 23 8.5 C 17.5 6.5, 11 9.3, 9 15 C 7.3 20, 9.4 25, 13.9 27.6 L 12.8 31.6 L 17 28.7 C 19 29.2, 21 29, 22.8 28.3"
          stroke={lineColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Waveform bars: center-peak equalizer profile (voice / AI signal) */}
        <g stroke={lineColor} strokeWidth="1.5" strokeLinecap="round">
          <line className="echox-bar" x1="11.3" y1="17.8" x2="11.3" y2="20.4" />
          <line className="echox-bar" x1="13.9" y1="15.3" x2="13.9" y2="22.9" />
          <line className="echox-bar" x1="16.5" y1="13" x2="16.5" y2="25.2" />
          <line className="echox-bar" x1="19.1" y1="11.6" x2="19.1" y2="26.6" />
          <line className="echox-bar" x1="21.7" y1="13.8" x2="21.7" y2="24.4" />
        </g>

        {/* X mark (translation: source -> target crossing point) */}
        <g stroke={accent} strokeWidth="2.1" strokeLinecap="round">
          <path className="echox-x" d="M 24 15 L 34.5 26" />
          <path className="echox-x" d="M 34.5 15 L 24 26" />
        </g>
      </svg>
    </span>
  );
}

export default EchoXLogo;