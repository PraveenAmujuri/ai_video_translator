import { useEffect } from "react";
import api from "../services/api";

export default function ProgressTracker({
  jobId,
  progress,
  setProgress,
  setStatus,
  setStreamUrl,
  status,
}) {

  useEffect(() => {
    if (!jobId) return;

    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/progress/${jobId}`);

        setProgress(res.data.progress);
        setStatus(res.data.status);

        if (res.data.stream_url) {
          setStreamUrl(res.data.stream_url);
        }

      } catch (err) {
        console.error(err);
      }
    }, 3000);

    return () => clearInterval(interval);

  }, [jobId]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">

      <h2 className="text-xl font-semibold mb-4">
        Progress
      </h2>

      <div className="w-full bg-slate-700 h-4 rounded-full overflow-hidden">

        <div
          className="bg-blue-500 h-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />

      </div>

      <p className="mt-4 text-slate-300">
        {status} ({progress}%)
      </p>

    </div>
  );
}