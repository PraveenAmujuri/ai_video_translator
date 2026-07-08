import { useRef, useState, useEffect } from "react";
import ShineBorder from "./ui/ShineBorder";
import { Backlight } from "./ui/Backlight";

export default function VideoPlayer({ videoUrl, subtitleUrl }) {
  const videoRef = useRef(null);
  const [isPortrait, setIsPortrait] = useState(false);
  const [ccActive, setCcActive] = useState(true);
  const [vttDataUrl, setVttDataUrl] = useState(null);

  useEffect(() => {
    if (!subtitleUrl) {
      setVttDataUrl(null);
      return;
    }
    const fetchVtt = async () => {
      try {
        const fullUrl = subtitleUrl.startsWith("http")
          ? subtitleUrl
          : `${import.meta.env.VITE_API_BASE_URL || "https://api.praveenai.tech"}${subtitleUrl}`;
        const res = await fetch(fullUrl);
        const text = await res.text();
        const dataUrl = "data:text/vtt;charset=utf-8," + encodeURIComponent(text);
        setVttDataUrl(dataUrl);
      } catch (err) {
        console.error("Failed to load VTT subtitles:", err);
        setVttDataUrl(null);
      }
    };
    fetchVtt();
  }, [subtitleUrl]);

  if (!videoUrl) return null;

  const finalMergedStreamTarget = videoUrl.startsWith("http")
    ? videoUrl
    : `${
        import.meta.env.VITE_API_BASE_URL ||
        "https://api.praveenai.tech"
      }${videoUrl}`;

  const handleMetadata = () => {
    const video = videoRef.current;

    if (!video) return;

    setIsPortrait(video.videoHeight > video.videoWidth);
  };

  return (
    <div className="flex flex-col items-center w-full">
      <div
        className={`${
          isPortrait
            ? "max-w-[420px]"
            : "w-full max-w-5xl"
        }`}
      >
        <ShineBorder
          borderRadius={24}
          borderWidth={2}
          duration={10}
          color={["#06b6d4", "#3b82f6", "#8b5cf6"]}
          className="w-full"
        >
          <Backlight blur={35} className="w-full">
            <video
              ref={videoRef}
              src={finalMergedStreamTarget}
              crossOrigin="anonymous"
              controls
              preload="metadata"
              onLoadedMetadata={handleMetadata}
              className={`
                mx-auto
                h-auto
                rounded-xl
                bg-neutral-100
                dark:bg-zinc-950
                transition-all
                duration-300

                ${
                  isPortrait
                    ? `
                      max-w-[420px]
                      max-h-[75vh]
                      w-auto
                    `
                    : `
                      w-full
                      max-h-[75vh]
                    `
                }
              `}
            >
              {vttDataUrl && ccActive && (
                <track
                  label="Translated Subtitles"
                  kind="subtitles"
                  srcLang="auto"
                  src={vttDataUrl}
                  default
                />
              )}
            </video>
          </Backlight>
        </ShineBorder>
      </div>

{subtitleUrl && (
  <div className="mt-4 flex justify-center w-full max-w-5xl px-2 mx-auto">
    <button
      type="button"
      onClick={() => setCcActive(!ccActive)}
      className="text-xs font-medium transition-all tracking-wide flex items-center gap-1.5 text-neutral-500 hover:text-black dark:hover:text-white group select-none"
    >
      {/* YouTube Style CC SVG with Fill/No-Fill States */}
      <svg
        viewBox="0 0 24 24"
        className={`w-4 h-4 transition-colors duration-200 ${
          ccActive 
            ? "text-[#FF8C00]" 
            : "text-neutral-400 dark:text-neutral-500 group-hover:text-black dark:group-hover:text-white"
        }`}
      >
        <path
          fill="currentColor"
          fillRule={ccActive ? "nonzero" : "evenodd"}
          clipRule="evenodd"
          d={
            ccActive
              ? "M4 5a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V7a2 2 0 00-2-2H4zm4 5.5a1.5 1.5 0 113 0v3a1.5 1.5 0 11-3 0v-3zm6 0a1.5 1.5 0 113 0v3a1.5 1.5 0 11-3 0v-3z"
              : "M4 5a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V7a2 2 0 00-2-2H4zm16 2v10H4V7h16zm-9 3.5a1.5 1.5 0 11-3 0v3a1.5 1.5 0 113 0v-3zm2 0a1.5 1.5 0 011.5-1.5h1.5a1 1 0 110 2h-1v1h1a1 1 0 110 2h-1.5A1.5 1.5 0 0113 13.5v-3z"
          }
        />
      </svg>

      <span>Subtitles are</span>
      <span
        className={`underline underline-offset-4 decoration-1 font-bold uppercase transition-colors duration-200 ${
          ccActive
            ? "text-[#FF8C00] decoration-[#FF8C00]"
            : "text-neutral-400 dark:text-neutral-600 decoration-neutral-400"
        }`}
      >
        {ccActive ? "Enabled" : "Disabled"}
      </span>
    </button>
  </div>
)}

    </div>
  );
}
