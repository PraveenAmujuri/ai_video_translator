import { useEffect } from "react";
import api from "../services/api";

export default function ProgressTracker({
  jobId,
  progress,
  setProgress,
  setStatus,
  setVideoUrl,
  setDubbedAudioUrl,
}) {

  useEffect(() => {

    if (!jobId) return;

    const interval = setInterval(
      async () => {

        try {

        const res = await api.get(
          `/progress/${jobId}`
        );

          const job = res.data;

          setProgress(job.progress);

          setStatus(job.status);

          if (
            job.status === "completed"
          ) {

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

            clearInterval(interval);

          }

        } catch (err) {

          console.error(err);

        }

      },
      2000,
    );

    return () => clearInterval(interval);

  }, [jobId]);

  return (

    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">

      <h2 className="text-xl font-semibold mb-4">
        Progress
      </h2>

      <div className="w-full bg-slate-800 rounded-full h-4 overflow-hidden">

        <div
          className="bg-green-500 h-full transition-all"
          style={{
            width: `${progress}%`,
          }}
        />

      </div>

      <p className="mt-3 text-slate-300">
        {progress}%
      </p>

    </div>

  );
}