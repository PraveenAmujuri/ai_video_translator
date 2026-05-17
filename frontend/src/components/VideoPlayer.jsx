import {
  useEffect,
  useRef,
} from "react";

export default function VideoPlayer({
  videoUrl,
  dubbedAudioUrl,
}) {

  const videoRef = useRef(null);

  const audioRef = useRef(null);

  useEffect(() => {

    const video = videoRef.current;

    const audio = audioRef.current;

    if (
      !video ||
      !audio ||
      !videoUrl ||
      !dubbedAudioUrl
    ) {
      return;
    }

    const syncAudio = () => {

      const drift = Math.abs(
        video.currentTime -
        audio.currentTime
      );

      if (drift > 0.3) {

        audio.currentTime =
          video.currentTime;

      }

    };

 const handlePlay = async () => {

  try {

    audio.muted = false;

    audio.volume = 1;

if (audio.readyState < 2) {

  await new Promise((resolve) => {

    audio.onloadedmetadata =
      resolve;

  });

}

audio.currentTime =
  video.currentTime;

const playPromise =
  audio.play();

    if (playPromise !== undefined) {

      await playPromise;

    }

  } catch (err) {

    console.error(
      "Audio sync error:",
      err,
    );

  }

};
    const handlePause = () => {
      audio.pause();
    };

    const handleSeeking = () => {

      audio.currentTime =
        video.currentTime;

    };

    video.addEventListener(
      "timeupdate",
      syncAudio,
    );

    video.addEventListener(
      "play",
      handlePlay,
    );

    video.addEventListener(
      "pause",
      handlePause,
    );

    video.addEventListener(
      "seeking",
      handleSeeking,
    );

    return () => {

      video.removeEventListener(
        "timeupdate",
        syncAudio,
      );

      video.removeEventListener(
        "play",
        handlePlay,
      );

      video.removeEventListener(
        "pause",
        handlePause,
      );

      video.removeEventListener(
        "seeking",
        handleSeeking,
      );

    };

  }, [videoUrl, dubbedAudioUrl]);

  return (

    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">

      {
        videoUrl && (

          <video
            ref={videoRef}
            src={videoUrl}
            controls
            
            className="w-full rounded-xl"
          />

        )
      }

<audio
  ref={audioRef}
  preload="auto"
  style={{
    display: "none",
  }}
  src={
    dubbedAudioUrl
      ? `http://127.0.0.1:8000${dubbedAudioUrl}`
      : undefined
  }
/>

    </div>

  );

}