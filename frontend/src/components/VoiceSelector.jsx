export default function VoiceSelector({
  voice,
  setVoice,
}) {

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">

      <h2 className="text-xl font-semibold mb-4">
        Voice
      </h2>

      <select
        value={voice}
        onChange={(e) => setVoice(e.target.value)}
        className="w-full p-3 rounded-lg bg-slate-800"
      >
        <option value="en-US-AriaNeural">
          Aria
        </option>

        <option value="en-US-GuyNeural">
          Guy
        </option>

        <option value="hi-IN-SwaraNeural">
          Hindi Swara
        </option>

      </select>

    </div>
  );
}