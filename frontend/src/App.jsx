import { useState, useEffect } from "react";

import UploadPanel from "./components/UploadPanel";
import VideoPlayer from "./components/VideoPlayer";
import ProgressTracker from "./components/ProgressTracker";
import LanguageSelector from "./components/LanguageSelector";
import VoiceSelector from "./components/VoiceSelector";
import HeroSection from "./components/HeroSection";

export default function App() {
  const [jobId, setJobId] = useState(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("idle");
  const [videoUrl, setVideoUrl] = useState(null);
  const [dubbedAudioUrl, setDubbedAudioUrl] = useState(null);
  const [language, setLanguage] = useState("te");
  const [voice, setVoice] = useState("te-IN-MohanNeural");

  return (
    <div
      className="
        min-h-screen
        overflow-hidden
        transition-colors
        duration-300
        bg-white
        text-black
        dark:bg-[#000000]  {/* Changed from #050505 to match Hero pure black */}
        dark:text-white
      "
    >
      {/* ───────────────── HERO ──────────────── */}
      <HeroSection />

      {/* ───────────────── MAIN APP ──────────────── */}
      <main className="
        relative
        z-20
        max-w-7xl
        mx-auto
        px-6
        py-20
        space-y-20
      ">

        {/* ───────────────── CONFIGURATION CONTROLS ──────────────── */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div>
            <LanguageSelector
              language={language}
              setLanguage={setLanguage}
            />
          </div>

          <div>
            <VoiceSelector
              voice={voice}
              setVoice={setVoice}
              targetLanguage={language}
            />
          </div>
        </section>

        {/* ───────────────── UPLOAD PANEL ──────────────── */}
        <section>
          <UploadPanel
            setJobId={setJobId}
            setStatus={setStatus}
            language={language}
            voice={voice}
            status={status}
          />
        </section>

        {/* ───────────────── WORKSPACE ──────────────── */}
        <section className="
          grid
          grid-cols-1
          xl:grid-cols-[340px_1fr]
          gap-20
          items-start
        ">

          {/* ───────────────── LEFT SIDEBAR ──────────────── */}
          <div className="space-y-14">
            <div>
              <ProgressTracker
                jobId={jobId}
                progress={progress}
                setProgress={setProgress}
                setStatus={setStatus}
                setVideoUrl={setVideoUrl}
                setDubbedAudioUrl={setDubbedAudioUrl}
                status={status}
              />
            </div>
          </div>

          {/* ───────────────── VIDEO PREVIEW ──────────────── */}
          <section className="relative min-h-[720px]">
            {/* Header */}
            <div className="
              mb-8
              flex
              items-center
              justify-between
            ">
              <div>
                <h2 className="
                  text-3xl
                  font-semibold
                  tracking-tight
                ">
                  Preview Output
                </h2>
                <p className="
                  mt-2
                  text-sm
                  text-black/50
                  dark:text-white/45
                ">
                  AI dubbed media preview
                </p>
              </div>

              <div className="
                text-xs
                font-medium
                text-black/60
                dark:text-white/60
              ">
                {status}
              </div>
            </div>

            {/* Player */}
            <div className="relative">
              <VideoPlayer
                videoUrl={videoUrl}
                dubbedAudioUrl={dubbedAudioUrl}
              />
            </div>
          </section>

        </section>
      </main>
    </div>
  );
}