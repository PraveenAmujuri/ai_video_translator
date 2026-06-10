import { useEffect } from "react";

const VOICES = {
  en: [
    {
      name: "en-US-AriaNeural",
      label: "Aria",
    },
    {
      name: "en-US-GuyNeural",
      label: "Guy",
    },
  ],

  hi: [
    {
      name: "hi-IN-SwaraNeural",
      label: "Hindi Swara",
    },
  ],

  te: [
    {
      name: "te-IN-MohanNeural",
      label: "Telugu Mohan",
    },
  ],
};

export default function VoiceSelector({
  voice,
  setVoice,
  targetLanguage,
}) {
  const currentVoices =
    VOICES[targetLanguage] || VOICES.en;

  useEffect(() => {
    if (
      currentVoices.length > 0 &&
      !currentVoices.find(
        (v) => v.name === voice
      )
    ) {
      setVoice(
        currentVoices[0].name
      );
    }
  }, [targetLanguage]);

  return (
    <div
      className="
      rounded-3xl
      p-6

      bg-black/[0.02]
      dark:bg-white/[0.02]

      border
      border-black/10
      dark:border-white/10

      backdrop-blur-xl

      transition-all
      duration-300

      hover:border-black/15
      dark:hover:border-white/15
    "
    >
      <h2
        className="
        text-xl
        font-semibold
        mb-4

        text-black
        dark:text-white
      "
      >
        Voice
      </h2>

      <select
        value={voice}
        onChange={(e) =>
          setVoice(e.target.value)
        }
        className="
          w-full
          h-14
          px-4

          rounded-xl

          bg-black/[0.03]
          dark:bg-white/[0.03]

          border
          border-black/10
          dark:border-white/10

          text-black
          dark:text-white

          backdrop-blur-xl

          outline-none

          transition-all
          duration-300

          hover:border-black/20
          dark:hover:border-white/20

          focus:border-blue-500
          focus:bg-black/[0.05]
          dark:focus:bg-white/[0.05]

          appearance-none
        "
      >
        {currentVoices.map((v) => (
          <option
            key={v.name}
            value={v.name}
          >
            {v.label}
          </option>
        ))}
      </select>
    </div>
  );
}