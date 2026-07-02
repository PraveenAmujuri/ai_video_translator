import { useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { motion } from "framer-motion";

import UploadPanel from "../components/UploadPanel";
import VideoPlayer from "../components/VideoPlayer";
import ProgressTracker from "../components/ProgressTracker";
import LanguageSelector from "../components/LanguageSelector";
import VoiceSelector from "../components/VoiceSelector";
import HeroSection from "../components/HeroSection";

export default function HomePage() {
  const { isDark } = useTheme();
  const [jobId, setJobId] = useState(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("idle");
  const [videoUrl, setVideoUrl] = useState(null);
  const [language, setLanguage] = useState("te");
  const [voice, setVoice] = useState("te-IN-MohanNeural");

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
          className="absolute inset-0 -z-10 pointer-events-none transition-opacity duration-500"
          style={{
            backgroundImage: `
              linear-gradient(rgba(59, 130, 246, 0.08) 1px, transparent 1px),
              linear-gradient(90deg, rgba(59, 130, 246, 0.08) 1px, transparent 1px)
            `,
            backgroundSize: "64px 64px",
            maskImage:
              "radial-gradient(ellipse at center, black 40%, transparent 100%)",
            WebkitMaskImage:
              "radial-gradient(ellipse at center, black 40%, transparent 100%)",
            opacity: isDark ? 1 : 0,
          }}
        />

        {/* Grid Background - Light Mode */}
        <div
          className="absolute inset-0 -z-10 pointer-events-none transition-opacity duration-500"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0, 0, 0, 0.04) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0, 0, 0, 0.04) 1px, transparent 1px)
            `,
            backgroundSize: "64px 64px",
            maskImage:
              "radial-gradient(ellipse at center, black 40%, transparent 100%)",
            WebkitMaskImage:
              "radial-gradient(ellipse at center, black 40%, transparent 100%)",
            opacity: isDark ? 0 : 1,
          }}
        />

        <motion.section 
          className="grid grid-cols-1 md:grid-cols-2 gap-10"
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

        <motion.section 
          className="grid grid-cols-1 gap-14 items-start max-w-3xl mx-auto"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
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
      </main>
    </>
  );
}
