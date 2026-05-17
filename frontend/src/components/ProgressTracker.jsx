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

    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">

      <h2 className="text-xl font-semibold mb-5">
        Progress Tracker
      </h2>

      <div className="w-full bg-slate-800 rounded-full h-4 overflow-hidden">

        <div
          className="bg-green-500 h-full transition-all duration-500"
          style={{
            width: `${progress}%`,
          }}
        />

      </div>

      <div className="mt-4 space-y-2">

        <p className="text-lg font-medium">
          {progress}%
        </p>

        <p
          className={`font-semibold ${getStatusColor()}`}
        >
          Status: {status}
        </p>

        <p className="text-slate-400 text-sm">
          {message}
        </p>

        {
          error && (
            <div className="bg-red-950 border border-red-800 rounded-lg p-3 text-red-300 text-sm">
              {error}
            </div>
          )
        }

      </div>

    </div>

  );

}