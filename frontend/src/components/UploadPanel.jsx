import { useState } from "react";
import api from "../services/api";

export default function UploadPanel({
  setJobId,
  setStatus,
  language,
  voice,
}) {
  const [youtubeUrl, setYoutubeUrl] = useState("");

  async function handleFileUpload(e) {
    const file = e.target.files[0];

    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      setStatus("uploading");

      const res = await api.post("/upload", formData);

      setJobId(res.data.job_id);

      setStatus("uploaded");

      alert("Upload successful");

    } catch (err) {
      console.error(err);
      alert("Upload failed");
    }
  }

  async function handleYoutubeSubmit() {

    if (!youtubeUrl) {
      alert("Enter YouTube URL");
      return;
    }

    try {
      setStatus("processing");

const res = await api.post("/translate", {
  youtube_url: youtubeUrl,
  target_language: language,
  source_language: "auto",
  voice: voice,
});

      setJobId(res.data.job_id);

    } catch (err) {
      console.error(err);
      alert("Failed to process YouTube URL");
    }
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">

      <h2 className="text-xl font-semibold mb-6">
        Input Media
      </h2>

      <div className="space-y-6">

        <div>
          <label className="block mb-2 text-slate-300">
            Upload Video / Audio
          </label>

          <input
            type="file"
            accept="video/*,audio/*"
            onChange={handleFileUpload}
            className="w-full"
          />
        </div>

        <div className="border-t border-slate-700 pt-6">

          <label className="block mb-2 text-slate-300">
            YouTube URL
          </label>

          <div className="flex gap-3">

            <input
              type="text"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              className="flex-1 bg-slate-800 rounded-xl px-4 py-3 outline-none"
            />

            <button
              onClick={handleYoutubeSubmit}
              className="bg-blue-600 hover:bg-blue-700 px-5 rounded-xl font-medium"
            >
              Process
            </button>

          </div>
        </div>

      </div>

    </div>
  );
}