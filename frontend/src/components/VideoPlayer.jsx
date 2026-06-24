import { useRef, useState } from "react";
import ShineBorder from "./ui/ShineBorder";
import { Backlight } from "./ui/Backlight";

export default function VideoPlayer({ videoUrl }) {
  const videoRef = useRef(null);
  const [isPortrait, setIsPortrait] = useState(false);

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
    <div className="flex justify-center w-full">
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
            />
          </Backlight>
        </ShineBorder>
      </div>
    </div>
  );
}