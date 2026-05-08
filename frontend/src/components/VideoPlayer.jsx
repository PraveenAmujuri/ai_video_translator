import { useEffect, useRef } from "react";
import Hls from "hls.js";

export default function VideoPlayer({ streamUrl }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (!streamUrl || !videoRef.current) return;

    if (Hls.isSupported()) {
      const hls = new Hls();

      hls.loadSource(`http://127.0.0.1:8000${streamUrl}`);
      hls.attachMedia(videoRef.current);

      return () => hls.destroy();
    }
  }, [streamUrl]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">

      <video
        ref={videoRef}
        controls
        className="w-full rounded-xl"
      />

    </div>
  );
}