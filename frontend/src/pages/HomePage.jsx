import { useState, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";
import { motion } from "framer-motion";

import UploadPanel from "../components/UploadPanel";
import VideoPlayer from "../components/VideoPlayer";
import ProgressTracker from "../components/ProgressTracker";
import LanguageSelector from "../components/LanguageSelector";
import VoiceSelector from "../components/VoiceSelector";
import VoicePlayer from "../components/VoicePlayer";
import HeroSection from "../components/HeroSection";

export default function HomePage() {
  const { isDark } = useTheme();
  
  // Persisted state initializers
  const [jobId, setJobId] = useState(() => localStorage.getItem("echox_job_id") || null);
  const [progress, setProgress] = useState(() => {
    const saved = localStorage.getItem("echox_progress");
    return saved ? parseInt(saved, 10) : 0;
  });
  const [status, setStatus] = useState(() => localStorage.getItem("echox_status") || "idle");
  const [videoUrl, setVideoUrl] = useState(() => localStorage.getItem("echox_video_url") || null);
  const [language, setLanguage] = useState(() => localStorage.getItem("echox_language") || "te");
  const [voice, setVoice] = useState(() => localStorage.getItem("echox_voice") || "te_IN-maya-medium");

  // Sync state changes with localStorage
  useEffect(() => {
    if (status === "idle") {
      setJobId(null);
      setProgress(0);
      setVideoUrl(null);
      localStorage.removeItem("echox_job_id");
      localStorage.removeItem("echox_progress");
      localStorage.removeItem("echox_video_url");
    }
    localStorage.setItem("echox_status", status);
  }, [status]);

  useEffect(() => {
    if (jobId) {
      localStorage.setItem("echox_job_id", jobId);
    }
  }, [jobId]);

  useEffect(() => {
    localStorage.setItem("echox_progress", progress.toString());
  }, [progress]);

  useEffect(() => {
    if (videoUrl) {
      localStorage.setItem("echox_video_url", videoUrl);
    }
  }, [videoUrl]);

  useEffect(() => {
    localStorage.setItem("echox_language", language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem("echox_voice", voice);
  }, [voice]);

  return (
    <>
      <HeroSection />

      <main
        className="
          relative
          z-20
          max-w-7xl
          mx-auto
          px-6
          py-20
          space-y-20
          overflow-hidden
        "
      >
        {/* Grid Background - Dark Mode */}
        <div
          className="absolute inset-0 -z-10 pointer-events-none transition-opacity duration-500 grid-bg-dark"
          style={{
            maskImage:
              "radial-gradient(ellipse at center, black 40%, transparent 100%)",
            WebkitMaskImage:
              "radial-gradient(ellipse at center, black 40%, transparent 100%)",
            opacity: isDark ? 1 : 0,
          }}
        />

        {/* Grid Background - Light Mode */}
        <div
          className="absolute inset-0 -z-10 pointer-events-none transition-opacity duration-500 grid-bg-light"
          style={{
            maskImage:
              "radial-gradient(ellipse at center, black 40%, transparent 100%)",
            WebkitMaskImage:
              "radial-gradient(ellipse at center, black 40%, transparent 100%)",
            opacity: isDark ? 0 : 1,
          }}
        />

        <motion.section 
          className="grid grid-cols-1 md:grid-cols-2 gap-10 relative z-30"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <div>
            <LanguageSelector language={language} setLanguage={setLanguage} />
          </div>
          <div>
            <VoiceSelector
              voice={voice}
              setVoice={setVoice}
              targetLanguage={language}
            />
          </div>
        </motion.section>

        <motion.section
          className="mt-10 relative z-20"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <VoicePlayer
            voice={voice}
            language={language}
            setVoice={setVoice}
          />
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <UploadPanel
            setJobId={setJobId}
            setStatus={setStatus}
            language={language}
            voice={voice}
            status={status}
          />
        </motion.section>

        {status !== "idle" && (
          <motion.section 
            className="grid grid-cols-1 gap-14 items-start max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="w-full">
              <ProgressTracker
                jobId={jobId}
                progress={progress}
                setProgress={setProgress}
                setStatus={setStatus}
                setVideoUrl={setVideoUrl}
                status={status}
              />
            </div>

            <section className="relative w-full">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">
                    Preview Output
                  </h2>
                  <p className="mt-2 text-sm text-black/50 dark:text-white/45">
                    AI dubbed media preview
                  </p>
                </div>

                <div className="text-xs font-medium text-black/60 dark:text-white/60">
                  {status}
                </div>
              </div>

              <div className="relative">
                <VideoPlayer videoUrl={videoUrl} />
              </div>
            </section>
          </motion.section>
        )}
      </main>
    </>
  );
}
