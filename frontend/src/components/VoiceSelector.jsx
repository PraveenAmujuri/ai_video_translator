import { useState, useEffect, useRef } from "react";

const VOICES = {
  en: [
    { name: "en_US-lessac-medium", label: "Lessac", gender: "Male", region: "US" },
    { name: "en_US-amy-medium", label: "Amy", gender: "Female", region: "US" },
    { name: "en_US-ryan-medium", label: "Ryan", gender: "Male", region: "US" },
    { name: "en_GB-alan-medium", label: "Alan", gender: "Male", region: "UK" }
  ],
  hi: [
    { name: "hi_IN-rohan-medium", label: "Rohan", gender: "Male", region: "India" },
    { name: "hi_IN-priyamvada-medium", label: "Priyamvada", gender: "Female", region: "India" }
  ],
  te: [
    { name: "te_IN-maya-medium", label: "Maya", gender: "Female", region: "Telugu" },
    { name: "te_IN-padmavathi-medium", label: "Padmavathi", gender: "Female", region: "Telugu" }
  ],
  ml: [
    { name: "ml_IN-meera-medium", label: "Meera", gender: "Female", region: "Malayalam" }
  ],
  ur: [
    { name: "ur_PK-fasih-medium", label: "Fasih", gender: "Male", region: "Urdu" }
  ],
  es: [
    { name: "es_ES-davefx-medium", label: "Davefx", gender: "Male", region: "Spain" }
  ],
  fr: [
    { name: "fr_FR-siwis-medium", label: "Siwis", gender: "Female", region: "France" }
  ],
  de: [
    { name: "de_DE-thorsten-medium", label: "Thorsten", gender: "Male", region: "Germany" }
  ],
  it: [
    { name: "it_IT-paola-medium", label: "Paola", gender: "Female", region: "Italy" }
  ],
  pt: [
    { name: "pt_BR-jeff-medium", label: "Jeff", gender: "Male", region: "Brazil" }
  ],
  zh: [
    { name: "zh_CN-huayan-medium", label: "Huayan", gender: "Female", region: "China" }
  ],
  ru: [
    { name: "ru_RU-irina-medium", label: "Irina", gender: "Female", region: "Russia" }
  ],
  ar: [
    { name: "ar_JO-kareem-medium", label: "Kareem", gender: "Male", region: "Jordan" }
  ],
  tr: [
    { name: "tr_TR-dfki-medium", label: "Dfki", gender: "Male", region: "Turkey" }
  ],
  id: [
    { name: "id_ID-news_tts-medium", label: "News TTS", gender: "Male", region: "Indonesia" }
  ],
  vi: [
    { name: "vi_VN-vais1000-medium", label: "Vais1000", gender: "Male", region: "Vietnam" }
  ],
  nl: [
    { name: "nl_NL-alex-medium", label: "Alex", gender: "Male", region: "Netherlands" }
  ],
  pl: [
    { name: "pl_PL-gosia-medium", label: "Gosia", gender: "Female", region: "Poland" }
  ]
};

export default function VoiceSelector({
  voice,
  setVoice,
  targetLanguage,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const currentVoices = VOICES[targetLanguage] || VOICES.en;

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

  useEffect(() => {
    if (
      currentVoices.length > 0 &&
      !currentVoices.find(
        (v) => v.name === voice
      )
    ) {
      setVoice(currentVoices[0].name);
    }
  }, [targetLanguage]);

  const activeVoice = currentVoices.find((v) => v.name === voice) || currentVoices[0] || { label: "Unknown", gender: "Unknown", region: "Unknown" };

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
        Voice
      </h2>

      <div className="relative" ref={containerRef}>
        <div
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
            flex
            items-center
            justify-between
            transition-all
            duration-300
            hover:border-black/20
            dark:hover:border-white/20
            cursor-pointer
          "
        >
          <div className="flex items-center flex-1 min-w-0 mr-2">
            <div className="flex-1 truncate text-left">
              {activeVoice.label} <span className="opacity-40 mx-1.5">•</span> {activeVoice.gender} <span className="opacity-40 mx-1.5">•</span> <span className="text-xs px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 text-black/70 dark:text-white/70">{activeVoice.region}</span>
            </div>
          </div>
          <svg
            className={`w-4 h-4 transition-transform duration-200 opacity-60 shrink-0 ${
              isOpen ? "rotate-180" : ""
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>

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
              custom-scrollbar
            "
          >
            {currentVoices.map((v) => (
              <div
                key={v.name}
                onClick={() => {
                  setVoice(v.name);
                  setIsOpen(false);
                }}
                className="
                  flex
                  items-center
                  justify-between
                  px-4
                  py-2.5
                  text-sm
                  transition-all
                  duration-150
                  cursor-pointer
                  hover:bg-black/[0.04]
                  dark:hover:bg-white/[0.04]
                  text-black
                  dark:text-white
                "
              >
                <span className="truncate">
                  {v.label} <span className="opacity-40 mx-1.5">•</span> {v.gender}
                </span>
                <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 shrink-0">
                  {v.region}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}