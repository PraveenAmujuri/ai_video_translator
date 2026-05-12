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
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">

      <h2 className="text-xl font-semibold mb-4">
        Voice
      </h2>

      <select
        value={voice}
        onChange={(e) =>
          setVoice(e.target.value)
        }
        className="w-full p-3 rounded-lg bg-slate-800"
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