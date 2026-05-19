import { useState } from "react";

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

  const [voice, setVoice] = useState(
    "te-IN-MohanNeural"
  );

  return (

  <div className="bg-[#050505] text-white">

    <div className="bg-black text-white">

      <HeroSection />

    </div>

    <div className="max-w-7xl mx-auto px-6 py-24">

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <div className="space-y-6">

          <UploadPanel
            setJobId={setJobId}
            setStatus={setStatus}
            language={language}
            voice={voice}
          />

          <LanguageSelector
            language={language}
            setLanguage={setLanguage}
          />

          <VoiceSelector
            voice={voice}
            setVoice={setVoice}
            targetLanguage={language}
          />

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

        <VideoPlayer
          videoUrl={videoUrl}
          dubbedAudioUrl={dubbedAudioUrl}
        />

      </div>

    </div>

  </div>

);
}