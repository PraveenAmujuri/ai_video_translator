import { useState, useRef } from "react";
import api from "../services/api";
import {
  X,
  Film,
  Loader2,
} from "lucide-react";

import Folder from "./ui/Folder";
import ShinyButton from "./ui/ShinyButton";

export default function UploadPanel({
  setJobId,
  setStatus,
  language,
  voice,
  status, // Hooked directly to track App status
  embedSubtitles = true,
  setEmbedSubtitles,
}) {
  const fileInputRef = useRef(null);
  const statusRef = useRef(status);
  statusRef.current = status;

  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState(null);
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  // Exact boolean flags based on parent prop verification
  const isUrlProcessing = status === "processing";
  const isFileActive = preview !== null || isUploading;
  const isDisabled = isFileActive || isUrlProcessing;

  async function handleFileUpload(file) {
    if (!file || isUrlProcessing) return;

    if (!file.type.startsWith("video/")) {
      alert("Please upload a video file only.");
      return;
    }

    const max_size = 200 * 1024 * 1024; // 200MB
    if (file.size > max_size) {
      alert("File size exceeds the 200MB limit. Please upload a smaller video.");
      return;
    }

    setFileName(file.name);
    setFileSize(file.size);

    const previewUrl = URL.createObjectURL(file);
    setPreview(previewUrl);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("target_language", language);
    formData.append("voice", voice);
    formData.append("source_language", "auto");
    formData.append("tts_rate", "+0%");
    formData.append("tts_pitch", "+0Hz");
    formData.append("tts_volume", "+0%");
    formData.append("preserve_background_audio", "false");
    formData.append("background_audio_volume", "0.3");
    formData.append("embed_subtitles", embedSubtitles ? "true" : "false");

    try {
      setStatus("processing");
      setIsUploading(true);
      simulateProgress();

      const res = await api.post("/translate-stream", formData);

      setJobId(res.data.job_id);
      setUploadProgress(100);

    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.detail || "Upload and translation failed.";
      alert(errMsg);
      setUploadProgress(0);
      setStatus("idle");
      setPreview(null);
    } finally {
      setIsUploading(false);
    }
  }

  function simulateProgress() {
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      setUploadProgress(progress);
      if (progress >= 90) {
        clearInterval(interval);
      }
    }, 120);
  }

  function handleChange(e) {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    handleFileUpload(selectedFile);
  }

  function handleDrop(e) {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (!droppedFile) return;
    handleFileUpload(droppedFile);
  }

  function removeFile() {
    setPreview(null);
    setFileName("");
    setFileSize(0);
    setUploadProgress(0);
    setStatus("idle");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleYoutubeSubmit() {
    if (!youtubeUrl || isDisabled) return;

    try {
      setStatus("processing");

      console.log("[EchoX UI] Dispatching pipeline lookup to backend...");

      const res = await api.post("/translate", {
        youtube_url: youtubeUrl.trim(),
        video_stream_url: null,
        target_language: language,
        source_language: "auto",
        voice: voice,
        embed_subtitles: embedSubtitles,
      });

      setJobId(res.data.job_id);
    } catch (err) {
      console.error("Pipeline processing failure:", err);
      alert("Failed to process YouTube stream pipeline.");
      setStatus("idle");
    }
  }
  return (
    <div className="space-y-16 pt-24 px-6 md:px-10 transition-colors duration-300 text-black dark:text-white">
      
      {/* Upload Section */}
      <div>
        <div className="mb-8">
          <h2 className="text-3xl font-semibold tracking-tight text-black dark:text-white">
            Upload Video
          </h2>
          <p className="mt-3 text-sm text-black/50 dark:text-white/40">
            Drag & drop your media or click to browse
          </p>
        </div>

        <div
          className={`relative overflow-hidden transition-all duration-300 rounded-[32px] border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/30 backdrop-blur-xl hover:border-black/15 dark:hover:border-white/15 transition-all duration-300 ${
            isUrlProcessing ? "opacity-40 cursor-not-allowed pointer-events-none" : "cursor-pointer"
          } ${isDragging && !isUrlProcessing ? "scale-[1.01] opacity-80" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            if (!isUrlProcessing) setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => {
            if (!isUrlProcessing) fileInputRef.current?.click();
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleChange}
            className="hidden"
            disabled={isUrlProcessing}
          />

          {!preview ? (
            <div className="flex flex-col items-center justify-center text-center py-16 md:py-20 px-8">
              <div className="group flex flex-col items-center justify-center transition-all duration-500">
                <div className="transition-transform duration-500 group-hover:scale-110 group-hover:-translate-y-1">
                  <Folder
                    size={1}
                    color="#3B82F6"
                    items={[
                      <div key="1" className="text-[9px] font-medium text-black">MP4</div>,
                      <div key="2" className="text-[9px] font-medium text-black">MOV</div>,
                      <div key="3" className="text-[9px] font-medium text-black">WEBM</div>,
                    ]}
                  />
                </div>

                <div className="mt-8 transition-all duration-500 group-hover:-translate-y-1">
                  <h3 className="text-2xl font-medium tracking-tight text-black dark:text-white">
                    Upload your video
                  </h3>
                  <p className="mt-3 text-sm text-black/50 dark:text-white/40">
                    MP4, MOV, WEBM and other supported formats
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-[28px]">
              <video src={preview} className="w-full max-h-[520px] object-cover" muted autoPlay loop />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6 flex items-end justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <Film className="w-5 h-5 text-white" />
                    <p className="text-white font-medium">{fileName}</p>
                  </div>
                  <p className="mt-2 text-sm text-white/70">
                    {(fileSize / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>

                {!isUrlProcessing && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile();
                    }}
                    className="text-white/70 hover:text-red-400 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                )}
              </div>

              {isUploading && (
                <div
                  className="absolute bottom-0 left-0 h-1 bg-white transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="relative flex items-center justify-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full h-px bg-black/10 dark:bg-white/10" />
        </div>
        <div className="relative px-4 text-xs tracking-[0.25em] uppercase text-black/40 dark:text-white/40 bg-white dark:bg-[#000000]">
          OR
        </div>
      </div>

      {/* URL Section */}
      <div className="w-full max-w-3xl mx-auto px-4 sm:px-0">
        <div className="mb-6">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-black dark:text-white">
            Import From URL
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-black/50 dark:text-white/40">
            Paste a YouTube link to instantly extract and process its content.
          </p>
        </div>

        {/* Input & Button Container Box */}
        <div 
          className={`
            relative
            flex 
            flex-col 
            sm:flex-row 
            gap-3 
            p-3
            sm:p-2 
            rounded-[22px] 
            border 
            transition-all
            duration-500
            backdrop-blur-xl
            w-full
            ${
              isUrlProcessing
                ? "border-orange-500/20 bg-orange-500/[0.01] shadow-[0_0_20px_rgba(249,115,22,0.04)]"
                : "border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/30 focus-within:border-orange-500/40 dark:focus-within:border-orange-500/30 focus-within:shadow-[0_0_25px_rgba(249,115,22,0.03)]"
            }
          `}
        >
          {/* Subtle Premium Overlay Light Track */}
          {isUrlProcessing && (
            <div className="absolute inset-0 pointer-events-none z-10 bg-gradient-to-r from-transparent via-white/5 dark:via-white/5 to-transparent animate-[premiumShimmer_3s_infinite_linear]" style={{ backgroundSize: '200% 100%' }} />
          )}

          {/* Input Field Container */}
          <div className="relative flex-1 flex items-center bg-black/[0.03] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 rounded-xl px-3.5 transition-all duration-300 focus-within:border-orange-500/30">
            <svg
              className="w-4 h-4 text-black/45 dark:text-white/40 mr-2.5 shrink-0"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
              />
            </svg>
            <input
              type="text"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              disabled={isDisabled}
              placeholder={isUrlProcessing ? "Extracting metadata..." : "https://youtube.com/watch?v=..."}
              className="
                flex-1 
                h-12 
                bg-transparent 
                text-black 
                dark:text-white 
                text-sm 
                outline-none 
                placeholder:text-black/35 
                dark:placeholder:text-white/35
                disabled:opacity-40
                disabled:cursor-not-allowed
                z-20
              "
            />
          </div>

          {/* Action Button */}
          <ShinyButton
            onClick={handleYoutubeSubmit}
            disabled={isDisabled || !youtubeUrl.trim()}
            className="w-full sm:w-auto shrink-0 z-20 rounded-xl sm:rounded-md py-3 sm:py-[12px] text-center flex justify-center items-center font-semibold"
          >
            {isUrlProcessing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Processing</span>
              </>
            ) : (
              <span>Process URL</span>
            )}
          </ShinyButton>

        </div>
      </div>

    </div>
  );
}