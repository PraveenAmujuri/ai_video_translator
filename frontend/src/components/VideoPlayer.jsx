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

    if (!video || !audio)
      return;

    const sync = () => {

      const drift = Math.abs(
        video.currentTime -
        audio.currentTime
      );

      if (drift > 0.4) {

        audio.currentTime =
          video.currentTime;

      }

    };

    video.addEventListener(
      "timeupdate",
      sync,
    );

video.onplay = async () => {

  try {

    await audio.play();

  } catch (err) {

    console.error(
      "Audio play blocked:",
      err,
    );

  }

};

    video.onpause = () => {
      audio.pause();
    };

    video.onseeking = () => {

      audio.currentTime =
        video.currentTime;

    };

    return () => {

      video.removeEventListener(
        "timeupdate",
        sync,
      );

    };

  }, []);

  return (

    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">

      <video
        ref={videoRef}
        src={videoUrl}
        controls
        muted
        className="w-full rounded-xl"
      />

      {
        dubbedAudioUrl && (

          <audio
            ref={audioRef}
            controls
            src={`http://127.0.0.1:8000${dubbedAudioUrl}`}
          />

        )
      }

    </div>

  );
}