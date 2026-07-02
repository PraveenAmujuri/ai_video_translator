import { useState, useEffect, useRef } from "react";

const LANGUAGES = [
  { code: "en", label: "English", supported: true },
  { code: "hi", label: "Hindi", supported: true },
  { code: "te", label: "Telugu", supported: true },
  { code: "ta", label: "Tamil", supported: false },
  { code: "ja", label: "Japanese", supported: false },
];

export default function LanguageSelector({
  language,
  setLanguage,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  const activeLang = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];

  return (
    <div
      className="
      rounded-3xl
      p-6

      bg-white/60
      dark:bg-black/30

      border
      border-black/10
      dark:border-white/10

      backdrop-blur-xl

      transition-all
      duration-300

      hover:border-black/15
      dark:hover:border-white/15
    "
    >
      <h2
        className="
        text-xl
        font-semibold
        mb-4

        text-black
        dark:text-white
      "
      >
        Target Language
      </h2>

      <div className="relative" ref={containerRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="
            w-full
            h-14
            px-4

            rounded-xl

            bg-black/[0.03]
            dark:bg-white/[0.03]

            border
            border-black/10
            dark:border-white/10

            text-black
            dark:text-white

            backdrop-blur-xl

            outline-none

            transition-all
            duration-300

            hover:border-black/20
            dark:hover:border-white/20

            flex
            items-center
            justify-between
            cursor-pointer
            text-left
          "
        >
          <span>{activeLang.label}</span>
          <svg
            className={`w-4 h-4 transition-transform duration-200 opacity-60 ${
              isOpen ? "rotate-180" : ""
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <div
            className="
              absolute
              z-50
              left-0
              right-0
              mt-2
              rounded-xl
              border
              border-black/10
              dark:border-white/10
              bg-white/95
              dark:bg-neutral-900/95
              backdrop-blur-xl
              shadow-xl
              overflow-hidden
              py-1.5
              max-h-60
              overflow-y-auto
            "
          >
            {LANGUAGES.map((opt) => (
              <div
                key={opt.code}
                onClick={() => {
                  if (opt.supported) {
                    setLanguage(opt.code);
                    setIsOpen(false);
                  }
                }}
                className={`
                  flex
                  items-center
                  justify-between
                  px-4
                  py-2.5
                  text-sm
                  transition-all
                  duration-150
                  ${
                    opt.supported
                      ? "cursor-pointer hover:bg-black/[0.04] dark:hover:bg-white/[0.04] text-black dark:text-white"
                      : "opacity-40 cursor-default text-black/60 dark:text-white/40 pointer-events-none"
                  }
                `}
              >
                <span>{opt.label}</span>
                {!opt.supported && (
                  <span className="text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400">
                    Currently unavailable
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}