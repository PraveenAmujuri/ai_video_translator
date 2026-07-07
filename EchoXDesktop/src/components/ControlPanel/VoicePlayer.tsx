import React, { useState, useEffect, useRef } from "react";
import type { VoiceOption } from "../../types";
import { TARGET_LANGUAGES } from "../../lib/translation-options";

interface VoicePlayerProps {
  voice: string;
  voices: VoiceOption[];
  onChange: (code: string) => void;
  targetLanguage: string;
  disabled?: boolean;
}

const EchoXIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
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

export function VoicePlayer({
  voice,
  voices,
  onChange,
  targetLanguage,
  disabled = false,
}: VoicePlayerProps) {
  const safeValue = voices.some((v) => v.code === voice)
    ? voice
    : (voices[0]?.code ?? "");

  const activeVoiceCode = safeValue;

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLiked, setIsLiked] = useState(false);

  const activeVoice = voices.find((v) => v.code === activeVoiceCode) || voices[0] || { label: "Unknown", gender: "Unknown", code: "" };
  const langMeta = TARGET_LANGUAGES.find(l => l.code === targetLanguage);
  const langName = langMeta ? langMeta.label : targetLanguage.toUpperCase();

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  // Stop playing preview when selection changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [activeVoiceCode]);

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
      if (!activeVoiceCode) return;

      const langFamily = activeVoiceCode.split("-")[0].split("_")[0].toLowerCase();
      const audioUrl = `/voice-previews/${langFamily}/${activeVoiceCode}.mp3`;
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

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || duration === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const clickPercent = clickX / width;
    const newTime = clickPercent * duration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const percent = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!activeVoiceCode || voices.length === 0) {
    return null;
  }

  // Clean voice label for presentation
  const presentationLabel = activeVoice.label.split(" (")[0];

  return (
    <div className="voice-spotify-card">
      <style>{`
        .voice-spotify-card {
          width: 100%;
          max-width: 760px;
          margin: 0 auto;
          border-radius: 40px;
          overflow: hidden;
          background: linear-gradient(135deg, #3b3b3b 0%, #232323 50%, #101010 100%);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 30px 60px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1);
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: space-between;
          position: relative;
          box-sizing: border-box;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          user-select: none;
          height: 260px;
        }
        @media (max-width: 640px) {
          .voice-spotify-card {
            flex-direction: column;
            max-width: 320px;
            aspect-ratio: 1 / 1;
            padding: 24px;
            justify-content: space-between;
            gap: 0;
            height: auto;
          }
        }
        .spotify-left {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          height: 100%;
          min-width: 0;
          box-sizing: border-box;
          padding: 32px 24px 32px 40px;
        }
        @media (max-width: 640px) {
          .spotify-left {
            display: none;
          }
        }
        .spotify-brand-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .spotify-title-area {
          margin-top: 16px;
        }
        .spotify-track-title {
          font-size: 36px;
          font-weight: 800;
          color: #ffffff;
          margin: 0;
          letter-spacing: -0.03em;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          line-height: 1.1;
        }
        .spotify-artist {
          font-size: 18px;
          font-weight: 500;
          color: #b3b3b3;
          margin: 8px 0 0 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .spotify-timeline-container {
          width: 100%;
        }
        .spotify-timeline-bar {
          height: 6px;
          background-color: rgba(255, 255, 255, 0.2);
          border-radius: 9999px;
          cursor: pointer;
          position: relative;
        }
        .spotify-timeline-fill {
          height: 100%;
          background-color: #ffffff;
          border-radius: 9999px;
        }
        .spotify-timeline-handle {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 12px;
          height: 12px;
          background-color: #ffffff;
          border-radius: 50%;
          pointer-events: none;
          opacity: 0;
          transition: opacity 150ms ease;
        }
        .spotify-timeline-bar:hover .spotify-timeline-handle {
          opacity: 1;
        }
        .spotify-time-labels {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          color: #b3b3b3;
          font-family: monospace;
          margin-top: 8px;
          line-height: 1;
        }
        .spotify-controls {
          display: flex;
          align-items: center;
          gap: 32px;
          margin-top: 16px;
        }
        .spotify-btn {
          background: none;
          border: none;
          padding: 4px;
          color: #b3b3b3;
          cursor: pointer;
          transition: color 150ms ease, transform 150ms ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .spotify-btn:hover {
          color: #ffffff;
          transform: scale(1.05);
        }
        .spotify-btn:active {
          transform: scale(0.95);
        }
        .spotify-btn:disabled, .spotify-btn-play:disabled {
          opacity: 0.35;
          cursor: not-allowed;
          pointer-events: none;
        }
        .spotify-btn-like.active {
          color: #f97316;
        }
        .spotify-btn-play {
          background: none;
          border: none;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: transform 150ms ease;
        }
        .spotify-btn-play:hover {
          transform: scale(1.05);
        }
        .spotify-btn-play:active {
          transform: scale(0.95);
        }
        .spotify-right {
          width: 280px;
          height: 100%;
          background: linear-gradient(135deg, #4b4b4b, #151515);
          border-left: 1px solid rgba(255, 255, 255, 0.05);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 24px;
          position: relative;
          box-sizing: border-box;
          flex-shrink: 0;
        }
        @media (max-width: 640px) {
          .spotify-right {
            width: 185px;
            height: 185px;
            margin: 0 auto;
            border-radius: 24px;
            padding: 16px;
            margin-top: 4px;
            border: 1px solid rgba(255, 255, 255, 0.05);
          }
        }
        .spotify-wordmark {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          opacity: 0.035;
          overflow: hidden;
          font-size: 3.5rem;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }
        @media (max-width: 640px) {
          .spotify-wordmark {
            font-size: 2.5rem;
          }
        }
        .spotify-equalizer {
          display: flex;
          align-items: flex-end;
          gap: 4px;
          height: 36px;
          position: relative;
          z-index: 10;
        }
        @media (max-width: 640px) {
          .spotify-equalizer {
            height: 28px;
          }
        }
        .spotify-equalizer-bar {
          width: 4px;
          border-radius: 9999px;
          background: linear-gradient(to top, #f97316, #fb923c);
          transition: height 300ms ease;
        }
        @media (max-width: 640px) {
          .spotify-equalizer-bar {
            width: 3px;
          }
        }
        .spotify-visualizer-text {
          font-size: 7px;
          font-family: monospace;
          letter-spacing: 0.15em;
          color: #b3b3b3;
          text-transform: uppercase;
          line-height: 1;
        }
        .spotify-cover-title {
          font-size: 24px;
          font-weight: 700;
          color: #ffffff;
          margin: 0;
          letter-spacing: -0.01em;
          line-height: 1.1;
          text-transform: lowercase;
        }
        @media (max-width: 640px) {
          .spotify-cover-title {
            font-size: 16px;
          }
        }
        .spotify-cover-meta {
          font-size: 7.5px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.5);
          margin-top: 6px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        @media (max-width: 640px) {
          .spotify-cover-meta {
            font-size: 6.5px;
            margin-top: 2px;
          }
        }
        .spotify-mobile-info-row {
          display: none;
        }
        @media (max-width: 640px) {
          .spotify-mobile-info-row {
            display: flex;
            align-items: center;
            gap: 16px;
            width: 100%;
            margin-top: 10px;
            box-sizing: border-box;
          }
        }
        .spotify-mobile-btn-play {
          background: none;
          border: none;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
          transition: transform 150ms ease;
        }
        .spotify-mobile-btn-play:hover {
          transform: scale(1.05);
        }
        .spotify-mobile-btn-play:active {
          transform: scale(0.95);
        }
        .spotify-mobile-title-stack {
          flex: 1;
          min-width: 0;
        }
        .spotify-mobile-title {
          font-size: 22px;
          font-weight: 800;
          color: #ffffff;
          margin: 0;
          letter-spacing: -0.02em;
          line-height: 1.1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .spotify-mobile-artist {
          font-size: 14px;
          font-weight: 600;
          color: #b3b3b3;
          margin: 6px 0 0 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .spotify-mobile-header {
          display: none;
        }
        @media (max-width: 640px) {
          .spotify-mobile-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            width: 100%;
          }
        }
        @keyframes miniEqBounce {
          0%, 100% { height: 4px; }
          50% { height: 24px; }
        }
        .animate-eq-bar {
          animation: miniEqBounce 0.8s ease-in-out infinite;
        }
      `}</style>

      {/* MOBILE HEADER (Only visible on Mobile view) */}
      <div className="spotify-mobile-header">
        <EchoXIcon className="w-6 h-6 text-white" />
      </div>

      {/* LEFT COLUMN PANEL (Only visible on Desktop view) */}
      <div className="spotify-left">
        {/* Brand/Logo */}
        <div className="spotify-brand-row">
          <EchoXIcon className="w-7 h-7 text-white" />
        </div>

        <h4 className="text-[11px] font-bold uppercase tracking-widest text-orange-500 mt-4 leading-none">
          Change selectors to preview different voices
        </h4>

        {/* Dynamic Titles */}
        <div className="spotify-title-area">
          <h1 className="spotify-track-title">{presentationLabel}</h1>
          <p className="spotify-artist">
            {langName} &bull; {activeVoice.gender.charAt(0).toUpperCase() + activeVoice.gender.slice(1)} &bull; {activeVoice.code.split("-")[2] || "medium"}
          </p>
        </div>

        {/* Seekbar and timeline bar */}
        <div className="spotify-timeline-container">
          <div className="spotify-timeline-bar" onClick={handleProgressBarClick}>
            <div 
              className="spotify-timeline-fill"
              style={{ width: `${percent}%` }}
            />
            <div 
              className="spotify-timeline-handle"
              style={{ left: `calc(${percent}% - 6px)` }}
            />
          </div>
          <div className="spotify-time-labels">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Footer controls */}
        <div className="spotify-controls">
          {/* Like */}
          <button 
            type="button"
            disabled={disabled}
            onClick={() => setIsLiked(!isLiked)}
            className={`spotify-btn spotify-btn-like ${isLiked ? 'active' : ''}`}
            title={isLiked ? "Remove from favorites" : "Add to favorites"}
          >
            <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </button>

          {/* Prev */}
          <button 
            type="button"
            disabled={disabled}
            className="spotify-btn"
            title="Previous Voice"
            onClick={() => {
              const idx = voices.findIndex(v => v.code === activeVoiceCode);
              if (idx > 0) onChange(voices[idx - 1].code);
              else onChange(voices[voices.length - 1].code);
            }}
          >
            <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" />
            </svg>
          </button>

          {/* Play/Pause */}
          <button 
            type="button"
            disabled={disabled}
            onClick={togglePlay}
            className="spotify-btn-play"
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <svg width="32" height="32" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            ) : (
              <svg width="32" height="32" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          {/* Next */}
          <button 
            type="button"
            disabled={disabled}
            className="spotify-btn"
            title="Next Voice"
            onClick={() => {
              const idx = voices.findIndex(v => v.code === activeVoiceCode);
              if (idx < voices.length - 1) onChange(voices[idx + 1].code);
              else onChange(voices[0].code);
            }}
          >
            <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 18l8.5-6L6 6zm9-12h2v12h-2z" />
            </svg>
          </button>

          {/* Ban Circle-minus icon */}
          <button 
            type="button"
            disabled={disabled}
            className="spotify-btn"
            title="Repeat preview"
          >
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
          </button>
        </div>
      </div>

      {/* RIGHT ALBUM ART COVER (Flush-mounted vertically on Desktop) */}
      <div className="spotify-right">
        <div className="spotify-wordmark">
          <span style={{ fontSize: langName.length > 10 ? "1.8rem" : langName.length > 7 ? "2.6rem" : "3.8rem" }} className="transition-all duration-300">
            {langName}
          </span>
        </div>
        
        {/* Dynamic Vinyl Record and Soundwave vector */}
        <svg className="absolute inset-0 w-full h-full p-8 pointer-events-none z-0" viewBox="0 0 100 100" fill="none" style={{ display: 'block' }}>
          <circle cx="50" cy="50" r="40" fill="#151515" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
          <circle cx="50" cy="50" r="35" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
          <circle cx="50" cy="50" r="30" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
          <circle cx="50" cy="50" r="25" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
          <circle cx="50" cy="50" r="20" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
          <circle cx="50" cy="50" r="12" fill="#252528" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
          <circle cx="50" cy="50" r="4" fill="#FF8C00" />
          <path d="M50,10 C62,10 72,15 80,24" stroke="#FF8C00" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
          <path d="M50,90 C38,90 28,85 20,76" stroke="#FF8C00" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
        </svg>

        <div className="relative z-10">
          <h2 className="spotify-cover-title">{presentationLabel.toLowerCase()}</h2>
          <p className="spotify-cover-meta">
            {langName} ({activeVoice.code.split("_")[1]?.split("-")[0] || "IN"}). Recorded for EchoX.
          </p>
        </div>

        <div className="spotify-equalizer">
          {[1, 2, 3, 4, 5, 6].map((bar) => (
            <div 
              key={bar}
              style={{
                animationDelay: `${bar * 0.08}s`,
                height: isPlaying ? 'auto' : `${(bar % 2 + 1) * 8}px`
              }}
              className={`spotify-equalizer-bar ${isPlaying ? 'animate-eq-bar' : ''}`}
            />
          ))}
        </div>
      </div>

      {/* MOBILE INFO ROW (Only visible on Mobile view) */}
      <div className="spotify-mobile-info-row">
        {/* Play/Pause Button on bottom left */}
        <button 
          type="button"
          disabled={disabled}
          onClick={togglePlay}
          className="spotify-mobile-btn-play"
        >
          {isPlaying ? (
            <svg width="40" height="40" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            </svg>
          ) : (
            <svg width="40" height="40" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        {/* Title and subtitle stack on bottom right */}
        <div className="spotify-mobile-title-stack">
          <h1 className="spotify-mobile-title">{presentationLabel}</h1>
          <p className="spotify-mobile-artist">
            ~{langName} &bull; {activeVoice.gender.charAt(0).toUpperCase() + activeVoice.gender.slice(1)}
          </p>
        </div>
      </div>

    </div>
  );
}
