export default function LanguageSelector({
  language,
  setLanguage,
}) {

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">

      <h2 className="text-xl font-semibold mb-4">
        Target Language
      </h2>

      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value)}
        className="w-full p-3 rounded-lg bg-slate-800"
      >
        <option value="en">English</option>
        <option value="hi">Hindi</option>
        <option value="te">Telugu</option>
        <option value="ta">Tamil</option>
        <option value="ja">Japanese</option>
      </select>

    </div>
  );
}