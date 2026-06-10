export default function LanguageSelector({
  language,
  setLanguage,
}) {
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
        Target Language
      </h2>

      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value)}
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
        <option value="en">English</option>
        <option value="hi">Hindi</option>
        <option value="te">Telugu</option>
        <option value="ta">Tamil</option>
        <option value="ja">Japanese</option>
      </select>
    </div>
  );
}