import { useState, useEffect, useRef } from "react";
import { useTheme } from "../context/ThemeContext";

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

const LANG_NAMES = {
  en: "English", hi: "Hindi", te: "Telugu", ml: "Malayalam", ur: "Urdu",
  es: "Spanish", fr: "French", de: "German", it: "Italian", pt: "Portuguese",
  zh: "Chinese", ru: "Russian", ar: "Arabic", tr: "Turkish", id: "Indonesian",
  vi: "Vietnam", nl: "Dutch", pl: "Polish"
};

const EchoXIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
    <path
      d="M 23 8.5 C 17.5 6.5, 11 9.3, 9 15 C 7.3 20, 9.4 25, 13.9 27.6 L 12.8 31.6 L 17 28.7 C 19 29.2, 21 29, 22.8 28.3"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <g stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="11.3" y1="17.8" x2="11.3" y2="20.4" />
      <line x1="13.9" y1="15.3" x2="13.9" y2="22.9" />
      <line x1="16.5" y1="13" x2="16.5" y2="25.2" />
      <line x1="19.1" y1="11.6" x2="19.1" y2="26.6" />
      <line x1="21.7" y1="13.8" x2="21.7" y2="24.4" />
    </g>
    <g stroke="#FF8C00" strokeWidth="3" strokeLinecap="round">
      <path d="M 24 15 L 34.5 26" />
      <path d="M 34.5 15 L 24 26" />
    </g>
  </svg>
);

