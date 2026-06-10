import { useEffect, useState } from "react";
import api from "../services/api";

export default function ProgressTracker({
  jobId,
  progress,
  setProgress,
  setStatus,
  setVideoUrl,
  setDubbedAudioUrl,
}) {

  const [message, setMessage] =
    useState("Waiting...");

  const [error, setError] =
    useState(null);

  useEffect(() => {

    if (!jobId) return;

    const interval = setInterval(
      async () => {

        try {

          const res = await api.get(
            `/progress/${jobId}`
          );

          const job = res.data;

          console.log(
            "JOB UPDATE:",
            job
          );

          setProgress(
            job.progress || 0
          );

          setStatus(
            job.status
          );

          setMessage(
            job.message || ""
          );

          setError(
            job.error || null
          );

          if (
            job.status === "completed"
          ) {

            console.log(
              "JOB COMPLETED"
            );

            const streamRes =
              await api.get(
                `/job/${jobId}/streams`
              );

            setVideoUrl(
              streamRes.data.video_url
            );

            setDubbedAudioUrl(
              streamRes.data.dubbed_audio_url
            );

            clearInterval(
              interval
            );

          }

          if (
            job.status === "failed"
          ) {

            console.error(
              "JOB FAILED:",
              job.error
            );

            clearInterval(
              interval
            );

          }

        } catch (err) {

          console.error(
            "TRACKER ERROR:",
            err
          );

          setError(
            "Backend connection failed"
          );

        }

      },
      2000
    );

    return () =>
      clearInterval(interval);

  }, [jobId]);

  const getStatusColor = () => {

    if (error) {
      return "text-red-400";
    }

    switch (status) {

      case "completed":
        return "text-green-400";

      case "failed":
        return "text-red-400";

      case "transcribing":
        return "text-yellow-400";

      case "translating":
        return "text-blue-400";

      case "generating_tts":
        return "text-purple-400";

      default:
        return "text-slate-300";

    }

  };

return (

  <div className="w-full py-8">

    {/* STATUS */}
    <div className="flex items-center gap-3">

      <div
        className={`
          w-3
          h-3
          rounded-full
          animate-pulse

          ${
            status === "completed"
              ? "bg-green-400"
              : status === "failed"
              ? "bg-red-400"
              : "bg-blue-400"
          }
        `}
      />

      <p
        className={`
          text-lg
          font-medium

          ${getStatusColor()}
        `}
      >
        {message || status}
      </p>

    </div>

    {/* PROGRESS */}
    <div className="mt-8">

      <div className="flex justify-between items-center mb-3">

        <span className="text-white/50 text-sm">
          Translation Progress
        </span>

        <span className="text-white font-semibold">
          {progress}%
        </span>

      </div>

      <div className="relative h-[3px] w-full bg-white/10 overflow-hidden">

        <div
          className="
            absolute
            left-0
            top-0
            h-full

            bg-white

            transition-all
            duration-700
          "
          style={{
            width: `${progress}%`,
          }}
        />

      </div>

    </div>

    {/* PIPELINE */}
    <div className="mt-10 flex flex-wrap gap-4">

      <div
        className={`
          text-sm

          ${
            progress >= 20
              ? "text-white"
              : "text-white/25"
          }
        `}
      >
        Extract
      </div>

      <div className="text-white/20">
        →
      </div>

      <div
        className={`
          text-sm

          ${
            progress >= 35
              ? "text-white"
              : "text-white/25"
          }
        `}
      >
        Transcribe
      </div>

      <div className="text-white/20">
        →
      </div>

      <div
        className={`
          text-sm

          ${
            progress >= 55
              ? "text-white"
              : "text-white/25"
          }
        `}
      >
        Translate
      </div>

      <div className="text-white/20">
        →
      </div>

      <div
        className={`
          text-sm

          ${
            progress >= 75
              ? "text-white"
              : "text-white/25"
          }
        `}
      >
        Voice
      </div>

      <div className="text-white/20">
        →
      </div>

      <div
        className={`
          text-sm

          ${
            progress >= 100
              ? "text-white"
              : "text-white/25"
          }
        `}
      >
        Complete
      </div>

    </div>

    {/* ERROR */}
    {
      error && (

        <div className="mt-8 text-red-400 text-sm">

          {error}

        </div>

      )
    }

  </div>

);
}