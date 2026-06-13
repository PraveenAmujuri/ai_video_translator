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
}) {
  const fileInputRef = useRef(null);

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

    setFileName(file.name);
    setFileSize(file.size);

    const previewUrl = URL.createObjectURL(file);
    setPreview(previewUrl);

    const formData = new FormData();
    formData.append("file", file);

    try {
      setStatus("uploading");
      setIsUploading(true);
      simulateProgress();

      const res = await api.post("/upload", formData);

      setJobId(res.data.job_id);
      setStatus("uploaded");
      setUploadProgress(100);

    } catch (err) {
      console.error(err);
      alert("Upload failed");
      setUploadProgress(0);
      setStatus("idle");
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

  // Passes explicit 'None' markers to keep parameter definitions aligned
  async function runServerFallback() {
    try {
      console.log("Engaging server-side backup tracker processing framework...");
      const res = await api.post("/translate", {
        youtube_url: youtubeUrl.trim(),
        video_stream_url: null, // 👈 Explicitly pass null to cleanly initialize the server column structure
        target_language: language,
        source_language: "auto",
        voice: voice,
      });
      setJobId(res.data.job_id);
    } catch (fallbackErr) {
      console.error("Server processing exception:", fallbackErr);
      alert("Failed to process YouTube stream pipeline.");
      setStatus("idle");
    }
  }

  async function handleYoutubeSubmit() {
    if (!youtubeUrl || isDisabled) return;

    try {
      setStatus("processing");

      const match = youtubeUrl.match(/(?:v=|\/|embed\/|youtu\.be\/)([0-9A-Za-z_-]{11})/);
      if (!match) {
        alert("Invalid YouTube URL structure.");
        setStatus("idle");
        return;
      }
      const videoId = match[1];

      const handleExtensionResponse = async (event) => {
        if (event.source !== window) return;

        if (event.data.type === "YOUTUBE_EXTRACT_SUCCESS") {
          window.removeEventListener("message", handleExtensionResponse);
          
          const extractedStreamUrl = event.data.url;

          // Validate that the returned URL string value from background configuration isn't empty
          if (extractedStreamUrl && extractedStreamUrl.trim() !== "") {
            console.log("🎯 EchoX Extension verified streaming URL payload. Dispatching to Azure Gateway.");
            
            try {
              const res = await api.post("/translate", {
                youtube_url: youtubeUrl.trim(),
                video_stream_url: extractedStreamUrl.trim(),
                target_language: language,
                source_language: "auto",
                voice: voice,
              });
              setJobId(res.data.job_id);
            } catch (apiErr) {
              console.error("API submission failed, retrying via server pipeline fallback...", apiErr);
              runServerFallback();
            }
          } else {
            console.warn("⚠️ Extension returned success signature but stream URL was blank. Engaging server fallback.");
            runServerFallback();
          }
        }

        if (event.data.type === "YOUTUBE_EXTRACT_FAILED") {
          window.removeEventListener("message", handleExtensionResponse);
          console.warn("EchoX Extension parser hit a brick wall. Running fallback configuration.");
          runServerFallback();
        }
      };

      window.addEventListener("message", handleExtensionResponse);
      window.postMessage({ type: "EXTRACT_YOUTUBE", videoId }, "*");

      setTimeout(() => {
        window.removeEventListener("message", handleExtensionResponse);
        if (status === "idle" || status === "uploaded" || status === "uploading") return;
        runServerFallback();
      }, 4000);

    } catch (err) {
      console.error("Initial pipeline handshake failure:", err);
      runServerFallback();
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
          className={`relative overflow-hidden transition-all duration-300 rounded-[32px] ${
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
      <div className="w-full max-w-3xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Import From URL
          </h2>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
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
            p-2 
            rounded-2xl 
            border 
            transition-all
            duration-500
            overflow-hidden
            ${
              isUrlProcessing
                ? "border-zinc-300 dark:border-zinc-700 bg-zinc-100/40 dark:bg-zinc-900/40 shadow-[0_0_15px_rgba(255,255,255,0.02)]"
                : "border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30 focus-within:border-zinc-400 dark:focus-within:border-zinc-600 focus-within:ring-1 focus-within:ring-zinc-400/20"
            }
          `}
        >
          {/* Subtle Premium Overlay Light Track */}
          {isUrlProcessing && (
            <div className="absolute inset-0 pointer-events-none z-10 bg-gradient-to-r from-transparent via-zinc-400/5 dark:via-zinc-100/5 to-transparent animate-[premiumShimmer_3s_infinite_linear]" style={{ backgroundSize: '200% 100%' }} />
          )}

          {/* Input Field */}
          <input
            type="text"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            disabled={isDisabled}
            placeholder={isUrlProcessing ? "Extracting remote stream metadata..." : "https://youtube.com/watch?v=..."}
            className="
              flex-1 
              h-12 
              px-4 
              bg-transparent 
              text-zinc-900 
              dark:text-zinc-100 
              text-sm 
              outline-none 
              placeholder:text-zinc-400 
              dark:placeholder:text-zinc-500
              disabled:opacity-40
              disabled:cursor-not-allowed
              z-20
            "
          />

          {/* Action Button */}
          <ShinyButton
            onClick={handleYoutubeSubmit}
            disabled={isDisabled || !youtubeUrl.trim()}
            className="shrink-0 z-20"
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