export default function VoicePlayer({ voice, language, setVoice }) {
  const { isDark } = useTheme();
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLiked, setIsLiked] = useState(false);

  const currentVoices = VOICES[language] || VOICES.en;
  const activeVoice = currentVoices.find((v) => v.name === voice) || currentVoices[0] || { label: "Unknown", gender: "Unknown", region: "Unknown", name: "" };
  const langName = LANG_NAMES[language] || language.toUpperCase();

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  // Stop playing preview when voice selection changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [voice]);

  const togglePlay = () => {
    if (isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlaying(false);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audioUrl = `/voice-previews/${language}/${voice}.mp3`;
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      setIsPlaying(true);
      setCurrentTime(0);
      setDuration(0);

      audio.addEventListener("timeupdate", () => {
        setCurrentTime(audio.currentTime);
      });
      audio.addEventListener("durationchange", () => {
        setDuration(audio.duration || 0);
      });
      audio.addEventListener("ended", () => {
        setIsPlaying(false);
        setCurrentTime(0);
      });

      audio.play().catch((err) => {
        console.warn("Failed to play voice preview:", err);
        setIsPlaying(false);
      });
    }
  };

  const handleProgressBarClick = (e) => {
    if (!audioRef.current || duration === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const clickPercent = clickX / width;
    const newTime = clickPercent * duration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (time) => {
    if (isNaN(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const percent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const presentationLabel = activeVoice.label;

  // Dynamic light/dark theme styles
  const cardGradientStyle = isDark
    ? {
        background: "linear-gradient(135deg, #121212 0%, #222222 60%, #3a3a3a 100%)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        boxShadow: "0 40px 80px rgba(0, 0, 0, 0.6), 0 15px 30px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.1)"
      }
    : {
        background: "linear-gradient(135deg, #b8b8bc 0%, #d1d1d6 60%, #e5e5ea 100%)",
        border: "1px solid rgba(0, 0, 0, 0.08)",
        boxShadow: "0 30px 60px rgba(0, 0, 0, 0.12), 0 10px 20px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.6)"
      };

  const coverGradientStyle = isDark
    ? { background: "linear-gradient(135deg, #3a3a3a, #151515)", borderLeft: "1px solid rgba(255, 255, 255, 0.05)" }
    : { background: "linear-gradient(135deg, #e5e5ea, #a6a6a9)", borderLeft: "1px solid rgba(0, 0, 0, 0.05)" };

  const coverBorderMobileStyle = isDark
    ? { border: "1px solid rgba(255, 255, 255, 0.05)" }
    : { border: "1px solid rgba(0, 0, 0, 0.08)" };

  const titleColorClass = isDark ? "text-white" : "text-black";
  const descColorClass = isDark ? "text-[#b3b3b3]" : "text-[#4a4a4d]";
  const headlineColorClass = "text-orange-500";
  const timelineTrackClass = isDark ? "bg-white/20" : "bg-black/15";
  const timelineFillClass = isDark ? "bg-white" : "bg-black";
  const iconColorClass = isDark ? "text-[#b3b3b3] hover:text-white" : "text-[#4a4a4d] hover:text-black";
  const mainPlayIconColorClass = isDark ? "text-white" : "text-black";
  const vinylInnerFill = isDark ? "#151515" : "#c8c8cb";
  const vinylGrooveColor = isDark ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.03)";
  const vinylLabelFill = isDark ? "#252528" : "#e5e5e7";
  const vinylLabelStroke = isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)";

  return (
    <div className="w-full relative select-none">
      <style>{`
        .text-spotify-title {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          letter-spacing: -0.03em;
        }
        @keyframes eqBarBounce1 {
          0%, 100% { transform: scaleY(0.15); }
          30% { transform: scaleY(0.85); }
          55% { transform: scaleY(0.3); }
          80% { transform: scaleY(0.95); }
        }
        @keyframes eqBarBounce2 {
          0%, 100% { transform: scaleY(0.25); }
          40% { transform: scaleY(1.0); }
          65% { transform: scaleY(0.15); }
          85% { transform: scaleY(0.75); }
        }
        @keyframes eqBarBounce3 {
          0%, 100% { transform: scaleY(0.1); }
          25% { transform: scaleY(0.75); }
          50% { transform: scaleY(0.25); }
          75% { transform: scaleY(0.85); }
        }
        .animate-eq-bar-1 {
          animation: eqBarBounce1 0.7s cubic-bezier(0.25, 0.8, 0.25, 1) infinite;
        }
        .animate-eq-bar-2 {
          animation: eqBarBounce2 0.85s cubic-bezier(0.25, 0.8, 0.25, 1) infinite;
        }
        .animate-eq-bar-3 {
          animation: eqBarBounce3 0.6s cubic-bezier(0.25, 0.8, 0.25, 1) infinite;
        }
        @keyframes vinylRotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .vinyl-disk-spin {
          animation: vinylRotate 16s linear infinite;
        }
        .vinyl-disk-spin.paused {
          animation-play-state: paused;
        }
        .vinyl-disk-spin.running {
          animation-play-state: running;
        }
      `}</style>

      {/* 1. DESKTOP VIEW LAYOUT (Album art flush with edges - scaled down size: max-w-[620px], h-[210px]) */}
      <div 
        style={cardGradientStyle}
        className="hidden md:flex w-full max-w-[620px] mx-auto rounded-[32px] flex-row items-center justify-between h-[210px] overflow-hidden transition-all duration-300"
      >
        
        {/* Left Interactive Panel */}
        <div className="flex-1 flex flex-col justify-between h-full pl-8 pr-5 py-6">
          
          {/* Logo & Title */}
          <div>
            <div className={`flex items-center gap-2 ${mainPlayIconColorClass}`}>
              <EchoXIcon className="w-6 h-6" />
            </div>
            
            <h4 className={`text-[10px] font-bold uppercase tracking-widest ${headlineColorClass} mt-2 leading-none`}>
              Change selectors to preview different voices
            </h4>
            
            <div className="mt-2.5">
              <h1 className={`text-2xl font-extrabold tracking-tight text-spotify-title leading-none ${titleColorClass}`}>
                {presentationLabel}
              </h1>
              <p className={`text-sm font-medium mt-1.5 ${descColorClass}`}>
                {langName} &bull; {activeVoice.gender} &bull; {activeVoice.name.split("-")[2] || "medium"}
              </p>
            </div>
          </div>

          {/* Timeline and Seeker */}
          <div className="w-full mt-auto">
            <div 
              onClick={handleProgressBarClick}
              className={`h-1 w-full ${timelineTrackClass} rounded-full cursor-pointer relative group`}
            >
              <div 
                style={{ width: `${percent}%` }}
                className={`h-full ${timelineFillClass} rounded-full relative`}
              />
              <div 
                style={{ left: `calc(${percent}% - 5px)` }}
                className={`absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 ${timelineFillClass} rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-150`}
              />
            </div>
            <div className={`flex justify-between items-center text-[10px] font-mono mt-1.5 leading-none ${descColorClass}`}>
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Playback Controls */}
          <div className={`flex items-center gap-6 mt-3 ${mainPlayIconColorClass}`}>
            {/* Heart Toggle */}
            <button 
              type="button" 
              onClick={() => setIsLiked(!isLiked)}
              className={`hover:scale-105 active:scale-95 transition-all cursor-pointer ${isLiked ? 'text-orange-500' : iconColorClass}`}
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </button>

            {/* Prev */}
            <button 
              type="button" 
              className={`hover:scale-105 active:scale-95 transition-all cursor-pointer ${iconColorClass}`}
              onClick={() => {
                const idx = currentVoices.findIndex(v => v.name === voice);
                if (idx > 0) setVoice(currentVoices[idx - 1].name);
                else setVoice(currentVoices[currentVoices.length - 1].name);
              }}
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" />
              </svg>
            </button>

            {/* Play/Pause Button */}
            <button 
              type="button" 
              onClick={togglePlay}
              className="hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              {isPlaying ? (
                <svg className="w-6.5 h-6.5 fill-current" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              ) : (
                <svg className="w-6.5 h-6.5 fill-current" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            {/* Next */}
            <button 
              type="button" 
              className={`hover:scale-105 active:scale-95 transition-all cursor-pointer ${iconColorClass}`}
              onClick={() => {
                const idx = currentVoices.findIndex(v => v.name === voice);
                if (idx < currentVoices.length - 1) setVoice(currentVoices[idx + 1].name);
                else setVoice(currentVoices[0].name);
              }}
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M6 18l8.5-6L6 6zm9-12h2v12h-2z" />
              </svg>
            </button>

            {/* Ban/Minus Icon */}
            <button type="button" className={`hover:scale-105 active:scale-95 transition-all cursor-pointer ${iconColorClass}`}>
              <svg className="w-5 h-5 fill-none stroke-current" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Right Album Artwork Panel (Flush layout - size: 210px x 210px) */}
        <div 
          style={coverGradientStyle}
          className="w-[210px] h-full overflow-hidden relative flex flex-col justify-between p-5 shrink-0 select-none"
        >
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.035] overflow-hidden">
            <span style={{ fontSize: langName.length > 10 ? "1.4rem" : langName.length > 7 ? "2rem" : "3rem" }} className="font-black uppercase tracking-widest font-sans transition-all duration-300">
              {langName}
            </span>
          </div>

          {/* Rotating Vinyl Record Container */}
          <div className={`absolute inset-0 w-full h-full p-6 flex items-center justify-center vinyl-disk-spin ${isPlaying ? 'running' : 'paused'}`}>
            <svg className="w-full h-full pointer-events-none z-0" viewBox="0 0 100 100" fill="none">
              <circle cx="50" cy="50" r="40" fill={vinylInnerFill} stroke={vinylLabelStroke} strokeWidth="1" />
              <circle cx="50" cy="50" r="35" stroke={vinylGrooveColor} strokeWidth="0.5" />
              <circle cx="50" cy="50" r="30" stroke={vinylGrooveColor} strokeWidth="0.5" />
              <circle cx="50" cy="50" r="25" stroke={vinylGrooveColor} strokeWidth="0.5" />
              <circle cx="50" cy="50" r="20" stroke={vinylGrooveColor} strokeWidth="0.5" />
              <circle cx="50" cy="50" r="12" fill={vinylLabelFill} stroke={vinylLabelStroke} strokeWidth="1" />
              <circle cx="50" cy="50" r="4" fill="#FF8C00" />
              <path d="M50,10 C62,10 72,15 80,24" stroke="#FF8C00" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
              <path d="M50,90 C38,90 28,85 20,76" stroke="#FF8C00" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
            </svg>
          </div>

          <div className="relative z-10">
            <h2 className={`text-xl font-bold tracking-tight lowercase text-spotify-title leading-tight ${titleColorClass}`}>
              {presentationLabel.toLowerCase()}
            </h2>
            <p className={`text-[7px] tracking-wider font-semibold uppercase mt-0.5 leading-normal max-w-[130px] ${descColorClass}`}>
              {langName} ({activeVoice.region}). Recorded for EchoX.
            </p>
          </div>

          <div className="flex items-end justify-between relative z-10">
            <div className="flex gap-1 items-end h-[28px] overflow-hidden">
              {[1, 2, 3, 4, 5, 6].map((bar) => {
                const animClass = isPlaying ? `animate-eq-bar-${(bar % 3) + 1}` : "";
                return (
                  <div 
                    key={bar}
                    style={{
                      transformOrigin: "bottom",
                      height: "24px"
                    }}
                    className={`w-0.75 rounded-full bg-gradient-to-t from-orange-500 to-amber-500 transition-all duration-300 ${animClass}`}
                  />
                );
              })}
            </div>
            <span className={`text-[6.5px] font-mono tracking-widest uppercase ${descColorClass}`}>Active</span>
          </div>
        </div>
      </div>

      {/* 2. MOBILE VIEW LAYOUT */}
      <div 
        style={cardGradientStyle}
        className="flex md:hidden w-full max-w-[320px] mx-auto aspect-square rounded-[40px] p-6 flex-col justify-between transition-all duration-300"
      >
        
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div className={mainPlayIconColorClass}>
            <EchoXIcon className="w-6 h-6" />
          </div>
        </div>

        {/* Square Album Cover Center */}
        <div 
          style={{ ...coverGradientStyle, ...coverBorderMobileStyle }}
          className="w-[185px] h-[185px] mx-auto rounded-3xl overflow-hidden relative flex flex-col justify-between p-4 shrink-0 mt-1 select-none"
        >
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] overflow-hidden">
            <span style={{ fontSize: langName.length > 10 ? "1.4rem" : langName.length > 7 ? "2rem" : "2.8rem" }} className="font-black uppercase tracking-widest font-sans transition-all duration-300">
              {langName}
            </span>
          </div>

          {/* Rotating Vinyl Container on Mobile */}
          <div className={`absolute inset-0 w-full h-full p-5 flex items-center justify-center vinyl-disk-spin ${isPlaying ? 'running' : 'paused'}`}>
            <svg className="w-full h-full pointer-events-none" viewBox="0 0 100 100" fill="none">
              <circle cx="50" cy="50" r="40" fill={vinylInnerFill} stroke={vinylLabelStroke} strokeWidth="1" />
              <circle cx="50" cy="50" r="35" stroke={vinylGrooveColor} strokeWidth="0.5" />
              <circle cx="50" cy="50" r="30" stroke={vinylGrooveColor} strokeWidth="0.5" />
              <circle cx="50" cy="50" r="25" stroke={vinylGrooveColor} strokeWidth="0.5" />
              <circle cx="50" cy="50" r="20" stroke={vinylGrooveColor} strokeWidth="0.5" />
              <circle cx="50" cy="50" r="12" fill={vinylLabelFill} stroke={vinylLabelStroke} strokeWidth="1" />
              <circle cx="50" cy="50" r="4" fill="#FF8C00" />
              <path d="M50,10 C62,10 72,15 80,24" stroke="#FF8C00" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
              <path d="M50,90 C38,90 28,85 20,76" stroke="#FF8C00" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
            </svg>
          </div>

          <div className="relative z-10">
            <h2 className={`text-white text-base font-bold tracking-tight lowercase text-spotify-title leading-tight ${titleColorClass}`}>
              {presentationLabel.toLowerCase()}
            </h2>
            <p className={`text-[6.5px] tracking-wider font-semibold uppercase mt-0.5 ${descColorClass}`}>
              {langName} ({activeVoice.region}). Recorded for EchoX.
            </p>
          </div>

          <div className="flex items-end justify-between relative z-10">
            <div className="flex gap-0.75 items-end h-[28px] overflow-hidden">
              {[1, 2, 3, 4, 5].map((bar) => {
                const animClass = isPlaying ? `animate-eq-bar-${(bar % 3) + 1}` : "";
                return (
                  <div 
                    key={bar}
                    style={{
                      transformOrigin: "bottom",
                      height: "20px"
                    }}
                    className={`w-0.75 rounded-full bg-gradient-to-t from-orange-500 to-amber-500 transition-all duration-300 ${animClass}`}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom Playback Info & Action bar */}
        <div className="flex items-center gap-4 mt-2.5 min-w-0">
          <button 
            type="button" 
            onClick={togglePlay}
            className={`hover:scale-105 active:scale-95 transition-all cursor-pointer shrink-0 ${mainPlayIconColorClass}`}
          >
            {isPlaying ? (
              <svg className="w-10 h-10 fill-current" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            ) : (
              <svg className="w-10 h-10 fill-current" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          <div className="flex-1 min-w-0">
            <h1 className={`text-[22px] font-extrabold tracking-tight truncate leading-none text-spotify-title ${titleColorClass}`}>
              {presentationLabel}
            </h1>
            <p className={`text-sm font-semibold truncate mt-1.5 ${descColorClass}`}>
              ~{langName} &bull; {activeVoice.gender}
            </p>
          </div>
        </div>

      </div>

    </div>
  );
}
