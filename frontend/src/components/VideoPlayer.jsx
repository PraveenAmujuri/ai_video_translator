import { useRef } from "react";
import ShineBorder from "./ui/ShineBorder";

export default function VideoPlayer({ videoUrl }) {
  const videoRef = useRef(null);

  // If the backend isn't finished merging the file yet, keep the player hidden safely
  if (!videoUrl) return null;

  // Build the clean streaming target string pointing directly to your Azure server build tree
  const finalMergedStreamTarget = videoUrl.startsWith("http")
    ? videoUrl
    : `${import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"}${videoUrl}`;

  return (
    <ShineBorder
      borderRadius={24}
      borderWidth={2}
      duration={10}
      color={["#3b82f6", "#8b5cf6", "#ec4899"]}
      className="w-full"
    >
      <div className="p-4 bg-slate-900 rounded-2xl w-full">
        <video
          ref={videoRef}
          src={finalMergedStreamTarget}
          controls
          preload="metadata"
          className="w-full rounded-xl shadow-2xl bg-black"
        />
      </div>
    </ShineBorder>
  );
}